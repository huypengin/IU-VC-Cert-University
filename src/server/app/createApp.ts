import fs from "fs";
import path from "path";
import express, { Router, type Express } from "express";
import cors from "cors";

export type CreateAppOptions = {
  baseUrl: string;
  register?: (router: Router) => void;
};

export function createApp(options: CreateAppOptions): Express {
  const app = express();
  const router = Router();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      issuer: options.baseUrl,
    });
  });

  options.register?.(router);
  app.use(router);

  // In production container, serve Vite static frontend if dist/ exists
  const distDir = path.resolve(process.cwd(), "dist");
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get("*", (req, res, next) => {
      if (
        req.path.startsWith("/oid4vci") ||
        req.path.startsWith("/.well-known") ||
        req.path.startsWith("/api")
      ) {
        return next();
      }
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  return app;
}

