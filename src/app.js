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

// Público: health check. Siempre 200 si el proceso está vivo (Render lo usa
// para dar el deploy por bueno); el estado de RabbitMQ va en el cuerpo, así
// una credencial mal escrita no deja el deploy colgado.
app.get("/health", async (req, res) => {
  try {
    res.json({ status: "ok", rabbitmq: await RabbitAdminService.health() });
  } catch (error) {
    res.json({ status: "degradado", rabbitmq: { error: error.message } });
  }
});

// Todo /rabbit exige JWT válido de Entra ID (y rol Admin, ver rabbitRoutes).
app.use("/rabbit", requireAuth, rabbitRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
