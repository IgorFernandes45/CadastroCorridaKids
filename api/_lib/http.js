// Utilidades HTTP compartilhadas pelas funções da API
const crypto = require('crypto');
const config = require('./config');

function enviar(res, status, dados, cache = 'no-store') {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.end(JSON.stringify(dados));
}

function erroPublico(status, mensagem) {
  return Object.assign(new Error(mensagem), { status, publico: mensagem });
}

async function lerBody(req) {
  // Na Vercel, req.body já vem interpretado (e lança erro se o JSON for inválido)
  let body;
  try { body = req.body; } catch (e) { return {}; }
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (body && typeof body === 'object') return body;
  if (typeof body === 'string') {
    try { return JSON.parse(body || '{}'); } catch (e) { return {}; }
  }
  return new Promise((resolve) => {
    let texto = '';
    req.on('data', (parte) => {
      texto += parte;
      if (texto.length > 20000) { texto = ''; req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(texto || '{}')); } catch (e) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function query(req) {
  if (req.query) return req.query;
  return Object.fromEntries(new URL(req.url, 'http://local').searchParams);
}

/* ---------- Token do painel admin (assinado, válido por 12h) ---------- */
const assinar = (texto) => crypto.createHmac('sha256', config.segredo).update(texto).digest('base64url');

function gerarToken() {
  const expira = Date.now() + 12 * 3600 * 1000;
  return `${expira}.${assinar(`admin.${expira}`)}`;
}

function tokenValido(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const [expira, assinatura] = token.split('.');
  if (!expira || !assinatura || Number(expira) < Date.now()) return false;
  const esperado = Buffer.from(assinar(`admin.${expira}`));
  const recebido = Buffer.from(assinatura);
  return recebido.length === esperado.length && crypto.timingSafeEqual(recebido, esperado);
}

function igualSeguro(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Envolve a função: confere o método e transforma exceções em JSON
function rota(metodos, fn) {
  return async (req, res) => {
    if (!metodos.includes(req.method)) {
      res.setHeader('Allow', metodos.join(', '));
      return enviar(res, 405, { erro: 'Método não permitido.' });
    }
    try {
      await fn(req, res);
    } catch (e) {
      if (!e.publico) console.error(e);
      enviar(res, e.status || 500, { erro: e.publico || 'Erro no servidor. Tente novamente em instantes.' });
    }
  };
}

// Remove campos internos antes de responder
function publico(item) {
  if (!item) return null;
  const { chave, ...resto } = item;
  return resto;
}

module.exports = { enviar, erroPublico, lerBody, query, gerarToken, tokenValido, igualSeguro, rota, publico };
