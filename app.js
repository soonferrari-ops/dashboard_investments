// ── Config ────────────────────────────────────────────────────────
const PORTFOLIOS_KEY   = 'portfolios_v2';
const API_KEY_STORAGE  = 'portfolio_anthropic_key';
const PORTFOLIO_COLORS = ['#5b8dee','#9b7de8','#4caf82','#e6a140','#e05c5c','#5bc4c4'];
const COLORS = { 'Ação':'#5b8dee','ETF':'#9b7de8','Cripto':'#e6a140','Cash':'#4caf82' };
const FX_CACHE = {};
let fxFetchedAll = false;

// ── Helpers ───────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2,10); }
function fmt(n) { return '€'+Number(n).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtPct(n) { return (n>=0?'+':'')+Number(n).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})+'%'; }
function getApiKey() { return localStorage.getItem(API_KEY_STORAGE)||''; }
function askApiKey() {
  const k = window.prompt('Introduz a tua chave API da Anthropic (começa por sk-ant-):\n\nFica guardada apenas no teu browser.');
  if (!k || !k.trim().startsWith('sk-ant-')) { toast('Chave inválida'); return false; }
  localStorage.setItem(API_KEY_STORAGE, k.trim());
  toast('✓ Chave guardada');
  return true;
}

// ── Estado ────────────────────────────────────────────────────────
let portfolios = JSON.parse(localStorage.getItem(PORTFOLIOS_KEY) || 'null');
if (!portfolios) {
  portfolios = [{ id: uid(), nome: 'Principal', ativos: [], history: [] }];
  saveAll();
}
let currentPortfolioId = portfolios[0].id;
let selectedType  = 'Ação';
let selectedBroker = 'Trading 212';
let evoChart = null, pieChart = null, globalPieChart = null, currentPeriod = '1m';
let importImageBase64 = null, importPositions = [], importMediaType = 'image/jpeg';
let currentSort = 'valor';

function currentP()  { return portfolios.find(p=>p.id===currentPortfolioId)||portfolios[0]; }
function getAtivos() { return currentP().ativos; }

// ── Persistência ──────────────────────────────────────────────────
function saveAll() { localStorage.setItem(PORTFOLIOS_KEY, JSON.stringify(portfolios)); }
function saveAtivos() {
  const p = currentP(), today = new Date().toISOString().split('T')[0];
  p.history = (p.history||[]).filter(h=>h.d!==today);
  p.history.push({ d:today, v:calcTotal() });
  if (p.history.length>365) p.history=p.history.slice(-365);
  saveAll();
}


// ── Agrupar ativos com mesmo ticker ──────────────────────────────
function mergeAtivos(ativos) {
  const map = {};
  ativos.forEach((a, idx) => {
    const key = a.ticker.toUpperCase() + '|' + a.tipo;
    if (!map[key]) {
      const qty = parseFloat(a.qty)||0;
      map[key] = { ...a, qty, _totalCusto: qty*(parseFloat(a.precoMedio)||0), _indices:[idx] };
    } else {
      const existing = map[key];
      const newQty = parseFloat(a.qty)||0;
      const totalQty = existing.qty + newQty;
      existing._totalCusto += newQty*(parseFloat(a.precoMedio)||0);
      existing.precoMedio = totalQty>0 ? existing._totalCusto/totalQty : 0;
      existing.precoMedioOriginal = existing.precoMedio;
      existing.moedaCompra = 'EUR'; // merged always in EUR
      existing.qty = totalQty;
      existing.precoAtual = parseFloat(a.precoAtual)||existing.precoAtual;
      existing._indices.push(idx);
    }
  });
  return Object.values(map).map(a => { const r={...a}; delete r._totalCusto; return r; });
}

// Consolidar ativos duplicados nos dados reais
function consolidarAtivos() {
  const ativos = getAtivos();
  const merged = mergeAtivos(ativos);
  // Remove _indices from merged result and save
  currentP().ativos = merged.map(a => { const r={...a}; delete r._indices; return r; });
  saveAtivos();
}

// ── Cálculos ──────────────────────────────────────────────────────
function valorAtivo(a)      { return a.tipo==='Cash'?parseFloat(a.cashVal)||0:(parseFloat(a.qty)||0)*(parseFloat(a.precoAtual)||0); }
function custoAtivo(a)      { return a.tipo==='Cash'?parseFloat(a.cashVal)||0:(parseFloat(a.qty)||0)*(parseFloat(a.precoMedio)||0); }
function calcTotalFrom(arr) { return arr.reduce((s,a)=>s+valorAtivo(a),0); }
function calcCustoFrom(arr) { return arr.reduce((s,a)=>s+custoAtivo(a),0); }
function calcTotal()        { return calcTotalFrom(getAtivos()); }
function calcCusto()        { return calcCustoFrom(getAtivos()); }
function calcCash()         { return getAtivos().filter(a=>a.tipo==='Cash').reduce((s,a)=>s+valorAtivo(a),0); }

// ── Preços / FX ───────────────────────────────────────────────────
const PROXIES = [
  u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  u => `https://thingproxy.freeboard.io/fetch/${u}`,
  u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

async function yahooFetch(url) {
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy(url), { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.chart?.result) return data;
    } catch {}
  }
  return null;
}

function detectCurrency(meta) {
  const c = meta?.currency||'USD';
  return (c==='GBp'||c==='GBX') ? 'GBX' : c;
}

async function getEurRate(currency) {
  if (currency==='EUR') return 1;
  if (FX_CACHE[currency]) return FX_CACHE[currency];
  const data = await yahooFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${currency}EUR=X?interval=1d&range=1d`);
  const rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (rate) { FX_CACHE[currency]=parseFloat(rate); return parseFloat(rate); }
  const fallback = {USD:0.87,GBP:1.16,JPY:0.0058,CHF:1.05,CAD:0.64,AUD:0.55,SEK:0.082,NOK:0.082,DKK:0.134,HKD:0.11,SGD:0.65,BRL:0.16,CNY:0.12};
  return fallback[currency]||1;
}

async function prefetchAllRates() {
  if (fxFetchedAll) return;
  const currencies = ['USD','GBP','JPY','CHF','CAD','AUD','SEK','NOK','DKK','HKD','SGD','BRL','CNY'];
  await Promise.all(currencies.map(async cur => {
    if (FX_CACHE[cur]) return;
    try {
      const data = await yahooFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${cur}EUR=X?interval=1d&range=1d`);
      const rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (rate) FX_CACHE[cur]=parseFloat(rate);
    } catch {}
  }));
  fxFetchedAll=true;
}

async function searchTicker(name) {
  // Search Yahoo Finance for the correct ticker by company name
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(name)}&quotesCount=5&newsCount=0&listsCount=0`;
    const data = await yahooFetch(url);
    const quotes = data?.quotes || [];
    // Prefer equity results
    const equity = quotes.find(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF');
    if (equity) return equity.symbol;
    if (quotes.length > 0) return quotes[0].symbol;
  } catch {}
  return null;
}

// ── Autocomplete ticker ──────────────────────────────────────────
let autocompleteTimeout = null;

async function searchTickerAutocomplete(query) {
  // Try multiple Yahoo search endpoints through different proxies
  const endpoints = [
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&listsCount=0`,
    `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&listsCount=0`,
    `https://query1.finance.yahoo.com/v6/finance/autocomplete?query=${encodeURIComponent(query)}&lang=en`,
  ];
  const proxies = [
    u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    u => `https://thingproxy.freeboard.io/fetch/${u}`,
  ];
  for (const endpoint of endpoints) {
    for (const proxy of proxies) {
      try {
        const res = await fetch(proxy(endpoint), { signal: AbortSignal.timeout(4000) });
        if (!res.ok) continue;
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { continue; }
        // Handle allorigins wrapper
        if (data?.contents) { try { data = JSON.parse(data.contents); } catch { continue; } }
        // Handle v1/finance/search format
        const quotes = data?.quotes || data?.ResultSet?.Result || [];
        const filtered = quotes.filter(q => (q.symbol||q.Symbol) && (q.quoteType==='EQUITY'||q.quoteType==='ETF'||q.quoteType==='CRYPTOCURRENCY'||q.typeDisp==='Equity'));
        if (filtered.length > 0) return filtered.map(q => ({
          symbol: q.symbol||q.Symbol,
          shortname: q.shortname||q.Name||q.longname||'',
          exchDisp: q.exchDisp||q.Exchange||q.exchange||'',
          quoteType: q.quoteType||'EQUITY'
        }));
      } catch {}
    }
  }
  return [];
}

