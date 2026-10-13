import * as RabbitAdminService from "../services/rabbitAdminService.js";

// Los controllers solo traducen HTTP <-> servicio: los datos ya llegan
// validados (req.validated) y no conocen detalles internos de RabbitMQ.

export async function listarColas(req, res) {
  res.json(await RabbitAdminService.listQueues());
}

export async function crearCola(req, res) {
  res.status(201).json(await RabbitAdminService.createQueue(req.validated.body));
}

export async function eliminarCola(req, res) {
  await RabbitAdminService.deleteQueue(req.validated.params.name, req.validated.query);
  res.status(204).send();
}

export async function listarExchanges(req, res) {
  res.json(await RabbitAdminService.listExchanges());
}

export async function crearExchange(req, res) {
  res.status(201).json(await RabbitAdminService.createExchange(req.validated.body));
}

export async function eliminarExchange(req, res) {
  await RabbitAdminService.deleteExchange(req.validated.params.name);
  res.status(204).send();
}

export async function listarBindings(req, res) {
  res.json(await RabbitAdminService.listBindings());
}

export async function crearBinding(req, res) {
  res.status(201).json(await RabbitAdminService.createBinding(req.validated.body));
}

export async function eliminarBinding(req, res) {
  await RabbitAdminService.deleteBinding(req.validated.query);
  res.status(204).send();
}
