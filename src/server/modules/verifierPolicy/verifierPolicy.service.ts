import {
  resolveReceipt as defaultResolveReceipt,
  verifyChainAnchoring as defaultVerifyChainAnchoring,
  verifyMerkleProofs as defaultVerifyMerkleProofs,
} from "../../../verifier/index.js";

import type {
  EvaluateVerifierPolicyOptions,
  VerifierPolicyChecks,
  VerifierPolicyDecision,
  VerifierPolicyDependencies,
} from "./verifierPolicy.types.js";

function createChecks(
  overrides: Partial<VerifierPolicyChecks> = {},
): VerifierPolicyChecks {
  return {
    merkle: "skipped",
    chain: "skipped",
    revocation: "skipped",
    issuerTrust: "skipped",
    ...overrides,
  };
}

function getDependencies(
  overrides: Partial<VerifierPolicyDependencies> = {},
): VerifierPolicyDependencies {
  return {
    resolveReceipt: defaultResolveReceipt,
    verifyMerkleProofs: defaultVerifyMerkleProofs,
    verifyChainAnchoring: defaultVerifyChainAnchoring,
    ...overrides,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isJwtVcWrapper(input: Record<string, unknown>): input is Record<string, unknown> & {
  vc: Record<string, unknown>;
} {
  return isRecord(input.vc) && (
    typeof input.iss === "string" ||
    typeof input.sub === "string" ||
    typeof input.jti === "string" ||
    input.nbf !== undefined
  );
}

function extractIssuer(vc: Record<string, unknown>): string | undefined {
  const issuer = vc.issuer;
  if (typeof issuer === "string") {
    return issuer;
  }
  if (issuer && typeof issuer === "object") {
    const issuerObject = issuer as Record<string, unknown>;
    if (typeof issuerObject.id === "string") {
      return issuerObject.id;
    }
  }
  return undefined;
}

function normalizeCredentialInput(input: Record<string, unknown>): Record<string, unknown> {
  if (!isJwtVcWrapper(input)) {
    return input;
  }

  const vc = { ...input.vc };

  if (!extractIssuer(vc) && typeof input.iss === "string") {
    vc.issuer = input.iss;
  }

  if (vc["iu:merkleReceipt"] === undefined && vc.iu_merkle_receipt !== undefined) {
    vc["iu:merkleReceipt"] = vc.iu_merkle_receipt;
  }

  if (vc.id === undefined && typeof input.jti === "string") {
    vc.id = input.jti;
  }

  if (!isRecord(vc.credentialSubject) && typeof input.sub === "string") {
    vc.credentialSubject = { id: input.sub };
  }

  return vc;
}

function isDependencyFailureMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    "econn",
    "enotfound",
    "fetch",
    "network",
    "rate limit",
    "rpc",
    "socket",
    "timeout",
    "unavailable",
  ].some((pattern) => normalized.includes(pattern));
}

export async function evaluateVerifierPolicy(
  input: unknown,
  options: EvaluateVerifierPolicyOptions = {},
): Promise<VerifierPolicyDecision> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      httpStatus: 422,
      body: {
        decision: "reject",
        reason: "Request body must be a VC JSON object",
        checks: createChecks(),
      },
      logCategory: "input_error",
    };
  }

  const vc = normalizeCredentialInput(input as Record<string, unknown>);
  const issuer = extractIssuer(vc);
  if (!issuer) {
    return {
      httpStatus: 422,
      body: {
        decision: "reject",
        reason: "VC issuer is missing or invalid",
        checks: createChecks(),
      },
      logCategory: "input_error",
    };
  }

  const trustedIssuers = options.trustedIssuers ?? [];
  const issuerTrustStatus =
    trustedIssuers.length === 0
      ? "skipped"
      : trustedIssuers.includes(issuer)
        ? "trusted"
        : "untrusted";

  if (issuerTrustStatus === "untrusted") {
    return {
      httpStatus: 409,
      body: {
        decision: "reject",
        reason: "Issuer is not trusted by IU policy",
        checks: createChecks({
          issuerTrust: "untrusted",
        }),
      },
      logCategory: "policy_reject",
    };
  }

  const deps = getDependencies(options.deps);
  const trustedChecks = createChecks({
    issuerTrust: issuerTrustStatus,
  });

  try {
    const { receipt } = await deps.resolveReceipt(vc);
    const merkle = await deps.verifyMerkleProofs(vc, receipt);

    if (!merkle.valid) {
      return {
        httpStatus: 409,
        body: {
          decision: "reject",
          reason: merkle.error ?? "Merkle verification failed",
          checks: createChecks({
            ...trustedChecks,
            merkle: "failed",
          }),
        },
        logCategory: "policy_reject",
      };
    }

    try {
      const chain = await deps.verifyChainAnchoring(receipt, options.rpcUrl);

      if (chain.valid) {
        return {
          httpStatus: 200,
          body: {
            decision: "accept",
            checks: createChecks({
              ...trustedChecks,
              merkle: "passed",
              chain: "passed",
              revocation: "active",
            }),
          },
          logCategory: "accept",
        };
      }

      if (chain.revoked) {
        return {
          httpStatus: 409,
          body: {
            decision: "reject",
            reason: chain.revocationReason ?? chain.error ?? "Credential revoked",
            checks: createChecks({
              ...trustedChecks,
              merkle: "passed",
              chain: "passed",
              revocation: "revoked",
            }),
          },
          logCategory: "policy_reject",
        };
      }

      if (chain.error && isDependencyFailureMessage(chain.error)) {
        return {
          httpStatus: 503,
          body: {
            decision: "reject",
            reason: chain.error,
            checks: createChecks({
              ...trustedChecks,
              merkle: "passed",
              chain: "indeterminate",
              revocation: "indeterminate",
            }),
          },
          logCategory: "dependency_failure",
        };
      }

      return {
        httpStatus: 409,
        body: {
          decision: "reject",
          reason: chain.error ?? "Chain verification failed",
          checks: createChecks({
            ...trustedChecks,
            merkle: "passed",
            chain: "failed",
            revocation: chain.revoked === false ? "active" : "skipped",
          }),
        },
        logCategory: "policy_reject",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        httpStatus: 503,
        body: {
          decision: "reject",
          reason: message,
          checks: createChecks({
            ...trustedChecks,
            merkle: "passed",
            chain: "indeterminate",
            revocation: "indeterminate",
          }),
        },
        logCategory: "dependency_failure",
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      httpStatus: 422,
      body: {
        decision: "reject",
        reason: message,
        checks: trustedChecks,
      },
      logCategory: "input_error",
    };
  }
}