function showAutocomplete(results) {
  let dropdown = document.getElementById('ticker-autocomplete');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'ticker-autocomplete';
    dropdown.className = 'ticker-autocomplete';
    document.body.appendChild(dropdown);
  }
  // Position relative to the ticker input
  const inputEl = document.getElementById('f-ticker');
  const rect = inputEl.getBoundingClientRect();
  dropdown.style.position = 'fixed';
  dropdown.style.top = (rect.bottom + 4) + 'px';
  dropdown.style.left = rect.left + 'px';
  dropdown.style.width = rect.width + 'px';
  if (!results || results.length === 0) { dropdown.style.display = 'none'; return; }
  dropdown.innerHTML = results.map(r => `
    <div class="autocomplete-item" data-symbol="${r.symbol}" data-name="${r.shortname||r.longname||''}">
      <span class="ac-ticker">${r.symbol}</span>
      <span class="ac-name">${r.shortname||r.longname||''}</span>
      <span class="ac-type">${r.exchDisp||r.exchange||''}</span>
    </div>`).join('');
  dropdown.style.display = 'block';
  dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('mousedown', function(e) {
      e.preventDefault();
      document.getElementById('f-ticker').value = item.dataset.symbol;
      document.getElementById('f-nome').value = item.dataset.name;
      dropdown.style.display = 'none';
    });
  });
}

async function fetchPriceRaw(ticker) {
  const data = await yahooFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`);
  if (!data) return null;
  const meta = data.chart.result[0].meta;
  if (!meta?.regularMarketPrice) return null;
  let price = parseFloat(meta.regularMarketPrice);
  const currency = detectCurrency(meta);
  if (currency==='GBX') price=price/100;
  const eurRate = await getEurRate(currency==='GBX'?'GBP':currency);
  return Math.round(price*eurRate*10000)/10000;
}

async function fetchPrice(ticker, name) {
  // Try the ticker as-is first
  const direct = await fetchPriceRaw(ticker);
  if (direct) return direct;
  // If it fails and has no suffix, try common exchange suffixes
  if (!ticker.includes('.') && !ticker.includes('-')) {
    const suffixes = ['.DE','.L','.PA','.AS','.MC','.MI','.LS','.SW','.BR','.HE','.ST','.OL','.CO','.VI','.WA','.AT','.T','.HK','.AX','.SA','.NS','.KS','.TO','.MX'];
    for (const suffix of suffixes) {
      const result = await fetchPriceRaw(ticker + suffix);
      if (result) return result;
    }
    // Last resort: search by name on Yahoo Finance
    if (name) {
      const foundTicker = await searchTicker(name);
      if (foundTicker && foundTicker !== ticker) {
        const result = await fetchPriceRaw(foundTicker);
        if (result) return result;
      }
    }
  }
  return null;
}

async function fetchHistoricalPrices(ticker, period) {
  const ranges = {'1m':'1mo','3m':'3mo','6m':'6mo','1a':'1y'};
  const data = await yahooFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=${ranges[period]||'1mo'}`);
  if (!data) return null;
  const result = data.chart.result[0];
  const currency = detectCurrency(result.meta);
  const gbxDiv = currency==='GBX'?100:1;
  const eurRate = await getEurRate(currency==='GBX'?'GBP':currency);
  const timestamps = result.timestamp, closes = result.indicators?.quote?.[0]?.close;
  if (!timestamps||!closes) return null;
  return timestamps.map((t,i)=>({
    d: new Date(t*1000).toISOString().split('T')[0],
    close: closes[i]!=null ? (closes[i]/gbxDiv)*eurRate : null
  })).filter(p=>p.close!=null);
}

async function atualizarTodosPrecos() {
  const btn = document.getElementById('btn-refresh-all');
  btn.textContent='↻ A atualizar...';
  Object.keys(FX_CACHE).forEach(k=>delete FX_CACHE[k]);
  fxFetchedAll=false;
  await prefetchAllRates();
  const ativos = getAtivos(); let n=0;
  for (let i=0;i<ativos.length;i++) {
    if (ativos[i].tipo==='Cash') continue;
    const price = await fetchPrice(ativos[i].ticker, ativos[i].nome);
    if (price) { ativos[i].precoAtual=price; n++; }
  }
  saveAtivos(); renderDashboard(); renderAtivos();
  btn.textContent='↻ Atualizar preços';
  document.getElementById('last-update').textContent='Atualizado: '+new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
  toast(`✓ ${n} preço(s) atualizado(s)`);
}

// ── Navegação ─────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const page = document.getElementById('page-'+id);
  if (page) page.classList.add('active');
  const nav = document.querySelector(`.nav-item[data-page="${id}"]`);
  if (nav) nav.classList.add('active');
  if (id==='global')    setTimeout(renderGlobal, 10);
  if (id==='dashboard') renderDashboard();
  if (id==='ativos')    renderAtivos();
  if (id==='analise')   { const el=document.getElementById('analise-sub'); if(el) el.textContent=currentP().nome; }
  if (id==='adicionar') { const el=document.getElementById('adicionar-sub'); if(el) el.textContent='A adicionar em: '+currentP().nome; }
}

document.addEventListener('click', function(e) {
  const pg = e.target.closest('[data-page]');
  if (pg && !pg.classList.contains('portfolio-item') && !pg.classList.contains('btn')) {
    e.preventDefault();
    showPage(pg.dataset.page);
  }
  if (pg && pg.classList.contains('btn') && pg.dataset.page) {
    e.preventDefault();
    showPage(pg.dataset.page);
  }
});

// ── Sidebar portfolios ────────────────────────────────────────────
function renderSidebar() {
  const list = document.getElementById('portfolio-list');
  if (!list) return;
  list.innerHTML='';
  portfolios.forEach((p,i)=>{
    const div = document.createElement('div');
    div.className='portfolio-item'+(p.id===currentPortfolioId?' active':'');
    div.innerHTML=`<span class="portfolio-item-name"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${PORTFOLIO_COLORS[i%PORTFOLIO_COLORS.length]};margin-right:7px;vertical-align:middle"></span>${p.nome}</span><button class="portfolio-item-edit" data-edit-portfolio="${p.id}">✎</button>`;
    div.addEventListener('click', function(e) {
      if (e.target.closest('[data-edit-portfolio]')) return;
      currentPortfolioId=p.id; renderSidebar(); showPage('dashboard');
    });
    list.appendChild(div);
  });
  document.querySelectorAll('[data-edit-portfolio]').forEach(btn=>{
    btn.addEventListener('click', function(e) { e.stopPropagation(); openPortfolioModal(btn.dataset.editPortfolio); });
  });
}

// ── Modal portfolio ───────────────────────────────────────────────
let editingPortfolioId = null;

function openPortfolioModal(id) {
  editingPortfolioId=id||null;
  const p=id?portfolios.find(x=>x.id===id):null;
  document.getElementById('modal-portfolio-title').textContent=p?'Editar portfolio':'Novo portfolio';
  document.getElementById('portfolio-nome-input').value=p?p.nome:'';
  document.getElementById('btn-guardar-portfolio').textContent=p?'Guardar':'Criar';
  document.getElementById('btn-apagar-portfolio').style.display=(p&&portfolios.length>1)?'block':'none';
  document.getElementById('modal-portfolio-backdrop').style.display='flex';
  setTimeout(()=>document.getElementById('portfolio-nome-input').focus(),50);
}

function closePortfolioModal() {
  document.getElementById('modal-portfolio-backdrop').style.display='none';
  editingPortfolioId=null;
}

