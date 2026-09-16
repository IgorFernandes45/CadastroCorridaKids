// GET /api/vagas — vagas restantes por categoria
const config = require('./_lib/config');
const db = require('./_lib/db');
const { rota, enviar } = require('./_lib/http');

module.exports = rota(['GET'], async (req, res) => {
  const confirmadas = await db.confirmadas();
  const categorias = config.categorias.map((c) => {
    const n = Number(confirmadas[c.id] || 0);
    return { id: c.id, nome: c.nome, vagas: c.vagas, confirmadas: n, restantes: Math.max(0, c.vagas - n) };
  });
  // cache curto na borda da Vercel para aguentar muitos acessos simultâneos
  enviar(res, 200, { categorias }, 'public, s-maxage=1, stale-while-revalidate=2');
});
