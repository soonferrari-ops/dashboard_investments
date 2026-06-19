// ── Config ─────────────────────────────────────────────────────────
const PORTFOLIOS_KEY  = 'portfolios_v2';
const API_KEY_STORAGE = 'portfolio_anthropic_key';
const PRICE_PROXY     = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const PORTFOLIO_COLORS = ['#5b8dee','#9b7de8','#4caf82','#e6a140','#e05c5c','#5bc4c4'];

function getApiKey() { return localStorage.getItem(API_KEY_STORAGE) || ''; }
function uid() { return Math.random().toString(36).slice(2,10); }

// ── Estado ─────────────────────────────────────────────────────────
let portfolios = JSON.parse(localStorage.getItem(PORTFOLIOS_KEY) || 'null');
if (!portfolios) {
  portfolios = [{ id: uid(), nome: 'Principal', ativos: [], history: [] }];
  saveAll();
}
let currentPortfolioId = portfolios[0].id;
let selectedType = 'Ação';
let evoChart = null, pieChart = null, currentPeriod = '1m';
const COLORS = { 'Ação':'#5b8dee','ETF':'#9b7de8','Cripto':'#e6a140','Cash':'#4caf82' };

function currentP() { return portfolios.find(p => p.id === currentPortfolioId) || portfolios[0]; }
function getAtivos() { return currentP().ativos; }

// ── Persistência ───────────────────────────────────────────────────
function saveAll() { localStorage.setItem(PORTFOLIOS_KEY, JSON.stringify(portfolios)); }
function saveAtivos() {
  const p = currentP(), today = new Date().toISOString().split('T')[0], total = calcTotal();
  p.history = (p.history||[]).filter(h => h.d !== today);
  p.history.push({ d: today, v: total });
  if (p.history.length > 365) p.history = p.history.slice(-365);
  saveAll();
}

// ── Cálculos ───────────────────────────────────────────────────────
function valorAtivo(a) { if(a.tipo==='Cash') return parseFloat(a.cashVal)||0; return (parseFloat(a.qty)||0)*(parseFloat(a.precoAtual)||0); }
function custoAtivo(a) { if(a.tipo==='Cash') return parseFloat(a.cashVal)||0; return (parseFloat(a.qty)||0)*(parseFloat(a.precoMedio)||0); }
function calcTotalFrom(ativos) { return ativos.reduce((s,a)=>s+valorAtivo(a),0); }
function calcCustoFrom(ativos) { return ativos.reduce((s,a)=>s+custoAtivo(a),0); }
function calcTotal() { return calcTotalFrom(getAtivos()); }
function calcCusto() { return calcCustoFrom(getAtivos()); }
function calcCash() { return getAtivos().filter(a=>a.tipo==='Cash').reduce((s,a)=>s+valorAtivo(a),0); }

// ── Formatação ─────────────────────────────────────────────────────
function fmt(n) { return '€'+Number(n).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtPct(n) { return (n>=0?'+':'')+Number(n).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})+'%'; }

// ── Navegação ──────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+id)?.classList.add('active');
  document.querySelector(`.nav-item[data-page="${id}"]`)?.classList.add('active');
  if(id==='global') renderGlobal();
  if(id==='dashboard') renderDashboard();
  if(id==='ativos') renderAtivos();
  if(id==='analise') { document.getElementById('analise-sub').textContent=currentP().nome; }
  if(id==='adicionar') { document.getElementById('adicionar-sub').textContent='A adicionar em: '+currentP().nome; }
}

document.addEventListener('click', e => {
  const pg = e.target.closest('[data-page]');
  if(pg && !pg.classList.contains('portfolio-item')){e.preventDefault();showPage(pg.dataset.page);}
});

