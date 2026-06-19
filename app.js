// ── Estado ────────────────────────────────────────────────────────
const STORAGE_KEY = 'portfolio_v1';
const HISTORY_KEY = 'portfolio_history_v1';

let ativos = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

let selectedType = 'Ação';
let evoChart = null;
let pieChart = null;
let currentPeriod = '1m';

const COLORS = { 'Ação': '#5b8dee', 'ETF': '#9b7de8', 'Cripto': '#e6a140', 'Cash': '#4caf82' };

// ── Navegação ──────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id)?.classList.add('active');
  document.querySelector(`.nav-item[data-page="${id}"]`)?.classList.add('active');
  if (id === 'dashboard') renderDashboard();
  if (id === 'ativos') renderAtivos();
}

document.addEventListener('click', e => {
  const pg = e.target.closest('[data-page]');
  if (pg) {
    e.preventDefault();
    showPage(pg.dataset.page);
  }
});

// ── Persistência ───────────────────────────────────────────────────
function saveAtivos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ativos));
  // Guardar snapshot do total no histórico diário
  const today = new Date().toISOString().split('T')[0];
  const total = calcTotal();
  history = history.filter(h => h.d !== today);
  history.push({ d: today, v: total });
  if (history.length > 365) history = history.slice(-365);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// ── Cálculos ───────────────────────────────────────────────────────
function valorAtivo(a) {
  if (a.tipo === 'Cash') return parseFloat(a.cashVal) || 0;
  return (parseFloat(a.qty) || 0) * (parseFloat(a.precoAtual) || 0);
}

function custoAtivo(a) {
  if (a.tipo === 'Cash') return parseFloat(a.cashVal) || 0;
  return (parseFloat(a.qty) || 0) * (parseFloat(a.precoMedio) || 0);
}

function calcTotal() {
  return ativos.reduce((s, a) => s + valorAtivo(a), 0);
}

function calcCusto() {
  return ativos.reduce((s, a) => s + custoAtivo(a), 0);
}

function calcCash() {
  return ativos.filter(a => a.tipo === 'Cash').reduce((s, a) => s + valorAtivo(a), 0);
}

