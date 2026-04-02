import type { Router } from "express";

import oid4vciRoutes from "../modules/oid4vci/oid4vci.routes.js";
import {
  createVerifierPolicyRouter,
  type CreateVerifierPolicyRouterOptions,
} from "../modules/verifierPolicy/verifierPolicy.routes.js";

export function registerOid4VCIServerRoutes(
  router: Router,
  verifierPolicyOptions: CreateVerifierPolicyRouterOptions = {},
): void {
  router.use(oid4vciRoutes);
  router.use(createVerifierPolicyRouter(verifierPolicyOptions));
}