// ── Sidebar portfolios ─────────────────────────────────────────────
function renderSidebar() {
  const list = document.getElementById('portfolio-list');
  list.innerHTML = '';
  portfolios.forEach((p,i) => {
    const div = document.createElement('div');
    div.className = 'portfolio-item'+(p.id===currentPortfolioId?' active':'');
    div.innerHTML = `<span class="portfolio-item-name"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${PORTFOLIO_COLORS[i%PORTFOLIO_COLORS.length]};margin-right:7px;vertical-align:middle"></span>${p.nome}</span><button class="portfolio-item-edit" data-edit-portfolio="${p.id}">✎</button>`;
    div.addEventListener('click', e => { if(e.target.closest('[data-edit-portfolio]'))return; currentPortfolioId=p.id; renderSidebar(); showPage('dashboard'); });
    list.appendChild(div);
  });
  document.querySelectorAll('[data-edit-portfolio]').forEach(btn => btn.addEventListener('click', e=>{e.stopPropagation();openPortfolioModal(btn.dataset.editPortfolio);}));
}

// ── Modal portfolio ────────────────────────────────────────────────
let editingPortfolioId = null;
function openPortfolioModal(id) {
  editingPortfolioId = id||null;
  const p = id?portfolios.find(x=>x.id===id):null;
  document.getElementById('modal-portfolio-title').textContent = p?'Editar portfolio':'Novo portfolio';
  document.getElementById('portfolio-nome-input').value = p?p.nome:'';
  document.getElementById('btn-guardar-portfolio').textContent = p?'Guardar':'Criar';
  document.getElementById('btn-apagar-portfolio').style.display = (p&&portfolios.length>1)?'block':'none';
  document.getElementById('modal-portfolio-backdrop').style.display='flex';
  setTimeout(()=>document.getElementById('portfolio-nome-input').focus(),50);
}
function closePortfolioModal() { document.getElementById('modal-portfolio-backdrop').style.display='none'; editingPortfolioId=null; }
document.getElementById('btn-new-portfolio').addEventListener('click',()=>openPortfolioModal(null));
document.getElementById('modal-portfolio-close').addEventListener('click',closePortfolioModal);
document.getElementById('modal-portfolio-backdrop').addEventListener('click',e=>{if(e.target===document.getElementById('modal-portfolio-backdrop'))closePortfolioModal();});
document.getElementById('btn-guardar-portfolio').addEventListener('click',()=>{
  const nome=document.getElementById('portfolio-nome-input').value.trim();
  if(!nome){toast('Dá um nome ao portfolio');return;}
  if(editingPortfolioId){const p=portfolios.find(x=>x.id===editingPortfolioId);if(p)p.nome=nome;}
  else{const novo={id:uid(),nome,ativos:[],history:[]};portfolios.push(novo);currentPortfolioId=novo.id;}
  saveAll();closePortfolioModal();renderSidebar();showPage('dashboard');toast('✓ Portfolio '+(editingPortfolioId?'atualizado':'criado'));
});
document.getElementById('btn-apagar-portfolio').addEventListener('click',()=>{
  const p=portfolios.find(x=>x.id===editingPortfolioId);
  if(!p||!confirm(`Apagar o portfolio "${p.nome}" e todos os seus ativos?`))return;
  portfolios=portfolios.filter(x=>x.id!==editingPortfolioId);
  if(currentPortfolioId===editingPortfolioId)currentPortfolioId=portfolios[0].id;
  saveAll();closePortfolioModal();renderSidebar();showPage('dashboard');toast('Portfolio apagado');
});

// ── Global ─────────────────────────────────────────────────────────
function renderGlobal() {
  const allAtivos=portfolios.flatMap(p=>p.ativos);
  const total=calcTotalFrom(allAtivos),custo=calcCustoFrom(allAtivos),gl=total-custo;
  const glPct=custo>0?(gl/custo)*100:0,cash=allAtivos.filter(a=>a.tipo==='Cash').reduce((s,a)=>s+valorAtivo(a),0),cashPct=total>0?(cash/total)*100:0;
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
    const pT=calcTotalFrom(p.ativos),pC=calcCustoFrom(p.ativos),pG=pT-pC,pGP=pC>0?(pG/pC)*100:0,cor=PORTFOLIO_COLORS[i%PORTFOLIO_COLORS.length];
    return `<div class="global-portfolio-card" data-goto="${p.id}"><div class="gpc-left"><div class="gpc-dot" style="background:${cor}"></div><div><div class="gpc-name">${p.nome}</div><div class="gpc-sub">${p.ativos.length} ativo(s)</div></div></div><div class="gpc-right"><div class="gpc-value">${fmt(pT)}</div><div class="gpc-gl ${pG>=0?'pos':'neg'}">${fmt(pG)} (${fmtPct(pGP)})</div></div></div>`;
  }).join('');
  document.querySelectorAll('[data-goto]').forEach(el=>el.addEventListener('click',()=>{currentPortfolioId=el.dataset.goto;renderSidebar();showPage('dashboard');}));
}

