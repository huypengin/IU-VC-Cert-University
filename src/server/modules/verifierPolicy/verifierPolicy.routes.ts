import { Router } from "express";

import {
  createVerifierPolicyController,
  type CreateVerifierPolicyControllerOptions,
} from "./verifierPolicy.controller.js";

export type CreateVerifierPolicyRouterOptions = CreateVerifierPolicyControllerOptions;

export function createVerifierPolicyRouter(
  options: CreateVerifierPolicyRouterOptions,
): Router {
  const router = Router();

  router.post("/api/verifier/policies/vc", createVerifierPolicyController(options));

  return router;
}
