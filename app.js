// ── Config ─────────────────────────────────────────────────────────
const STORAGE_KEY   = 'portfolio_v1';
const HISTORY_KEY   = 'portfolio_history_v1';
const API_KEY_STORAGE = 'portfolio_anthropic_key';

function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

// Yahoo Finance proxy (gratuito, sem necessidade de chave)
const PRICE_PROXY = 'https://query1.finance.yahoo.com/v8/finance/chart/';

// ── Estado ─────────────────────────────────────────────────────────
let ativos  = JSON.parse(localStorage.getItem(STORAGE_KEY)  || '[]');
let history = JSON.parse(localStorage.getItem(HISTORY_KEY)  || '[]');
let selectedType = 'Ação';
let evoChart = null;
let pieChart = null;
let currentPeriod = '1m';
const COLORS = { 'Ação':'#5b8dee','ETF':'#9b7de8','Cripto':'#e6a140','Cash':'#4caf82' };

// ── Navegação ──────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id)?.classList.add('active');
  document.querySelector(`.nav-item[data-page="${id}"]`)?.classList.add('active');
  if (id === 'dashboard') renderDashboard();
  if (id === 'ativos')    renderAtivos();
  if (id === 'analise')   renderAnalisePage();
}

document.addEventListener('click', e => {
  const pg = e.target.closest('[data-page]');
  if (pg) { e.preventDefault(); showPage(pg.dataset.page); }
});

// ── Persistência ───────────────────────────────────────────────────
function saveAtivos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ativos));
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
function calcTotal()  { return ativos.reduce((s, a) => s + valorAtivo(a), 0); }
function calcCusto()  { return ativos.reduce((s, a) => s + custoAtivo(a), 0); }
function calcCash()   { return ativos.filter(a => a.tipo === 'Cash').reduce((s, a) => s + valorAtivo(a), 0); }

// ── Formatação ─────────────────────────────────────────────────────
function fmt(n) {
  return '€' + Number(n).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(n) {
  return (n >= 0 ? '+' : '') + Number(n).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

// ── Preços em tempo real ───────────────────────────────────────────
async function fetchPrice(ticker) {
  try {
    const url = `https://corsproxy.io/?${encodeURIComponent(PRICE_PROXY + ticker + '?interval=1d&range=1d')}`;
    const res = await fetch(url);
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return price ? parseFloat(price) : null;
  } catch {
    return null;
  }
}

async function fetchHistoricalPrices(ticker, period) {
  try {
    const ranges = { '1m':'1mo','3m':'3mo','6m':'6mo','1a':'1y' };
    const range = ranges[period] || '1mo';
    const url = `https://corsproxy.io/?${encodeURIComponent(PRICE_PROXY + ticker + `?interval=1d&range=${range}`)}`;
    const res = await fetch(url);
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const timestamps = result.timestamp;
    const closes = result.indicators?.quote?.[0]?.close;
    if (!timestamps || !closes) return null;
    return timestamps.map((t, i) => ({
      d: new Date(t * 1000).toISOString().split('T')[0],
      close: closes[i]
    })).filter(p => p.close != null);
  } catch {
    return null;
  }
}

async function atualizarTodosPrecos() {
  const btn = document.getElementById('btn-refresh-all');
  btn.classList.add('loading');
  btn.textContent = '↻ A atualizar...';

  let atualizados = 0;
  for (let i = 0; i < ativos.length; i++) {
    const a = ativos[i];
    if (a.tipo === 'Cash') continue;
    const price = await fetchPrice(a.ticker);
    if (price) {
      ativos[i].precoAtual = price;
      atualizados++;
    }
  }

  saveAtivos();
  renderDashboard();
  renderAtivos();

  btn.classList.remove('loading');
  btn.textContent = '↻ Atualizar preços';
  document.getElementById('last-update').textContent = 'Atualizado: ' + new Date().toLocaleTimeString('pt-PT', { hour:'2-digit', minute:'2-digit' });
  toast(`✓ ${atualizados} preço(s) atualizado(s)`);
}

document.getElementById('btn-refresh-all').addEventListener('click', atualizarTodosPrecos);

// ── Dashboard ──────────────────────────────────────────────────────
function renderDashboard() {
  const total  = calcTotal();
  const custo  = calcCusto();
  const gl     = total - custo;
  const glPct  = custo > 0 ? (gl / custo) * 100 : 0;
  const cash   = calcCash();
  const cashPct = total > 0 ? (cash / total) * 100 : 0;

  document.getElementById('m-total').textContent     = fmt(total);
  document.getElementById('m-total-sub').textContent = ativos.length + ' posições activas';
  document.getElementById('m-gl').textContent        = fmt(gl);
  document.getElementById('m-gl').className          = 'metric-value ' + (gl >= 0 ? 'pos' : 'neg');
  document.getElementById('m-gl-pct').textContent    = fmtPct(glPct);
  document.getElementById('m-gl-pct').className      = 'metric-trend ' + (gl >= 0 ? 'pos' : 'neg');
  document.getElementById('m-custo').textContent     = fmt(custo);
  document.getElementById('m-cash').textContent      = fmt(cash);
  document.getElementById('m-cash-pct').textContent  = total > 0 ? cashPct.toFixed(1) + '% do total' : '—';
  document.getElementById('last-update').textContent = 'Atualizado: ' + new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});

  renderEvoChart();
  renderPieChart();
  renderDashTable();
}