// ── Dashboard ──────────────────────────────────────────────────────
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
  renderEvoChart();renderPieChart();renderDashTable();
}

function renderDashTable() {
  const ativos=getAtivos(),tbody=document.getElementById('dash-tbody'),table=document.getElementById('dash-table'),empty=document.getElementById('dash-empty');
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

// ── Gráficos ───────────────────────────────────────────────────────
async function renderEvoChart() {
  const ativos=getAtivos(),canvas=document.getElementById('evoChart'),empty=document.getElementById('evo-empty');
  if(ativos.length===0){canvas.style.display='none';empty.classList.add('visible');if(evoChart){evoChart.destroy();evoChart=null;}return;}
  const mainAtivo=ativos.find(a=>a.tipo!=='Cash');let labels=[],data=[];
  if(mainAtivo){
    const hist=await fetchHistoricalPrices(mainAtivo.ticker,currentPeriod);
    if(hist&&hist.length>1){const fc=hist[0].close,cv=calcTotal();labels=hist.map(h=>new Date(h.d).toLocaleDateString('pt-PT',{day:'2-digit',month:'short'}));data=hist.map(h=>Math.round((h.close/fc)*cv*100)/100);}
  }
  if(data.length<2){
    const days={'1m':30,'3m':90,'6m':180,'1a':365}[currentPeriod]||30,cutoff=new Date(Date.now()-days*86400000),filtered=(currentP().history||[]).filter(h=>new Date(h.d)>=cutoff);
    if(filtered.length<2){canvas.style.display='none';empty.classList.add('visible');if(evoChart){evoChart.destroy();evoChart=null;}return;}
    labels=filtered.map(h=>new Date(h.d).toLocaleDateString('pt-PT',{day:'2-digit',month:'short'}));data=filtered.map(h=>h.v);
  }
  canvas.style.display='block';empty.classList.remove('visible');
  if(evoChart)evoChart.destroy();
  evoChart=new Chart(canvas,{type:'line',data:{labels,datasets:[{data,borderColor:'#5b8dee',borderWidth:2,pointRadius:0,pointHoverRadius:4,fill:true,backgroundColor:ctx=>{const g=ctx.chart.ctx.createLinearGradient(0,0,0,200);g.addColorStop(0,'rgba(91,141,238,0.15)');g.addColorStop(1,'rgba(91,141,238,0)');return g;},tension:0.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>fmt(ctx.raw)},backgroundColor:'#1a1e28',borderColor:'#252935',borderWidth:1,titleColor:'#8b90a0',bodyColor:'#e8eaf0',padding:10}},scales:{x:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#555d70',font:{size:11},maxTicksLimit:6}},y:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#555d70',font:{size:11},callback:v=>'€'+(v/1000).toFixed(0)+'k'}}}}});
}

document.querySelectorAll('.chart-tab').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.chart-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');currentPeriod=btn.dataset.period;renderEvoChart();}));

function renderPieChart() {
  const ativos=getAtivos(),canvas=document.getElementById('pieChart'),empty=document.getElementById('pie-empty'),legend=document.getElementById('pie-legend'),donutLabel=document.getElementById('donut-label');
  if(ativos.length===0){canvas.style.display='none';empty.classList.add('visible');legend.innerHTML='';donutLabel.textContent='—';if(pieChart){pieChart.destroy();pieChart=null;}return;}
  canvas.style.display='block';empty.classList.remove('visible');
  const tipos=['Ação','ETF','Cripto','Cash'],total=calcTotal(),vals=tipos.map(t=>ativos.filter(a=>a.tipo===t).reduce((s,a)=>s+valorAtivo(a),0)),labels=tipos.filter((_,i)=>vals[i]>0),data=vals.filter(v=>v>0),colors=labels.map(t=>COLORS[t]);
  donutLabel.textContent=fmt(total);
  legend.innerHTML=labels.map((l,i)=>`<div class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span>${l} ${total>0?((data[i]/total)*100).toFixed(1):0}%</div>`).join('');
  if(pieChart)pieChart.destroy();
  pieChart=new Chart(canvas,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:0,hoverOffset:4}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${fmt(ctx.raw)} (${((ctx.raw/total)*100).toFixed(1)}%)`},backgroundColor:'#1a1e28',borderColor:'#252935',borderWidth:1,bodyColor:'#e8eaf0',padding:10}}}});
}

// ── Ativos ─────────────────────────────────────────────────────────
function renderAtivos() {
  const ativos=getAtivos(),p=currentP();
  document.getElementById('ativos-title').textContent=p.nome;
  document.getElementById('ativos-sub').textContent=ativos.length+' posições';
  const tbody=document.getElementById('ativos-tbody'),table=document.getElementById('ativos-table'),empty=document.getElementById('ativos-empty');
  tbody.innerHTML='';
  if(ativos.length===0){table.style.display='none';empty.style.display='block';return;}
  table.style.display='table';empty.style.display='none';
  const total=calcTotal();
  [...ativos].sort((a,b)=>valorAtivo(b)-valorAtivo(a)).forEach(a=>{
    const realIdx=ativos.indexOf(a),val=valorAtivo(a),custo=custoAtivo(a),gl=val-custo,glPct=custo>0?(gl/custo)*100:0,peso=total>0?(val/total)*100:0,cor=COLORS[a.tipo]||'#888';
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><div class="ticker-name">${a.ticker}</div><div class="ticker-full">${a.nome}</div></td><td><span class="tag tag-${a.tipo}">${a.tipo}</span></td><td class="right" style="font-family:var(--mono)">${a.tipo==='Cash'?'—':Number(a.qty).toLocaleString('pt-PT')}</td><td class="right" style="font-family:var(--mono)">${a.tipo==='Cash'?'—':fmt(a.precoMedio)}</td><td class="right" style="font-family:var(--mono)">${a.tipo==='Cash'?'—':fmt(parseFloat(a.precoAtual)||0)}</td><td class="right" style="font-family:var(--mono)">${fmt(val)}</td><td class="right"><div class="${gl>=0?'pos':'neg'}" style="font-family:var(--mono)">${fmt(gl)}</div><div class="${gl>=0?'pos':'neg'}" style="font-size:11px">${fmtPct(glPct)}</div></td><td class="right"><div style="display:flex;align-items:center;justify-content:flex-end;gap:6px"><div class="bar-wrap"><div class="bar" style="width:${Math.min(peso,100)}%;background:${cor}"></div></div><span style="font-size:12px;font-family:var(--mono);color:var(--text2)">${peso.toFixed(1)}%</span></div></td><td><button class="btn-icon" data-edit="${realIdx}">✎</button></td>`;
    tbody.appendChild(tr);
  });
  document.querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>openModal(parseInt(btn.dataset.edit))));
}

