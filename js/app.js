/* ==========================================================
   Corrida Kids Nonatão — inscrições (dados salvos no navegador)
   ========================================================== */
(function () {
  'use strict';

  const CONFIG = {
    evento: {
      nome: '2ª Corrida Kids do Nonatão',
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
    admin: { usuario: 'admin', senha: 'nonatao123' },
  };

  const KEY_DADOS = 'ck_inscricoes';
  const KEY_SEQ = 'ck_seq';
  const KEY_ADMIN = 'ck_admin';

  const DDDS = new Set([
    11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,
    41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,63,64,65,66,67,68,69,
    71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99,
  ]);

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* ---------------- Armazenamento ---------------- */
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { toast('Não foi possível salvar neste navegador.', true); return false; }
    },
  };

  const db = {
    all: () => store.get(KEY_DADOS, []),
    save: (lista) => store.set(KEY_DADOS, lista),
    find: (id) => db.all().find((i) => i.id === id),
    update(id, patch) {
      const lista = db.all();
      const idx = lista.findIndex((i) => i.id === id);
      if (idx < 0) return null;
      lista[idx] = { ...lista[idx], ...patch };
      db.save(lista);
      return lista[idx];
    },
    remove(id) { db.save(db.all().filter((i) => i.id !== id)); },
    add(dados) {
      const seq = store.get(KEY_SEQ, 0) + 1;
      const item = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        numero: seq,
        ...dados,
        status: 'pendente',
        criadaEm: new Date().toISOString(),
        confirmadaEm: null,
      };
      const lista = db.all();
      lista.push(item);
      if (!db.save(lista)) return null;
      store.set(KEY_SEQ, seq);
      return item;
    },
  };

  function contagem() {
    const lista = db.all();
    return CONFIG.categorias.map((c) => {
      const confirmadas = lista.filter((i) => i.categoria === c.id && i.status === 'confirmada').length;
      const pendentes = lista.filter((i) => i.categoria === c.id && i.status === 'pendente').length;
      return { ...c, confirmadas, pendentes, restantes: Math.max(0, c.vagas - confirmadas) };
    });
  }
  const categoriaPorId = (id) => CONFIG.categorias.find((c) => c.id === id);

  /* ---------------- Utilidades ---------------- */
  const pad = (n, t = 4) => String(n).padStart(t, '0');
  const codigo = (i) => '#' + pad(i.numero);
  const soDigitos = (s) => String(s || '').replace(/\D/g, '');
  const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

  function capitalizarNome(nome) {
    const minusculas = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
    return nome
      .toLowerCase()
      .split(' ')
      .map((p, i) => (i > 0 && minusculas.has(p)) ? p : p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }
  const normalizarNome = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

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
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
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

  /* ---------------- Validações ---------------- */
  const RE_NOME = /^[A-Za-zÀ-ÖØ-öø-ÿ' ]+$/;

  function validarNome(valor, rotulo) {
    const v = normalizarNome(valor);
    if (!v) return `Informe o nome ${rotulo}.`;
    if (!RE_NOME.test(v)) return 'Use apenas letras, sem números ou símbolos.';
    const partes = v.split(' ');
    if (partes.length < 2) return 'Informe nome e sobrenome.';
    if (partes.some((p) => p.replace(/'/g, '').length < 1) || partes[0].length < 2) return 'Nome inválido.';
    if (v.length < 5) return 'Nome muito curto.';
    if (/(.)\1\1/i.test(v.replace(/\s/g, ''))) return 'Confira o nome digitado.';
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

  function categoriaDaIdade(idade) {
    return CONFIG.categorias.find((c) => idade >= c.min && idade <= c.max) || null;
  }

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
  function vagasHTML(admin = false) {
    const R = 40, C = 2 * Math.PI * R;
    return contagem().map((c) => {
      const pct = c.confirmadas / c.vagas;
      const cor = c.id === 'A' ? 'var(--blue)' : 'var(--red)';
      let badge;
      if (c.restantes === 0) badge = '<span class="badge badge-full">Esgotado</span>';
      else if (c.restantes <= Math.ceil(c.vagas * 0.2)) badge = '<span class="badge badge-warn">Últimas vagas</span>';
      else badge = '<span class="badge badge-ok">Abertas</span>';
      const rodape = admin
        ? `${c.confirmadas}/${c.vagas} confirmadas<br>${c.pendentes} pendente(s)`
        : `de ${c.vagas} vagas`;
      return `
        <div class="vaga">
          <div class="vaga-top"><span class="vaga-cat">${c.nome}</span></div>
          <div class="ring">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle class="track" cx="50" cy="50" r="${R}"/>
              <circle class="bar" cx="50" cy="50" r="${R}" stroke="${cor}"
                stroke-dasharray="${C}" stroke-dashoffset="${C}" data-offset="${C * (1 - pct)}"/>
            </svg>
            <div class="ring-num"><b>${c.restantes}</b><span>restantes</span></div>
          </div>
          <div class="vaga-foot">${rodape}</div>
          <div style="text-align:center">${badge}</div>
        </div>`;
    }).join('');
  }

  function animarAneis(container) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $$('.ring .bar', container).forEach((b) => { b.style.strokeDashoffset = b.dataset.offset; });
    }));
  }

  /* ---------------- Views ---------------- */
  let countdownTimer;

  function renderHome() {
    const el = $('#vagasHome');
    el.innerHTML = vagasHTML();
    animarAneis(el);

    const esgotado = contagem().every((c) => c.restantes === 0);
    const btn = $('#btnInscrever');
    btn.textContent = esgotado ? 'Inscrições esgotadas' : 'Fazer inscrição';
    btn.classList.toggle('disabled', esgotado);

    const pendente = db.all().filter((i) => i.status === 'pendente').pop();
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
  }

  function renderForm() {
    const form = $('#formInscricao');
    form.reset();
    $$('.field', form).forEach((f) => f.classList.remove('invalid', 'valid'));
    $$('.field-error', form).forEach((e) => { e.textContent = ''; });
    $('#categoriaPreview').hidden = true;

    const hoje = new Date();
    $('#fNascimento').max = hoje.toISOString().slice(0, 10);
    $('#fNascimento').min = '2012-10-11';
  }

  function renderPagamento(id) {
    const i = db.find(id);
    if (!i) { location.hash = '#/'; return; }
    if (i.status === 'confirmada') { location.hash = '#/sucesso/' + i.id; return; }

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
    wpp.href = linkWhatsapp(i);
    wpp.onclick = (ev) => {
      const atual = db.find(i.id);
      if (!atual) { ev.preventDefault(); location.hash = '#/'; return; }
      const cat = contagem().find((c) => c.id === atual.categoria);
      if (atual.status !== 'confirmada' && cat.restantes === 0) {
        ev.preventDefault();
        toast(`As vagas de ${cat.nome} acabaram.`, true);
        return;
      }
      // A vaga é contabilizada no momento em que o responsável vai para o WhatsApp
      db.update(atual.id, { status: 'confirmada', confirmadaEm: new Date().toISOString() });
      setTimeout(() => { location.hash = '#/sucesso/' + atual.id; }, 300);
    };

    $('#btnCancelar').onclick = () => {
      if (confirm('Cancelar esta inscrição? Os dados serão apagados.')) {
        db.remove(i.id);
        toast('Inscrição cancelada.');
        location.hash = '#/';
      }
    };
  }

  function renderSucesso(id) {
    const i = db.find(id);
    if (!i) { location.hash = '#/'; return; }
    $('#sucessoTexto').textContent =
      `A vaga de ${i.crianca.split(' ')[0]} está garantida. Não esqueça de anexar o comprovante do Pix na conversa do WhatsApp.`;
    $('#sucessoResumo').innerHTML =
      `<div class="row"><span class="row-label">Inscrição</span><span class="row-value mono">${codigo(i)}</span></div>` + resumoHTML(i);
    $('#btnReabrirWpp').href = linkWhatsapp(i);
  }

  /* ---------------- Admin ---------------- */
  const isAdmin = () => { try { return sessionStorage.getItem(KEY_ADMIN) === '1'; } catch (e) { return false; } };
  let filtro = 'todas';

  function renderAdmin() {
    const lista = db.all();
    const confirmadas = lista.filter((i) => i.status === 'confirmada');
    const pendentes = lista.length - confirmadas.length;

    $('#adminStats').innerHTML = `
      <div class="stat"><b>${confirmadas.length}</b><span>Confirmadas</span></div>
      <div class="stat"><b>${pendentes}</b><span>Pendentes</span></div>
      <div class="stat money"><b>${brl(confirmadas.length * CONFIG.valor)}</b><span>Arrecadação</span></div>`;

    const v = $('#vagasAdmin');
    v.innerHTML = vagasHTML(true);
    animarAneis(v);
    $('#adminUpdated').textContent = 'Atualizado ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' · dados deste aparelho';
    renderLista();
  }

  function renderLista() {
    const busca = semAcento($('#adminBusca').value.trim());
    const buscaDig = soDigitos(busca);
    let lista = db.all().slice().reverse();

    if (filtro === 'pendente') lista = lista.filter((i) => i.status === 'pendente');
    else if (filtro !== 'todas') lista = lista.filter((i) => i.categoria === filtro);

    if (busca) {
      lista = lista.filter((i) =>
        semAcento(i.crianca).includes(busca) ||
        semAcento(i.responsavel).includes(busca) ||
        (buscaDig && (i.telefone.includes(buscaDig) || pad(i.numero).includes(buscaDig))));
    }

    const el = $('#adminLista');
    if (!lista.length) {
      el.innerHTML = `<div class="empty">
        <svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
        <p>Nenhuma inscrição encontrada.</p></div>`;
      return;
    }

    el.innerHTML = lista.map((i) => {
      const cat = categoriaPorId(i.categoria);
      const ok = i.status === 'confirmada';
      const tel = soDigitos(i.telefone);
      return `
        <details class="item" data-id="${i.id}">
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
    }).join('');
  }

  function exportarCSV() {
    const lista = db.all();
    if (!lista.length) { toast('Nenhuma inscrição para exportar.', true); return; }
    const cab = ['Nº', 'Criança', 'Nascimento', 'Idade na corrida', 'Categoria', 'Responsável', 'Telefone', 'Status', 'Cadastro', 'Confirmação'];
    const linhas = lista.map((i) => [
      pad(i.numero), i.crianca, formatarData(i.nascimento), i.idade,
      (categoriaPorId(i.categoria) || {}).nome || '', i.responsavel, formatarTelefone(i.telefone),
      i.status, formatarDataHora(i.criadaEm), i.confirmadaEm ? formatarDataHora(i.confirmadaEm) : '',
    ]);
    const csv = [cab, ...linhas]
      .map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
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
    const cat = contagem().find((c) => c.id === categoriaDaIdade(idade).id);
    prev.hidden = false;
    prev.classList.toggle('full', cat.restantes === 0);
    prev.innerHTML = cat.restantes === 0
      ? `Categoria ${cat.nome} esgotada <span class="badge badge-full">0 vagas</span>`
      : `${idade} anos na corrida · Categoria ${cat.nome} <span class="badge badge-blue">${cat.restantes} vagas</span>`;
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
        const limpo = input.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' ]/g, '').replace(/\s{2,}/g, ' ');
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

    form.addEventListener('submit', (e) => {
      e.preventDefault();
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

      const crianca = capitalizarNome(normalizarNome(form.crianca.value));
      const responsavel = capitalizarNome(normalizarNome(form.responsavel.value));
      const nascimento = form.nascimento.value;
      const telefone = soDigitos(form.telefone.value);
      const idade = idadeNaCorrida(nascimento);
      const cat = contagem().find((c) => c.id === categoriaDaIdade(idade).id);

      if (cat.restantes === 0) {
        setErro('nascimento', `As vagas da categoria ${cat.nome} estão esgotadas.`);
        toast('Categoria esgotada.', true);
        return;
      }

      const duplicada = db.all().find((i) =>
        semAcento(i.crianca) === semAcento(crianca) && i.nascimento === nascimento);
      if (duplicada) {
        if (duplicada.status === 'pendente') {
          toast('Essa criança já tem uma inscrição pendente.');
          location.hash = '#/pagamento/' + duplicada.id;
        } else {
          setErro('crianca', `${crianca} já está inscrita (${codigo(duplicada)}).`);
          toast('Criança já inscrita.', true);
        }
        return;
      }

      const item = db.add({ crianca, responsavel, telefone, nascimento, idade, categoria: cat.id });
      if (item) location.hash = '#/pagamento/' + item.id;
    });
  }

  function ligarAdmin() {
    $('#formLogin').addEventListener('submit', (e) => {
      e.preventDefault();
      const u = $('#lUser').value.trim();
      const s = $('#lPass').value;
      if (u === CONFIG.admin.usuario && s === CONFIG.admin.senha) {
        try { sessionStorage.setItem(KEY_ADMIN, '1'); } catch (_) { /* ignora */ }
        $('#loginError').textContent = '';
        $('#lPass').value = '';
        render();
      } else {
        $('#loginError').textContent = 'Usuário ou senha incorretos.';
        if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
      }
    });

    $('#btnSair').addEventListener('click', () => {
      try { sessionStorage.removeItem(KEY_ADMIN); } catch (_) { /* ignora */ }
      location.hash = '#/';
    });

    $('#adminBusca').addEventListener('input', renderLista);

    $('#adminFiltro').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      filtro = b.dataset.f;
      $$('#adminFiltro button').forEach((x) => x.classList.toggle('active', x === b));
      renderLista();
    });

    $('#adminLista').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      const id = b.closest('.item').dataset.id;
      const i = db.find(id);
      if (!i) return;
      if (b.dataset.act === 'excluir') {
        if (confirm(`Excluir a inscrição de ${i.crianca}?`)) {
          db.remove(id);
          toast('Inscrição excluída.');
          renderAdmin();
        }
      } else if (b.dataset.act === 'status') {
        if (i.status === 'confirmada') {
          db.update(id, { status: 'pendente', confirmadaEm: null });
          toast('Marcada como pendente.');
        } else {
          const cat = contagem().find((c) => c.id === i.categoria);
          if (cat.restantes === 0) { toast('Categoria sem vagas.', true); return; }
          db.update(id, { status: 'confirmada', confirmadaEm: new Date().toISOString() });
          toast('Vaga confirmada.');
        }
        renderAdmin();
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
    $('#topbarTitle').textContent = TITULOS[view];
    $('#btnBack').hidden = view === 'home';
    window.scrollTo(0, 0);
    atualizarTopbar();
  }

  function render() {
    const [, rota = '', param] = location.hash.split('/');
    clearInterval(countdownTimer);

    switch (rota) {
      case 'inscricao':
        if (contagem().every((c) => c.restantes === 0)) { toast('Inscrições esgotadas.', true); location.hash = '#/'; return; }
        renderForm(); mostrar('inscricao'); break;
      case 'pagamento':
        mostrar('pagamento'); renderPagamento(param); break;
      case 'sucesso':
        mostrar('sucesso'); renderSucesso(param); break;
      case 'admin':
        if (isAdmin()) { mostrar('admin'); renderAdmin(); }
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
  window.addEventListener('scroll', atualizarTopbar, { passive: true });
  window.addEventListener('hashchange', render);
  window.addEventListener('storage', (e) => { if (e.key === KEY_DADOS) render(); });

  ligarFormulario();
  ligarAdmin();
  render();
})();
