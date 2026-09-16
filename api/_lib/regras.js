// Validações do cadastro (as mesmas do navegador, repetidas no servidor)
const config = require('./config');

const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

const RE_NOME = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;
const letras = (p) => p.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '').length;
const soDigitos = (s) => String(s || '').replace(/\D/g, '');
const normalizarNome = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function capitalizarNome(nome) {
  const minusculas = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
  return nome
    .toLowerCase()
    .split(' ')
    .map((p, i) => (i > 0 && minusculas.has(p))
      ? p
      : p.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('-'))
    .join(' ');
}

function validarNome(valor, rotulo) {
  const v = normalizarNome(valor);
  if (!v) return `Informe o nome ${rotulo}.`;
  if (v.length > 80) return 'Nome muito longo.';
  if (!RE_NOME.test(v)) return 'Use apenas letras, sem números ou símbolos.';
  const partes = v.split(' ');
  if (partes.length < 2) return 'Informe nome e sobrenome.';
  if (partes.some((p) => letras(p) < 1 || /^['-]|['-]$/.test(p)) || letras(partes[0]) < 2) return 'Nome inválido.';
  if (letras(partes[partes.length - 1]) < 2) return 'Informe o sobrenome completo.';
  if (v.length < 5) return 'Nome muito curto.';
  if (/(\S)\1\1/i.test(v)) return 'Confira o nome digitado.';
  return '';
}

function validarTelefone(valor) {
  const d = soDigitos(valor);
  if (!d) return 'Informe um telefone para contato.';
  if (d.length !== 11) return 'O celular deve ter DDD + 9 dígitos.';
  if (!DDDS.has(Number(d.slice(0, 2)))) return 'DDD inválido.';
  if (d[2] !== '9') return 'O número de celular deve começar com 9.';
  if (/^(\d)\1+$/.test(d.slice(2))) return 'Número de telefone inválido.';
  return '';
}

function idadeNaCorrida(nascIso) {
  const [a, m, d] = nascIso.split('-').map(Number);
  const [ea, em, ed] = config.dataCorrida.split('-').map(Number);
  let idade = ea - a;
  if (em < m || (em === m && ed < d)) idade--;
  return idade;
}

function validarNascimento(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return 'Informe a data de nascimento.';
  const data = new Date(valor + 'T12:00:00Z');
  if (isNaN(data) || data.toISOString().slice(0, 10) !== valor) return 'Data inválida.';
  if (data > new Date()) return 'A data de nascimento não pode estar no futuro.';
  const idade = idadeNaCorrida(valor);
  if (idade < 3) return `A criança terá ${Math.max(idade, 0)} ano(s) no dia da corrida. A idade mínima é 3 anos.`;
  if (idade > 13) return `A criança terá ${idade} anos no dia da corrida. A idade máxima é 13 anos.`;
  return '';
}

const categoriaDaIdade = (idade) => config.categorias.find((c) => idade >= c.min && idade <= c.max) || null;
const categoriaPorId = (id) => config.categorias.find((c) => c.id === id) || null;

// Valida o corpo recebido e devolve os dados já normalizados
function validarInscricao(body) {
  const b = body || {};
  const erros = {};
  const e1 = validarNome(b.crianca, 'da criança'); if (e1) erros.crianca = e1;
  const e2 = validarNome(b.responsavel, 'do responsável'); if (e2) erros.responsavel = e2;
  const e3 = validarTelefone(b.telefone); if (e3) erros.telefone = e3;
  const e4 = validarNascimento(b.nascimento); if (e4) erros.nascimento = e4;
  if (b.termo !== true) erros.termo = 'Confirme a autorização para continuar.';
  if (Object.keys(erros).length) return { erros };

  const crianca = capitalizarNome(normalizarNome(b.crianca));
  const idade = idadeNaCorrida(b.nascimento);
  return {
    erros,
    dados: {
      crianca,
      responsavel: capitalizarNome(normalizarNome(b.responsavel)),
      telefone: soDigitos(b.telefone),
      nascimento: b.nascimento,
      idade,
      categoria: categoriaDaIdade(idade).id,
    },
    // identifica a mesma criança (nome sem acento + nascimento) para barrar duplicidade
    chave: `${semAcento(crianca)}|${b.nascimento}`,
  };
}

module.exports = { validarInscricao, categoriaPorId };