// ── Preços ─────────────────────────────────────────────────────────
const FX_CACHE = {};

// Proxies CORS em sequência — tenta o próximo se o anterior falhar
const PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

async function yahooFetch(yahooUrl) {
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy(yahooUrl), { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.chart?.result) return data;
    } catch {}
  }
  return null;
}

function detectCurrency(meta) {
  const c = meta?.currency || 'USD';
  return (c === 'GBp' || c === 'GBX') ? 'GBX' : c;
}

// Vai buscar todas as taxas de câmbio de uma vez para ser eficiente
const CURRENCIES_TO_FETCH = ['USD','GBP','JPY','CHF','CAD','AUD','SEK','NOK','DKK','HKD','SGD','BRL','CNY'];
let fxFetchedAll = false;

async function prefetchAllRates() {
  if (fxFetchedAll) return;
  // Buscar todas as taxas em paralelo
  await Promise.all(CURRENCIES_TO_FETCH.map(async cur => {
    if (FX_CACHE[cur]) return;
    try {
      const data = await yahooFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${cur}EUR=X?interval=1d&range=1d`);
      const rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (rate) FX_CACHE[cur] = parseFloat(rate);
    } catch {}
  }));
  fxFetchedAll = true;
}

async function getEurRate(currency) {
  if (currency === 'EUR') return 1;
  // Se ainda não temos a taxa, ir buscar agora
  if (!FX_CACHE[currency]) {
    try {
      const data = await yahooFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${currency}EUR=X?interval=1d&range=1d`);
      const rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (rate) FX_CACHE[currency] = parseFloat(rate);
    } catch {}
  }
  return FX_CACHE[currency] || 1;
}

async function fetchPrice(ticker) {
  const data = await yahooFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`);
  if (!data) return null;
  const meta = data.chart.result[0].meta;
  if (!meta?.regularMarketPrice) return null;
  let price = parseFloat(meta.regularMarketPrice);
  const currency = detectCurrency(meta);
  if (currency === 'GBX') price = price / 100;
  const eurRate = await getEurRate(currency === 'GBX' ? 'GBP' : currency);
  return Math.round(price * eurRate * 10000) / 10000;
}

async function fetchHistoricalPrices(ticker, period) {
  const ranges = {'1m':'1mo','3m':'3mo','6m':'6mo','1a':'1y'};
  const data = await yahooFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=${ranges[period]||'1mo'}`);
  if (!data) return null;
  const result = data.chart.result[0];
  const currency = detectCurrency(result.meta);
  const gbxDiv = currency === 'GBX' ? 100 : 1;
  const eurRate = await getEurRate(currency === 'GBX' ? 'GBP' : currency);
  const timestamps = result.timestamp, closes = result.indicators?.quote?.[0]?.close;
  if (!timestamps || !closes) return null;
  return timestamps.map((t,i) => ({
    d: new Date(t*1000).toISOString().split('T')[0],
    close: closes[i] != null ? (closes[i] / gbxDiv) * eurRate : null
  })).filter(p => p.close != null);
}