// ── Formatação ─────────────────────────────────────────────────────
function fmt(n) {
  return '€' + Number(n).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n) {
  const s = n >= 0 ? '+' : '';
  return s + Number(n).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

// ── Dashboard ──────────────────────────────────────────────────────
function renderDashboard() {
  const total = calcTotal();
  const custo = calcCusto();
  const gl = total - custo;
  const glPct = custo > 0 ? (gl / custo) * 100 : 0;
  const cash = calcCash();
  const cashPct = total > 0 ? (cash / total) * 100 : 0;

  document.getElementById('m-total').textContent = fmt(total);
  document.getElementById('m-total-sub').textContent = ativos.length + ' posições activas';
  document.getElementById('m-gl').textContent = fmt(gl);
  document.getElementById('m-gl').className = 'metric-value ' + (gl >= 0 ? 'pos' : 'neg');
  document.getElementById('m-gl-pct').textContent = fmtPct(glPct);
  document.getElementById('m-gl-pct').className = 'metric-trend ' + (gl >= 0 ? 'pos' : 'neg');
  document.getElementById('m-custo').textContent = fmt(custo);
  document.getElementById('m-cash').textContent = fmt(cash);
  document.getElementById('m-cash-pct').textContent = total > 0 ? (cashPct.toFixed(1) + '% do total') : '—';

  document.getElementById('last-update').textContent = 'Atualizado: ' + new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  renderEvoChart();
  renderPieChart();
  renderDashTable();
}

function renderDashTable() {
  const tbody = document.getElementById('dash-tbody');
  const table = document.getElementById('dash-table');
  const empty = document.getElementById('dash-empty');
  tbody.innerHTML = '';

  if (ativos.length === 0) {
    table.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  table.style.display = 'table';
  empty.style.display = 'none';

  const total = calcTotal();
  const sorted = [...ativos].sort((a, b) => valorAtivo(b) - valorAtivo(a)).slice(0, 6);

  sorted.forEach(a => {
    const val = valorAtivo(a);
    const custo = custoAtivo(a);
    const gl = val - custo;
    const glPct = custo > 0 ? (gl / custo) * 100 : 0;
    const peso = total > 0 ? (val / total) * 100 : 0;
    const cor = COLORS[a.tipo] || '#888';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="ticker-name">${a.ticker}</div>
        <div class="ticker-full">${a.nome}</div>
      </td>
      <td><span class="tag tag-${a.tipo}">${a.tipo}</span></td>
      <td class="right" style="font-family:var(--mono)">${fmt(val)}</td>
      <td class="right">
        <div style="font-family:var(--mono)" class="${gl >= 0 ? 'pos' : 'neg'}">${fmt(gl)}</div>
        <div style="font-size:11px" class="${gl >= 0 ? 'pos' : 'neg'}">${fmtPct(glPct)}</div>
      </td>
      <td class="right">
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px">
          <div class="bar-wrap"><div class="bar" style="width:${Math.min(peso,100)}%;background:${cor}"></div></div>
          <span style="font-size:12px;font-family:var(--mono);color:var(--text2)">${peso.toFixed(1)}%</span>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Gráfico evolução ───────────────────────────────────────────────
function getEvoData(period) {
  const now = new Date();
  const days = { '1m': 30, '3m': 90, '6m': 180, '1a': 365 }[period] || 30;
  const cutoff = new Date(now - days * 86400000);
  const filtered = history.filter(h => new Date(h.d) >= cutoff);

  if (filtered.length === 0) return null;

  // Garantir ponto inicial se não existir
  const labels = filtered.map(h => {
    const d = new Date(h.d);
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
  });
  const data = filtered.map(h => h.v);

  return { labels, data };
}

function renderEvoChart() {
  const canvas = document.getElementById('evoChart');
  const empty = document.getElementById('evo-empty');
  const evoData = getEvoData(currentPeriod);

  if (!evoData || evoData.data.length < 2) {
    canvas.style.display = 'none';
    empty.classList.add('visible');
    if (evoChart) { evoChart.destroy(); evoChart = null; }
    return;
  }

  canvas.style.display = 'block';
  empty.classList.remove('visible');

  const cfg = {
    type: 'line',
    data: {
      labels: evoData.labels,
      datasets: [{
        data: evoData.data,
        borderColor: '#5b8dee',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        backgroundColor: (ctx) => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
          g.addColorStop(0, 'rgba(91,141,238,0.15)');
          g.addColorStop(1, 'rgba(91,141,238,0)');
          return g;
        },
        tension: 0.4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => fmt(ctx.raw) },
        backgroundColor: '#1a1e28', borderColor: '#252935', borderWidth: 1,
        titleColor: '#8b90a0', bodyColor: '#e8eaf0', padding: 10
      }},
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#555d70', font: { size: 11 }, maxTicksLimit: 6 } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#555d70', font: { size: 11 }, callback: v => '€' + (v/1000).toFixed(0) + 'k' } }
      }
    }
  };

  if (evoChart) { evoChart.destroy(); }
  evoChart = new Chart(canvas, cfg);
}

document.querySelectorAll('.chart-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = btn.dataset.period;
    renderEvoChart();
  });
});

// ── Gráfico donut ──────────────────────────────────────────────────
function renderPieChart() {
  const canvas = document.getElementById('pieChart');
  const empty = document.getElementById('pie-empty');
  const legend = document.getElementById('pie-legend');
  const donutLabel = document.getElementById('donut-label');

  if (ativos.length === 0) {
    canvas.style.display = 'none';
    empty.classList.add('visible');
    legend.innerHTML = '';
    donutLabel.textContent = '—';
    if (pieChart) { pieChart.destroy(); pieChart = null; }
    return;
  }

  canvas.style.display = 'block';
  empty.classList.remove('visible');

  const tipos = ['Ação', 'ETF', 'Cripto', 'Cash'];
  const total = calcTotal();
  const vals = tipos.map(t => ativos.filter(a => a.tipo === t).reduce((s, a) => s + valorAtivo(a), 0));
  const labels = tipos.filter((_, i) => vals[i] > 0);
  const data = vals.filter(v => v > 0);
  const colors = labels.map(t => COLORS[t]);

  donutLabel.textContent = fmt(total);

  legend.innerHTML = labels.map((l, i) => {
    const pct = total > 0 ? ((data[i] / total) * 100).toFixed(1) : 0;
    return `<div class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span>${l} ${pct}%</div>`;
  }).join('');

  if (pieChart) { pieChart.destroy(); }
  pieChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => `${ctx.label}: ${fmt(ctx.raw)} (${((ctx.raw/total)*100).toFixed(1)}%)` },
          backgroundColor: '#1a1e28', borderColor: '#252935', borderWidth: 1,
          bodyColor: '#e8eaf0', padding: 10
        }
      }
    }
  });
}

