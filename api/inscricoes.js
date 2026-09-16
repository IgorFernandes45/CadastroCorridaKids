// GET  /api/inscricoes?id=...  — dados de uma inscrição (tela de pagamento)
// POST /api/inscricoes          — nova inscrição (fica pendente até o envio do comprovante)
const db = require('./_lib/db');
const { validarInscricao, categoriaPorId } = require('./_lib/regras');
const { rota, enviar, lerBody, query, publico } = require('./_lib/http');

module.exports = rota(['GET', 'POST'], async (req, res) => {
  if (req.method === 'GET') {
    const id = String(query(req).id || '');
    const item = id && id.length <= 40 ? await db.buscar(id) : null;
    if (!item) return enviar(res, 404, { erro: 'Inscrição não encontrada.' });
    return enviar(res, 200, { inscricao: publico(item) });
  }

  const { erros, dados, chave } = validarInscricao(await lerBody(req));
  if (Object.keys(erros).length) return enviar(res, 422, { erro: 'Confira os campos destacados.', erros });

  const categoria = categoriaPorId(dados.categoria);
  const r = await db.criar(dados, chave, categoria.vagas);

  if (r.ok) return enviar(res, 201, { inscricao: publico(r.item) });

  if (r.motivo === 'esgotada') {
    return enviar(res, 409, {
      motivo: 'esgotada',
      erro: `As vagas da categoria ${categoria.nome} estão esgotadas.`,
      erros: { nascimento: `As vagas da categoria ${categoria.nome} estão esgotadas.` },
    });
  }

  const ex = r.existente;
  const confirmada = ex.status === 'confirmada';
  return enviar(res, 409, {
    motivo: 'duplicada',
    erro: confirmada ? 'Inscrição já realizada.' : 'Essa criança já tem uma inscrição aguardando pagamento.',
    erros: confirmada ? { crianca: `Já existe uma inscrição confirmada para ${ex.crianca} (#${String(ex.numero).padStart(4, '0')}).` } : {},
    // só devolve o id quando ainda está pendente, para o responsável retomar o pagamento
    inscricao: confirmada ? null : { id: ex.id, status: ex.status },
  });
});
