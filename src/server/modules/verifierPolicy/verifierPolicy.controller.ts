import type { RequestHandler } from "express";

import { evaluateVerifierPolicy as defaultEvaluateVerifierPolicy } from "./verifierPolicy.service.js";
import type {
  EvaluateVerifierPolicyOptions,
  VerifierPolicyDecision,
} from "./verifierPolicy.types.js";

type EvaluateVerifierPolicyFn = (
  input: unknown,
  options?: EvaluateVerifierPolicyOptions,
) => Promise<VerifierPolicyDecision>;

type VerifierPolicyLogger = {
  info(message: string, data: unknown): void;
  warn(message: string, data: unknown): void;
  error(message: string, data: unknown): void;
};

export type CreateVerifierPolicyControllerOptions = {
  evaluateVerifierPolicy?: EvaluateVerifierPolicyFn;
  logger?: VerifierPolicyLogger;
  rpcUrl?: string;
  trustedIssuers?: string[];
};

function logDecision(
  logger: VerifierPolicyLogger,
  decision: VerifierPolicyDecision,
): void {
  const payload = {
    httpStatus: decision.httpStatus,
    body: decision.body,
  };

  switch (decision.logCategory) {
    case "accept":
      logger.info("verifier_policy_accept", payload);
      return;
    case "policy_reject":
      logger.warn("verifier_policy_policy_reject", payload);
      return;
    case "dependency_failure":
      logger.error("verifier_policy_dependency_failure", payload);
      return;
    case "input_error":
      logger.error("verifier_policy_input_error", payload);
      return;
  }
}

export function createVerifierPolicyController(
  options: CreateVerifierPolicyControllerOptions = {},
): RequestHandler {
  const evaluateVerifierPolicy =
    options.evaluateVerifierPolicy ?? defaultEvaluateVerifierPolicy;
  const logger = options.logger ?? console;

  return async (req, res) => {
    if (!req.is("application/json")) {
      res.status(415).json({
        error: "unsupported_media_type",
        error_description: "Content-Type must be application/json",
      });
      return;
    }

    const decision = await evaluateVerifierPolicy(req.body, {
      rpcUrl: options.rpcUrl,
      trustedIssuers: options.trustedIssuers,
    });

    logDecision(logger, decision);
    res.status(decision.httpStatus).json(decision.body);
  };
}