// ── Página Ativos ──────────────────────────────────────────────────
function renderAtivos() {
  const tbody = document.getElementById('ativos-tbody');
  const table = document.getElementById('ativos-table');
  const empty = document.getElementById('ativos-empty');
  tbody.innerHTML = '';

  if (ativos.length === 0) {
    table.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  table.style.display = 'table';
  empty.style.display = 'none';

  const total = calcTotal();
  const sorted = [...ativos].sort((a, b) => valorAtivo(b) - valorAtivo(a));

  sorted.forEach((a, idx) => {
    const realIdx = ativos.indexOf(a);
    const val = valorAtivo(a);
    const custo = custoAtivo(a);
    const gl = val - custo;
    const glPct = custo > 0 ? (gl / custo) * 100 : 0;
    const peso = total > 0 ? (val / total) * 100 : 0;
    const cor = COLORS[a.tipo] || '#888';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="ticker-name">${a.ticker}</div>
        <div class="ticker-full">${a.nome}</div>
      </td>
      <td><span class="tag tag-${a.tipo}">${a.tipo}</span></td>
      <td class="right" style="font-family:var(--mono)">${a.tipo === 'Cash' ? '—' : Number(a.qty).toLocaleString('pt-PT')}</td>
      <td class="right" style="font-family:var(--mono)">${a.tipo === 'Cash' ? '—' : fmt(a.precoMedio)}</td>
      <td class="right" style="font-family:var(--mono)">${fmt(val)}</td>
      <td class="right">
        <div class="${gl >= 0 ? 'pos' : 'neg'}" style="font-family:var(--mono)">${fmt(gl)}</div>
        <div class="${gl >= 0 ? 'pos' : 'neg'}" style="font-size:11px">${fmtPct(glPct)}</div>
      </td>
      <td class="right">
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px">
          <div class="bar-wrap"><div class="bar" style="width:${Math.min(peso,100)}%;background:${cor}"></div></div>
          <span style="font-size:12px;font-family:var(--mono);color:var(--text2)">${peso.toFixed(1)}%</span>
        </div>
      </td>
      <td>
        <button class="btn-icon" data-edit="${realIdx}" title="Editar">✎</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openModal(parseInt(btn.dataset.edit)));
  });
}

// ── Formulário adicionar ───────────────────────────────────────────
document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedType = btn.dataset.type;
    toggleCashFields();
    updatePreview();
  });
});

function toggleCashFields() {
  const isCash = selectedType === 'Cash';
  document.getElementById('row-qty-price').style.display = isCash ? 'none' : 'flex';
  document.getElementById('row-cash').style.display = isCash ? 'flex' : 'none';
}

['f-qty', 'f-preco-medio', 'f-preco-atual', 'f-cash-val'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', updatePreview);
});

function updatePreview() {
  const preview = document.getElementById('form-preview');
  if (selectedType === 'Cash') {
    const val = parseFloat(document.getElementById('f-cash-val').value) || 0;
    if (val === 0) { preview.style.display = 'none'; return; }
    preview.style.display = 'block';
    document.getElementById('prev-investido').textContent = fmt(val);
    document.getElementById('prev-atual').textContent = fmt(val);
    document.getElementById('prev-gl').textContent = '€0,00 (0,00%)';
    document.getElementById('prev-gl').className = '';
  } else {
    const qty = parseFloat(document.getElementById('f-qty').value) || 0;
    const pm = parseFloat(document.getElementById('f-preco-medio').value) || 0;
    const pa = parseFloat(document.getElementById('f-preco-atual').value) || 0;
    if (qty === 0 || pm === 0) { preview.style.display = 'none'; return; }
    preview.style.display = 'block';
    const investido = qty * pm;
    const atual = qty * pa;
    const gl = atual - investido;
    const glPct = investido > 0 ? (gl / investido) * 100 : 0;
    document.getElementById('prev-investido').textContent = fmt(investido);
    document.getElementById('prev-atual').textContent = pa > 0 ? fmt(atual) : '—';
    document.getElementById('prev-gl').textContent = pa > 0 ? `${fmt(gl)} (${fmtPct(glPct)})` : '—';
    document.getElementById('prev-gl').className = gl >= 0 ? 'pos' : 'neg';
  }
}

