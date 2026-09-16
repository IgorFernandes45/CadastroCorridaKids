// GET /api/status — diagnóstico da conexão com o banco (mostra apenas nomes de variáveis, nunca valores)
const ambiente = require('./_lib/ambiente');
const db = require('./_lib/db');
const { rota, enviar } = require('./_lib/http');

module.exports = rota(['GET'], async (req, res) => {
  let conectado = false;
  let erro = null;
  try {
    await db.confirmadas();
    conectado = true;
  } catch (e) {
    erro = e.publico || String(e.message || e).replace(/https?:\/\/\S+/g, '[url]').slice(0, 160);
  }
  enviar(res, conectado ? 200 : 503, {
    banco: db.tipo,
    conectado,
    erro,
    variaveisUsadas: ambiente.variaveisUsadas,
    variaveisEncontradas: ambiente.variaveisBanco,
  });
});
