/* ==========================================================
   Corrida Kids Nonatão — inscrições (dados gravados no servidor)
   ========================================================== */
(function () {
  'use strict';

  const CONFIG = {
    evento: {
      data: '2026-10-10',
      inicio: '2026-10-10T17:00:00-03:00',
      dataTexto: '10/10/2026 às 17h',
      local: 'Loja Nonatão 2 – Uiraúna-PB',
    },
    valor: 15,
    categorias: [
      { id: 'A', nome: '3 a 5 anos', min: 3, max: 5, vagas: 50 },
      { id: 'B', nome: '6 a 13 anos', min: 6, max: 13, vagas: 100 },
    ],
    pix: { chave: '07519004430', nome: 'Angela Ferreira', cidade: 'Uirauna' },
    whatsapp: '5583996724918',
  };

  const KEY_MINHAS = 'ck_minhas';   // inscrições feitas neste aparelho (só para retomar o pagamento)
  const KEY_TOKEN = 'ck_token';     // sessão do painel admin

  const DDDS = new Set([
    11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,
    41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,63,64,65,66,67,68,69,
    71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99,
  ]);

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  // Limpa dados da versão antiga, que guardava tudo no navegador
  try { ['ck_inscricoes', 'ck_seq', 'ck_versao', 'ck_admin'].forEach((k) => { localStorage.removeItem(k); sessionStorage.removeItem(k); }); } catch (e) { /* ignora */ }

  /* ---------------- Armazenamento local (conveniência) ---------------- */
  const local = {
    get(key, fallback, storage = localStorage) {
      try { const v = storage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set(key, value, storage = localStorage) {
      try { storage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignora */ }
    },
    remove(key, storage = localStorage) {
      try { storage.removeItem(key); } catch (e) { /* ignora */ }
    },
  };

  const minhas = {
    all: () => local.get(KEY_MINHAS, []),
    salvar(i) {
      const lista = minhas.all().filter((x) => x.id !== i.id);
      lista.push({ id: i.id, numero: i.numero, crianca: i.crianca, status: i.status });
      local.set(KEY_MINHAS, lista.slice(-20));
    },
    remover(id) { local.set(KEY_MINHAS, minhas.all().filter((x) => x.id !== id)); },
  };

  /* ---------------- API ---------------- */
  class ErroApi extends Error {
    constructor(msg, status, dados) { super(msg); this.status = status; this.dados = dados || {}; }
  }

  async function chamar(caminho, { metodo = 'GET', corpo, token } = {}) {
    const headers = {};
    if (corpo) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = 'Bearer ' + token;
    let r;
    try {
      r = await fetch(caminho, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined, cache: 'no-store' });
    } catch (e) {
      throw new ErroApi('Sem conexão. Verifique sua internet e tente de novo.', 0);
    }
    let dados = {};
    try { dados = await r.json(); } catch (e) { /* resposta vazia */ }
    if (!r.ok) throw new ErroApi(dados.erro || 'Algo deu errado. Tente novamente.', r.status, dados);
    return dados;
  }

  const api = {
    vagas: () => chamar('/api/vagas'),
    buscar: (id) => chamar('/api/inscricoes?id=' + encodeURIComponent(id)),
    criar: (dados) => chamar('/api/inscricoes', { metodo: 'POST', corpo: dados }),
    confirmar: (id) => chamar('/api/confirmar', { metodo: 'POST', corpo: { id } }),
    cancelar: (id) => chamar('/api/cancelar', { metodo: 'POST', corpo: { id } }),
    admin: (acao, extra = {}) => chamar('/api/admin', {
      metodo: 'POST',
      corpo: { acao, ...extra },
      token: local.get(KEY_TOKEN, null, sessionStorage),
    }),
  };

  // Guarda a última contagem de vagas para a prévia da categoria no formulário
  let vagasCache = null;
  async function carregarVagas() {
    const { categorias } = await api.vagas();
    vagasCache = categorias;
    return categorias;
  }
  const vagaDe = (cat) => (vagasCache || []).find((c) => c.id === cat) || null;

  /* ---------------- Utilidades ---------------- */
  const pad = (n, t = 4) => String(n).padStart(t, '0');
  const codigo = (i) => '#' + pad(i.numero);
  const soDigitos = (s) => String(s || '').replace(/\D/g, '');
  const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const categoriaPorId = (id) => CONFIG.categorias.find((c) => c.id === id);
  const rotaAtual = () => location.hash.split('/')[1] || '';

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function formatarTelefone(v) {
    const d = soDigitos(v).slice(0, 11);
    if (d.length <= 2) return d.length ? '(' + d : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  function formatarData(iso) {
    if (!iso) return '';
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
  }
  function formatarDataHora(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // Idade completa na data da corrida
  function idadeNaCorrida(nascIso) {
    const [a, m, d] = nascIso.split('-').map(Number);
    const [ea, em, ed] = CONFIG.evento.data.split('-').map(Number);
    let idade = ea - a;
    if (em < m || (em === m && ed < d)) idade--;
    return idade;
  }

  const normalizarNome = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function iniciais(nome) {
    const p = nome.split(' ').filter(Boolean);
    return ((p[0] || '')[0] + ((p.length > 1 ? p[p.length - 1] : '')[0] || '')).toUpperCase();
  }

  let toastTimer;
  function toast(msg, erro = false) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('error', erro);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), erro ? 3500 : 2400);
  }

  function carregando(botao, ativo, texto) {
    if (!botao) return;
    if (ativo) {
      botao.dataset.textoOriginal = botao.innerHTML;
      botao.classList.add('loading');
      botao.setAttribute('aria-busy', 'true');
      if (texto) botao.innerHTML = `<span class="spinner" aria-hidden="true"></span>${texto}`;
    } else {
      botao.classList.remove('loading');
      botao.removeAttribute('aria-busy');
      if (botao.dataset.textoOriginal) botao.innerHTML = botao.dataset.textoOriginal;
    }
  }

  async function copiar(texto, msg) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;top:0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, texto.length);
      try { document.execCommand('copy'); } catch (_) { /* ignora */ }
      ta.remove();
    }
    if (navigator.vibrate) navigator.vibrate(15);
    toast(msg || 'Copiado!');
  }

  /* ---------------- Validações (repetidas no servidor) ---------------- */
  const RE_NOME = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;
  const RE_NAO_NOME = /[^A-Za-zÀ-ÖØ-öø-ÿ' -]/g;
  const letras = (p) => p.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '').length;

  function validarNome(valor, rotulo) {
    const v = normalizarNome(valor);
    if (!v) return `Informe o nome ${rotulo}.`;
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

  function validarNascimento(valor) {
    if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return 'Informe a data de nascimento.';
    const data = new Date(valor + 'T12:00:00');
    if (isNaN(data)) return 'Data inválida.';
    if (data > new Date()) return 'A data de nascimento não pode estar no futuro.';
    const idade = idadeNaCorrida(valor);
    if (idade < 3) return `A criança terá ${Math.max(idade, 0)} ano(s) no dia da corrida. A idade mínima é 3 anos.`;
    if (idade > 13) return `A criança terá ${idade} anos no dia da corrida. A idade máxima é 13 anos.`;
    return '';
  }

  const categoriaDaIdade = (idade) => CONFIG.categorias.find((c) => idade >= c.min && idade <= c.max) || null;

  /* ---------------- Mensagem WhatsApp ---------------- */
  function linkWhatsapp(i) {
    const cat = categoriaPorId(i.categoria);
    const texto = [
      '*INSCRIÇÃO – 2ª CORRIDA KIDS DO NONATÃO* 🏃',
      '',
      `*Inscrição:* ${codigo(i)}`,
      `*Criança:* ${i.crianca}`,
      `*Nascimento:* ${formatarData(i.nascimento)} (${i.idade} anos na corrida)`,
      `*Categoria:* ${cat ? cat.nome : '-'}`,
      `*Responsável:* ${i.responsavel}`,
      `*Telefone:* ${formatarTelefone(i.telefone)}`,
      `*Valor:* ${brl(CONFIG.valor)} (Pix)`,
      '',
      `📅 ${CONFIG.evento.dataTexto}`,
      `📍 ${CONFIG.evento.local}`,
      '',
      'Segue o comprovante de pagamento 👇',
    ].join('\n');
    return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`;
  }

  function resumoHTML(i) {
    const cat = categoriaPorId(i.categoria);
    return `
      <div class="row"><span class="row-label">Criança</span><span class="row-value">${esc(i.crianca)}</span></div>
      <div class="row"><span class="row-label">Idade na corrida</span><span class="row-value">${i.idade} anos</span></div>
      <div class="row"><span class="row-label">Categoria</span><span class="row-value"><span class="badge badge-blue">${esc(cat ? cat.nome : '-')}</span></span></div>
      <div class="row"><span class="row-label">Responsável</span><span class="row-value">${esc(i.responsavel)}</span></div>
      <div class="row"><span class="row-label">Telefone</span><span class="row-value mono">${esc(formatarTelefone(i.telefone))}</span></div>`;
  }

  /* ---------------- Componentes ---------------- */
  // contagens: [{ id, confirmadas, pendentes? }]
  function vagasHTML(contagens, admin = false) {
    const R = 40, C = 2 * Math.PI * R;
    return CONFIG.categorias.map((base) => {
      const dados = contagens.find((x) => x.id === base.id) || {};
      const confirmadas = dados.confirmadas || 0;
      const restantes = Math.max(0, base.vagas - confirmadas);
      const pct = Math.min(1, confirmadas / base.vagas);
      const cor = base.id === 'A' ? 'var(--blue)' : 'var(--red)';
      let badge;
      if (restantes === 0) badge = '<span class="badge badge-full">Esgotado</span>';
      else if (restantes <= Math.ceil(base.vagas * 0.2)) badge = '<span class="badge badge-warn">Últimas vagas</span>';
      else badge = '<span class="badge badge-ok">Abertas</span>';
      const rodape = admin
        ? `${confirmadas}/${base.vagas} confirmadas<br>${dados.pendentes || 0} pendente(s)`
        : `de ${base.vagas} vagas`;
      return `
        <div class="vaga">
          <div class="vaga-top"><span class="vaga-cat">${base.nome}</span></div>
          <div class="ring">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle class="track" cx="50" cy="50" r="${R}"/>
              <circle class="bar" cx="50" cy="50" r="${R}" stroke="${cor}"
                stroke-dasharray="${C}" stroke-dashoffset="${C}" data-offset="${C * (1 - pct)}"/>
            </svg>
            <div class="ring-num"><b>${restantes}</b><span>restantes</span></div>
          </div>
          <div class="vaga-foot">${rodape}</div>
          <div style="text-align:center">${badge}</div>
        </div>`;
    }).join('');
  }

  const vagasSkeleton = () => CONFIG.categorias.map((c) => `
    <div class="vaga skeleton-card">
      <div class="vaga-top"><span class="vaga-cat">${c.nome}</span></div>
      <div class="ring"><div class="skeleton skeleton-ring"></div></div>
      <div class="skeleton skeleton-line"></div>
    </div>`).join('');

  const erroHTML = (msg, acao = 'tentar-novamente') => `
    <div class="erro-card">
      <p>${esc(msg)}</p>
      <button class="btn btn-sm btn-secondary" type="button" data-acao="${acao}">Tentar novamente</button>
    </div>`;

  function animarAneis(container) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $$('.ring .bar', container).forEach((b) => { b.style.strokeDashoffset = b.dataset.offset; });
    }));
  }

  /* ---------------- Views ---------------- */
  let countdownTimer;
  let adminTimer;
  let renderId = 0; // ignora respostas de telas que já foram trocadas

  async function renderHome() {
    const meu = ++renderId;
    const el = $('#vagasHome');
    const btn = $('#btnInscrever');

    const pendente = minhas.all().filter((i) => i.status === 'pendente').pop();
    const banner = $('#pendingBanner');
    banner.hidden = !pendente;
    if (pendente) {
      $('#pendingText').textContent = `${pendente.crianca} · ${codigo(pendente)} aguardando o comprovante.`;
      $('#btnPending').onclick = () => { location.hash = '#/pagamento/' + pendente.id; };
    }

    const tick = () => {
      const diff = new Date(CONFIG.evento.inicio) - new Date();
      const cd = $('#countdown');
      if (diff <= 0) { cd.innerHTML = ''; return; }
      const d = Math.floor(diff / 864e5);
      const h = Math.floor(diff / 36e5) % 24;
      const m = Math.floor(diff / 6e4) % 60;
      cd.innerHTML = `<div><b>${d}</b><span>dias</span></div><div><b>${pad(h, 2)}</b><span>horas</span></div><div><b>${pad(m, 2)}</b><span>min</span></div>`;
    };
    tick();
    clearInterval(countdownTimer);
    countdownTimer = setInterval(tick, 30000);

    if (!vagasCache) el.innerHTML = vagasSkeleton();
    try {
      const categorias = await carregarVagas();
      if (meu !== renderId) return;
      el.innerHTML = vagasHTML(categorias);
      animarAneis(el);
      const esgotado = categorias.every((c) => c.restantes === 0);
      btn.textContent = esgotado ? 'Inscrições esgotadas' : 'Fazer inscrição';
      btn.classList.toggle('disabled', esgotado);
    } catch (e) {
      if (meu !== renderId) return;
      el.innerHTML = erroHTML('Não foi possível carregar as vagas. ' + e.message);
    }
  }

  function renderForm() {
    const form = $('#formInscricao');
    form.reset();
    $$('.field', form).forEach((f) => f.classList.remove('invalid', 'valid'));
    $$('.field-error', form).forEach((e) => { e.textContent = ''; });
    $('#categoriaPreview').hidden = true;
    $('#fNascimento').max = new Date().toISOString().slice(0, 10);
    $('#fNascimento').min = '2012-10-11';
    carregarVagas().then(atualizarCategoria).catch(() => { /* a prévia apenas não mostra as vagas */ });
  }

  async function obterInscricao(id) {
    try {
      const { inscricao } = await api.buscar(id);
      minhas.salvar(inscricao);
      return inscricao;
    } catch (e) {
      if (e.status === 404) {
        minhas.remover(id);
        toast('Inscrição não encontrada.', true);
      } else {
        toast(e.message, true);
      }
      location.hash = '#/';
      return null;
    }
  }

  async function renderPagamento(id) {
    const meu = ++renderId;
    const secao = $('[data-view="pagamento"]');
    secao.classList.add('is-loading');
    $('#qrCode').innerHTML = '<div class="skeleton" style="width:100%;height:100%"></div>';
    $('#pixCopiaCola').textContent = '';
    $('#payResumo').innerHTML = '';
    $('#payCodigo').textContent = '';

    const i = await obterInscricao(id);
    if (!i || meu !== renderId) return;
    if (i.status === 'confirmada') { location.replace('#/sucesso/' + i.id); return; }
    secao.classList.remove('is-loading');

    $('#payCodigo').textContent = 'Inscrição ' + codigo(i);
    const payload = Pix.gerarPix({
      chave: CONFIG.pix.chave,
      nome: CONFIG.pix.nome,
      cidade: CONFIG.pix.cidade,
      valor: CONFIG.valor,
      txid: 'KIDS' + pad(i.numero),
    });
    $('#pixCopiaCola').textContent = payload;
    $('#btnCopiaCola').onclick = () => copiar(payload, 'Código Pix copiado!');

    const qrEl = $('#qrCode');
    if (typeof window.qrcode === 'function') {
      const qr = window.qrcode(0, 'M');
      qr.addData(payload);
      qr.make();
      qrEl.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    } else {
      qrEl.innerHTML = '<div class="qr-fallback">Sem conexão para gerar o QR Code. Use o Pix Copia e Cola abaixo.</div>';
    }

    $('#payResumo').innerHTML = resumoHTML(i);

    const wpp = $('#btnWhatsapp');
    const link = linkWhatsapp(i);
    wpp.href = link;
    wpp.onclick = async (ev) => {
      ev.preventDefault();
      if (wpp.classList.contains('loading')) return;
      // No computador abre o WhatsApp em outra aba (aberta já no clique para não ser bloqueada)
      const computador = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      const aba = computador ? window.open('', '_blank') : null;
      carregando(wpp, true, 'Garantindo sua vaga...');
      try {
        const { inscricao } = await api.confirmar(i.id);
        minhas.salvar(inscricao);
        history.replaceState(null, '', '#/sucesso/' + i.id);
        if (aba) {
          aba.opener = null;
          aba.location.href = link;
          render();
        } else {
          location.href = link;
          setTimeout(render, 800);
        }
      } catch (e) {
        if (aba) aba.close();
        toast(e.message, true);
        if (e.status === 404) { minhas.remover(i.id); location.hash = '#/'; }
      } finally {
        carregando(wpp, false);
      }
    };

    $('#btnCancelar').onclick = async () => {
      if (!confirm('Cancelar esta inscrição? Os dados serão apagados.')) return;
      const b = $('#btnCancelar');
      carregando(b, true, 'Cancelando...');
      try {
        await api.cancelar(i.id);
        minhas.remover(i.id);
        toast('Inscrição cancelada.');
        location.hash = '#/';
      } catch (e) {
        toast(e.message, true);
      } finally {
        carregando(b, false);
      }
    };
  }

  async function renderSucesso(id) {
    const meu = ++renderId;
    $('#sucessoResumo').innerHTML = '<div class="row"><div class="skeleton skeleton-line"></div></div>';
    $('#sucessoTexto').textContent = '';
    const i = await obterInscricao(id);
    if (!i || meu !== renderId) return;
    if (i.status !== 'confirmada') { location.replace('#/pagamento/' + i.id); return; }
    $('#sucessoTexto').textContent =
      `A vaga de ${i.crianca.split(' ')[0]} está garantida. Não esqueça de anexar o comprovante do Pix na conversa do WhatsApp.`;
    $('#sucessoResumo').innerHTML =
      `<div class="row"><span class="row-label">Inscrição</span><span class="row-value mono">${codigo(i)}</span></div>` + resumoHTML(i);
    $('#btnReabrirWpp').href = linkWhatsapp(i);
  }

  /* ---------------- Admin ---------------- */
  const temSessao = () => !!local.get(KEY_TOKEN, null, sessionStorage);
  const POR_PAGINA = 50;
  let filtro = 'todas';
  let limiteLista = POR_PAGINA;
  let adminDados = [];

  function sairAdmin(msg) {
    local.remove(KEY_TOKEN, sessionStorage);
    clearInterval(adminTimer);
    adminDados = [];
    $('#adminLista').innerHTML = '';
    if (msg) toast(msg, true);
    render();
  }

  async function carregarAdmin(silencioso = false) {
    const btn = $('#btnAtualizar');
    if (!silencioso) carregando(btn, true);
    try {
      const { inscricoes } = await api.admin('listar');
      adminDados = inscricoes;
      if (rotaAtual() === 'admin') desenharAdmin();
    } catch (e) {
      if (e.status === 401) return sairAdmin(e.message);
      if (!silencioso) toast(e.message, true);
      if (!adminDados.length) $('#adminLista').innerHTML = erroHTML(e.message, 'recarregar-admin');
    } finally {
      if (!silencioso) carregando(btn, false);
    }
  }

  function renderAdmin() {
    if (!adminDados.length) {
      $('#adminStats').innerHTML = '<div class="stat"><div class="skeleton skeleton-line"></div></div>'.repeat(3);
      $('#vagasAdmin').innerHTML = vagasSkeleton();
      $('#adminLista').innerHTML = '';
    } else {
      desenharAdmin();
    }
    carregarAdmin();
    clearInterval(adminTimer);
    adminTimer = setInterval(() => {
      if (rotaAtual() === 'admin' && !document.hidden) carregarAdmin(true);
    }, 30000);
  }

  function desenharAdmin() {
    const soma = {};
    let confirmadas = 0;
    for (const i of adminDados) {
      const s = soma[i.categoria] || (soma[i.categoria] = { id: i.categoria, confirmadas: 0, pendentes: 0 });
      if (i.status === 'confirmada') { s.confirmadas++; confirmadas++; } else s.pendentes++;
    }
    const pendentes = adminDados.length - confirmadas;

    $('#adminStats').innerHTML = `
      <div class="stat"><b>${confirmadas}</b><span>Confirmadas</span></div>
      <div class="stat"><b>${pendentes}</b><span>Pendentes</span></div>
      <div class="stat money"><b>${brl(confirmadas * CONFIG.valor)}</b><span>Arrecadação</span></div>`;

    const v = $('#vagasAdmin');
    v.innerHTML = vagasHTML(Object.values(soma), true);
    animarAneis(v);
    $('#adminUpdated').textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    renderLista();
  }

  function filtrarLista() {
    const busca = semAcento($('#adminBusca').value.trim());
    const dig = soDigitos(busca);
    // Só dígitos (ou "#12"): até 4 dígitos procura o nº da inscrição, acima disso o telefone
    const numerica = dig && !/[a-z]/.test(busca);
    const porNumero = numerica && (dig.length <= 4 || busca.startsWith('#'));
    let lista = adminDados.slice().sort((a, b) => b.numero - a.numero);

    if (filtro === 'pendente') lista = lista.filter((i) => i.status === 'pendente');
    else if (filtro !== 'todas') lista = lista.filter((i) => i.categoria === filtro);

    if (!busca) return lista;
    if (porNumero) return lista.filter((i) => i.numero === Number(dig));
    if (numerica) return lista.filter((i) => i.telefone.includes(dig));
    return lista.filter((i) => semAcento(i.crianca).includes(busca) || semAcento(i.responsavel).includes(busca));
  }

  function renderLista() {
    const lista = filtrarLista();
    const el = $('#adminLista');
    const abertos = new Set($$('.item[open]', el).map((d) => d.dataset.id));

    if (!lista.length) {
      el.innerHTML = `<div class="empty">
        <svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
        <p>Nenhuma inscrição encontrada.</p></div>`;
      return;
    }

    const visiveis = lista.slice(0, limiteLista);
    const restam = lista.length - visiveis.length;
    const rodape = `
      <p class="lista-info">Mostrando ${visiveis.length} de ${lista.length}</p>
      ${restam > 0 ? `<button class="btn btn-secondary btn-block lista-mais" type="button" data-act="mais">Mostrar mais ${Math.min(restam, POR_PAGINA)}</button>` : ''}`;

    el.innerHTML = visiveis.map((i) => {
      const cat = categoriaPorId(i.categoria);
      const ok = i.status === 'confirmada';
      const tel = soDigitos(i.telefone);
      return `
        <details class="item" data-id="${esc(i.id)}"${abertos.has(i.id) ? ' open' : ''}>
          <summary>
            <div class="avatar ${i.categoria === 'B' ? 'b' : ''}">${esc(iniciais(i.crianca))}</div>
            <div class="item-main">
              <strong>${esc(i.crianca)}</strong>
              <span>${codigo(i)} · ${esc(cat ? cat.nome : '')} · ${i.idade} anos</span>
            </div>
            <div class="item-side">
              <span class="badge ${ok ? 'badge-ok' : 'badge-warn'}">${ok ? 'Confirmada' : 'Pendente'}</span>
            </div>
          </summary>
          <div class="item-body">
            <div class="row"><span class="row-label">Responsável</span><span class="row-value">${esc(i.responsavel)}</span></div>
            <div class="row"><span class="row-label">Telefone</span><span class="row-value mono">${esc(formatarTelefone(tel))}</span></div>
            <div class="row"><span class="row-label">Nascimento</span><span class="row-value">${formatarData(i.nascimento)}</span></div>
            <div class="row"><span class="row-label">Cadastro</span><span class="row-value">${formatarDataHora(i.criadaEm)}</span></div>
            ${ok ? `<div class="row"><span class="row-label">Confirmada</span><span class="row-value">${formatarDataHora(i.confirmadaEm)}</span></div>` : ''}
            <div class="item-actions">
              <a class="btn btn-green-soft full" href="https://wa.me/55${tel}" target="_blank" rel="noopener">Chamar responsável no WhatsApp</a>
              <button class="btn btn-secondary" type="button" data-act="status">${ok ? 'Marcar pendente' : 'Confirmar vaga'}</button>
              <button class="btn btn-danger-soft" type="button" data-act="excluir">Excluir</button>
            </div>
          </div>
        </details>`;
    }).join('') + rodape;
  }

  function exportarCSV() {
    if (!adminDados.length) { toast('Nenhuma inscrição para exportar.', true); return; }
    const cab = ['Nº', 'Criança', 'Nascimento', 'Idade na corrida', 'Categoria', 'Responsável', 'Telefone', 'Status', 'Cadastro', 'Confirmação'];
    const linhas = adminDados.slice().sort((a, b) => a.numero - b.numero).map((i) => [
      pad(i.numero), i.crianca, formatarData(i.nascimento), i.idade,
      (categoriaPorId(i.categoria) || {}).nome || '', i.responsavel, formatarTelefone(i.telefone),
      i.status, formatarDataHora(i.criadaEm), i.confirmadaEm ? formatarDataHora(i.confirmadaEm) : '',
    ]);
    const csv = [cab, ...linhas]
      .map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `inscricoes-corrida-kids-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------------- Formulário ---------------- */
  function setErro(nome, msg) {
    const err = $(`[data-error="${nome}"]`);
    if (err) err.textContent = msg;
    const input = $(`#formInscricao [name="${nome}"]`);
    if (input) {
      const f = input.closest('.field');
      f.classList.toggle('invalid', !!msg);
      f.classList.toggle('valid', !msg && !!input.value);
    }
    return !msg;
  }

  function atualizarCategoria() {
    const valor = $('#fNascimento').value;
    const prev = $('#categoriaPreview');
    if (validarNascimento(valor)) { prev.hidden = true; return; }
    const idade = idadeNaCorrida(valor);
    const cat = categoriaDaIdade(idade);
    const vaga = vagaDe(cat.id);
    const esgotada = vaga && vaga.restantes === 0;
    prev.hidden = false;
    prev.classList.toggle('full', !!esgotada);
    prev.innerHTML = esgotada
      ? `Categoria ${cat.nome} esgotada <span class="badge badge-full">0 vagas</span>`
      : `${idade} anos na corrida · Categoria ${cat.nome}` +
        (vaga ? ` <span class="badge badge-blue">${vaga.restantes} vagas</span>` : '');
  }

  function validarCampo(nome) {
    const v = $(`#formInscricao [name="${nome}"]`).value;
    switch (nome) {
      case 'crianca': return setErro(nome, validarNome(v, 'da criança'));
      case 'responsavel': return setErro(nome, validarNome(v, 'do responsável'));
      case 'telefone': return setErro(nome, validarTelefone(v));
      case 'nascimento': atualizarCategoria(); return setErro(nome, validarNascimento(v));
    }
    return true;
  }

  function ligarFormulario() {
    const form = $('#formInscricao');
    const tel = $('#fTelefone');

    tel.addEventListener('input', () => {
      tel.value = formatarTelefone(tel.value);
      if (tel.closest('.field').classList.contains('invalid')) validarCampo('telefone');
    });

    ['crianca', 'responsavel'].forEach((n) => {
      const input = $(`[name="${n}"]`, form);
      input.addEventListener('input', () => {
        // bloqueia números e símbolos enquanto digita
        const limpo = input.value.replace(RE_NAO_NOME, '').replace(/\s{2,}/g, ' ');
        if (limpo !== input.value) input.value = limpo;
        if (input.closest('.field').classList.contains('invalid')) validarCampo(n);
      });
    });

    ['crianca', 'responsavel', 'telefone'].forEach((n) => {
      $(`[name="${n}"]`, form).addEventListener('blur', () => {
        if ($(`[name="${n}"]`, form).value) validarCampo(n);
      });
    });
    $('#fNascimento').addEventListener('change', () => validarCampo('nascimento'));
    $('#fTermo').addEventListener('change', (e) => { if (e.target.checked) $('[data-error="termo"]').textContent = ''; });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#btnSubmit');
      if (btn.classList.contains('loading')) return;

      const ok = ['crianca', 'nascimento', 'responsavel', 'telefone'].map(validarCampo).every(Boolean);
      const termo = $('#fTermo').checked;
      $('[data-error="termo"]').textContent = termo ? '' : 'Confirme a autorização para continuar.';

      if (!ok || !termo) {
        const primeiro = $('.field.invalid input', form);
        if (primeiro) primeiro.focus();
        if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
        toast('Confira os campos destacados.', true);
        return;
      }

      carregando(btn, true, 'Enviando...');
      try {
        const { inscricao } = await api.criar({
          crianca: form.crianca.value,
          responsavel: form.responsavel.value,
          nascimento: form.nascimento.value,
          telefone: form.telefone.value,
          termo: true,
        });
        minhas.salvar(inscricao);
        location.hash = '#/pagamento/' + inscricao.id;
      } catch (err) {
        const d = err.dados || {};
        Object.entries(d.erros || {}).forEach(([campo, msg]) => {
          if (campo === 'termo') $('[data-error="termo"]').textContent = msg;
          else setErro(campo, msg);
        });
        if (d.motivo === 'duplicada' && d.inscricao) {
          toast('Essa criança já tem uma inscrição aguardando pagamento.');
          location.hash = '#/pagamento/' + d.inscricao.id;
        } else {
          if (d.motivo === 'esgotada') carregarVagas().then(atualizarCategoria).catch(() => {});
          toast(err.message, true);
        }
      } finally {
        carregando(btn, false);
      }
    });
  }

  function ligarAdmin() {
    $('#formLogin').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#formLogin button[type="submit"]');
      if (btn.classList.contains('loading')) return;
      $('#loginError').textContent = '';
      carregando(btn, true, 'Entrando...');
      try {
        const { token } = await chamar('/api/admin', {
          metodo: 'POST',
          corpo: { acao: 'login', usuario: $('#lUser').value.trim(), senha: $('#lPass').value },
        });
        local.set(KEY_TOKEN, token, sessionStorage);
        $('#lPass').value = '';
        render();
      } catch (err) {
        $('#loginError').textContent = err.message;
        if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
      } finally {
        carregando(btn, false);
      }
    });

    $('#btnSair').addEventListener('click', () => {
      local.remove(KEY_TOKEN, sessionStorage);
      clearInterval(adminTimer);
      adminDados = [];
      location.hash = '#/';
    });

    $('#btnAtualizar').addEventListener('click', () => carregarAdmin());

    $('#btnZerar').addEventListener('click', async () => {
      const resposta = prompt('Isso apaga TODAS as inscrições e reinicia a numeração em #0001. Digite ZERAR para confirmar:');
      if (resposta === null) return;
      if (resposta.trim().toUpperCase() !== 'ZERAR') { toast('Nada foi apagado.', true); return; }
      const b = $('#btnZerar');
      carregando(b, true, 'Apagando...');
      try {
        await api.admin('zerar', { confirmacao: 'ZERAR' });
        adminDados = [];
        vagasCache = null;
        toast('Todas as inscrições foram apagadas.');
        desenharAdmin();
      } catch (err) {
        if (err.status === 401) return sairAdmin(err.message);
        toast(err.message, true);
      } finally {
        carregando(b, false);
      }
    });

    let buscaTimer;
    $('#adminBusca').addEventListener('input', () => {
      clearTimeout(buscaTimer);
      buscaTimer = setTimeout(() => { limiteLista = POR_PAGINA; renderLista(); }, 120);
    });

    $('#adminFiltro').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      filtro = b.dataset.f;
      limiteLista = POR_PAGINA;
      $$('#adminFiltro button').forEach((x) => x.classList.toggle('active', x === b));
      renderLista();
    });

    $('#adminLista').addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-act], button[data-acao]');
      if (!b) return;
      if (b.dataset.acao === 'recarregar-admin') return carregarAdmin();
      if (b.dataset.act === 'mais') {
        limiteLista += POR_PAGINA;
        renderLista();
        return;
      }
      const id = b.closest('.item').dataset.id;
      const i = adminDados.find((x) => x.id === id);
      if (!i || b.classList.contains('loading')) return;

      try {
        if (b.dataset.act === 'excluir') {
          if (!confirm(`Excluir a inscrição de ${i.crianca}?`)) return;
          carregando(b, true, '...');
          await api.admin('excluir', { id });
          adminDados = adminDados.filter((x) => x.id !== id);
          toast('Inscrição excluída.');
        } else if (b.dataset.act === 'status') {
          carregando(b, true, '...');
          const novo = i.status === 'confirmada' ? 'pendente' : 'confirmada';
          const { inscricao } = await api.admin('status', { id, status: novo });
          adminDados = adminDados.map((x) => (x.id === id ? inscricao : x));
          toast(novo === 'confirmada' ? 'Vaga confirmada.' : 'Marcada como pendente.');
        }
        desenharAdmin();
      } catch (err) {
        if (err.status === 401) return sairAdmin(err.message);
        toast(err.message, true);
        carregando(b, false);
      }
    });

    $('#btnExportar').addEventListener('click', exportarCSV);
  }

  /* ---------------- Roteador ---------------- */
  const TITULOS = {
    home: 'Corrida Kids', inscricao: 'Inscrição', pagamento: 'Pagamento',
    sucesso: 'Confirmado', login: 'Organizador', admin: 'Inscrições',
  };

  function mostrar(view) {
    $$('.view').forEach((v) => v.classList.toggle('active', v.dataset.view === view));
    document.body.dataset.view = view;
    $('#topbarTitle').textContent = TITULOS[view];
    $('#btnBack').hidden = view === 'home';
    window.scrollTo(0, 0);
    atualizarTopbar();
  }

  function render() {
    const [, rota = '', param] = location.hash.split('/');
    clearInterval(countdownTimer);
    if (rota !== 'admin') clearInterval(adminTimer);

    switch (rota) {
      case 'inscricao':
        if (vagasCache && vagasCache.every((c) => c.restantes === 0)) {
          toast('Inscrições esgotadas.', true);
          location.hash = '#/';
          return;
        }
        renderId++;
        renderForm(); mostrar('inscricao'); break;
      case 'pagamento':
        mostrar('pagamento'); renderPagamento(param); break;
      case 'sucesso':
        mostrar('sucesso'); renderSucesso(param); break;
      case 'admin':
        renderId++;
        if (temSessao()) { mostrar('admin'); renderAdmin(); }
        else { mostrar('login'); setTimeout(() => $('#lUser').focus(), 50); }
        break;
      default:
        mostrar('home'); renderHome();
    }
  }

  function atualizarTopbar() {
    $('#topbar').classList.toggle('scrolled', window.scrollY > 40);
  }

  $('#btnBack').addEventListener('click', () => { location.hash = '#/'; });
  $('#btnCopiaChave').addEventListener('click', () => copiar(CONFIG.pix.chave, 'Chave Pix copiada!'));
  $('#vagasHome').addEventListener('click', (e) => { if (e.target.closest('[data-acao]')) renderHome(); });
  window.addEventListener('scroll', atualizarTopbar, { passive: true });
  window.addEventListener('hashchange', render);
  // Ao voltar para a aba, atualiza as vagas da tela inicial
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && rotaAtual() === '') renderHome();
  });

  ligarFormulario();
  ligarAdmin();
  render();
})();
