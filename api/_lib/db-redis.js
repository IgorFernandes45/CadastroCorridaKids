// Banco Redis (Upstash) usado na Vercel, acessado pela API REST — sem dependências.
// Estrutura:
//   ck:insc            hash   id -> inscrição (JSON)
//   ck:conf:<cat>      set    ids confirmados da categoria (controle de vagas)
//   ck:dup             hash   chave da criança -> id (evita duplicidade)
//   ck:seq             número sequencial das inscrições
const crypto = require('crypto');

const ambiente = require('./ambiente');

const URL_BASE = ambiente.redisUrl.replace(/\/$/, '');
const TOKEN = ambiente.redisToken;
const P = process.env.DB_PREFIXO || 'ck:';

const K = {
  insc: `${P}insc`,
  seq: `${P}seq`,
  conf: (cat) => `${P}conf:${cat}`,
  dup: `${P}dup`,
};

async function chamar(caminho, corpo) {
  const r = await fetch(URL_BASE + caminho, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok && !Array.isArray(json)) throw new Error(`Redis HTTP ${r.status}: ${json.error || ''}`);
  return json;
}

async function cmd(...args) {
  const json = await chamar('', args);
  if (json.error) throw new Error(`Redis: ${json.error}`);
  return json.result;
}

async function pipeline(comandos) {
  const json = await chamar('/pipeline', comandos);
  return json.map((x) => {
    if (x.error) throw new Error(`Redis: ${x.error}`);
    return x.result;
  });
}

// Confirma a vaga de forma atômica: só adiciona se ainda houver vaga
const LUA_CONFIRMAR = `
if redis.call('SISMEMBER', KEYS[1], ARGV[1]) == 1 then return 1 end
if redis.call('SCARD', KEYS[1]) >= tonumber(ARGV[2]) then return 0 end
redis.call('SADD', KEYS[1], ARGV[1])
return 1`;

const parse = (json) => (json ? JSON.parse(json) : null);

async function buscar(id) {
  return parse(await cmd('HGET', K.insc, id));
}

module.exports = {
  tipo: 'redis',

  async confirmadas() {
    const [a, b] = await pipeline([['SCARD', K.conf('A')], ['SCARD', K.conf('B')]]);
    return { A: a, B: b };
  },

  async listar() {
    const valores = await cmd('HVALS', K.insc);
    return (valores || []).map(parse).sort((x, y) => x.numero - y.numero);
  },

  buscar,

  async criar(dados, chave, limite) {
    if ((await cmd('SCARD', K.conf(dados.categoria))) >= limite) return { ok: false, motivo: 'esgotada' };

    const id = crypto.randomBytes(9).toString('base64url');
    const reservou = await cmd('HSETNX', K.dup, chave, id);
    if (Number(reservou) !== 1) {
      const idExistente = await cmd('HGET', K.dup, chave);
      const existente = idExistente && await buscar(idExistente);
      if (existente) return { ok: false, motivo: 'duplicada', existente };
      await cmd('HSET', K.dup, chave, id); // chave órfã: reaproveita
    }

    const item = {
      id,
      numero: await cmd('INCR', K.seq),
      ...dados,
      chave,
      status: 'pendente',
      criadaEm: new Date().toISOString(),
      confirmadaEm: null,
    };
    await cmd('HSET', K.insc, id, JSON.stringify(item));
    return { ok: true, item };
  },

  async confirmar(id, limite) {
    const item = await buscar(id);
    if (!item) return { ok: false, motivo: 'inexistente' };
    const entrou = await cmd('EVAL', LUA_CONFIRMAR, '1', K.conf(item.categoria), id, String(limite));
    if (Number(entrou) !== 1) return { ok: false, motivo: 'esgotada' };
    if (item.status !== 'confirmada') {
      item.status = 'confirmada';
      item.confirmadaEm = new Date().toISOString();
      await cmd('HSET', K.insc, id, JSON.stringify(item));
    }
    return { ok: true, item };
  },

  async desconfirmar(id) {
    const item = await buscar(id);
    if (!item) return { ok: false, motivo: 'inexistente' };
    item.status = 'pendente';
    item.confirmadaEm = null;
    await pipeline([
      ['SREM', K.conf(item.categoria), id],
      ['HSET', K.insc, id, JSON.stringify(item)],
    ]);
    return { ok: true, item };
  },

  async remover(id) {
    const item = await buscar(id);
    if (!item) return { ok: false, motivo: 'inexistente' };
    await pipeline([
      ['HDEL', K.insc, id],
      ['SREM', K.conf(item.categoria), id],
      ['HDEL', K.dup, item.chave],
    ]);
    return { ok: true };
  },

  async zerar() {
    await cmd('DEL', K.insc, K.seq, K.dup, K.conf('A'), K.conf('B'));
    return { ok: true };
  },
};
