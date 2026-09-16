// Banco em arquivo texto: data/inscricoes.txt, uma inscrição (JSON) por linha.
// Usado ao rodar o site no computador (npm start). Operações em fila para não gravar ao mesmo tempo.
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const PASTA = process.env.DB_PASTA || path.join(__dirname, '..', '..', 'data');
const ARQUIVO = path.join(PASTA, 'inscricoes.txt');
const SEQUENCIA = path.join(PASTA, 'sequencia.txt');

let fila = Promise.resolve();
function exclusivo(fn) {
  const resultado = fila.then(fn, fn);
  fila = resultado.catch(() => {});
  return resultado;
}

async function lerTudo() {
  try {
    const texto = await fs.readFile(ARQUIVO, 'utf8');
    return texto.split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

async function gravarTudo(lista) {
  await fs.mkdir(PASTA, { recursive: true });
  const temp = `${ARQUIVO}.${process.pid}.tmp`;
  await fs.writeFile(temp, lista.map((i) => JSON.stringify(i)).join('\n') + (lista.length ? '\n' : ''), 'utf8');
  await fs.rename(temp, ARQUIVO);
}

async function proximoNumero() {
  let atual = 0;
  try { atual = Number(await fs.readFile(SEQUENCIA, 'utf8')) || 0; } catch (e) { /* começa do zero */ }
  const numero = atual + 1;
  await fs.mkdir(PASTA, { recursive: true });
  await fs.writeFile(SEQUENCIA, String(numero), 'utf8');
  return numero;
}

const contarConfirmadas = (lista, categoria) =>
  lista.filter((i) => i.categoria === categoria && i.status === 'confirmada').length;

module.exports = {
  tipo: 'txt',

  async confirmadas() {
    const lista = await lerTudo();
    const soma = {};
    for (const i of lista) if (i.status === 'confirmada') soma[i.categoria] = (soma[i.categoria] || 0) + 1;
    return soma;
  },

  listar: () => lerTudo(),

  async buscar(id) {
    return (await lerTudo()).find((i) => i.id === id) || null;
  },

  criar: (dados, chave, limite) => exclusivo(async () => {
    const lista = await lerTudo();
    const existente = lista.find((i) => i.chave === chave);
    if (existente) return { ok: false, motivo: 'duplicada', existente };
    if (contarConfirmadas(lista, dados.categoria) >= limite) return { ok: false, motivo: 'esgotada' };

    const item = {
      id: crypto.randomBytes(9).toString('base64url'),
      numero: await proximoNumero(),
      ...dados,
      chave,
      status: 'pendente',
      criadaEm: new Date().toISOString(),
      confirmadaEm: null,
    };
    lista.push(item);
    await gravarTudo(lista);
    return { ok: true, item };
  }),

  confirmar: (id, limite) => exclusivo(async () => {
    const lista = await lerTudo();
    const item = lista.find((i) => i.id === id);
    if (!item) return { ok: false, motivo: 'inexistente' };
    if (item.status === 'confirmada') return { ok: true, item };
    if (contarConfirmadas(lista, item.categoria) >= limite) return { ok: false, motivo: 'esgotada' };
    item.status = 'confirmada';
    item.confirmadaEm = new Date().toISOString();
    await gravarTudo(lista);
    return { ok: true, item };
  }),

  desconfirmar: (id) => exclusivo(async () => {
    const lista = await lerTudo();
    const item = lista.find((i) => i.id === id);
    if (!item) return { ok: false, motivo: 'inexistente' };
    item.status = 'pendente';
    item.confirmadaEm = null;
    await gravarTudo(lista);
    return { ok: true, item };
  }),

  remover: (id) => exclusivo(async () => {
    const lista = await lerTudo();
    const restante = lista.filter((i) => i.id !== id);
    if (restante.length === lista.length) return { ok: false, motivo: 'inexistente' };
    await gravarTudo(restante);
    return { ok: true };
  }),
};
