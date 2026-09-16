// Localiza as credenciais do Redis nas variáveis de ambiente, aceitando qualquer prefixo
// (ex.: KV_REST_API_URL, UPSTASH_REDIS_REST_URL, STORAGE_KV_REST_API_URL...)
function procurar(sufixos) {
  for (const sufixo of sufixos) {
    const nome = Object.keys(process.env).find((k) => k === sufixo || k.endsWith('_' + sufixo));
    if (nome && process.env[nome]) return { nome, valor: process.env[nome] };
  }
  return null;
}

const url = procurar(['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL', 'REDIS_REST_API_URL']);
const token = procurar(['KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN', 'REDIS_REST_API_TOKEN']);

module.exports = {
  redisUrl: url ? url.valor : '',
  redisToken: token ? token.valor : '',
  // só nomes, nunca valores
  variaveisBanco: Object.keys(process.env).filter((k) => /REDIS|KV_|UPSTASH/i.test(k)).sort(),
  variaveisUsadas: [url && url.nome, token && token.nome].filter(Boolean),
};
