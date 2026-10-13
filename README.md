# pedidos360-rabbit-admin

Microservicio **administrador de RabbitMQ** de Pedidos360 (Express). Expone una API REST
para crear y eliminar colas, exchanges y bindings. Valida el JWT de Entra ID y exige el rol
`Admin`. Usa la API HTTP de RabbitMQ Management.

| Método | Ruta |
|---|---|
| GET / POST | `/rabbit/queues` |
| DELETE | `/rabbit/queues/{name}?force=true` |
| GET / POST | `/rabbit/exchanges` |
| DELETE | `/rabbit/exchanges/{name}` |
| GET / POST | `/rabbit/bindings` |
| DELETE | `/rabbit/bindings?source=&destination=&destinationType=&routingKey=` |

- Lógica: `src/services/rabbitAdminService.js`
- Validación (DTOs con zod): `src/validators/rabbitSchemas.js`
- Reglas (nombres, tipos, recursos protegidos): `src/config/rabbitAdmin.js`

```bash
cp .env.example .env
pnpm install
pnpm dev        # GET http://localhost:4200/health
```
