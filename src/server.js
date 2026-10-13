import app from "./app.js";
import { env } from "./config/env.js";

app.listen(env.port, () => {
  console.log(`Pedidos360 Rabbit Admin escuchando en http://localhost:${env.port}`);
});
