import express, { Request, Response, NextFunction } from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { logger } from "./utils/logger";
import { requestLogger } from "./middleware/requestLogger";
import webhookRoutes from "./routes/webhook";
import translateRoutes from "./routes/translate";
import webRoutes from "./routes/web";
import adminRoutes from "./routes/admin";
import betaTestRoutes from "./routes/betaTest";
import { getProvidersHealth } from "./controllers/providersController";
import { getSiteConfig } from "./controllers/siteController";
import { isDbHealthy } from "./db";
import { config } from "./config";

const app = express();

// Keep the raw body around: the WhatsApp webhook signature is an HMAC over the
// exact bytes Meta sent, which cannot be recovered from the parsed object.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  })
);
app.use(requestLogger);

// Swagger docs
const swaggerDocument = YAML.load(path.join(process.cwd(), "swagger.yaml"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check
app.get("/health", async (_req, res) => {
  const dbHealthy = await isDbHealthy();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    database: dbHealthy ? "connected" : "disconnected",
    sttProvider: config.TILTAB_STT_PROVIDER,
    remoteSttConfigured: Boolean(config.TILTAB_STT_SERVICE_URL),
    openaiConfigured: Boolean(config.OPENAI_API_KEY),
    groqConfigured: Boolean(config.GROQ_API_KEY),
    elevenlabsConfigured: Boolean(config.ELEVENLABS_API_KEY),
  });
});

// Provider health & billing snapshot
app.get("/health/providers", getProvidersHealth);

// Public marketing site + web app. Registered before the static mounts so "/"
// resolves to the landing page rather than a directory listing miss.
const SITE_DIR = path.join(process.cwd(), "public/site");
app.get("/", (_req, res) => res.sendFile(path.join(SITE_DIR, "index.html")));
app.get("/app", (_req, res) => res.sendFile(path.join(SITE_DIR, "app.html")));
app.get("/api/site/config", getSiteConfig);

// Static web UI. The admin HTML shell is public so the token never has to
// appear in a URL; all admin API endpoints require the token via the
// X-Admin-Token header and the UI prompts for it.
app.use("/site", express.static(SITE_DIR));
app.use("/web", express.static(path.join(process.cwd(), "public/web")));
app.use(express.static(path.join(process.cwd(), "public")));

// Routes
app.use("/webhook", webhookRoutes);
app.use("/api/translate", translateRoutes);
app.use("/api/web", webRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/beta", betaTestRoutes);

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled error", { error: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal server error" });
});

export default app;