function renderDashTable() {
  const tbody = document.getElementById('dash-tbody');
  const table = document.getElementById('dash-table');
  const empty = document.getElementById('dash-empty');
  tbody.innerHTML = '';
  if (ativos.length === 0) { table.style.display='none'; empty.style.display='block'; return; }
  table.style.display = 'table'; empty.style.display = 'none';
  const total  = calcTotal();
  const sorted = [...ativos].sort((a,b) => valorAtivo(b)-valorAtivo(a)).slice(0,6);
  sorted.forEach(a => {
    const val  = valorAtivo(a);
    const custo = custoAtivo(a);
    const gl   = val - custo;
    const glPct = custo > 0 ? (gl/custo)*100 : 0;
    const peso  = total > 0 ? (val/total)*100 : 0;
    const cor   = COLORS[a.tipo] || '#888';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><div class="ticker-name">${a.ticker}</div><div class="ticker-full">${a.nome}</div></td>
      <td><span class="tag tag-${a.tipo}">${a.tipo}</span></td>
      <td class="right" style="font-family:var(--mono)">${a.tipo==='Cash'?'—':fmt(parseFloat(a.precoAtual)||0)}</td>
      <td class="right" style="font-family:var(--mono)">${fmt(val)}</td>
      <td class="right">
        <div class="${gl>=0?'pos':'neg'}" style="font-family:var(--mono)">${fmt(gl)}</div>
        <div class="${gl>=0?'pos':'neg'}" style="font-size:11px">${fmtPct(glPct)}</div>
      </td>
      <td class="right">
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px">
          <div class="bar-wrap"><div class="bar" style="width:${Math.min(peso,100)}%;background:${cor}"></div></div>
          <span style="font-size:12px;font-family:var(--mono);color:var(--text2)">${peso.toFixed(1)}%</span>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ── Gráfico evolução ───────────────────────────────────────────────
async function renderEvoChart() {
  const canvas = document.getElementById('evoChart');
  const empty  = document.getElementById('evo-empty');

  if (ativos.length === 0) {
    canvas.style.display = 'none';
    empty.classList.add('visible');
    if (evoChart) { evoChart.destroy(); evoChart = null; }
    return;
  }

  // Tentar buscar histórico real do primeiro ativo não-cash
  const mainAtivo = ativos.find(a => a.tipo !== 'Cash');
  let labels = [], data = [];

  if (mainAtivo) {
    const hist = await fetchHistoricalPrices(mainAtivo.ticker, currentPeriod);
    if (hist && hist.length > 1) {
      // Calcular valor do portfolio em cada data usando os preços históricos
      // (simplificado: aplica a variação % do ativo principal ao total do portfolio)
      const firstClose = hist[0].close;
      const currentVal = calcTotal();
      labels = hist.map(h => {
        const d = new Date(h.d);
        return d.toLocaleDateString('pt-PT', { day:'2-digit', month:'short' });
      });
      data = hist.map(h => {
        const ratio = h.close / firstClose;
        return Math.round(currentVal * ratio * 100) / 100;
      });
    }
  }

  // Fallback para histórico local
  if (data.length < 2) {
    const days = { '1m':30,'3m':90,'6m':180,'1a':365 }[currentPeriod] || 30;
    const cutoff = new Date(Date.now() - days * 86400000);
    const filtered = history.filter(h => new Date(h.d) >= cutoff);
    if (filtered.length < 2) {
      canvas.style.display = 'none';
      empty.classList.add('visible');
      if (evoChart) { evoChart.destroy(); evoChart = null; }
      return;
    }
    labels = filtered.map(h => new Date(h.d).toLocaleDateString('pt-PT',{day:'2-digit',month:'short'}));
    data   = filtered.map(h => h.v);
  }

  canvas.style.display = 'block';
  empty.classList.remove('visible');

  if (evoChart) { evoChart.destroy(); }
  evoChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#5b8dee',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        backgroundColor: ctx => {
          const g = ctx.chart.ctx.createLinearGradient(0,0,0,200);
          g.addColorStop(0,'rgba(91,141,238,0.15)');
          g.addColorStop(1,'rgba(91,141,238,0)');
          return g;
        },
        tension: 0.4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => fmt(ctx.raw) },
          backgroundColor:'#1a1e28', borderColor:'#252935', borderWidth:1,
          titleColor:'#8b90a0', bodyColor:'#e8eaf0', padding:10
        }
      },
      scales: {
        x: { grid:{color:'rgba(255,255,255,0.05)'}, ticks:{color:'#555d70',font:{size:11},maxTicksLimit:6} },
        y: { grid:{color:'rgba(255,255,255,0.05)'}, ticks:{color:'#555d70',font:{size:11},callback:v=>'€'+(v/1000).toFixed(0)+'k'} }
      }
    }
  });
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
  const empty  = document.getElementById('pie-empty');
  const legend = document.getElementById('pie-legend');
  const donutLabel = document.getElementById('donut-label');
  if (ativos.length === 0) {
    canvas.style.display='none'; empty.classList.add('visible');
    legend.innerHTML=''; donutLabel.textContent='—';
    if (pieChart) { pieChart.destroy(); pieChart=null; }
    return;
  }
  canvas.style.display='block'; empty.classList.remove('visible');
  const tipos  = ['Ação','ETF','Cripto','Cash'];
  const total  = calcTotal();
  const vals   = tipos.map(t => ativos.filter(a=>a.tipo===t).reduce((s,a)=>s+valorAtivo(a),0));
  const labels = tipos.filter((_,i)=>vals[i]>0);
  const data   = vals.filter(v=>v>0);
  const colors = labels.map(t=>COLORS[t]);
  donutLabel.textContent = fmt(total);
  legend.innerHTML = labels.map((l,i) => {
    const pct = total>0?((data[i]/total)*100).toFixed(1):0;
    return `<div class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span>${l} ${pct}%</div>`;
  }).join('');
  if (pieChart) { pieChart.destroy(); }
  pieChart = new Chart(canvas, {
    type:'doughnut',
    data:{ labels, datasets:[{ data, backgroundColor:colors, borderWidth:0, hoverOffset:4 }] },
    options:{
      responsive:true, maintainAspectRatio:false, cutout:'68%',
      plugins:{
        legend:{display:false},
        tooltip:{
          callbacks:{label:ctx=>`${ctx.label}: ${fmt(ctx.raw)} (${((ctx.raw/total)*100).toFixed(1)}%)`},
          backgroundColor:'#1a1e28',borderColor:'#252935',borderWidth:1,bodyColor:'#e8eaf0',padding:10
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
  if (ativos.length===0) { table.style.display='none'; empty.style.display='block'; return; }
  table.style.display='table'; empty.style.display='none';
  const total = calcTotal();
  [...ativos].sort((a,b)=>valorAtivo(b)-valorAtivo(a)).forEach(a => {
    const realIdx = ativos.indexOf(a);
    const val   = valorAtivo(a);
    const custo = custoAtivo(a);
    const gl    = val - custo;
    const glPct = custo>0?(gl/custo)*100:0;
    const peso  = total>0?(val/total)*100:0;
    const cor   = COLORS[a.tipo]||'#888';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><div class="ticker-name">${a.ticker}</div><div class="ticker-full">${a.nome}</div></td>
      <td><span class="tag tag-${a.tipo}">${a.tipo}</span></td>
      <td class="right" style="font-family:var(--mono)">${a.tipo==='Cash'?'—':Number(a.qty).toLocaleString('pt-PT')}</td>
      <td class="right" style="font-family:var(--mono)">${a.tipo==='Cash'?'—':fmt(a.precoMedio)}</td>
      <td class="right" style="font-family:var(--mono)">${a.tipo==='Cash'?'—':fmt(parseFloat(a.precoAtual)||0)}</td>
      <td class="right" style="font-family:var(--mono)">${fmt(val)}</td>
      <td class="right">
        <div class="${gl>=0?'pos':'neg'}" style="font-family:var(--mono)">${fmt(gl)}</div>
        <div class="${gl>=0?'pos':'neg'}" style="font-size:11px">${fmtPct(glPct)}</div>
      </td>
      <td class="right">
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px">
          <div class="bar-wrap"><div class="bar" style="width:${Math.min(peso,100)}%;background:${cor}"></div></div>
          <span style="font-size:12px;font-family:var(--mono);color:var(--text2)">${peso.toFixed(1)}%</span>
        </div>
      </td>
      <td><button class="btn-icon" data-edit="${realIdx}" title="Editar">✎</button></td>`;
    tbody.appendChild(tr);
  });
  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openModal(parseInt(btn.dataset.edit)));
  });
}

// ── Análise IA ─────────────────────────────────────────────────────
function renderAnalisePage() {
  // Reset ao mudar de página
}

document.getElementById('btn-analisar').addEventListener('click', async () => {
  if (ativos.length === 0) { toast('Adiciona pelo menos um ativo primeiro'); return; }

  // Verificar se tem chave API guardada
  if (!getApiKey()) {
    const chave = prompt('Introduz a tua chave API da Anthropic (começa por sk-ant-):\n\nFica guardada apenas no teu browser, nunca é partilhada.');
    if (!chave || !chave.trim().startsWith('sk-ant-')) {
      toast('Chave inválida. Deve começar por sk-ant-');
      return;
    }
    localStorage.setItem(API_KEY_STORAGE, chave.trim());
    toast('✓ Chave guardada no browser');
  }

  const empty   = document.getElementById('ai-empty');
  const loading = document.getElementById('ai-loading');
  const result  = document.getElementById('ai-result');

  empty.style.display   = 'none';
  loading.style.display = 'flex';
  result.style.display  = 'none';

  const total = calcTotal();
  const custo = calcCusto();
  const gl    = total - custo;
  const glPct = custo > 0 ? ((gl/custo)*100).toFixed(2) : 0;

  const portfolioResume = ativos.map(a => {
    const val  = valorAtivo(a);
    const c    = custoAtivo(a);
    const g    = val - c;
    const gPct = c > 0 ? ((g/c)*100).toFixed(1) : 0;
    const peso = total > 0 ? ((val/total)*100).toFixed(1) : 0;
    if (a.tipo === 'Cash') return `- ${a.ticker} (Cash): €${val.toFixed(2)}, peso: ${peso}%`;
    return `- ${a.ticker} (${a.nome}) [${a.tipo}]: ${a.qty} unidades, preço médio €${parseFloat(a.precoMedio).toFixed(2)}, preço atual €${parseFloat(a.precoAtual).toFixed(2)}, valor €${val.toFixed(2)}, G/P: ${g>=0?'+':''}€${g.toFixed(2)} (${gPct}%), peso: ${peso}%`;
  }).join('\n');

  const prompt = `Analisa o seguinte portfolio de investimentos de um investidor português e dá feedback construtivo em português de Portugal.

PORTFOLIO:
Valor total: €${total.toFixed(2)}
Custo base: €${custo.toFixed(2)}
Ganho/Perda total: €${gl.toFixed(2)} (${glPct}%)

POSIÇÕES:
${portfolioResume}

Por favor:
1. Faz uma avaliação geral do portfolio (diversificação, concentração de risco, equilíbrio)
2. Destaca os pontos fortes
3. Aponta riscos ou pontos de atenção
4. Dá 2-3 sugestões concretas de melhoria
5. Dá uma nota geral de 1 a 10 com justificação

Responde de forma estruturada usando ### para títulos de secção. Sê direto e concreto. Não dês conselhos financeiros formais — é uma análise informativa.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getApiKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || 'Não foi possível obter resposta.';

    // Formatar markdown simples
    const html = text
      .replace(/### (.+)/g, '<h3>$1</h3>')
      .replace(/## (.+)/g, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\- (.+)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<)(.+)/gm, '<p>$1</p>');

    loading.style.display = 'none';
    result.style.display  = 'block';
    result.innerHTML = html;
  } catch (err) {
    loading.style.display = 'none';
    empty.style.display   = 'block';
    toast('Erro ao contactar a IA. Verifica a tua ligação.');
  }
});

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
  document.getElementById('row-cash').style.display      = isCash ? 'flex' : 'none';
}

['f-qty','f-preco-medio','f-preco-atual','f-cash-val'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', updatePreview);
});

function updatePreview() {
  const preview = document.getElementById('form-preview');
  if (selectedType === 'Cash') {
    const val = parseFloat(document.getElementById('f-cash-val').value)||0;
    if (!val) { preview.style.display='none'; return; }
    preview.style.display='block';
    document.getElementById('prev-investido').textContent = fmt(val);
    document.getElementById('prev-atual').textContent     = fmt(val);
    document.getElementById('prev-gl').textContent        = '€0,00 (0,00%)';
    document.getElementById('prev-gl').className = '';
  } else {
    const qty = parseFloat(document.getElementById('f-qty').value)||0;
    const pm  = parseFloat(document.getElementById('f-preco-medio').value)||0;
    const pa  = parseFloat(document.getElementById('f-preco-atual').value)||0;
    if (!qty||!pm) { preview.style.display='none'; return; }
    preview.style.display='block';
    const investido = qty*pm, atual=qty*pa, gl=atual-investido;
    const glPct = investido>0?(gl/investido)*100:0;
    document.getElementById('prev-investido').textContent = fmt(investido);
    document.getElementById('prev-atual').textContent     = pa>0?fmt(atual):'—';
    document.getElementById('prev-gl').textContent        = pa>0?`${fmt(gl)} (${fmtPct(glPct)})`:'—';
    document.getElementById('prev-gl').className = gl>=0?'pos':'neg';
  }
}

// Botão buscar preço automático
document.getElementById('btn-fetch-price').addEventListener('click', async () => {
  const ticker = document.getElementById('f-ticker').value.trim().toUpperCase();
  if (!ticker) { toast('Escreve um ticker primeiro'); return; }
  const btn = document.getElementById('btn-fetch-price');
  btn.textContent = '...';
  const price = await fetchPrice(ticker);
  btn.textContent = '↓ Preço';
  if (price) {
    document.getElementById('f-preco-atual').value = price;
    updatePreview();
    toast(`✓ Preço atual: €${price.toFixed(2)}`);
  } else {
    toast('Não foi possível obter o preço. Verifica o ticker (ex: AAPL, BTC-USD, VWCE.AS)');
  }
});

document.getElementById('btn-guardar').addEventListener('click', () => {
  const ticker = document.getElementById('f-ticker').value.trim().toUpperCase();
  const nome   = document.getElementById('f-nome').value.trim();
  if (!ticker) { toast('Preenche o ticker / nome do ativo'); return; }
  const ativo = { tipo: selectedType, ticker, nome: nome||ticker };
  if (selectedType === 'Cash') {
    const val = parseFloat(document.getElementById('f-cash-val').value);
    if (!val) { toast('Preenche o valor em cash'); return; }
    ativo.cashVal  = val;
    ativo.cashJuro = parseFloat(document.getElementById('f-cash-juro').value)||0;
  } else {
    const qty = parseFloat(document.getElementById('f-qty').value);
    const pm  = parseFloat(document.getElementById('f-preco-medio').value);
    const pa  = parseFloat(document.getElementById('f-preco-atual').value);
    if (!qty||!pm) { toast('Preenche a quantidade e o preço médio'); return; }
    ativo.qty        = qty;
    ativo.precoMedio = pm;
    ativo.precoAtual = pa||pm;
  }
  ativos.push(ativo);
  saveAtivos();
  resetForm();
  toast('✓ Ativo adicionado!');
  showPage('dashboard');
});

document.getElementById('btn-cancelar').addEventListener('click', () => { resetForm(); showPage('dashboard'); });

function resetForm() {
  ['f-ticker','f-nome','f-qty','f-preco-medio','f-preco-atual','f-cash-val','f-cash-juro'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('form-preview').style.display = 'none';
  selectedType = 'Ação';
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.type-btn[data-type="Ação"]').classList.add('active');
  toggleCashFields();
}

// ── Modal editar ───────────────────────────────────────────────────
function openModal(idx) {
  const a = ativos[idx];
  document.getElementById('edit-idx').value  = idx;
  document.getElementById('edit-ticker').value = a.ticker;
  document.getElementById('edit-nome').value   = a.nome;
  if (a.tipo==='Cash') {
    document.getElementById('edit-row-normal').style.display='none';
    document.getElementById('edit-row-cash').style.display='flex';
    document.getElementById('edit-cash-val').value  = a.cashVal;
    document.getElementById('edit-cash-juro').value = a.cashJuro||'';
  } else {
    document.getElementById('edit-row-normal').style.display='flex';
    document.getElementById('edit-row-cash').style.display='none';
    document.getElementById('edit-qty').value         = a.qty;
    document.getElementById('edit-preco-medio').value = a.precoMedio;
    document.getElementById('edit-preco-atual').value = a.precoAtual;
  }
  document.getElementById('modal-backdrop').style.display='flex';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-backdrop').addEventListener('click', e => {
  if (e.target===document.getElementById('modal-backdrop')) closeModal();
});
function closeModal() { document.getElementById('modal-backdrop').style.display='none'; }

document.getElementById('btn-editar-guardar').addEventListener('click', () => {
  const idx = parseInt(document.getElementById('edit-idx').value);
  const a   = ativos[idx];
  a.ticker = document.getElementById('edit-ticker').value.trim().toUpperCase();
  a.nome   = document.getElementById('edit-nome').value.trim();
  if (a.tipo==='Cash') {
    a.cashVal  = parseFloat(document.getElementById('edit-cash-val').value)||0;
    a.cashJuro = parseFloat(document.getElementById('edit-cash-juro').value)||0;
  } else {
    a.qty        = parseFloat(document.getElementById('edit-qty').value)||0;
    a.precoMedio = parseFloat(document.getElementById('edit-preco-medio').value)||0;
    a.precoAtual = parseFloat(document.getElementById('edit-preco-atual').value)||0;
  }
  saveAtivos(); closeModal(); renderAtivos();
  toast('✓ Ativo atualizado');
});

document.getElementById('btn-apagar').addEventListener('click', () => {
  const idx = parseInt(document.getElementById('edit-idx').value);
  if (confirm(`Apagar "${ativos[idx].ticker}"?`)) {
    ativos.splice(idx,1); saveAtivos(); closeModal(); renderAtivos();
    toast('Ativo removido');
  }
});

// ── Toast ──────────────────────────────────────────────────────────
function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t=document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 3000);
}

// ── Init ───────────────────────────────────────────────────────────
document.getElementById('btn-clear-key')?.addEventListener('click', () => {
  if (getApiKey()) {
    if (confirm('Apagar a chave API guardada?')) {
      localStorage.removeItem(API_KEY_STORAGE);
      toast('✓ Chave apagada');
    }
  } else {
    toast('Não há chave guardada');
  }
});

toggleCashFields();
renderDashboard();
