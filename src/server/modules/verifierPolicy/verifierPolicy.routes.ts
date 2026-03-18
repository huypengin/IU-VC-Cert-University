import { Router } from "express";

import { createBearerAuth } from "../../shared/security/bearerAuth.js";
import {
  createVerifierPolicyController,
  type CreateVerifierPolicyControllerOptions,
} from "./verifierPolicy.controller.js";

export type CreateVerifierPolicyRouterOptions =
  CreateVerifierPolicyControllerOptions & {
    bearerToken: string;
  };

export function createVerifierPolicyRouter(
  options: CreateVerifierPolicyRouterOptions,
): Router {
  const router = Router();

  router.post(
    "/api/verifier/policies/vc",
    createBearerAuth(options.bearerToken),
    createVerifierPolicyController(options),
  );

  return router;
}
