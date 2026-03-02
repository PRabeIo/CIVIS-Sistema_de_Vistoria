function onlyNumericId(req, res, next) {
  const n = Number(req.params.idvistoria);
  if (Number.isNaN(n)) return res.status(404).json({ error: "Rota inválida." });
  next();
}

module.exports = { onlyNumericId };