document.getElementById('btn-new-portfolio').addEventListener('click',()=>openPortfolioModal(null));
document.getElementById('modal-portfolio-close').addEventListener('click',closePortfolioModal);
document.getElementById('modal-portfolio-backdrop').addEventListener('click',function(e){
  if(e.target===document.getElementById('modal-portfolio-backdrop')) closePortfolioModal();
});
document.getElementById('btn-guardar-portfolio').addEventListener('click',function(){
  const nome=document.getElementById('portfolio-nome-input').value.trim();
  if(!nome){toast('Dá um nome ao portfolio');return;}
  if(editingPortfolioId){const p=portfolios.find(x=>x.id===editingPortfolioId);if(p)p.nome=nome;}
  else{const novo={id:uid(),nome,ativos:[],history:[],agrupar:true};portfolios.push(novo);currentPortfolioId=novo.id;}
  saveAll();closePortfolioModal();renderSidebar();showPage('dashboard');
  toast('✓ Portfolio '+(editingPortfolioId?'atualizado':'criado'));
});
document.getElementById('btn-apagar-portfolio').addEventListener('click',function(){
  const p=portfolios.find(x=>x.id===editingPortfolioId);
  if(!p||!confirm(`Apagar o portfolio "${p.nome}" e todos os seus ativos?`)) return;
  portfolios=portfolios.filter(x=>x.id!==editingPortfolioId);
  if(currentPortfolioId===editingPortfolioId) currentPortfolioId=portfolios[0].id;
  saveAll();closePortfolioModal();renderSidebar();showPage('dashboard');toast('Portfolio apagado');
});

// ── Global ────────────────────────────────────────────────────────
function renderGlobal() {
  const allAtivos=portfolios.flatMap(p=>p.ativos);
  const total=calcTotalFrom(allAtivos),custo=calcCustoFrom(allAtivos),gl=total-custo;
  const glPct=custo>0?(gl/custo)*100:0;
  const cash=allAtivos.filter(a=>a.tipo==='Cash').reduce((s,a)=>s+valorAtivo(a),0);
  const cashPct=total>0?(cash/total)*100:0;
  document.getElementById('g-total').textContent=fmt(total);
  document.getElementById('g-total-sub').textContent=portfolios.length+' portfolio(s)';
  document.getElementById('g-gl').textContent=fmt(gl);
  document.getElementById('g-gl').className='metric-value '+(gl>=0?'pos':'neg');
  document.getElementById('g-gl-pct').textContent=fmtPct(glPct);
  document.getElementById('g-gl-pct').className='metric-trend '+(gl>=0?'pos':'neg');
  document.getElementById('g-custo').textContent=fmt(custo);
  document.getElementById('g-cash').textContent=fmt(cash);
  document.getElementById('g-cash-pct').textContent=total>0?cashPct.toFixed(1)+'% do total':'—';
  const container=document.getElementById('global-portfolios-list');
  container.innerHTML=portfolios.map((p,i)=>{
    const pT=calcTotalFrom(p.ativos),pC=calcCustoFrom(p.ativos),pG=pT-pC,pGP=pC>0?(pG/pC)*100:0;
    const cor=PORTFOLIO_COLORS[i%PORTFOLIO_COLORS.length];
    return `<div class="global-portfolio-card" data-goto="${p.id}"><div class="gpc-left"><div class="gpc-dot" style="background:${cor}"></div><div><div class="gpc-name">${p.nome}</div><div class="gpc-sub">${p.ativos.length} ativo(s)</div></div></div><div class="gpc-right"><div class="gpc-value">${fmt(pT)}</div><div class="gpc-gl ${pG>=0?'pos':'neg'}">${fmt(pG)} (${fmtPct(pGP)})</div></div></div>`;
  }).join('');
  document.querySelectorAll('[data-goto]').forEach(el=>{
    el.addEventListener('click',()=>{currentPortfolioId=el.dataset.goto;renderSidebar();showPage('dashboard');});
  });
  // Pie chart por tipo de ativo (global)
  const canvas=document.getElementById('globalPieChart');
  const empty=document.getElementById('global-pie-empty');
  const legend=document.getElementById('global-pie-legend');
  const donutLabel=document.getElementById('global-donut-label');
  if(!canvas) return;
  if(allAtivos.length===0){
    canvas.style.display='none';empty.classList.add('visible');legend.innerHTML='';donutLabel.textContent='—';
    if(globalPieChart){globalPieChart.destroy();globalPieChart=null;}return;
  }
  canvas.style.display='block';empty.classList.remove('visible');
  const tipos=['Ação','ETF','Cripto','Cash'];
  const vals=tipos.map(t=>allAtivos.filter(a=>a.tipo===t).reduce((s,a)=>s+valorAtivo(a),0));
  const labels=tipos.filter((_,i)=>vals[i]>0),data=vals.filter(v=>v>0),colors=labels.map(t=>COLORS[t]);
  donutLabel.textContent=fmt(total);
  legend.innerHTML=labels.map((l,i)=>`<div class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span>${l} ${total>0?((data[i]/total)*100).toFixed(1):0}%</div>`).join('');
  if(globalPieChart) globalPieChart.destroy();
  globalPieChart=new Chart(canvas,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:0,hoverOffset:4}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${fmt(ctx.raw)} (${((ctx.raw/total)*100).toFixed(1)}%)`},backgroundColor:'#1a1e28',borderColor:'#252935',borderWidth:1,bodyColor:'#e8eaf0',padding:10}}}});
}

// ── Dashboard ─────────────────────────────────────────────────────
function renderDashboard() {
  const p=currentP(),ativos=getAtivos(),total=calcTotal(),custo=calcCusto(),gl=total-custo;
  const glPct=custo>0?(gl/custo)*100:0,cash=calcCash(),cashPct=total>0?(cash/total)*100:0;
  document.getElementById('dash-title').textContent=p.nome;
  document.getElementById('dash-sub').textContent=ativos.length+' posições activas';
  document.getElementById('m-total').textContent=fmt(total);
  document.getElementById('m-total-sub').textContent=ativos.length+' posições';
  document.getElementById('m-gl').textContent=fmt(gl);
  document.getElementById('m-gl').className='metric-value '+(gl>=0?'pos':'neg');
  document.getElementById('m-gl-pct').textContent=fmtPct(glPct);
  document.getElementById('m-gl-pct').className='metric-trend '+(gl>=0?'pos':'neg');
  document.getElementById('m-custo').textContent=fmt(custo);
  document.getElementById('m-cash').textContent=fmt(cash);
  document.getElementById('m-cash-pct').textContent=total>0?cashPct.toFixed(1)+'% do total':'—';
  document.getElementById('last-update').textContent='Atualizado: '+new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
  renderEvoChart(); renderPieChart(); renderDashTable();
}

function renderDashTable() {
  const ativos=mergeAtivos(getAtivos()),tbody=document.getElementById('dash-tbody'),table=document.getElementById('dash-table'),empty=document.getElementById('dash-empty');
  tbody.innerHTML='';
  if(ativos.length===0){table.style.display='none';empty.style.display='block';return;}
  table.style.display='table';empty.style.display='none';
  const total=calcTotal();
  [...ativos].sort((a,b)=>valorAtivo(b)-valorAtivo(a)).slice(0,6).forEach(a=>{
    const val=valorAtivo(a),custo=custoAtivo(a),gl=val-custo,glPct=custo>0?(gl/custo)*100:0,peso=total>0?(val/total)*100:0,cor=COLORS[a.tipo]||'#888';
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><div class="ticker-name">${a.ticker}</div><div class="ticker-full">${a.nome}</div></td><td><span class="tag tag-${a.tipo}">${a.tipo}</span></td><td class="right" style="font-family:var(--mono)">${a.tipo==='Cash'?'—':fmt(parseFloat(a.precoAtual)||0)}</td><td class="right" style="font-family:var(--mono)">${fmt(val)}</td><td class="right"><div class="${gl>=0?'pos':'neg'}" style="font-family:var(--mono)">${fmt(gl)}</div><div class="${gl>=0?'pos':'neg'}" style="font-size:11px">${fmtPct(glPct)}</div></td><td class="right"><div style="display:flex;align-items:center;justify-content:flex-end;gap:6px"><div class="bar-wrap"><div class="bar" style="width:${Math.min(peso,100)}%;background:${cor}"></div></div><span style="font-size:12px;font-family:var(--mono);color:var(--text2)">${peso.toFixed(1)}%</span></div></td>`;
    tbody.appendChild(tr);
  });
}

