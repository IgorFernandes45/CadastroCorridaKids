// POST /api/admin { acao, ... } — painel do organizador
//   login   { usuario, senha }  -> { token }
//   listar                      -> { inscricoes }
//   status  { id, status }      -> confirma ou volta para pendente
//   excluir { id }
//   zerar   { confirmacao: 'ZERAR' } -> apaga todas as inscrições e reinicia a numeração
const config = require('./_lib/config');
const db = require('./_lib/db');
const { categoriaPorId } = require('./_lib/regras');
const { rota, enviar, lerBody, gerarToken, tokenValido, igualSeguro, publico } = require('./_lib/http');

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = rota(['POST'], async (req, res) => {
  const body = await lerBody(req);

  if (body.acao === 'login') {
    const ok = igualSeguro(body.usuario || '', config.admin.usuario) & igualSeguro(body.senha || '', config.admin.senha);
    if (!ok) {
      await esperar(600); // atrasa tentativas de adivinhar a senha
      return enviar(res, 401, { erro: 'Usuário ou senha incorretos.' });
    }
    return enviar(res, 200, { token: gerarToken() });
  }

  if (!tokenValido(req)) return enviar(res, 401, { erro: 'Sessão expirada. Entre novamente.' });

  switch (body.acao) {
    case 'listar': {
      const lista = await db.listar();
      return enviar(res, 200, { inscricoes: lista.map(publico), banco: db.tipo });
    }
    case 'status': {
      const id = String(body.id || '');
      const item = await db.buscar(id);
      if (!item) return enviar(res, 404, { erro: 'Inscrição não encontrada.' });
      if (body.status === 'confirmada') {
        const r = await db.confirmar(id, categoriaPorId(item.categoria).vagas);
        if (!r.ok) return enviar(res, 409, { erro: 'Categoria sem vagas.' });
        return enviar(res, 200, { inscricao: publico(r.item) });
      }
      const r = await db.desconfirmar(id);
      return enviar(res, 200, { inscricao: publico(r.item) });
    }
    case 'excluir': {
      const r = await db.remover(String(body.id || ''));
      if (!r.ok) return enviar(res, 404, { erro: 'Inscrição não encontrada.' });
      return enviar(res, 200, { ok: true });
    }
    case 'zerar': {
      if (body.confirmacao !== 'ZERAR') return enviar(res, 400, { erro: 'Confirmação inválida.' });
      await db.zerar();
      return enviar(res, 200, { ok: true });
    }
    default:
      return enviar(res, 400, { erro: 'Ação inválida.' });
  }
});