document.getElementById('btn-guardar').addEventListener('click', () => {
  const ticker = document.getElementById('f-ticker').value.trim().toUpperCase();
  const nome = document.getElementById('f-nome').value.trim();

  if (!ticker) { toast('Preenche o ticker / nome do ativo'); return; }

  const ativo = { tipo: selectedType, ticker, nome: nome || ticker };

  if (selectedType === 'Cash') {
    const val = parseFloat(document.getElementById('f-cash-val').value);
    if (!val) { toast('Preenche o valor em cash'); return; }
    ativo.cashVal = val;
    ativo.cashJuro = parseFloat(document.getElementById('f-cash-juro').value) || 0;
  } else {
    const qty = parseFloat(document.getElementById('f-qty').value);
    const pm = parseFloat(document.getElementById('f-preco-medio').value);
    const pa = parseFloat(document.getElementById('f-preco-atual').value);
    if (!qty || !pm) { toast('Preenche a quantidade e o preço médio'); return; }
    ativo.qty = qty;
    ativo.precoMedio = pm;
    ativo.precoAtual = pa || pm;
  }

  ativos.push(ativo);
  saveAtivos();
  resetForm();
  toast('✓ Ativo adicionado com sucesso!');
  showPage('dashboard');
});

document.getElementById('btn-cancelar').addEventListener('click', () => {
  resetForm();
  showPage('dashboard');
});

function resetForm() {
  document.getElementById('f-ticker').value = '';
  document.getElementById('f-nome').value = '';
  document.getElementById('f-qty').value = '';
  document.getElementById('f-preco-medio').value = '';
  document.getElementById('f-preco-atual').value = '';
  document.getElementById('f-cash-val').value = '';
  document.getElementById('f-cash-juro').value = '';
  document.getElementById('form-preview').style.display = 'none';
  selectedType = 'Ação';
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.type-btn[data-type="Ação"]').classList.add('active');
  toggleCashFields();
}

// ── Modal editar ───────────────────────────────────────────────────
function openModal(idx) {
  const a = ativos[idx];
  document.getElementById('edit-idx').value = idx;
  document.getElementById('edit-ticker').value = a.ticker;
  document.getElementById('edit-nome').value = a.nome;

  if (a.tipo === 'Cash') {
    document.getElementById('edit-row-normal').style.display = 'none';
    document.getElementById('edit-row-cash').style.display = 'flex';
    document.getElementById('edit-cash-val').value = a.cashVal;
    document.getElementById('edit-cash-juro').value = a.cashJuro || '';
  } else {
    document.getElementById('edit-row-normal').style.display = 'flex';
    document.getElementById('edit-row-cash').style.display = 'none';
    document.getElementById('edit-qty').value = a.qty;
    document.getElementById('edit-preco-medio').value = a.precoMedio;
    document.getElementById('edit-preco-atual').value = a.precoAtual;
  }

  document.getElementById('modal-backdrop').style.display = 'flex';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-backdrop').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-backdrop')) closeModal();
});

function closeModal() {
  document.getElementById('modal-backdrop').style.display = 'none';
}

document.getElementById('btn-editar-guardar').addEventListener('click', () => {
  const idx = parseInt(document.getElementById('edit-idx').value);
  const a = ativos[idx];

  a.ticker = document.getElementById('edit-ticker').value.trim().toUpperCase();
  a.nome = document.getElementById('edit-nome').value.trim();

  if (a.tipo === 'Cash') {
    a.cashVal = parseFloat(document.getElementById('edit-cash-val').value) || 0;
    a.cashJuro = parseFloat(document.getElementById('edit-cash-juro').value) || 0;
  } else {
    a.qty = parseFloat(document.getElementById('edit-qty').value) || 0;
    a.precoMedio = parseFloat(document.getElementById('edit-preco-medio').value) || 0;
    a.precoAtual = parseFloat(document.getElementById('edit-preco-atual').value) || 0;
  }

  saveAtivos();
  closeModal();
  renderAtivos();
  toast('✓ Ativo atualizado');
});

document.getElementById('btn-apagar').addEventListener('click', () => {
  const idx = parseInt(document.getElementById('edit-idx').value);
  if (confirm(`Apagar "${ativos[idx].ticker}"? Esta ação não pode ser desfeita.`)) {
    ativos.splice(idx, 1);
    saveAtivos();
    closeModal();
    renderAtivos();
    toast('Ativo removido');
  }
});

// ── Toast ──────────────────────────────────────────────────────────
function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Init ───────────────────────────────────────────────────────────
toggleCashFields();
renderDashboard();