// ── Gráficos ──────────────────────────────────────────────────────
async function renderEvoChart() {
  const ativos=getAtivos(),canvas=document.getElementById('evoChart'),empty=document.getElementById('evo-empty');
  if(ativos.length===0){canvas.style.display='none';empty.classList.add('visible');if(evoChart){evoChart.destroy();evoChart=null;}return;}
  const mainAtivo=ativos.find(a=>a.tipo!=='Cash');
  let labels=[],data=[];
  if(mainAtivo){
    const hist=await fetchHistoricalPrices(mainAtivo.ticker,currentPeriod);
    if(hist&&hist.length>1){const fc=hist[0].close,cv=calcTotal();labels=hist.map(h=>new Date(h.d).toLocaleDateString('pt-PT',{day:'2-digit',month:'short'}));data=hist.map(h=>Math.round((h.close/fc)*cv*100)/100);}
  }
  if(data.length<2){
    const days={'1m':30,'3m':90,'6m':180,'1a':365}[currentPeriod]||30,cutoff=new Date(Date.now()-days*86400000);
    const filtered=(currentP().history||[]).filter(h=>new Date(h.d)>=cutoff);
    if(filtered.length<2){canvas.style.display='none';empty.classList.add('visible');if(evoChart){evoChart.destroy();evoChart=null;}return;}
    labels=filtered.map(h=>new Date(h.d).toLocaleDateString('pt-PT',{day:'2-digit',month:'short'}));data=filtered.map(h=>h.v);
  }
  canvas.style.display='block';empty.classList.remove('visible');
  if(evoChart) evoChart.destroy();
  evoChart=new Chart(canvas,{type:'line',data:{labels,datasets:[{data,borderColor:'#5b8dee',borderWidth:2,pointRadius:0,pointHoverRadius:4,fill:true,backgroundColor:ctx=>{const g=ctx.chart.ctx.createLinearGradient(0,0,0,200);g.addColorStop(0,'rgba(91,141,238,0.15)');g.addColorStop(1,'rgba(91,141,238,0)');return g;},tension:0.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>fmt(ctx.raw)},backgroundColor:'#1a1e28',borderColor:'#252935',borderWidth:1,titleColor:'#8b90a0',bodyColor:'#e8eaf0',padding:10}},scales:{x:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#555d70',font:{size:11},maxTicksLimit:6}},y:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#555d70',font:{size:11},callback:v=>'€'+(v/1000).toFixed(0)+'k'}}}}});
}

document.querySelectorAll('.chart-tab').forEach(btn=>btn.addEventListener('click',function(){
  document.querySelectorAll('.chart-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');currentPeriod=btn.dataset.period;renderEvoChart();
}));

function renderPieChart() {
  const ativos=mergeAtivos(getAtivos()),canvas=document.getElementById('pieChart'),empty=document.getElementById('pie-empty'),legend=document.getElementById('pie-legend'),donutLabel=document.getElementById('donut-label');
  if(ativos.length===0){canvas.style.display='none';empty.classList.add('visible');legend.innerHTML='';donutLabel.textContent='—';if(pieChart){pieChart.destroy();pieChart=null;}return;}
  canvas.style.display='block';empty.classList.remove('visible');
  const total=calcTotal();
  // Sort by value descending, group small positions into "Outros"
  const sorted=[...ativos].sort((a,b)=>valorAtivo(b)-valorAtivo(a));
  const TOP=8;
  const top=sorted.slice(0,TOP);
  const rest=sorted.slice(TOP);
  const tickerColors=['#5b8dee','#9b7de8','#4caf82','#e6a140','#e05c5c','#5bc4c4','#f06292','#aed581'];
  let labels=top.map(a=>a.ticker);
  let data=top.map(a=>valorAtivo(a));
  let colors=top.map((_,i)=>tickerColors[i%tickerColors.length]);
  if(rest.length>0){
    const restVal=rest.reduce((s,a)=>s+valorAtivo(a),0);
    labels.push('Outros');data.push(restVal);colors.push('#555d70');
  }
  donutLabel.textContent=fmt(total);
  legend.innerHTML=labels.map((l,i)=>`<div class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span>${l} ${total>0?((data[i]/total)*100).toFixed(1):0}%</div>`).join('');
  if(pieChart) pieChart.destroy();
  pieChart=new Chart(canvas,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:0,hoverOffset:4}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${fmt(ctx.raw)} (${((ctx.raw/total)*100).toFixed(1)}%)`},backgroundColor:'#1a1e28',borderColor:'#252935',borderWidth:1,bodyColor:'#e8eaf0',padding:10}}}});
}

// ── Ordenação ─────────────────────────────────────────────────────
function sortAtivos(ativos) {
  const sorted = [...ativos];
  switch(currentSort) {
    case 'gl-eur':  return sorted.sort((a,b)=>(valorAtivo(b)-custoAtivo(b))-(valorAtivo(a)-custoAtivo(a)));
    case 'gl-pct':  return sorted.sort((a,b)=>{
      const pA=custoAtivo(a)>0?(valorAtivo(a)-custoAtivo(a))/custoAtivo(a):0;
      const pB=custoAtivo(b)>0?(valorAtivo(b)-custoAtivo(b))/custoAtivo(b):0;
      return pB-pA;
    });
    case 'ticker':  return sorted.sort((a,b)=>a.ticker.localeCompare(b.ticker));
    default:        return sorted.sort((a,b)=>valorAtivo(b)-valorAtivo(a));
  }
}

// ── Ativos ────────────────────────────────────────────────────────
function getAgrupar() { return currentP().agrupar !== false; }

function renderAtivos() {
  const rawAtivos=getAtivos(),p=currentP();
  const agrupar=getAgrupar();
  const merged=mergeAtivos(rawAtivos);
  const ativos=agrupar ? merged : rawAtivos.map((a,i)=>({...a,_indices:[i]}));
  const hasDupes=rawAtivos.length>merged.length;
  const toggle=document.getElementById('toggle-agrupar');
  if(toggle) toggle.checked=agrupar;
  document.getElementById('ativos-title').textContent=p.nome;
  document.getElementById('ativos-sub').textContent=rawAtivos.length+' posições'+(hasDupes&&!agrupar?' ('+(rawAtivos.length-merged.length)+' duplicado(s))':'');
  const tbody=document.getElementById('ativos-tbody'),table=document.getElementById('ativos-table'),empty=document.getElementById('ativos-empty');
  tbody.innerHTML='';
  if(ativos.length===0){table.style.display='none';empty.style.display='block';return;}
  table.style.display='table';empty.style.display='none';
  const total=calcTotal();
  sortAtivos(ativos).forEach(a=>{
    const val=valorAtivo(a),custo=custoAtivo(a),gl=val-custo,glPct=custo>0?(gl/custo)*100:0,peso=total>0?(val/total)*100:0,cor=COLORS[a.tipo]||'#888';
    const pmDisplay=a.moedaCompra&&a.moedaCompra!=='EUR'?`<span style="font-size:11px;color:var(--text2)">${a.moedaCompra} ${Number(a.precoMedioOriginal||a.precoMedio).toFixed(2)}</span><br>${fmt(a.precoMedio)}`:fmt(a.precoMedio);
    const isGrouped = a._indices && a._indices.length > 1;
    const editIdx = a._indices ? a._indices[0] : rawAtivos.indexOf(a);
    const editIndices = a._indices ? a._indices.join(',') : String(editIdx);
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><div class="ticker-name">${a.ticker}</div><div class="ticker-full">${a.nome}${isGrouped?` <span style="font-size:10px;color:var(--text3)">(${a._indices.length}×)</span>`:''}</div></td><td><span class="tag tag-${a.tipo}">${a.tipo}</span></td><td class="right" style="font-family:var(--mono)">${a.tipo==='Cash'?'—':Number(a.qty).toLocaleString('en-GB')}</td><td class="right" style="font-family:var(--mono)">${a.tipo==='Cash'?'—':pmDisplay}</td><td class="right" style="font-family:var(--mono)">${a.tipo==='Cash'?'—':fmt(parseFloat(a.precoAtual)||0)}</td><td class="right" style="font-family:var(--mono)">${fmt(val)}</td><td class="right"><div class="${gl>=0?'pos':'neg'}" style="font-family:var(--mono)">${fmt(gl)}</div><div class="${gl>=0?'pos':'neg'}" style="font-size:11px">${fmtPct(glPct)}</div></td><td class="right"><div style="display:flex;align-items:center;justify-content:flex-end;gap:6px"><div class="bar-wrap"><div class="bar" style="width:${Math.min(peso,100)}%;background:${cor}"></div></div><span style="font-size:12px;font-family:var(--mono);color:var(--text2)">${peso.toFixed(1)}%</span></div></td><td><button class="btn-icon" data-edit="${editIndices}">✎</button></td>`;
    tbody.appendChild(tr);
  });
  document.querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>{
    const indices = btn.dataset.edit.split(',').map(Number);
    console.log('Edit clicked, indices:', indices, 'data-edit:', btn.dataset.edit);
    if(indices.length > 1) openModalGrouped(indices);
    else openModal(indices[0]);
  }));
}

