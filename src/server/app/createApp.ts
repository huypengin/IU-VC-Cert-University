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

  return app;
}
