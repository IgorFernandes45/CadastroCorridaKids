// POST /api/cancelar { id } — o responsável desiste de uma inscrição ainda pendente
const db = require('./_lib/db');
const { rota, enviar, lerBody } = require('./_lib/http');

module.exports = rota(['POST'], async (req, res) => {
  const { id } = await lerBody(req);
  if (typeof id !== 'string' || !id || id.length > 40) return enviar(res, 400, { erro: 'Inscrição inválida.' });

  const item = await db.buscar(id);
  if (!item) return enviar(res, 404, { erro: 'Inscrição não encontrada.' });
  if (item.status === 'confirmada') {
    return enviar(res, 409, { erro: 'Essa inscrição já foi confirmada. Fale com a organização para cancelar.' });
  }
  await db.remover(id);
  enviar(res, 200, { ok: true });
});
