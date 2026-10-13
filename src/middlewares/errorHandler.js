export function notFound(req, res) {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars -- Express reconoce el middleware de error por su firma de 4 argumentos
export function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(err.status ?? 500).json({
    message: err.message ?? "Error interno del servidor",
  });
}
