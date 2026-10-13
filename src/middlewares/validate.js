// Valida body/params/query con un schema de zod. Si falla responde 400 con
// un mensaje claro por campo; si pasa, reemplaza el dato por la versión
// validada (con defaults aplicados) en req.validated.
export function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        campo: issue.path.join(".") || source,
        mensaje: issue.message,
      }));
      return res.status(400).json({
        message: `Datos inválidos: ${errors.map((e) => `${e.campo}: ${e.mensaje}`).join("; ")}`,
        errors,
      });
    }
    req.validated = { ...req.validated, [source]: result.data };
    next();
  };
}