// ── Adicionar ativo ───────────────────────────────────────────────
const MOEDAS_OPTIONS = `<option value="EUR">€ EUR</option><option value="USD">$ USD</option><option value="GBP">£ GBP</option><option value="GBX">p GBX (pence)</option><option value="JPY">¥ JPY</option><option value="CHF">₣ CHF</option><option value="CAD">$ CAD</option><option value="AUD">$ AUD</option><option value="BRL">R$ BRL</option><option value="SEK">kr SEK</option><option value="NOK">kr NOK</option><option value="DKK">kr DKK</option><option value="HKD">HK$ HKD</option><option value="SGD">S$ SGD</option><option value="CNY">¥ CNY</option>`;

document.querySelectorAll('.type-btn').forEach(btn=>btn.addEventListener('click',function(){
  document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');selectedType=btn.dataset.type;toggleCashFields();updatePreview();
}));

function toggleCashFields() {
  const isCash=selectedType==='Cash';
  document.getElementById('row-qty-price').style.display=isCash?'none':'flex';
  document.getElementById('row-cash').style.display=isCash?'flex':'none';
}

const fMoeda = document.getElementById('f-moeda');
if (fMoeda) {
  fMoeda.innerHTML = MOEDAS_OPTIONS;
  fMoeda.addEventListener('change', function() {
    const sym={EUR:'€',USD:'$',GBP:'£',GBX:'p',JPY:'¥',CHF:'₣',CAD:'CA$',AUD:'AU$',BRL:'R$',SEK:'kr',NOK:'kr',DKK:'kr',HKD:'HK$',SGD:'S$',CNY:'¥'};
    const lbl=document.getElementById('label-moeda-compra');
    if(lbl) lbl.textContent=(sym[fMoeda.value]||fMoeda.value)+' '+fMoeda.value;
    updatePreview();
  });
}

// Autocomplete on ticker input
const fTicker = document.getElementById('f-ticker');
if (fTicker) {
  fTicker.addEventListener('input', function() {
    clearTimeout(autocompleteTimeout);
    const q = fTicker.value.trim();
    if (q.length < 2) { const d=document.getElementById('ticker-autocomplete'); if(d) d.style.display='none'; return; }
    autocompleteTimeout = setTimeout(async () => {
      const results = await searchTickerAutocomplete(q);
      showAutocomplete(results);
    }, 300);
  });
  fTicker.addEventListener('blur', function() {
    setTimeout(() => { const d=document.getElementById('ticker-autocomplete'); if(d) d.style.display='none'; }, 200);
  });
  fTicker.addEventListener('focus', function() {
    if (fTicker.value.trim().length >= 2) {
      const d=document.getElementById('ticker-autocomplete');
      if(d) d.style.display='block';
    }
  });
}

['f-qty','f-preco-medio','f-preco-atual','f-cash-val'].forEach(id=>{
  const el=document.getElementById(id);
  if(el) el.addEventListener('input', updatePreview);
});

async function updatePreview() {
  const preview=document.getElementById('form-preview');
  if (selectedType==='Cash') {
    const val=parseFloat(document.getElementById('f-cash-val').value)||0;
    if(!val){preview.style.display='none';return;}
    preview.style.display='block';
    document.getElementById('prev-investido').textContent=fmt(val);
    document.getElementById('prev-atual').textContent=fmt(val);
    document.getElementById('prev-gl').textContent='€0,00 (0,00%)';
    document.getElementById('prev-gl').className='';
  } else {
    const qty=parseFloat(document.getElementById('f-qty').value)||0;
    const pm=parseFloat(document.getElementById('f-preco-medio').value)||0;
    const pa=parseFloat(document.getElementById('f-preco-atual').value)||0;
    const moeda=document.getElementById('f-moeda')?.value||'EUR';
    if(!qty||!pm){preview.style.display='none';return;}
    preview.style.display='block';
    const fxRate=moeda==='GBX'?(await getEurRate('GBP'))/100:await getEurRate(moeda);
    const investido=qty*pm*fxRate,atual=qty*pa,gl=atual-investido,glPct=investido>0?(gl/investido)*100:0;
    document.getElementById('prev-investido').textContent=fmt(investido)+(moeda!=='EUR'?` (${moeda} ${(qty*pm).toFixed(2)})`:'');
    document.getElementById('prev-atual').textContent=pa>0?fmt(atual):'—';
    document.getElementById('prev-gl').textContent=pa>0?`${fmt(gl)} (${fmtPct(glPct)})`:'—';
    document.getElementById('prev-gl').className=gl>=0?'pos':'neg';
  }
}

document.getElementById('btn-fetch-price').addEventListener('click', async function() {
  const ticker=document.getElementById('f-ticker').value.trim().toUpperCase();
  if(!ticker){toast('Escreve um ticker primeiro');return;}
  const btn=document.getElementById('btn-fetch-price');
  btn.textContent='...';
  const price=await fetchPrice(ticker);
  btn.textContent='↓ Preço';
  if(price){document.getElementById('f-preco-atual').value=price;updatePreview();toast(`✓ Preço: €${price.toFixed(2)}`);}
  else toast('Não foi possível obter o preço. Tenta ex: AAPL, BTC-USD, VWCE.AS');
});

document.getElementById('btn-guardar').addEventListener('click', async function() {
  const ticker=document.getElementById('f-ticker').value.trim().toUpperCase();
  const nome=document.getElementById('f-nome').value.trim();
  if(!ticker){toast('Preenche o ticker');return;}
  const ativo={tipo:selectedType,ticker,nome:nome||ticker};
  if(selectedType==='Cash'){
    const val=parseFloat(document.getElementById('f-cash-val').value);
    if(!val){toast('Preenche o valor em cash');return;}
    ativo.cashVal=val;ativo.cashJuro=parseFloat(document.getElementById('f-cash-juro').value)||0;
  } else {
    const qty=parseFloat(document.getElementById('f-qty').value);
    const pm=parseFloat(document.getElementById('f-preco-medio').value);
    const pa=parseFloat(document.getElementById('f-preco-atual').value);
    const moeda=document.getElementById('f-moeda')?.value||'EUR';
    if(!qty||!pm){toast('Preenche a quantidade e o preço médio');return;}
    const fxRate=moeda==='GBX'?(await getEurRate('GBP'))/100:await getEurRate(moeda);
    ativo.qty=qty;ativo.moedaCompra=moeda;ativo.precoMedioOriginal=pm;
    ativo.precoMedio=Math.round(pm*fxRate*10000)/10000;
    if(pa) { ativo.precoAtual=pa; }
    else { toast('A buscar preço...'); const fetched=await fetchPrice(ticker, nome); ativo.precoAtual=fetched||ativo.precoMedio; }
  }
  currentP().ativos.push(ativo);
  saveAtivos();resetForm();toast('✓ Ativo adicionado!');showPage('dashboard');
});

document.getElementById('btn-cancelar').addEventListener('click',function(){resetForm();showPage('dashboard');});

function resetForm() {
  ['f-ticker','f-nome','f-qty','f-preco-medio','f-preco-atual','f-cash-val','f-cash-juro'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  const fm=document.getElementById('f-moeda'); if(fm) fm.value='EUR';
  const lbl=document.getElementById('label-moeda-compra'); if(lbl) lbl.textContent='€';
  document.getElementById('form-preview').style.display='none';
  selectedType='Ação';
  document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('active'));
  const firstBtn=document.querySelector('.type-btn[data-type="Ação"]'); if(firstBtn) firstBtn.classList.add('active');
  toggleCashFields();
}

