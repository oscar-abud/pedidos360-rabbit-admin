import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { requireAuth } from "./middlewares/auth.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";
import * as RabbitAdminService from "./services/rabbitAdminService.js";
import rabbitRoutes from "./routes/rabbitRoutes.js";

const app = express();

app.use(
  cors({
    origin: env.corsOrigins,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  }),
);
app.use(express.json());

// Público: health check (incluye si la API de Management responde).
app.get("/health", async (req, res) => {
  try {
    res.json({ status: "ok", rabbitmq: await RabbitAdminService.health() });
  } catch (error) {
    res.status(503).json({ status: "degradado", message: error.message });
  }
});

// Todo /rabbit exige JWT válido de Entra ID (y rol Admin, ver rabbitRoutes).
app.use("/rabbit", requireAuth, rabbitRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
