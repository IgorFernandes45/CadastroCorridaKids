// Servidor local: serve o site e a API usando o banco em data/inscricoes.txt
//   npm start   ->  http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = __dirname;
const PORTA = Number(process.env.PORT) || 3000;

const rotas = {
  '/api/vagas': require('./api/vagas'),
  '/api/inscricoes': require('./api/inscricoes'),
  '/api/confirmar': require('./api/confirmar'),
  '/api/cancelar': require('./api/cancelar'),
  '/api/admin': require('./api/admin'),
  '/api/status': require('./api/status'),
};

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

// Pastas que nunca devem ser servidas como arquivo
const BLOQUEADO = /^[\\/](api|data|node_modules|\.git|\.claude)([\\/]|$)|^[\\/](server\.js|package\.json)$/i;

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORTA}`);
  const api = rotas[url.pathname.replace(/\/+$/, '')];
  if (api) {
    req.query = Object.fromEntries(url.searchParams);
    return api(req, res);
  }

  let relativo;
  try { relativo = path.normalize(decodeURIComponent(url.pathname)); } catch (e) { relativo = '/'; }
  if (BLOQUEADO.test(relativo)) { res.writeHead(404); return res.end('Não encontrado'); }

  let arquivo = path.join(RAIZ, relativo);
  if (!arquivo.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(arquivo) && fs.statSync(arquivo).isDirectory()) arquivo = path.join(arquivo, 'index.html');

  fs.readFile(arquivo, (erro, conteudo) => {
    if (erro) { res.writeHead(404); return res.end('Não encontrado'); }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(arquivo).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(conteudo);
  });
}).listen(PORTA, () => {
  console.log(`Corrida Kids rodando em http://localhost:${PORTA}`);
  console.log(`Banco: ${require('./api/_lib/db').tipo === 'txt' ? path.join(RAIZ, 'data', 'inscricoes.txt') : 'Redis'}`);
});