async function atualizarTodosPrecos(){
  const btn=document.getElementById('btn-refresh-all');btn.textContent='↻ A atualizar...';
  // Limpar cache e ir buscar taxas atualizadas
  Object.keys(FX_CACHE).forEach(k => delete FX_CACHE[k]);
  fxFetchedAll = false;
  await prefetchAllRates();
  const ativos=getAtivos();let n=0;
  for(let i=0;i<ativos.length;i++){
    if(ativos[i].tipo==='Cash')continue;
    const price=await fetchPrice(ativos[i].ticker);
    if(price){
      ativos[i].precoAtual=price;
      n++;
    }
  }
  saveAtivos();renderDashboard();renderAtivos();btn.textContent='↻ Atualizar preços';
  document.getElementById('last-update').textContent='Atualizado: '+new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
  toast(`✓ ${n} preço(s) atualizado(s)`);
}
document.getElementById('btn-refresh-all').addEventListener('click',atualizarTodosPrecos);

// ── Análise IA ─────────────────────────────────────────────────────
document.getElementById('btn-analisar').addEventListener('click',async()=>{
  const ativos=getAtivos();if(ativos.length===0){toast('Adiciona pelo menos um ativo primeiro');return;}
  if(!getApiKey()){const chave=prompt('Introduz a tua chave API da Anthropic (começa por sk-ant-):\n\nFica guardada apenas no teu browser.');if(!chave||!chave.trim().startsWith('sk-ant-')){toast('Chave inválida');return;}localStorage.setItem(API_KEY_STORAGE,chave.trim());toast('✓ Chave guardada');}
  const empty=document.getElementById('ai-empty'),loading=document.getElementById('ai-loading'),result=document.getElementById('ai-result');
  empty.style.display='none';loading.style.display='flex';result.style.display='none';
  const total=calcTotal(),custo=calcCusto(),gl=total-custo,glPct=custo>0?((gl/custo)*100).toFixed(2):0;
  const resume=ativos.map(a=>{const val=valorAtivo(a),c=custoAtivo(a),g=val-c,gPct=c>0?((g/c)*100).toFixed(1):0,peso=total>0?((val/total)*100).toFixed(1):0;if(a.tipo==='Cash')return `- ${a.ticker} (Cash): €${val.toFixed(2)}, peso: ${peso}%`;return `- ${a.ticker} (${a.nome}) [${a.tipo}]: ${a.qty} unidades, preço médio €${parseFloat(a.precoMedio).toFixed(2)}, preço atual €${parseFloat(a.precoAtual).toFixed(2)}, valor €${val.toFixed(2)}, G/P: ${g>=0?'+':''}€${g.toFixed(2)} (${gPct}%), peso: ${peso}%`;}).join('\n');
  const prompt=`Analisa o portfolio "${currentP().nome}" de um investidor português.\n\nValor total: €${total.toFixed(2)}\nCusto base: €${custo.toFixed(2)}\nGanho/Perda: €${gl.toFixed(2)} (${glPct}%)\n\nPOSIÇÕES:\n${resume}\n\nPor favor:\n1. Avaliação geral (diversificação, risco)\n2. Pontos fortes\n3. Riscos ou pontos de atenção\n4. 2-3 sugestões concretas\n5. Nota de 1 a 10 com justificação\n\nUsa ### para títulos. Responde em português de Portugal. Não dês conselhos financeiros formais.`;
  try{
    const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':getApiKey(),'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1000,messages:[{role:'user',content:prompt}]})});
    const data=await response.json(),text=data.content?.[0]?.text||'Sem resposta.';
    const html=text.replace(/### (.+)/g,'<h3>$1</h3>').replace(/## (.+)/g,'<h3>$1</h3>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/^\- (.+)/gm,'<li>$1</li>').replace(/(<li>.*<\/li>)/gs,'<ul>$1</ul>').replace(/\n\n/g,'</p><p>').replace(/^(?!<)(.+)/gm,'<p>$1</p>');
    loading.style.display='none';result.style.display='block';result.innerHTML=html;
  }catch(err){loading.style.display='none';empty.style.display='block';toast('Erro ao contactar a IA.');}
});

