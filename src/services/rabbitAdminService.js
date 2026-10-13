import { env } from "../config/env.js";
import { PROTECTED, RESERVED_PREFIX } from "../config/rabbitAdmin.js";

// RabbitAdminService: TODA la lógica de administración de RabbitMQ vive aquí.
// Los controllers solo llaman a métodos de alto nivel (createQueue,
// deleteExchange...) y no saben que por debajo se usa la API HTTP de
// RabbitMQ Management (permite listar, cosa que AMQP no puede).

const vhost = encodeURIComponent(env.rabbitVhost);
const authHeader = `Basic ${Buffer.from(
  `${env.rabbitManagementUser}:${env.rabbitManagementPassword}`,
).toString("base64")}`;

class RabbitAdminError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function management(method, path, body) {
  let response;
  try {
    response = await fetch(`${env.rabbitManagementUrl}/api${path}`, {
      method,
      headers: {
        Authorization: authHeader,
        ...(body !== undefined && { "Content-Type": "application/json" }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new RabbitAdminError(503, `RabbitMQ Management no disponible: ${error.message}`);
  }

  if (response.status === 204 || response.status === 201) return null;
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const reason = data?.reason ?? data?.error ?? `HTTP ${response.status}`;
    if (response.status === 404) throw new RabbitAdminError(404, `No encontrado: ${reason}`);
    if (response.status === 401) throw new RabbitAdminError(502, "Credenciales de RabbitMQ Management inválidas");
    throw new RabbitAdminError(response.status >= 500 ? 502 : 400, reason);
  }
  return data;
}

const enc = encodeURIComponent;

async function exists(kind, name) {
  try {
    await management("GET", `/${kind}/${vhost}/${enc(name)}`);
    return true;
  } catch (error) {
    if (error.status === 404) return false;
    throw error;
  }
}

function assertNotProtected(kind, name) {
  if (name.startsWith(RESERVED_PREFIX) || PROTECTED[kind].includes(name)) {
    throw new RabbitAdminError(
      409,
      `'${name}' es parte de la topología base de Pedidos360 o reservado por RabbitMQ y no se puede eliminar`,
    );
  }
}

// ---------------------------------------------------------------- Colas

export async function listQueues() {
  const queues = await management(
    "GET",
    `/queues/${vhost}?columns=name,durable,auto_delete,arguments,messages,messages_ready,messages_unacknowledged,consumers`,
  );
  return queues.map((q) => ({
    name: q.name,
    durable: q.durable,
    autoDelete: q.auto_delete,
    arguments: q.arguments ?? {},
    messages: q.messages ?? 0,
    messagesReady: q.messages_ready ?? 0,
    messagesUnacked: q.messages_unacknowledged ?? 0,
    consumers: q.consumers ?? 0,
    protected: PROTECTED.queues.includes(q.name),
  }));
}

export async function createQueue({ name, durable, autoDelete, messageTtlMs, maxLength, deadLetterExchange }) {
  if (await exists("queues", name)) {
    throw new RabbitAdminError(409, `La cola '${name}' ya existe`);
  }
  if (deadLetterExchange && !(await exists("exchanges", deadLetterExchange))) {
    throw new RabbitAdminError(400, `El dead letter exchange '${deadLetterExchange}' no existe`);
  }

  const args = {};
  if (messageTtlMs) args["x-message-ttl"] = messageTtlMs;
  if (maxLength) args["x-max-length"] = maxLength;
  if (deadLetterExchange) args["x-dead-letter-exchange"] = deadLetterExchange;

  await management("PUT", `/queues/${vhost}/${enc(name)}`, {
    durable,
    auto_delete: autoDelete,
    arguments: args,
  });
  return { name, durable, autoDelete, arguments: args };
}

export async function deleteQueue(name, { force }) {
  assertNotProtected("queues", name);
  const queue = await management("GET", `/queues/${vhost}/${enc(name)}`).catch((error) => {
    throw error.status === 404 ? new RabbitAdminError(404, `La cola '${name}' no existe`) : error;
  });
  if (!force && (queue.messages ?? 0) > 0) {
    throw new RabbitAdminError(
      409,
      `La cola '${name}' tiene ${queue.messages} mensajes. Usa ?force=true para eliminarla igual`,
    );
  }
  await management("DELETE", `/queues/${vhost}/${enc(name)}`);
}

// ------------------------------------------------------------ Exchanges

export async function listExchanges() {
  const exchanges = await management("GET", `/exchanges/${vhost}?columns=name,type,durable,auto_delete,internal`);
  return exchanges
    // El exchange por defecto ("") y los amq.* son del broker, no se muestran.
    .filter((e) => e.name !== "" && !e.name.startsWith(RESERVED_PREFIX))
    .map((e) => ({
      name: e.name,
      type: e.type,
      durable: e.durable,
      autoDelete: e.auto_delete,
      protected: PROTECTED.exchanges.includes(e.name),
    }));
}

export async function createExchange({ name, type, durable, autoDelete }) {
  if (await exists("exchanges", name)) {
    throw new RabbitAdminError(409, `El exchange '${name}' ya existe`);
  }
  await management("PUT", `/exchanges/${vhost}/${enc(name)}`, {
    type,
    durable,
    auto_delete: autoDelete,
    internal: false,
    arguments: {},
  });
  return { name, type, durable, autoDelete };
}

export async function deleteExchange(name) {
  assertNotProtected("exchanges", name);
  if (!(await exists("exchanges", name))) {
    throw new RabbitAdminError(404, `El exchange '${name}' no existe`);
  }
  await management("DELETE", `/exchanges/${vhost}/${enc(name)}`);
}

// ------------------------------------------------------------- Bindings

const destinationSegment = { queue: "q", exchange: "e" };
const destinationKind = { queue: "queues", exchange: "exchanges" };

export async function listBindings() {
  const bindings = await management("GET", `/bindings/${vhost}`);
  return bindings
    .filter((b) => b.source !== "") // bindings implícitos del default exchange
    .map((b) => ({
      source: b.source,
      destination: b.destination,
      destinationType: b.destination_type,
      routingKey: b.routing_key,
      arguments: b.arguments ?? {},
      protected:
        PROTECTED.exchanges.includes(b.source) &&
        (PROTECTED.queues.includes(b.destination) || PROTECTED.exchanges.includes(b.destination)),
    }));
}

export async function createBinding({ source, destination, destinationType, routingKey }) {
  if (!(await exists("exchanges", source))) {
    throw new RabbitAdminError(404, `El exchange origen '${source}' no existe`);
  }
  if (!(await exists(destinationKind[destinationType], destination))) {
    throw new RabbitAdminError(404, `El destino '${destination}' (${destinationType}) no existe`);
  }
  const current = await findBindings({ source, destination, destinationType, routingKey });
  if (current.length > 0) {
    throw new RabbitAdminError(409, "Ese binding ya existe");
  }

  await management(
    "POST",
    `/bindings/${vhost}/e/${enc(source)}/${destinationSegment[destinationType]}/${enc(destination)}`,
    { routing_key: routingKey, arguments: {} },
  );
  return { source, destination, destinationType, routingKey };
}

async function findBindings({ source, destination, destinationType, routingKey }) {
  const bindings = await management(
    "GET",
    `/bindings/${vhost}/e/${enc(source)}/${destinationSegment[destinationType]}/${enc(destination)}`,
  );
  return bindings.filter((b) => b.routing_key === routingKey);
}

export async function deleteBinding({ source, destination, destinationType, routingKey }) {
  const isCore =
    PROTECTED.exchanges.includes(source) &&
    (PROTECTED.queues.includes(destination) || PROTECTED.exchanges.includes(destination));
  if (isCore) {
    throw new RabbitAdminError(409, "Ese binding es parte de la topología base de Pedidos360 y no se puede eliminar");
  }

  const [binding] = await findBindings({ source, destination, destinationType, routingKey });
  if (!binding) {
    throw new RabbitAdminError(404, "El binding no existe");
  }
  await management(
    "DELETE",
    `/bindings/${vhost}/e/${enc(source)}/${destinationSegment[destinationType]}/${enc(destination)}/${enc(binding.properties_key)}`,
  );
}

export async function health() {
  const overview = await management("GET", "/overview");
  return { rabbitmqVersion: overview.rabbitmq_version, cluster: overview.cluster_name };
}
