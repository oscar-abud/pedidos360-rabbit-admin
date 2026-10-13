import app from "./app.js";
import { env } from "./config/env.js";
import * as RabbitAdminService from "./services/rabbitAdminService.js";

app.listen(env.port, () => {
  console.log(`Pedidos360 Rabbit Admin escuchando en http://localhost:${env.port}`);

  // Verificación al arrancar: deja en el log si la API de Management responde
  // con las credenciales configuradas (útil para diagnosticar en Render).
  RabbitAdminService.health()
    .then((info) => console.log(`[RABBITMQ] Management OK: RabbitMQ ${info.rabbitmqVersion} (${env.rabbitManagementUrl}, vhost ${env.rabbitVhost})`))
    .catch((error) => console.error(`[RABBITMQ] Management NO responde (${env.rabbitManagementUrl}, vhost ${env.rabbitVhost}): ${error.message}`));
});