// ── Formulário adicionar ───────────────────────────────────────────
document.querySelectorAll('.type-btn').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');selectedType=btn.dataset.type;toggleCashFields();updatePreview();}));
function toggleCashFields(){const isCash=selectedType==='Cash';document.getElementById('row-qty-price').style.display=isCash?'none':'flex';document.getElementById('row-cash').style.display=isCash?'flex':'none';}
['f-qty','f-preco-medio','f-preco-atual','f-cash-val'].forEach(id=>document.getElementById(id)?.addEventListener('input',updatePreview));
document.getElementById('f-moeda')?.addEventListener('change',()=>{
  const m=document.getElementById('f-moeda').value;
  const sym={EUR:'€',USD:'$',GBP:'£',GBX:'p',JPY:'¥',CHF:'₣',CAD:'CA$',AUD:'AU$',BRL:'R$',SEK:'kr',NOK:'kr',DKK:'kr',HKD:'HK$',SGD:'S$',CNY:'¥'};
  const lbl=document.getElementById('label-moeda-compra');
  if(lbl)lbl.textContent=(sym[m]||m)+' '+m;
  updatePreview();
});
async function updatePreview(){
  const preview=document.getElementById('form-preview');
  if(selectedType==='Cash'){const val=parseFloat(document.getElementById('f-cash-val').value)||0;if(!val){preview.style.display='none';return;}preview.style.display='block';document.getElementById('prev-investido').textContent=fmt(val);document.getElementById('prev-atual').textContent=fmt(val);document.getElementById('prev-gl').textContent='€0,00 (0,00%)';document.getElementById('prev-gl').className='';}
  else{
    const qty=parseFloat(document.getElementById('f-qty').value)||0;
    const pm=parseFloat(document.getElementById('f-preco-medio').value)||0;
    const pa=parseFloat(document.getElementById('f-preco-atual').value)||0;
    const moeda=document.getElementById('f-moeda')?.value||'EUR';
    if(!qty||!pm){preview.style.display='none';return;}
    preview.style.display='block';
    // Converter preço médio para EUR para o preview
    const fxRate=moeda==='GBX'?(await getEurRate('GBP'))/100:await getEurRate(moeda);
    const investido=qty*pm*fxRate;
    const atual=qty*pa; // preço atual já está em EUR (vem do fetchPrice)
    const gl=atual-investido,glPct=investido>0?(gl/investido)*100:0;
    document.getElementById('prev-investido').textContent=fmt(investido)+` (${moeda} ${(qty*pm).toFixed(2)})`;
    document.getElementById('prev-atual').textContent=pa>0?fmt(atual):'—';
    document.getElementById('prev-gl').textContent=pa>0?`${fmt(gl)} (${fmtPct(glPct)})`:'—';
    document.getElementById('prev-gl').className=gl>=0?'pos':'neg';
  }
}
document.getElementById('btn-fetch-price').addEventListener('click',async()=>{
  const ticker=document.getElementById('f-ticker').value.trim().toUpperCase();if(!ticker){toast('Escreve um ticker primeiro');return;}
  const btn=document.getElementById('btn-fetch-price');btn.textContent='...';
  const price=await fetchPrice(ticker);btn.textContent='↓ Preço';
  if(price){document.getElementById('f-preco-atual').value=price;updatePreview();toast(`✓ Preço: €${price.toFixed(2)}`);}
  else toast('Não foi possível obter o preço. Tenta ex: AAPL, BTC-USD, VWCE.AS');
});
document.getElementById('btn-guardar').addEventListener('click',async()=>{
  const ticker=document.getElementById('f-ticker').value.trim().toUpperCase(),nome=document.getElementById('f-nome').value.trim();
  if(!ticker){toast('Preenche o ticker');return;}
  const ativo={tipo:selectedType,ticker,nome:nome||ticker};
  if(selectedType==='Cash'){const val=parseFloat(document.getElementById('f-cash-val').value);if(!val){toast('Preenche o valor em cash');return;}ativo.cashVal=val;ativo.cashJuro=parseFloat(document.getElementById('f-cash-juro').value)||0;}
  else{
    const qty=parseFloat(document.getElementById('f-qty').value),pm=parseFloat(document.getElementById('f-preco-medio').value),pa=parseFloat(document.getElementById('f-preco-atual').value);
    const moeda=document.getElementById('f-moeda')?.value||'EUR';
    if(!qty||!pm){toast('Preenche a quantidade e o preço médio');return;}
    const fxRate=moeda==='GBX'?(await getEurRate('GBP'))/100:await getEurRate(moeda);
    ativo.qty=qty;ativo.moedaCompra=moeda;ativo.precoMedioOriginal=pm;ativo.precoMedio=Math.round(pm*fxRate*10000)/10000;
    // Se não há preço atual, tentar buscar automaticamente
    if(pa){ativo.precoAtual=pa;}
    else{
      toast('A buscar preço atual...');
      const fetched=await fetchPrice(ticker);
      ativo.precoAtual=fetched||ativo.precoMedio;
    }
  }
  currentP().ativos.push(ativo);saveAtivos();resetForm();toast('✓ Ativo adicionado!');showPage('dashboard');
});
document.getElementById('btn-cancelar').addEventListener('click',()=>{resetForm();showPage('dashboard');});
function resetForm(){['f-ticker','f-nome','f-qty','f-preco-medio','f-preco-atual','f-cash-val','f-cash-juro'].forEach(id=>document.getElementById(id).value='');const fm=document.getElementById('f-moeda');if(fm)fm.value='EUR';const lbl=document.getElementById('label-moeda-compra');if(lbl)lbl.textContent='€';document.getElementById('form-preview').style.display='none';selectedType='Ação';document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('active'));document.querySelector('.type-btn[data-type="Ação"]').classList.add('active');toggleCashFields();}

