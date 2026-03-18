import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

function tokensMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function createBearerAuth(expectedToken: string): RequestHandler {
  return (req, res, next) => {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({
        error: "unauthorized",
        error_description: "Missing or invalid bearer token",
      });
      return;
    }

    const token = header.slice("Bearer ".length);
    if (!tokensMatch(token, expectedToken)) {
      res.status(401).json({
        error: "unauthorized",
        error_description: "Missing or invalid bearer token",
      });
      return;
    }

    next();
  };
}
