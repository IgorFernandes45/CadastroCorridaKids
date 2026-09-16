// POST /api/confirmar { id } — conta a vaga quando o responsável vai enviar o comprovante no WhatsApp
const db = require('./_lib/db');
const { categoriaPorId } = require('./_lib/regras');
const { rota, enviar, lerBody, publico } = require('./_lib/http');

module.exports = rota(['POST'], async (req, res) => {
  const { id } = await lerBody(req);
  if (typeof id !== 'string' || !id || id.length > 40) return enviar(res, 400, { erro: 'Inscrição inválida.' });

  const atual = await db.buscar(id);
  if (!atual) return enviar(res, 404, { erro: 'Inscrição não encontrada.' });

  const categoria = categoriaPorId(atual.categoria);
  const r = await db.confirmar(id, categoria.vagas);
  if (r.ok) return enviar(res, 200, { inscricao: publico(r.item) });
  if (r.motivo === 'esgotada') {
    return enviar(res, 409, { motivo: 'esgotada', erro: `As vagas da categoria ${categoria.nome} acabaram.` });
  }
  return enviar(res, 404, { erro: 'Inscrição não encontrada.' });
});