// ── Modal editar ativo ────────────────────────────────────────────
function openModalGrouped(indices) {
  const ativos = getAtivos();
  const modal = document.getElementById('modal-backdrop');
  const body = document.getElementById('modal-backdrop').querySelector('.modal-body');
  
  // Show all entries for this grouped ticker
  document.getElementById('modal-backdrop').querySelector('.modal-title').textContent = 
    ativos[indices[0]]?.ticker + ' — ' + indices.length + ' entradas';
  
  body.innerHTML = indices.map(function(idx, i) {
    const a = ativos[idx];
    if (!a) return '';
    const moedas = ['EUR','USD','GBP','GBX','JPY','CHF','CAD','AUD','BRL','SEK','NOK','DKK','HKD','SGD','CNY'];
    const moedaOpts = moedas.map(function(m){ return '<option value="'+m+'" '+(( a.moedaCompra||'EUR')===m?'selected':'')+'>'+m+'</option>'; }).join('');
    return '<div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin-bottom:12px">'
      + '<div style="font-size:11px;color:var(--text3);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em">Entrada '+(i+1)+'</div>'
      + '<input type="hidden" class="grouped-idx" value="'+idx+'">'
      + '<div class="form-row">'
      + '<div class="form-group"><label class="label">Quantidade</label><input class="input grouped-qty" type="number" step="any" value="'+a.qty+'"/></div>'
      + '<div class="form-group"><label class="label">Moeda</label><select class="input grouped-moeda">'+moedaOpts+'</select></div>'
      + '<div class="form-group"><label class="label">Preço médio</label><input class="input grouped-pm" type="number" step="any" value="'+(a.precoMedioOriginal||a.precoMedio)+'"/></div>'
      + '<div class="form-group"><label class="label">Preço atual (€)</label><input class="input grouped-pa" type="number" step="any" value="'+a.precoAtual+'"/></div>'
      + '</div>'
      + '<div style="text-align:right;margin-top:8px"><button class="btn btn-ghost" style="font-size:11px;color:var(--neg)" data-delete-idx="'+idx+'">Apagar esta entrada</button></div>'
      + '</div>';
  }).join('');
  
  // Replace footer buttons
  const footer = document.getElementById('modal-backdrop').querySelector('.modal-footer');
  footer.innerHTML = '<span style="font-size:12px;color:var(--text2)">'+indices.length+' entradas agrupadas</span><button class="btn btn-primary" id="btn-grouped-guardar">Guardar todas</button>';
  
  modal.style.display = 'flex';
  
  // Delete individual entry
  body.querySelectorAll('[data-delete-idx]').forEach(btn => {
    btn.addEventListener('click', function() {
      if (!confirm('Apagar esta entrada?')) return;
      const delIdx = parseInt(btn.dataset.deleteIdx);
      getAtivos().splice(delIdx, 1);
      saveAtivos();
      modal.style.display = 'none';
      renderAtivos();
      toast('Entrada apagada');
    });
  });
  
  // Save all
  document.getElementById('btn-grouped-guardar').addEventListener('click', async function() {
    const entries = body.querySelectorAll('.grouped-idx');
    for (const entry of entries) {
      const idx = parseInt(entry.value);
      const a = getAtivos()[idx];
      if (!a) continue;
      const moeda = entry.closest('div[style]').querySelector('.grouped-moeda').value;
      const pm = parseFloat(entry.closest('div[style]').querySelector('.grouped-pm').value)||0;
      const pa = parseFloat(entry.closest('div[style]').querySelector('.grouped-pa').value)||0;
      const qty = parseFloat(entry.closest('div[style]').querySelector('.grouped-qty').value)||0;
      const fxRate = moeda==='GBX'?(await getEurRate('GBP'))/100:await getEurRate(moeda);
      a.qty = qty;
      a.moedaCompra = moeda;
      a.precoMedioOriginal = pm;
      a.precoMedio = Math.round(pm*fxRate*10000)/10000;
      a.precoAtual = pa;
    }
    saveAtivos();
    modal.style.display = 'none';
    renderAtivos();
    toast('✓ Entradas atualizadas');
  });
}

function openModal(idx) {
  const a=getAtivos()[idx];
  document.getElementById('edit-idx').value=idx;
  document.getElementById('edit-ticker').value=a.ticker;
  document.getElementById('edit-nome').value=a.nome;
  if(a.tipo==='Cash'){
    document.getElementById('edit-row-normal').style.display='none';
    document.getElementById('edit-row-cash').style.display='flex';
    document.getElementById('edit-cash-val').value=a.cashVal;
    document.getElementById('edit-cash-juro').value=a.cashJuro||'';
  } else {
    document.getElementById('edit-row-normal').style.display='flex';
    document.getElementById('edit-row-cash').style.display='none';
    document.getElementById('edit-qty').value=a.qty;
    const em=document.getElementById('edit-moeda');
    if(em){ em.innerHTML=MOEDAS_OPTIONS; em.value=a.moedaCompra||'EUR'; }
    document.getElementById('edit-preco-medio').value=a.precoMedioOriginal||a.precoMedio;
    document.getElementById('edit-preco-atual').value=a.precoAtual;
  }
  document.getElementById('modal-backdrop').style.display='flex';
}

document.getElementById('modal-close').addEventListener('click', function() {
  const modal = document.getElementById('modal-backdrop');
  modal.style.display='none';
  // Restore original footer
  const footer = modal.querySelector('.modal-footer');
  footer.innerHTML = '<button class="btn btn-ghost" id="btn-apagar">Apagar</button><button class="btn btn-primary" id="btn-editar-guardar">Guardar</button>';
  // Re-attach listeners
  attachModalListeners();
});
document.getElementById('modal-backdrop').addEventListener('click',function(e){
  if(e.target===document.getElementById('modal-backdrop')) document.getElementById('modal-backdrop').style.display='none';
});

function attachModalListeners() {
  const btnApagar = document.getElementById('btn-apagar');
  const btnGuardar = document.getElementById('btn-editar-guardar');
  if (btnApagar) btnApagar.addEventListener('click', handleApagarModal);
  if (btnGuardar) btnGuardar.addEventListener('click', handleGuardarModal);
}

async function handleGuardarModal() {
  const idx=parseInt(document.getElementById('edit-idx').value),a=getAtivos()[idx];
  a.ticker=document.getElementById('edit-ticker').value.trim().toUpperCase();
  a.nome=document.getElementById('edit-nome').value.trim();
  if(a.tipo==='Cash'){
    a.cashVal=parseFloat(document.getElementById('edit-cash-val').value)||0;
    a.cashJuro=parseFloat(document.getElementById('edit-cash-juro').value)||0;
  } else {
    const moeda=document.getElementById('edit-moeda')?.value||'EUR';
    const pm=parseFloat(document.getElementById('edit-preco-medio').value)||0;
    const fxRate=moeda==='GBX'?(await getEurRate('GBP'))/100:await getEurRate(moeda);
    a.qty=parseFloat(document.getElementById('edit-qty').value)||0;
    a.moedaCompra=moeda;a.precoMedioOriginal=pm;
    a.precoMedio=Math.round(pm*fxRate*10000)/10000;
    a.precoAtual=parseFloat(document.getElementById('edit-preco-atual').value)||0;
  }
  saveAtivos();document.getElementById('modal-backdrop').style.display='none';renderAtivos();toast('✓ Ativo atualizado');
}

function handleApagarModal() {
  const idx=parseInt(document.getElementById('edit-idx').value);
  if(confirm('Apagar "'+getAtivos()[idx]?.ticker+'"?')){
    currentP().ativos.splice(idx,1);saveAtivos();
    document.getElementById('modal-backdrop').style.display='none';renderAtivos();toast('Ativo removido');
  }
}

attachModalListeners();

// ── Reset gráfico evolução ────────────────────────────────────────
document.getElementById('btn-reset-evo').addEventListener('click', function() {
  if(!confirm('Apagar o histórico do gráfico de evolução deste portfolio?')) return;
  currentP().history = [];
  saveAll();
  renderEvoChart();
  toast('✓ Histórico apagado');
});

