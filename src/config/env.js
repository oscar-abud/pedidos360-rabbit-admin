import "dotenv/config";

function required(value, key) {
  if (!value || value.trim() === "") {
    console.warn(`[config] Falta ${key} en .env`);
    return "";
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT) || 4200,

  azureTenantId: required(process.env.AZURE_TENANT_ID, "AZURE_TENANT_ID"),
  azureAudience: required(process.env.AZURE_AUDIENCE, "AZURE_AUDIENCE"),

  corsOrigins: (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  rabbitManagementUrl: required(process.env.RABBITMQ_MANAGEMENT_URL, "RABBITMQ_MANAGEMENT_URL").replace(/\/+$/, ""),
  rabbitManagementUser: required(process.env.RABBITMQ_MANAGEMENT_USER, "RABBITMQ_MANAGEMENT_USER"),
  rabbitManagementPassword: required(process.env.RABBITMQ_MANAGEMENT_PASSWORD, "RABBITMQ_MANAGEMENT_PASSWORD"),
  rabbitVhost: process.env.RABBITMQ_VHOST || "/",
};
