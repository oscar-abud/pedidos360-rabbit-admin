import { Router } from "express";
import * as RabbitAdminController from "../controllers/rabbitAdminController.js";
import { requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  createBindingSchema,
  createExchangeSchema,
  createQueueSchema,
  deleteBindingSchema,
  deleteQueueQuerySchema,
  nameParamSchema,
} from "../validators/rabbitSchemas.js";

const router = Router();

// Administrar la infraestructura de mensajería: solo Admin.
router.use(requireRole("Admin"));

// Colas
router.get("/queues", RabbitAdminController.listarColas);
router.post("/queues", validate(createQueueSchema), RabbitAdminController.crearCola);
router.delete(
  "/queues/:name",
  validate(nameParamSchema, "params"),
  validate(deleteQueueQuerySchema, "query"),
  RabbitAdminController.eliminarCola,
);

// Exchanges
router.get("/exchanges", RabbitAdminController.listarExchanges);
router.post("/exchanges", validate(createExchangeSchema), RabbitAdminController.crearExchange);
router.delete("/exchanges/:name", validate(nameParamSchema, "params"), RabbitAdminController.eliminarExchange);

// Bindings (un binding no tiene nombre propio: se identifica por
// source + destination + destinationType + routingKey en el query string)
router.get("/bindings", RabbitAdminController.listarBindings);
router.post("/bindings", validate(createBindingSchema), RabbitAdminController.crearBinding);
router.delete("/bindings", validate(deleteBindingSchema, "query"), RabbitAdminController.eliminarBinding);

export default router;
