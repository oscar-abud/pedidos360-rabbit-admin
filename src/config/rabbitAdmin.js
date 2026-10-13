// Reglas centralizadas del administrador de RabbitMQ.

// Formato permitido para nombres de colas y exchanges: minúsculas, números,
// punto, guion y guion bajo; entre 3 y 64 caracteres.
export const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,63}$/;

export const EXCHANGE_TYPES = ["direct", "topic", "fanout", "headers"];

// Prefijo reservado por RabbitMQ (amq.direct, amq.topic...): no se crean,
// no se borran y no se usan como origen de bindings.
export const RESERVED_PREFIX = "amq.";

// Topología propia de Pedidos360 (la declaran pedidos-api y pedidos360-worker).
// Borrarla desde el panel rompería el sistema, así que está protegida.
export const PROTECTED = {
  exchanges: ["pedidos.events", "pedidos.dlx", "pedidos.retry", "pedidos.retry.return"],
  queues: [
    "pedidos.notificaciones.queue",
    "pedidos.tickets.queue",
    "pedidos.dlq",
    "pedidos.retry.1000ms",
    "pedidos.retry.2000ms",
    "pedidos.retry.4000ms",
  ],
};

// Límites para los argumentos opcionales de una cola.
export const LIMITS = {
  maxMessageTtlMs: 7 * 24 * 60 * 60 * 1000, // 7 días
  maxQueueLength: 1_000_000,
};