// ── Análise IA ────────────────────────────────────────────────────
document.getElementById('btn-analisar').addEventListener('click', async function() {
  const ativos=getAtivos();
  if(ativos.length===0){toast('Adiciona pelo menos um ativo primeiro');return;}
  if(!getApiKey()&&!askApiKey()) return;
  const empty=document.getElementById('ai-empty'),loading=document.getElementById('ai-loading'),result=document.getElementById('ai-result');
  empty.style.display='none';loading.style.display='flex';result.style.display='none';
  const total=calcTotal(),custo=calcCusto(),gl=total-custo,glPct=custo>0?((gl/custo)*100).toFixed(2):0;
  const resume=ativos.map(a=>{
    const val=valorAtivo(a),c=custoAtivo(a),g=val-c,gPct=c>0?((g/c)*100).toFixed(1):0,peso=total>0?((val/total)*100).toFixed(1):0;
    if(a.tipo==='Cash') return `- ${a.ticker} (Cash): €${val.toFixed(2)}, peso: ${peso}%`;
    return `- ${a.ticker} (${a.nome}) [${a.tipo}]: ${a.qty} unidades, preço médio €${parseFloat(a.precoMedio).toFixed(2)}, preço atual €${parseFloat(a.precoAtual).toFixed(2)}, valor €${val.toFixed(2)}, G/P: ${g>=0?'+':''}€${g.toFixed(2)} (${gPct}%), peso: ${peso}%`;
  }).join('\n');
  const aiPrompt=`Analisa o portfolio "${currentP().nome}" de um investidor português.\n\nValor total: €${total.toFixed(2)}\nCusto base: €${custo.toFixed(2)}\nGanho/Perda: €${gl.toFixed(2)} (${glPct}%)\n\nPOSIÇÕES:\n${resume}\n\nPor favor:\n1. Avaliação geral (diversificação, risco)\n2. Pontos fortes\n3. Riscos ou pontos de atenção\n4. 2-3 sugestões concretas\n5. Nota de 1 a 10 com justificação\n\nUsa ### para títulos. Responde em português de Portugal. Não dês conselhos financeiros formais.`;
  try {
    const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':getApiKey(),'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1000,messages:[{role:'user',content:aiPrompt}]})});
    const data=await response.json(),text=data.content?.[0]?.text||'Sem resposta.';
    const html=text.replace(/### (.+)/g,'<h3>$1</h3>').replace(/## (.+)/g,'<h3>$1</h3>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/^\- (.+)/gm,'<li>$1</li>').replace(/(<li>.*<\/li>)/gs,'<ul>$1</ul>').replace(/\n\n/g,'</p><p>').replace(/^(?!<)(.+)/gm,'<p>$1</p>');
    loading.style.display='none';result.style.display='block';result.innerHTML=html;
  } catch(err) {
    loading.style.display='none';empty.style.display='block';toast('Erro ao contactar a IA.');
  }
});

// ── Importar screenshot ───────────────────────────────────────────
document.querySelectorAll('[data-broker]').forEach(btn=>btn.addEventListener('click',function(){
  document.querySelectorAll('[data-broker]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');selectedBroker=btn.dataset.broker;
}));

const uploadZone=document.getElementById('upload-zone');
const imgUpload=document.getElementById('img-upload');

if(uploadZone) {
  uploadZone.addEventListener('click',()=>imgUpload.click());
  uploadZone.addEventListener('dragover',function(e){e.preventDefault();uploadZone.classList.add('drag-over');});
  uploadZone.addEventListener('dragleave',()=>uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop',function(e){e.preventDefault();uploadZone.classList.remove('drag-over');if(e.dataTransfer.files[0])handleImageFile(e.dataTransfer.files[0]);});
}
if(imgUpload) imgUpload.addEventListener('change',function(e){if(e.target.files[0])handleImageFile(e.target.files[0]);});

function handleImageFile(file) {
  importMediaType = file.type || 'image/jpeg';
  if (!['image/jpeg','image/png','image/gif','image/webp'].includes(importMediaType)) {
    importMediaType = 'image/jpeg';
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    importImageBase64 = dataUrl.split(',')[1];
    document.getElementById('img-preview').src = dataUrl;
    document.getElementById('img-preview-wrap').style.display = 'block';
    document.getElementById('upload-zone').style.display = 'none';
    document.getElementById('import-actions').style.display = 'block';
    document.getElementById('import-result').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

document.getElementById('btn-nova-imagem').addEventListener('click',function(){
  importImageBase64=null;importPositions=[];
  document.getElementById('img-preview-wrap').style.display='none';
  document.getElementById('upload-zone').style.display='block';
  document.getElementById('import-actions').style.display='none';
  document.getElementById('import-result').style.display='none';
  imgUpload.value='';
});

document.getElementById('btn-importar-analisar').addEventListener('click', async function() {
  if(!importImageBase64){toast('Faz upload de uma imagem primeiro');return;}
  if(!getApiKey()&&!askApiKey()) return;
  // Validate base64 - must be substantial
  if(importImageBase64.length < 1000){toast('Imagem inválida ou muito pequena');return;}
  // Log for debugging
  console.log('Image type:', importMediaType, 'Base64 length:', importImageBase64.length);
  document.getElementById('import-loading').style.display='flex';
  document.getElementById('import-actions').style.display='none';
  document.getElementById('import-result').style.display='none';
  const aiPrompt = [
    'Analisa esta screenshot de ' + selectedBroker + ' e extrai TODAS as posicoes de investimento.',
    '',
    'Formato de resposta - JSON array apenas:',
    '[{"ticker":"NOK","nome":"Nokia","tipo":"Acao","qty":2525,"precoMedio":11.87,"moeda":"EUR"}]',
    '',
    'COMO CALCULAR O PRECO MEDIO:',
    'A imagem mostra: quantidade, valor atual em euros, e ganho/perda em euros e percentagem.',
    'Formula: precoMedio = (valorAtual - ganhoEuros) / quantidade',
    'Exemplo LPKF: valor=40050, ganho=+16265.63, qty=1500 -> precoMedio = (40050-16265.63)/1500 = 15.86',
    'Exemplo Nokia: valor=29897.83, ganho=-276.30, qty=2525 -> precoMedio = (29897.83-(-276.30))/2525 = 11.95',
    '',
    'SUFIXOS DE BOLSA:',
    '- Acoes americanas NASDAQ/NYSE: sem sufixo (OUST, HLIT, ALMU, MRAM)',
    '- LSE Londres: .L (IQE.L)',
    '- Frankfurt/XETRA/FWB2: .DE (LPK.DE, 7H6.DE)',
    '- Nokia e cotada em NASDAQ como NOK (nao NOKIA.HE)',
    '- T1 Energy ticker e TE',
    '',
    'CAMPOS:',
    '- tipo: sempre "Acao" para acoes',
    '- moeda: EUR para Trading212, USD para acoes americanas',
    '- Devolve APENAS o JSON array, sem texto, sem markdown'
  ].join('\n');

  try {
    const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':getApiKey(),'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:2000,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:importMediaType,data:importImageBase64}},{type:'text',text:aiPrompt}]}]})});
    const data=await response.json();
    const text=data.content?.[0]?.text||'[]';
    let positions=[];
    try{
      let clean=text.split('```json').join('').split('```').join('').trim();
      const start=clean.indexOf('[');
      const end=clean.lastIndexOf(']');
      if(start!==-1&&end!==-1) clean=clean.slice(start,end+1);
      positions=JSON.parse(clean);
      if(!Array.isArray(positions)) positions=[];
    } catch(err){
      console.error('Parse error:',err,'Text:',text);
      toast('Não foi possível ler as posições. Tenta com uma imagem mais clara.');
    }
    importPositions=positions;
    document.getElementById('import-loading').style.display='none';
    document.getElementById('import-result').style.display='block';
    document.getElementById('import-actions').style.display='block';
    renderImportTable(positions);
  } catch(err) {
    console.error('Import AI error:', err);
    document.getElementById('import-loading').style.display='none';
    document.getElementById('import-actions').style.display='block';
    toast('Erro: ' + (err.message||err));
  }
});

