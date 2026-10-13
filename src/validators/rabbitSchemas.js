import { z } from "zod";
import { EXCHANGE_TYPES, LIMITS, NAME_PATTERN, RESERVED_PREFIX } from "../config/rabbitAdmin.js";

// DTOs de entrada con validación (equivalente a @Valid + anotaciones de
// Bean Validation en Spring). Si algo no cumple, el middleware validate
// responde 400 con la lista de errores.

const resourceName = (label) =>
  z
    .string({ required_error: `El nombre ${label} es obligatorio` })
    .trim()
    .min(1, `El nombre ${label} no puede estar vacío`)
    .regex(
      NAME_PATTERN,
      `Nombre ${label} inválido: 3-64 caracteres, solo minúsculas, números, '.', '-' y '_'`,
    )
    .refine((name) => !name.startsWith(RESERVED_PREFIX), {
      message: `El prefijo '${RESERVED_PREFIX}' está reservado por RabbitMQ`,
    });

export const createQueueSchema = z
  .object({
    name: resourceName("de la cola"),
    durable: z.boolean().default(true),
    autoDelete: z.boolean().default(false),
    messageTtlMs: z
      .number()
      .int("El TTL debe ser un número entero de milisegundos")
      .positive("El TTL debe ser mayor a 0")
      .max(LIMITS.maxMessageTtlMs, "El TTL máximo es 7 días")
      .optional(),
    maxLength: z
      .number()
      .int("maxLength debe ser entero")
      .positive("maxLength debe ser mayor a 0")
      .max(LIMITS.maxQueueLength)
      .optional(),
    deadLetterExchange: resourceName("del dead letter exchange").optional(),
  })
  .strict();

export const createExchangeSchema = z
  .object({
    name: resourceName("del exchange"),
    type: z.enum(EXCHANGE_TYPES, {
      errorMap: () => ({ message: `Tipo inválido. Permitidos: ${EXCHANGE_TYPES.join(", ")}` }),
    }),
    durable: z.boolean().default(true),
    autoDelete: z.boolean().default(false),
  })
  .strict();

const bindingBase = {
  source: resourceName("del exchange origen"),
  destination: resourceName("del destino"),
  destinationType: z.enum(["queue", "exchange"], {
    errorMap: () => ({ message: "destinationType debe ser 'queue' o 'exchange'" }),
  }),
  routingKey: z.string().trim().max(255, "La routing key admite máximo 255 caracteres").default(""),
};

export const createBindingSchema = z.object(bindingBase).strict();

// Para DELETE /bindings los datos llegan por query string.
export const deleteBindingSchema = z.object(bindingBase);

export const nameParamSchema = z.object({ name: resourceName("del recurso") });

export const deleteQueueQuerySchema = z.object({
  // Por defecto no se borra una cola con mensajes (se perderían).
  force: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});
