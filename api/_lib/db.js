// Escolhe o banco: Redis quando configurado (Vercel), senão o arquivo data/inscricoes.txt
const temRedis = !!((process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
  (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN));

function semBanco() {
  // Na Vercel o disco é somente leitura: sem Redis não há onde gravar
  const falhar = async () => {
    throw Object.assign(new Error('Banco não configurado'), {
      status: 503,
      publico: 'Inscrições temporariamente indisponíveis. Tente novamente mais tarde.',
    });
  };
  return { tipo: 'nenhum', confirmadas: falhar, listar: falhar, buscar: falhar, criar: falhar, confirmar: falhar, desconfirmar: falhar, remover: falhar };
}

if (temRedis) module.exports = require('./db-redis');
else if (process.env.VERCEL) {
  console.error('Configure o Upstash Redis (KV_REST_API_URL / KV_REST_API_TOKEN) no projeto da Vercel.');
  module.exports = semBanco();
} else module.exports = require('./db-txt');