function renderImportTable(positions) {
  const wrap=document.getElementById('import-table-wrap'),title=document.getElementById('import-result-title');
  if(!positions||positions.length===0){wrap.innerHTML='<div class="empty-state"><p>Não foram detetadas posições.<br>Tenta com uma imagem mais clara.</p></div>';title.textContent='Nenhuma posição detetada';return;}
  title.textContent=positions.length+' posição(ões) detetada(s)';
  wrap.innerHTML='<table class="import-table"><thead><tr><th>Ticker</th><th>Nome</th><th>Tipo</th><th>Qtd</th><th>Preço médio</th><th>Moeda</th><th></th></tr></thead><tbody>'+positions.map((p,i)=>'<tr id="import-row-'+i+'"><td><input class="input" id="imp-ticker-'+i+'" value="'+(p.ticker||'')+'" style="width:80px" autocomplete="off"/></td><td><input class="input" id="imp-nome-'+i+'" value="'+(p.nome||'')+'" style="width:140px"/></td><td><select class="input" id="imp-tipo-'+i+'" style="width:90px"><option value="Ação" '+(p.tipo==='Ação'||p.tipo==='Acao'?'selected':'')+'>Ação</option><option value="ETF" '+(p.tipo==='ETF'?'selected':'')+'>ETF</option><option value="Cripto" '+(p.tipo==='Cripto'?'selected':'')+'>Cripto</option><option value="Cash" '+(p.tipo==='Cash'?'selected':'')+'>Cash</option></select></td><td><input class="input" id="imp-qty-'+i+'" value="'+(p.qty||'')+'" type="number" step="any" style="width:80px"/></td><td><input class="input" id="imp-pm-'+i+'" value="'+(p.precoMedio||'')+'" type="number" step="any" style="width:90px"/></td><td><select class="input" id="imp-moeda-'+i+'" style="width:80px">'+['EUR','USD','GBP','GBX','JPY','CHF','CAD','AUD','BRL','SEK','NOK','DKK','HKD','SGD','CNY'].map(m=>'<option value="'+m+'" '+(( p.moeda||'EUR')===m?'selected':'')+'>'+m+'</option>').join('')+'</select></td><td><button class="btn-skip" data-skip="'+i+'">Ignorar</button></td></tr>').join('')+'</tbody></table>';
  document.querySelectorAll('[data-skip]').forEach(btn=>btn.addEventListener('click',function(){
    const i=btn.dataset.skip,row=document.getElementById('import-row-'+i);
    if(btn.classList.contains('skipped')){btn.classList.remove('skipped');btn.textContent='Ignorar';row.classList.remove('import-row-skip');}
    else{btn.classList.add('skipped');btn.textContent='Ignorado';row.classList.add('import-row-skip');}
  }));
  positions.forEach((p,i)=>{
    const input=document.getElementById('imp-ticker-'+i);
    if(!input) return;
    let acTimeout=null;
    input.addEventListener('input',function(){
      clearTimeout(acTimeout);
      const q=input.value.trim();
      if(q.length<2){try{hideImportAC(i);}catch{}return;}
      acTimeout=setTimeout(async()=>{
        try{const results=await searchTickerAutocomplete(q);showImportAC(i,results,input);}
        catch(e){console.warn('Autocomplete error:',e);}
      },300);
    });
    input.addEventListener('blur',()=>setTimeout(()=>{try{hideImportAC(i);}catch{}},200));
  });
}

function showImportAC(i,results,inputEl){
  let dropdown=document.getElementById('imp-ac-'+i);
  if(!dropdown){dropdown=document.createElement('div');dropdown.id='imp-ac-'+i;dropdown.className='ticker-autocomplete';document.body.appendChild(dropdown);}
  if(!results||results.length===0){dropdown.style.display='none';return;}
  const rect=inputEl.getBoundingClientRect();
  dropdown.style.position='fixed';
  dropdown.style.top=(rect.bottom+4)+'px';
  dropdown.style.left=rect.left+'px';
  dropdown.style.width=rect.width+'px';
  dropdown.innerHTML=results.map(r=>'<div class="autocomplete-item" data-symbol="'+r.symbol+'" data-name="'+(r.shortname||'')+'"><span class="ac-ticker">'+r.symbol+'</span><span class="ac-name">'+(r.shortname||'')+'</span><span class="ac-type">'+(r.exchDisp||'')+'</span></div>').join('');
  dropdown.style.display='block';
  dropdown.querySelectorAll('.autocomplete-item').forEach(item=>{
    item.addEventListener('mousedown',function(e){
      e.preventDefault();
      inputEl.value=item.dataset.symbol;
      const nomeEl=document.getElementById('imp-nome-'+i);
      if(nomeEl) nomeEl.value=item.dataset.name;
      dropdown.style.display='none';
    });
  });
}

function hideImportAC(i){
  const d=document.getElementById('imp-ac-'+i);
  if(d) d.style.display='none';
}

document.getElementById('btn-import-guardar').addEventListener('click', async function() {
  if(!importPositions||importPositions.length===0) return;
  const btn=document.getElementById('btn-import-guardar');
  btn.textContent='A guardar...';
  let saved=0,skipped=0;
  for(let i=0;i<importPositions.length;i++){
    const skipBtn=document.querySelector('[data-skip="'+i+'"]');
    if(skipBtn?.classList.contains('skipped')){skipped++;continue;}
    const ticker=document.getElementById('imp-ticker-'+i)?.value.trim().toUpperCase();
    const nome=document.getElementById('imp-nome-'+i)?.value.trim();
    const tipo=document.getElementById('imp-tipo-'+i)?.value;
    const qty=parseFloat(document.getElementById('imp-qty-'+i)?.value);
    const pm=parseFloat(document.getElementById('imp-pm-'+i)?.value);
    const moeda=document.getElementById('imp-moeda-'+i)?.value||'EUR';
    if(!ticker||!qty) continue;
    const fxRate=moeda==='GBX'?(await getEurRate('GBP'))/100:await getEurRate(moeda);
    const precoMedioEur=pm?Math.round(pm*fxRate*10000)/10000:0;
    const precoAtual=await fetchPrice(ticker,nome)||precoMedioEur;
    currentP().ativos.push({tipo:tipo||'Ação',ticker,nome:nome||ticker,qty,moedaCompra:moeda,precoMedioOriginal:pm||0,precoMedio:precoMedioEur,precoAtual});
    saved++;
  }
  saveAtivos();btn.textContent='✓ Guardar todas';
  toast('✓ '+saved+' ativo(s) adicionado(s)'+(skipped>0?', '+skipped+' ignorado(s)':''));
  showPage('dashboard');
});

// ── Toast ─────────────────────────────────────────────────────────
function toast(msg) {
  let t=document.querySelector('.toast');
  if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);}
  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}

// ── Botões sidebar ────────────────────────────────────────────────
document.getElementById('btn-refresh-all').addEventListener('click', atualizarTodosPrecos);
document.getElementById('btn-clear-key').addEventListener('click',function(){
  if(getApiKey()){if(confirm('Apagar a chave API guardada?')){localStorage.removeItem(API_KEY_STORAGE);toast('✓ Chave apagada');}}
  else{toast('Não há chave guardada');}
});

// ── Toggle agrupar ────────────────────────────────────────────────
const toggleAgrupar = document.getElementById('toggle-agrupar');
if(toggleAgrupar) {
  toggleAgrupar.addEventListener('change', function() {
    currentP().agrupar = this.checked;
    saveAll();
    renderAtivos();
  });
}

// ── Sort ──────────────────────────────────────────────────────────
document.addEventListener('click', function(e) {
  const sortMenu = document.getElementById('sort-menu');
  const btnSort = document.getElementById('btn-sort');
  if (!sortMenu) return;
  if (e.target.closest('#btn-sort')) {
    e.stopPropagation();
    sortMenu.style.display = sortMenu.style.display==='none'?'block':'none';
    return;
  }
  if (e.target.closest('.sort-option')) {
    const opt = e.target.closest('.sort-option');
    currentSort = opt.dataset.sort;
    document.querySelectorAll('.sort-option').forEach(o=>o.classList.remove('active'));
    opt.classList.add('active');
    const labels = {'valor':'Valor','gl-eur':'G/P €','gl-pct':'G/P %','ticker':'A-Z'};
    btnSort.textContent = '↕ '+(labels[currentSort]||'Ordenar');
    sortMenu.style.display = 'none';
    renderAtivos();
    return;
  }
  sortMenu.style.display = 'none';
});

// ── Init ──────────────────────────────────────────────────────────
toggleCashFields();
renderSidebar();
prefetchAllRates().then(()=>renderDashboard());