// ── Modal editar ativo ─────────────────────────────────────────────
function openModal(idx){
  const a=getAtivos()[idx];document.getElementById('edit-idx').value=idx;document.getElementById('edit-ticker').value=a.ticker;document.getElementById('edit-nome').value=a.nome;
  if(a.tipo==='Cash'){document.getElementById('edit-row-normal').style.display='none';document.getElementById('edit-row-cash').style.display='flex';document.getElementById('edit-cash-val').value=a.cashVal;document.getElementById('edit-cash-juro').value=a.cashJuro||'';}
  else{document.getElementById('edit-row-normal').style.display='flex';document.getElementById('edit-row-cash').style.display='none';document.getElementById('edit-qty').value=a.qty;const em=document.getElementById('edit-moeda');if(em)em.value=a.moedaCompra||'EUR';document.getElementById('edit-preco-medio').value=a.precoMedioOriginal||a.precoMedio;document.getElementById('edit-preco-atual').value=a.precoAtual;}
  document.getElementById('modal-backdrop').style.display='flex';
}
document.getElementById('modal-close').addEventListener('click',()=>document.getElementById('modal-backdrop').style.display='none');
document.getElementById('modal-backdrop').addEventListener('click',e=>{if(e.target===document.getElementById('modal-backdrop'))document.getElementById('modal-backdrop').style.display='none';});
document.getElementById('btn-editar-guardar').addEventListener('click',async()=>{
  const idx=parseInt(document.getElementById('edit-idx').value),a=getAtivos()[idx];
  a.ticker=document.getElementById('edit-ticker').value.trim().toUpperCase();a.nome=document.getElementById('edit-nome').value.trim();
  if(a.tipo==='Cash'){a.cashVal=parseFloat(document.getElementById('edit-cash-val').value)||0;a.cashJuro=parseFloat(document.getElementById('edit-cash-juro').value)||0;}
  else{
    const moeda=document.getElementById('edit-moeda')?.value||'EUR';
    const pm=parseFloat(document.getElementById('edit-preco-medio').value)||0;
    const fxRate=moeda==='GBX'?(await getEurRate('GBP'))/100:await getEurRate(moeda);
    a.qty=parseFloat(document.getElementById('edit-qty').value)||0;a.moedaCompra=moeda;a.precoMedioOriginal=pm;a.precoMedio=Math.round(pm*fxRate*10000)/10000;a.precoAtual=parseFloat(document.getElementById('edit-preco-atual').value)||0;
  }
  saveAtivos();document.getElementById('modal-backdrop').style.display='none';renderAtivos();toast('✓ Ativo atualizado');
});
document.getElementById('btn-apagar').addEventListener('click',()=>{
  const idx=parseInt(document.getElementById('edit-idx').value);
  if(confirm(`Apagar "${getAtivos()[idx].ticker}"?`)){currentP().ativos.splice(idx,1);saveAtivos();document.getElementById('modal-backdrop').style.display='none';renderAtivos();toast('Ativo removido');}
});

// ── Toast ──────────────────────────────────────────────────────────
function toast(msg){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);}t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);}

// ── Init ───────────────────────────────────────────────────────────
document.getElementById('btn-clear-key')?.addEventListener('click',()=>{if(getApiKey()){if(confirm('Apagar a chave API guardada?')){localStorage.removeItem(API_KEY_STORAGE);toast('✓ Chave apagada');}}else{toast('Não há chave guardada');}});

toggleCashFields();
renderSidebar();
prefetchAllRates().then(() => renderDashboard());
