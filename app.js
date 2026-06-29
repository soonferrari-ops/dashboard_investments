// ── Config ────────────────────────────────────────────────────────
const PORTFOLIOS_KEY   = 'portfolios_v2';
const SETTINGS_KEY     = 'portfolio_settings';
const API_KEY_STORAGE  = 'portfolio_anthropic_key';
const PORTFOLIO_COLORS = ['#5b8dee','#9b7de8','#4caf82','#e6a140','#e05c5c','#5bc4c4'];
const COLORS = { 'Ação':'#5b8dee','ETF':'#9b7de8','Cripto':'#e6a140','Cash':'#4caf82' };
const FX_CACHE = {};
let fxFetchedAll = false;
let currentUser = null;

// ── Settings ──────────────────────────────────────────────────────
const DEFAULT_SETTINGS = { theme: 'dark', lang: 'pt', currency: 'EUR', numfmt: 'pt' };
let settings = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };

const CURRENCY_SYMBOLS = { EUR:'€', USD:'$', GBP:'£', CHF:'₣', JPY:'¥', BRL:'R$', CAD:'C$', AUD:'A$', CNY:'¥', HKD:'HK$' };
const TRANSLATIONS = {
  pt: { global:'Global', dashboard:'Dashboard', ativos:'Ativos', analise:'Análise IA', adicionar:'Adicionar ativo', importar:'Importar screenshot', valorTotal:'Valor total', ganhoPerda:'Ganho / Perda', custoBase:'Custo base', cashDisp:'Cash disponível', cashTotal:'Cash total', evolucao:'Evolução', alocacao:'Alocação', alocacaoTipo:'Alocação por tipo', posicoes:'Posições', verTodas:'Ver todas →', agrupar:'Agrupar', atualizar:'Atualizar preços', definicoes:'Definições', portfolios:'Portfolios', valorInvestido:'valor investido', globalSub:'Todos os portfolios consolidados', semDados:'Sem dados', reset:'Reset', novoPortfolio:'+ Novo portfolio', apagarChave:'✕ Apagar chave IA', thAtivo:'Ativo', thTipo:'Tipo', thPreco:'Preço atual', thValor:'Valor', thGanho:'Ganho / Perda', thPeso:'Peso', thQtd:'Qtd.', thPrecoMedio:'Preço médio', posActivas:'posições activas', doTotal:'do total', settingsTema:'Tema', settingsLingua:'Língua', settingsMoeda:'Moeda padrão', settingsFormato:'Formato de números', temaEscuro:'🌙 Escuro', temaClaro:'☀️ Claro', temaSistema:'💻 Sistema', guardar:'Guardar', cancelar:'Cancelar', apagar:'Apagar', criar:'Criar', ordenar:'↕ Ordenar', adicionar2:'+ Adicionar', sortValor:'Valor', sortGL:'Ganho/Perda €', sortGLPct:'Ganho/Perda %', sortTicker:'Ticker A-Z', sortPeso:'Peso', semAtivos:'Ainda não tens ativos.', adicionaPrimeiro:'Adiciona o primeiro →', analisePortfolio:'Análise do portfolio', analiseDesc:'Powered by Claude · Os dados ficam apenas no teu browser', analisarAgora:'Analisar agora', analisando:'A analisar o teu portfolio...', analisandoImg:'A analisar a screenshot...', tipoAtivo:'Tipo de ativo', tickerNome:'Ticker / Nome', nomeCompleto:'Nome completo', quantidade:'Quantidade', moedaCompra:'Moeda de compra', precoMedio:'Preço médio', precoAtualEur:'Preço atual (€)', valorEur:'Valor (€)', valorCash:'Valor em cash (€)', juroAnual:'Juro anual (%) — opcional', juroAnualShort:'Juro anual (%)', guardarAtivo:'Guardar ativo', editarAtivo:'Editar ativo', valorInvestidoLabel:'Valor investido', valorAtual:'Valor atual', importarSub:'A IA deteta as posições automaticamente', uploadTitle:'Arrasta a screenshot aqui', uploadSub:'ou clica para escolher ficheiro', escolherFicheiro:'Escolher ficheiro', removerImagem:'✕ Remover imagem', analisarIA:'🔍 Analisar com IA', reveEdita:'Revê e edita antes de guardar', guardarTodas:'✓ Guardar todas', nome:'Nome', nomePortfolio:'Nome do portfolio', apagarPortfolio:'Apagar portfolio', evoEmpty:'Adiciona ativos para ver a evolução', resetBtn:'↺ Reset', entrarGoogle:'Entrar com Google', sincronizar:'Forçar sync', sair:'Sair', atualizado:'Atualizado', posicoes2:'posições', doTotalLabel:'do total', atualizadoLabel:'Atualizado:', avisoIA:'Ainda não has configurado a chave da IA.', entradas:'entradas', apagarEntrada:'Apagar esta entrada', entradasAgrupadas:'entradas agrupadas', entrada:'ENTRADA', aiEmptyText:'Clica em "Analisar agora" para uma análise detalhada. A IA avalia diversificação, riscos e oportunidades.', phTicker:'ex: AAPL, VWCE, BTC-USD', phNome:'ex: Apple Inc.', phQty:'ex: 10', phPreco:'ex: 150,00', phPrecoAuto:'auto ou manual', phCashVal:'ex: 5000', phCashJuro:'ex: 3,5', phPortfolioNome:'ex: Reforma, Cripto, Principal', ignorar:'Ignorar', posDetected:'posição(ões) detetada(s)', nenhumaDetetada:'Nenhuma posição detetada', tentaImagem:'Tenta com uma imagem mais clara.' },
  en: { global:'Global', dashboard:'Dashboard', ativos:'Assets', analise:'AI Analysis', adicionar:'Add asset', importar:'Import screenshot', valorTotal:'Total value', ganhoPerda:'Gain / Loss', custoBase:'Cost basis', cashDisp:'Available cash', cashTotal:'Total cash', evolucao:'Evolution', alocacao:'Allocation', alocacaoTipo:'Allocation by type', posicoes:'Positions', verTodas:'See all →', agrupar:'Group', atualizar:'Update prices', definicoes:'Settings', portfolios:'Portfolios', valorInvestido:'invested value', globalSub:'All portfolios consolidated', semDados:'No data', reset:'Reset', novoPortfolio:'+ New portfolio', apagarChave:'✕ Delete AI key', thAtivo:'Asset', thTipo:'Type', thPreco:'Current price', thValor:'Value', thGanho:'Gain / Loss', thPeso:'Weight', thQtd:'Qty.', thPrecoMedio:'Avg. price', posActivas:'active positions', doTotal:'of total', settingsTema:'Theme', settingsLingua:'Language', settingsMoeda:'Default currency', settingsFormato:'Number format', temaEscuro:'🌙 Dark', temaClaro:'☀️ Light', temaSistema:'💻 System', guardar:'Save', cancelar:'Cancel', apagar:'Delete', criar:'Create', ordenar:'↕ Sort', adicionar2:'+ Add', sortValor:'Value', sortGL:'Gain/Loss €', sortGLPct:'Gain/Loss %', sortTicker:'Ticker A-Z', sortPeso:'Weight', semAtivos:"You don't have any assets yet.", adicionaPrimeiro:'Add the first →', analisePortfolio:'Portfolio analysis', analiseDesc:'Powered by Claude · Data stays in your browser only', analisarAgora:'Analyse now', analisando:'Analysing your portfolio...', analisandoImg:'Analysing the screenshot...', tipoAtivo:'Asset type', tickerNome:'Ticker / Name', nomeCompleto:'Full name', quantidade:'Quantity', moedaCompra:'Purchase currency', precoMedio:'Avg. price', precoAtualEur:'Current price (€)', valorEur:'Value (€)', valorCash:'Cash value (€)', juroAnual:'Annual interest (%) — optional', juroAnualShort:'Annual interest (%)', guardarAtivo:'Save asset', editarAtivo:'Edit asset', valorInvestidoLabel:'Invested value', valorAtual:'Current value', importarSub:'AI automatically detects positions', uploadTitle:'Drag screenshot here', uploadSub:'or click to choose file', escolherFicheiro:'Choose file', removerImagem:'✕ Remove image', analisarIA:'🔍 Analyse with AI', reveEdita:'Review and edit before saving', guardarTodas:'✓ Save all', nome:'Name', nomePortfolio:'Portfolio name', apagarPortfolio:'Delete portfolio', evoEmpty:'Add assets to see evolution', resetBtn:'↺ Reset', entrarGoogle:'Sign in with Google', sincronizar:'Force sync', sair:'Sign out', atualizado:'Updated', posicoes2:'positions', doTotalLabel:'of total', atualizadoLabel:'Updated:', avisoIA:'AI key not configured.', entradas:'entries', apagarEntrada:'Delete this entry', entradasAgrupadas:'grouped entries', entrada:'ENTRY', aiEmptyText:'Click "Analyse now" for a detailed analysis. AI evaluates diversification, risks and opportunities.', phTicker:'e.g.: AAPL, VWCE, BTC-USD', phNome:'e.g.: Apple Inc.', phQty:'e.g.: 10', phPreco:'e.g.: 150.00', phPrecoAuto:'auto or manual', phCashVal:'e.g.: 5000', phCashJuro:'e.g.: 3.5', phPortfolioNome:'e.g.: Retirement, Crypto, Main', ignorar:'Ignore', posDetected:'position(s) detected', nenhumaDetetada:'No positions detected', tentaImagem:'Try with a clearer image.' },
  es: { global:'Global', dashboard:'Dashboard', ativos:'Activos', analise:'Análisis IA', adicionar:'Añadir activo', importar:'Importar captura', valorTotal:'Valor total', ganhoPerda:'Ganancia / Pérdida', custoBase:'Coste base', cashDisp:'Efectivo disponible', cashTotal:'Total efectivo', evolucao:'Evolución', alocacao:'Asignación', alocacaoTipo:'Asignación por tipo', posicoes:'Posiciones', verTodas:'Ver todas →', agrupar:'Agrupar', atualizar:'Actualizar precios', definicoes:'Configuración', portfolios:'Carteras', valorInvestido:'valor invertido', globalSub:'Todas las carteras consolidadas', semDados:'Sin datos', reset:'Reset', novoPortfolio:'+ Nuevo portfolio', apagarChave:'✕ Borrar clave IA', thAtivo:'Activo', thTipo:'Tipo', thPreco:'Precio actual', thValor:'Valor', thGanho:'Ganancia / Pérdida', thPeso:'Peso', thQtd:'Cant.', thPrecoMedio:'Precio medio', posActivas:'posiciones activas', doTotal:'del total', settingsTema:'Tema', settingsLingua:'Idioma', settingsMoeda:'Moneda predeterminada', settingsFormato:'Formato de números', temaEscuro:'🌙 Oscuro', temaClaro:'☀️ Claro', temaSistema:'💻 Sistema', guardar:'Guardar', cancelar:'Cancelar', apagar:'Eliminar', criar:'Crear', ordenar:'↕ Ordenar', adicionar2:'+ Añadir', sortValor:'Valor', sortGL:'Ganancia/Pérdida €', sortGLPct:'Ganancia/Pérdida %', sortTicker:'Ticker A-Z', sortPeso:'Peso', semAtivos:'Aún no tienes activos.', adicionaPrimeiro:'Añade el primero →', analisePortfolio:'Análisis del portfolio', analiseDesc:'Powered by Claude · Los datos quedan solo en tu browser', analisarAgora:'Analizar ahora', analisando:'Analizando tu portfolio...', analisandoImg:'Analizando la captura...', tipoAtivo:'Tipo de activo', tickerNome:'Ticker / Nombre', nomeCompleto:'Nombre completo', quantidade:'Cantidad', moedaCompra:'Moneda de compra', precoMedio:'Precio medio', precoAtualEur:'Precio actual (€)', valorEur:'Valor (€)', valorCash:'Valor en efectivo (€)', juroAnual:'Interés anual (%) — opcional', juroAnualShort:'Interés anual (%)', guardarAtivo:'Guardar activo', editarAtivo:'Editar activo', valorInvestidoLabel:'Valor invertido', valorAtual:'Valor actual', importarSub:'La IA detecta las posiciones automáticamente', uploadTitle:'Arrastra la captura aquí', uploadSub:'o haz clic para elegir archivo', escolherFicheiro:'Elegir archivo', removerImagem:'✕ Eliminar imagen', analisarIA:'🔍 Analizar con IA', reveEdita:'Revisa y edita antes de guardar', guardarTodas:'✓ Guardar todas', nome:'Nombre', nomePortfolio:'Nombre del portfolio', apagarPortfolio:'Eliminar portfolio', evoEmpty:'Añade activos para ver la evolución', resetBtn:'↺ Reiniciar', entrarGoogle:'Iniciar sesión con Google', sincronizar:'Forzar sincronización', sair:'Cerrar sesión', atualizado:'Actualizado', posicoes2:'posiciones', doTotalLabel:'del total', atualizadoLabel:'Actualizado:', avisoIA:'Clave IA no configurada.', entradas:'entradas', apagarEntrada:'Eliminar esta entrada', entradasAgrupadas:'entradas agrupadas', entrada:'ENTRADA', aiEmptyText:'Haz clic en "Analizar ahora" para un análisis detallado. La IA evalúa diversificación, riesgos y oportunidades.', phTicker:'ej: AAPL, VWCE, BTC-USD', phNome:'ej: Apple Inc.', phQty:'ej: 10', phPreco:'ej: 150,00', phPrecoAuto:'auto o manual', phCashVal:'ej: 5000', phCashJuro:'ej: 3,5', phPortfolioNome:'ej: Jubilación, Cripto, Principal', ignorar:'Ignorar', posDetected:'posición(es) detectada(s)', nenhumaDetetada:'Ninguna posición detectada', tentaImagem:'Intenta con una imagen más clara.' },
  fr: { global:'Global', dashboard:'Tableau', ativos:'Actifs', analise:'Analyse IA', adicionar:'Ajouter actif', importar:'Importer capture', valorTotal:'Valeur totale', ganhoPerda:'Gain / Perte', custoBase:'Coût de base', cashDisp:'Liquidités', cashTotal:'Total liquidités', evolucao:'Évolution', alocacao:'Allocation', alocacaoTipo:'Allocation par type', posicoes:'Positions', verTodas:'Voir tout →', agrupar:'Grouper', atualizar:'Actualiser prix', definicoes:'Paramètres', portfolios:'Portefeuilles', valorInvestido:'valeur investie', globalSub:'Tous les portefeuilles consolidés', semDados:'Pas de données', reset:'Reset', novoPortfolio:'+ Nouveau portfolio', apagarChave:'✕ Supprimer clé IA', thAtivo:'Actif', thTipo:'Type', thPreco:'Prix actuel', thValor:'Valeur', thGanho:'Gain / Perte', thPeso:'Poids', thQtd:'Qté.', thPrecoMedio:'Prix moyen', posActivas:'positions actives', doTotal:'du total', settingsTema:'Thème', settingsLingua:'Langue', settingsMoeda:'Devise par défaut', settingsFormato:'Format des nombres', temaEscuro:'🌙 Sombre', temaClaro:'☀️ Clair', temaSistema:'💻 Système', guardar:'Enregistrer', cancelar:'Annuler', apagar:'Supprimer', criar:'Créer', ordenar:'↕ Trier', adicionar2:'+ Ajouter', sortValor:'Valeur', sortGL:'Gain/Perte €', sortGLPct:'Gain/Perte %', sortTicker:'Ticker A-Z', sortPeso:'Poids', semAtivos:"Vous n'avez pas encore d'actifs.", adicionaPrimeiro:'Ajouter le premier →', analisePortfolio:'Analyse du portefeuille', analiseDesc:'Powered by Claude · Les données restent dans votre navigateur', analisarAgora:'Analyser maintenant', analisando:'Analyse en cours...', analisandoImg:'Analyse de la capture...', tipoAtivo:"Type d'actif", tickerNome:'Ticker / Nom', nomeCompleto:'Nom complet', quantidade:'Quantité', moedaCompra:"Devise d'achat", precoMedio:'Prix moyen', precoAtualEur:'Prix actuel (€)', valorEur:'Valeur (€)', valorCash:'Valeur en espèces (€)', juroAnual:'Intérêt annuel (%) — optionnel', juroAnualShort:'Intérêt annuel (%)', guardarAtivo:'Enregistrer actif', editarAtivo:'Modifier actif', valorInvestidoLabel:'Valeur investie', valorAtual:'Valeur actuelle', importarSub:"L'IA détecte les positions automatiquement", uploadTitle:'Faites glisser la capture ici', uploadSub:'ou cliquez pour choisir un fichier', escolherFicheiro:'Choisir fichier', removerImagem:'✕ Supprimer image', analisarIA:'🔍 Analyser avec IA', reveEdita:'Vérifiez et modifiez avant de sauvegarder', guardarTodas:'✓ Tout sauvegarder', nome:'Nom', nomePortfolio:'Nom du portefeuille', apagarPortfolio:'Supprimer portefeuille', evoEmpty:"Ajoutez des actifs pour voir l'évolution", resetBtn:'↺ Réinitialiser', entrarGoogle:'Se connecter avec Google', sincronizar:'Forcer la synchronisation', sair:'Déconnexion', atualizado:'Mis à jour', posicoes2:'positions', doTotalLabel:'du total', atualizadoLabel:'Mis à jour:', avisoIA:'Clé IA non configurée.', entradas:'entrées', apagarEntrada:'Supprimer cette entrée', entradasAgrupadas:'entrées groupées', entrada:'ENTRÉE', aiEmptyText:'Cliquez sur "Analyser maintenant" pour une analyse détaillée. L\'IA évalue la diversification, les risques et les opportunités.', phTicker:'ex: AAPL, VWCE, BTC-USD', phNome:'ex: Apple Inc.', phQty:'ex: 10', phPreco:'ex: 150,00', phPrecoAuto:'auto ou manuel', phCashVal:'ex: 5000', phCashJuro:'ex: 3,5', phPortfolioNome:'ex: Retraite, Crypto, Principal', ignorar:'Ignorer', posDetected:'position(s) détectée(s)', nenhumaDetetada:'Aucune position détectée', tentaImagem:'Essayez avec une image plus claire.' },
  de: { global:'Global', dashboard:'Dashboard', ativos:'Vermögen', analise:'KI-Analyse', adicionar:'Hinzufügen', importar:'Screenshot import', valorTotal:'Gesamtwert', ganhoPerda:'Gewinn / Verlust', custoBase:'Kostenbasis', cashDisp:'Bargeld', cashTotal:'Gesamtbargeld', evolucao:'Entwicklung', alocacao:'Allokation', alocacaoTipo:'Allokation nach Typ', posicoes:'Positionen', verTodas:'Alle sehen →', agrupar:'Gruppieren', atualizar:'Preise aktualisieren', definicoes:'Einstellungen', portfolios:'Portfolios', valorInvestido:'investierter Wert', globalSub:'Alle Portfolios zusammengefasst', semDados:'Keine Daten', reset:'Reset', novoPortfolio:'+ Neues Portfolio', apagarChave:'✕ KI-Schlüssel löschen', thAtivo:'Anlage', thTipo:'Typ', thPreco:'Aktueller Preis', thValor:'Wert', thGanho:'Gewinn / Verlust', thPeso:'Gewicht', thQtd:'Menge', thPrecoMedio:'Durchschn. Preis', posActivas:'aktive Positionen', doTotal:'vom Total', settingsTema:'Design', settingsLingua:'Sprache', settingsMoeda:'Standardwährung', settingsFormato:'Zahlenformat', temaEscuro:'🌙 Dunkel', temaClaro:'☀️ Hell', temaSistema:'💻 System', guardar:'Speichern', cancelar:'Abbrechen', apagar:'Löschen', criar:'Erstellen', ordenar:'↕ Sortieren', adicionar2:'+ Hinzufügen', sortValor:'Wert', sortGL:'Gewinn/Verlust €', sortGLPct:'Gewinn/Verlust %', sortTicker:'Ticker A-Z', sortPeso:'Gewicht', semAtivos:'Sie haben noch keine Anlagen.', adicionaPrimeiro:'Erste hinzufügen →', analisePortfolio:'Portfolio-Analyse', analiseDesc:'Powered by Claude · Daten bleiben nur in deinem Browser', analisarAgora:'Jetzt analysieren', analisando:'Portfolio wird analysiert...', analisandoImg:'Screenshot wird analysiert...', tipoAtivo:'Anlagetyp', tickerNome:'Ticker / Name', nomeCompleto:'Vollständiger Name', quantidade:'Menge', moedaCompra:'Kaufwährung', precoMedio:'Durchschn. Preis', precoAtualEur:'Aktueller Preis (€)', valorEur:'Wert (€)', valorCash:'Barwert (€)', juroAnual:'Jahreszins (%) — optional', juroAnualShort:'Jahreszins (%)', guardarAtivo:'Anlage speichern', editarAtivo:'Anlage bearbeiten', valorInvestidoLabel:'Investierter Wert', valorAtual:'Aktueller Wert', importarSub:'KI erkennt Positionen automatisch', uploadTitle:'Screenshot hierher ziehen', uploadSub:'oder klicken zum Auswählen', escolherFicheiro:'Datei auswählen', removerImagem:'✕ Bild entfernen', analisarIA:'🔍 Mit KI analysieren', reveEdita:'Überprüfen und bearbeiten vor dem Speichern', guardarTodas:'✓ Alle speichern', nome:'Name', nomePortfolio:'Portfolio-Name', apagarPortfolio:'Portfolio löschen', evoEmpty:'Füge Anlagen hinzu um die Entwicklung zu sehen', resetBtn:'↺ Zurücksetzen', entrarGoogle:'Mit Google anmelden', sincronizar:'Synchronisation erzwingen', sair:'Abmelden', atualizado:'Aktualisiert', posicoes2:'Positionen', doTotalLabel:'vom Total', atualizadoLabel:'Aktualisiert:', avisoIA:'KI-Schlüssel nicht konfiguriert.', entradas:'Einträge', apagarEntrada:'Diesen Eintrag löschen', entradasAgrupadas:'gruppierte Einträge', entrada:'EINTRAG', aiEmptyText:'Klicke auf "Jetzt analysieren" für eine detaillierte Analyse. KI bewertet Diversifikation, Risiken und Chancen.', phTicker:'z.B.: AAPL, VWCE, BTC-USD', phNome:'z.B.: Apple Inc.', phQty:'z.B.: 10', phPreco:'z.B.: 150,00', phPrecoAuto:'auto oder manuell', phCashVal:'z.B.: 5000', phCashJuro:'z.B.: 3,5', phPortfolioNome:'z.B.: Rente, Krypto, Haupt', ignorar:'Ignorieren', posDetected:'Position(en) erkannt', nenhumaDetetada:'Keine Positionen erkannt', tentaImagem:'Versuche es mit einem klareren Bild.' },
  it: { global:'Globale', dashboard:'Dashboard', ativos:'Attivi', analise:'Analisi IA', adicionar:'Aggiungi attivo', importar:'Importa screenshot', valorTotal:'Valore totale', ganhoPerda:'Guadagno / Perdita', custoBase:'Costo base', cashDisp:'Liquidità', cashTotal:'Totale liquidità', evolucao:'Evoluzione', alocacao:'Allocazione', alocacaoTipo:'Allocazione per tipo', posicoes:'Posizioni', verTodas:'Vedi tutto →', agrupar:'Raggruppa', atualizar:'Aggiorna prezzi', definicoes:'Impostazioni', portfolios:'Portafogli', valorInvestido:'valore investito', globalSub:'Tutti i portafogli consolidati', semDados:'Nessun dato', reset:'Reset', novoPortfolio:'+ Nuovo portfolio', apagarChave:'✕ Elimina chiave IA', thAtivo:'Attivo', thTipo:'Tipo', thPreco:'Prezzo attuale', thValor:'Valore', thGanho:'Guadagno / Perdita', thPeso:'Peso', thQtd:'Qtà.', thPrecoMedio:'Prezzo medio', posActivas:'posizioni attive', doTotal:'del totale', settingsTema:'Tema', settingsLingua:'Lingua', settingsMoeda:'Valuta predefinita', settingsFormato:'Formato numeri', temaEscuro:'🌙 Scuro', temaClaro:'☀️ Chiaro', temaSistema:'💻 Sistema', guardar:'Salva', cancelar:'Annulla', apagar:'Elimina', criar:'Crea', ordenar:'↕ Ordina', adicionar2:'+ Aggiungi', sortValor:'Valore', sortGL:'Guadagno/Perdita €', sortGLPct:'Guadagno/Perdita %', sortTicker:'Ticker A-Z', sortPeso:'Peso', semAtivos:'Non hai ancora attivi.', adicionaPrimeiro:'Aggiungi il primo →', analisePortfolio:'Analisi del portafoglio', analiseDesc:'Powered by Claude · I dati rimangono solo nel tuo browser', analisarAgora:'Analizza ora', analisando:'Analisi in corso...', analisandoImg:'Analisi screenshot...', tipoAtivo:'Tipo di attivo', tickerNome:'Ticker / Nome', nomeCompleto:'Nome completo', quantidade:'Quantità', moedaCompra:'Valuta di acquisto', precoMedio:'Prezzo medio', precoAtualEur:'Prezzo attuale (€)', valorEur:'Valore (€)', valorCash:'Valore in contanti (€)', juroAnual:'Interesse annuale (%) — opzionale', juroAnualShort:'Interesse annuale (%)', guardarAtivo:'Salva attivo', editarAtivo:'Modifica attivo', valorInvestidoLabel:'Valore investito', valorAtual:'Valore attuale', importarSub:'La IA rileva le posizioni automaticamente', uploadTitle:'Trascina lo screenshot qui', uploadSub:'o clicca per scegliere file', escolherFicheiro:'Scegli file', removerImagem:'✕ Rimuovi immagine', analisarIA:'🔍 Analizza con IA', reveEdita:'Rivedi e modifica prima di salvare', guardarTodas:'✓ Salva tutte', nome:'Nome', nomePortfolio:'Nome del portafoglio', apagarPortfolio:'Elimina portafoglio', evoEmpty:"Aggiungi attivi per vedere l'evoluzione", resetBtn:'↺ Reimposta', entrarGoogle:'Accedi con Google', sincronizar:'Forza sincronizzazione', sair:'Esci', atualizado:'Aggiornato', posicoes2:'posizioni', doTotalLabel:'del totale', atualizadoLabel:'Aggiornato:', avisoIA:'Chiave IA non configurata.', entradas:'voci', apagarEntrada:'Elimina questa voce', entradasAgrupadas:'voci raggruppate', entrada:'VOCE', aiEmptyText:'Clicca su "Analizza ora" per un\'analisi dettagliata. L\'IA valuta diversificazione, rischi e opportunità.', phTicker:'es: AAPL, VWCE, BTC-USD', phNome:'es: Apple Inc.', phQty:'es: 10', phPreco:'es: 150,00', phPrecoAuto:'auto o manuale', phCashVal:'es: 5000', phCashJuro:'es: 3,5', phPortfolioNome:'es: Pensione, Crypto, Principale', ignorar:'Ignora', posDetected:'posizione/i rilevata/e', nenhumaDetetada:'Nessuna posizione rilevata', tentaImagem:'Prova con un\'immagine più chiara.' },
  zh: { global:'全球', dashboard:'仪表板', ativos:'资产', analise:'AI分析', adicionar:'添加资产', importar:'导入截图', valorTotal:'总价值', ganhoPerda:'盈亏', custoBase:'成本基础', cashDisp:'可用现金', cashTotal:'总现金', evolucao:'演变', alocacao:'分配', alocacaoTipo:'按类型分配', posicoes:'持仓', verTodas:'查看全部 →', agrupar:'分组', atualizar:'更新价格', definicoes:'设置', portfolios:'投资组合', valorInvestido:'投资价值', globalSub:'所有投资组合汇总', semDados:'无数据', reset:'重置', novoPortfolio:'+ 新投资组合', apagarChave:'✕ 删除AI密钥', thAtivo:'资产', thTipo:'类型', thPreco:'当前价格', thValor:'价值', thGanho:'盈亏', thPeso:'权重', thQtd:'数量', thPrecoMedio:'平均价格', posActivas:'活跃持仓', doTotal:'占总额', settingsTema:'主题', settingsLingua:'语言', settingsMoeda:'默认货币', settingsFormato:'数字格式', temaEscuro:'🌙 深色', temaClaro:'☀️ 浅色', temaSistema:'💻 系统', guardar:'保存', cancelar:'取消', apagar:'删除', criar:'创建', ordenar:'↕ 排序', adicionar2:'+ 添加', sortValor:'价值', sortGL:'盈亏 €', sortGLPct:'盈亏 %', sortTicker:'Ticker A-Z', sortPeso:'权重', semAtivos:'您还没有资产。', adicionaPrimeiro:'添加第一个 →', analisePortfolio:'投资组合分析', analiseDesc:'Powered by Claude · 数据仅保留在您的浏览器中', analisarAgora:'立即分析', analisando:'正在分析...', analisandoImg:'正在分析截图...', tipoAtivo:'资产类型', tickerNome:'代码 / 名称', nomeCompleto:'全名', quantidade:'数量', moedaCompra:'购买货币', precoMedio:'平均价格', precoAtualEur:'当前价格 (€)', valorEur:'价值 (€)', valorCash:'现金价值 (€)', juroAnual:'年利率 (%) — 可选', juroAnualShort:'年利率 (%)', guardarAtivo:'保存资产', editarAtivo:'编辑资产', valorInvestidoLabel:'投资价值', valorAtual:'当前价值', importarSub:'AI自动检测持仓', uploadTitle:'拖动截图到此处', uploadSub:'或点击选择文件', escolherFicheiro:'选择文件', removerImagem:'✕ 删除图片', analisarIA:'🔍 用AI分析', reveEdita:'保存前审查编辑', guardarTodas:'✓ 全部保存', nome:'名称', nomePortfolio:'投资组合名称', apagarPortfolio:'删除投资组合', evoEmpty:'添加资产以查看演变', resetBtn:'↺ 重置', entrarGoogle:'用Google登录', sincronizar:'强制同步', sair:'退出', atualizado:'已更新', posicoes2:'持仓', doTotalLabel:'占总额', atualizadoLabel:'更新时间:', avisoIA:'AI密钥未配置。', entradas:'条目', apagarEntrada:'删除此条目', entradasAgrupadas:'已分组条目', entrada:'条目', aiEmptyText:'点击"立即分析"进行详细分析。AI评估多元化、风险和机会。', phTicker:'例: AAPL, VWCE, BTC-USD', phNome:'例: Apple Inc.', phQty:'例: 10', phPreco:'例: 150.00', phPrecoAuto:'自动或手动', phCashVal:'例: 5000', phCashJuro:'例: 3.5', phPortfolioNome:'例: 退休, 加密, 主要', ignorar:'忽略', posDetected:'个仓位已检测', nenhumaDetetada:'未检测到仓位', tentaImagem:'请使用更清晰的图片。' },
  ja: { global:'グローバル', dashboard:'ダッシュボード', ativos:'資産', analise:'AI分析', adicionar:'資産追加', importar:'スクショ読込', valorTotal:'総資産', ganhoPerda:'損益', custoBase:'取得原価', cashDisp:'現金', cashTotal:'総現金', evolucao:'推移', alocacao:'配分', alocacaoTipo:'タイプ別配分', posicoes:'ポジション', verTodas:'全て見る →', agrupar:'グループ', atualizar:'価格更新', definicoes:'設定', portfolios:'ポートフォリオ', valorInvestido:'投資額', globalSub:'全ポートフォリオ統合', semDados:'データなし', reset:'リセット', novoPortfolio:'+ 新規ポートフォリオ', apagarChave:'✕ AIキー削除', thAtivo:'資産', thTipo:'タイプ', thPreco:'現在価格', thValor:'価値', thGanho:'損益', thPeso:'比率', thQtd:'数量', thPrecoMedio:'平均価格', posActivas:'アクティブ', doTotal:'の合計', settingsTema:'テーマ', settingsLingua:'言語', settingsMoeda:'デフォルト通貨', settingsFormato:'数字フォーマット', temaEscuro:'🌙 ダーク', temaClaro:'☀️ ライト', temaSistema:'💻 システム', guardar:'保存', cancelar:'キャンセル', apagar:'削除', criar:'作成', ordenar:'↕ 並び替え', adicionar2:'+ 追加', sortValor:'価値', sortGL:'損益 €', sortGLPct:'損益 %', sortTicker:'Ticker A-Z', sortPeso:'比率', semAtivos:'資産がまだありません。', adicionaPrimeiro:'最初の資産を追加 →', analisePortfolio:'ポートフォリオ分析', analiseDesc:'Powered by Claude · データはブラウザのみに保存', analisarAgora:'今すぐ分析', analisando:'分析中...', analisandoImg:'スクリーンショット分析中...', tipoAtivo:'資産タイプ', tickerNome:'ティッカー / 名前', nomeCompleto:'フルネーム', quantidade:'数量', moedaCompra:'購入通貨', precoMedio:'平均価格', precoAtualEur:'現在価格 (€)', valorEur:'価値 (€)', valorCash:'現金価値 (€)', juroAnual:'年利率 (%) — 任意', juroAnualShort:'年利率 (%)', guardarAtivo:'資産を保存', editarAtivo:'資産を編集', valorInvestidoLabel:'投資額', valorAtual:'現在価値', importarSub:'AIが自動でポジションを検出', uploadTitle:'スクリーンショットをここにドラッグ', uploadSub:'またはクリックしてファイルを選択', escolherFicheiro:'ファイルを選択', removerImagem:'✕ 画像を削除', analisarIA:'🔍 AIで分析', reveEdita:'保存前に確認・編集', guardarTodas:'✓ すべて保存', nome:'名前', nomePortfolio:'ポートフォリオ名', apagarPortfolio:'ポートフォリオを削除', evoEmpty:'資産を追加して推移を確認', resetBtn:'↺ リセット', entrarGoogle:'Googleでサインイン', sincronizar:'強制同期', sair:'サインアウト', atualizado:'更新済み', posicoes2:'ポジション', doTotalLabel:'の合計', atualizadoLabel:'更新:', avisoIA:'AIキーが設定されていません。', entradas:'エントリー', apagarEntrada:'このエントリーを削除', entradasAgrupadas:'グループエントリー', entrada:'エントリー', aiEmptyText:'「今すぐ分析」をクリックして詳細な分析を実行します。AIが分散、リスク、機会を評価します。', phTicker:'例: AAPL, VWCE, BTC-USD', phNome:'例: Apple Inc.', phQty:'例: 10', phPreco:'例: 150.00', phPrecoAuto:'自動または手動', phCashVal:'例: 5000', phCashJuro:'例: 3.5', phPortfolioNome:'例: 年金, 暗号, メイン', ignorar:'無視', posDetected:'ポジション検出', nenhumaDetetada:'ポジションが検出されませんでした', tentaImagem:'より鮮明な画像で試してください。' },
  ar: { global:'عالمي', dashboard:'لوحة التحكم', ativos:'الأصول', analise:'تحليل AI', adicionar:'إضافة أصل', importar:'استيراد لقطة', valorTotal:'القيمة الإجمالية', ganhoPerda:'ربح / خسارة', custoBase:'التكلفة الأساسية', cashDisp:'النقد المتاح', cashTotal:'إجمالي النقد', evolucao:'التطور', alocacao:'التخصيص', alocacaoTipo:'التخصيص حسب النوع', posicoes:'المراكز', verTodas:'عرض الكل →', agrupar:'تجميع', atualizar:'تحديث الأسعار', definicoes:'الإعدادات', portfolios:'المحافظ', valorInvestido:'القيمة المستثمرة', globalSub:'جميع المحافظ موحدة', semDados:'لا توجد بيانات', reset:'إعادة', novoPortfolio:'+ محفظة جديدة', apagarChave:'✕ حذف مفتاح AI', thAtivo:'الأصل', thTipo:'النوع', thPreco:'السعر الحالي', thValor:'القيمة', thGanho:'ربح / خسارة', thPeso:'الوزن', thQtd:'الكمية', thPrecoMedio:'متوسط السعر', posActivas:'مراكز نشطة', doTotal:'من الإجمالي', settingsTema:'المظهر', settingsLingua:'اللغة', settingsMoeda:'العملة الافتراضية', settingsFormato:'تنسيق الأرقام', temaEscuro:'🌙 داكن', temaClaro:'☀️ فاتح', temaSistema:'💻 النظام', guardar:'حفظ', cancelar:'إلغاء', apagar:'حذف', criar:'إنشاء', ordenar:'↕ ترتيب', adicionar2:'+ إضافة', sortValor:'القيمة', sortGL:'ربح/خسارة €', sortGLPct:'ربح/خسارة %', sortTicker:'Ticker A-Z', sortPeso:'الوزن', semAtivos:'ليس لديك أصول بعد.', adicionaPrimeiro:'أضف الأول →', analisePortfolio:'تحليل المحفظة', analiseDesc:'Powered by Claude · البيانات تبقى في متصفحك فقط', analisarAgora:'تحليل الآن', analisando:'جاري التحليل...', analisandoImg:'جاري تحليل لقطة الشاشة...', tipoAtivo:'نوع الأصل', tickerNome:'الرمز / الاسم', nomeCompleto:'الاسم الكامل', quantidade:'الكمية', moedaCompra:'عملة الشراء', precoMedio:'متوسط السعر', precoAtualEur:'السعر الحالي (€)', valorEur:'القيمة (€)', valorCash:'قيمة النقد (€)', juroAnual:'الفائدة السنوية (%) — اختياري', juroAnualShort:'الفائدة السنوية (%)', guardarAtivo:'حفظ الأصل', editarAtivo:'تعديل الأصل', valorInvestidoLabel:'القيمة المستثمرة', valorAtual:'القيمة الحالية', importarSub:'يكتشف الذكاء الاصطناعي المراكز تلقائياً', uploadTitle:'اسحب لقطة الشاشة هنا', uploadSub:'أو انقر لاختيار ملف', escolherFicheiro:'اختر ملفاً', removerImagem:'✕ إزالة الصورة', analisarIA:'🔍 تحليل بالذكاء الاصطناعي', reveEdita:'راجع وعدّل قبل الحفظ', guardarTodas:'✓ حفظ الكل', nome:'الاسم', nomePortfolio:'اسم المحفظة', apagarPortfolio:'حذف المحفظة', evoEmpty:'أضف أصولاً لرؤية التطور', resetBtn:'↺ إعادة تعيين', entrarGoogle:'تسجيل الدخول بـ Google', sincronizar:'فرض المزامنة', sair:'تسجيل الخروج', atualizado:'تم التحديث', posicoes2:'مراكز', doTotalLabel:'من الإجمالي', atualizadoLabel:'تم التحديث:', avisoIA:'مفتاح AI غير مُعدّ.', entradas:'إدخالات', apagarEntrada:'حذف هذا الإدخال', entradasAgrupadas:'إدخالات مجمعة', entrada:'إدخال', aiEmptyText:'انقر على "تحليل الآن" للحصول على تحليل مفصل. يقيّم الذكاء الاصطناعي التنويع والمخاطر والفرص.', phTicker:'مثال: AAPL, VWCE, BTC-USD', phNome:'مثال: Apple Inc.', phQty:'مثال: 10', phPreco:'مثال: 150.00', phPrecoAuto:'تلقائي أو يدوي', phCashVal:'مثال: 5000', phCashJuro:'مثال: 3.5', phPortfolioNome:'مثال: تقاعد, تشفير, رئيسي', ignorar:'تجاهل', posDetected:'مركز/مراكز مكتشفة', nenhumaDetetada:'لم يتم اكتشاف أي مراكز', tentaImagem:'حاول باستخدام صورة أوضح.' },
  hi: { global:'वैश्विक', dashboard:'डैशबोर्ड', ativos:'संपत्ति', analise:'AI विश्लेषण', adicionar:'संपत्ति जोड़ें', importar:'स्क्रीनशॉट आयात', valorTotal:'कुल मूल्य', ganhoPerda:'लाभ / हानि', custoBase:'लागत आधार', cashDisp:'उपलब्ध नकद', cashTotal:'कुल नकद', evolucao:'विकास', alocacao:'आवंटन', alocacaoTipo:'प्रकार के अनुसार', posicoes:'पोजीशन', verTodas:'सभी देखें →', agrupar:'समूह', atualizar:'कीमतें अपडेट', definicoes:'सेटिंग्स', portfolios:'पोर्टफोलियो', valorInvestido:'निवेश मूल्य', globalSub:'सभी पोर्टफोलियो', semDados:'कोई डेटा नहीं', reset:'रीसेट', novoPortfolio:'+ नया पोर्टफोलियो', apagarChave:'✕ AI कुंजी हटाएं', thAtivo:'संपत्ति', thTipo:'प्रकार', thPreco:'वर्तमान मूल्य', thValor:'मूल्य', thGanho:'लाभ / हानि', thPeso:'भार', thQtd:'मात्रा', thPrecoMedio:'औसत मूल्य', posActivas:'सक्रिय पोजीशन', doTotal:'कुल का', settingsTema:'थीम', settingsLingua:'भाषा', settingsMoeda:'डिफ़ॉल्ट मुद्रा', settingsFormato:'संख्या प्रारूप', temaEscuro:'🌙 डार्क', temaClaro:'☀️ लाइट', temaSistema:'💻 सिस्टम', guardar:'सहेजें', cancelar:'रद्द करें', apagar:'हटाएं', criar:'बनाएं', ordenar:'↕ क्रमबद्ध', adicionar2:'+ जोड़ें', sortValor:'मूल्य', sortGL:'लाभ/हानि €', sortGLPct:'लाभ/हानि %', sortTicker:'Ticker A-Z', sortPeso:'भार', semAtivos:'आपके पास अभी कोई संपत्ति नहीं है।', adicionaPrimeiro:'पहला जोड़ें →', analisePortfolio:'पोर्टफोलियो विश्लेषण', analiseDesc:'Powered by Claude · डेटा केवल आपके browser में रहता है', analisarAgora:'अभी विश्लेषण करें', analisando:'विश्लेषण हो रहा है...', analisandoImg:'स्क्रीनशॉट का विश्लेषण...', tipoAtivo:'संपत्ति प्रकार', tickerNome:'टिकर / नाम', nomeCompleto:'पूरा नाम', quantidade:'मात्रा', moedaCompra:'खरीद मुद्रा', precoMedio:'औसत मूल्य', precoAtualEur:'वर्तमान मूल्य (€)', valorEur:'मूल्य (€)', valorCash:'नकद मूल्य (€)', juroAnual:'वार्षिक ब्याज (%) — वैकल्पिक', juroAnualShort:'वार्षिक ब्याज (%)', guardarAtivo:'संपत्ति सहेजें', editarAtivo:'संपत्ति संपादित करें', valorInvestidoLabel:'निवेश मूल्य', valorAtual:'वर्तमान मूल्य', importarSub:'AI स्वचालित रूप से पोजीशन का पता लगाता है', uploadTitle:'यहाँ स्क्रीनशॉट खींचें', uploadSub:'या फ़ाइल चुनने के लिए क्लिक करें', escolherFicheiro:'फ़ाइल चुनें', removerImagem:'✕ छवि हटाएं', analisarIA:'🔍 AI से विश्लेषण', reveEdita:'सहेजने से पहले समीक्षा करें', guardarTodas:'✓ सभी सहेजें', nome:'नाम', nomePortfolio:'पोर्टफोलियो नाम', apagarPortfolio:'पोर्टफोलियो हटाएं', evoEmpty:'विकास देखने के लिए संपत्ति जोड़ें', resetBtn:'↺ रीसेट', entrarGoogle:'Google से साइन इन', sincronizar:'सिंक करें', sair:'साइन आउट', atualizado:'अपडेट', posicoes2:'पोजीशन', doTotalLabel:'कुल का', atualizadoLabel:'अपडेट:', avisoIA:'AI कुंजी कॉन्फ़िगर नहीं।', entradas:'प्रविष्टियाँ', apagarEntrada:'यह प्रविष्टि हटाएं', entradasAgrupadas:'समूहित प्रविष्टियाँ', entrada:'प्रविष्टि', aiEmptyText:'"अभी विश्लेषण करें" पर क्लिक करें। AI विविधीकरण, जोखिम और अवसरों का मूल्यांकन करता है।', phTicker:'उदा: AAPL, VWCE, BTC-USD', phNome:'उदा: Apple Inc.', phQty:'उदा: 10', phPreco:'उदा: 150.00', phPrecoAuto:'स्वतः या मैन्युअल', phCashVal:'उदा: 5000', phCashJuro:'उदा: 3.5', phPortfolioNome:'उदा: सेवानिवृत्ति, क्रिप्टो, मुख्य', ignorar:'अनदेखा करें', posDetected:'पोजीशन पता चली', nenhumaDetetada:'कोई पोजीशन नहीं मिली', tentaImagem:'स्पष्ट छवि से पुनः प्रयास करें।' },
};

function t(key) { return (TRANSLATIONS[settings.lang] || TRANSLATIONS.pt)[key] || key; }
function currencySymbol() { return CURRENCY_SYMBOLS[settings.currency] || '€'; }

function applyI18n() {
  // Static data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  // Nav items — text node after SVG
  document.querySelectorAll('[data-i18n-nav]').forEach(el => {
    const key = el.dataset.i18nNav;
    Array.from(el.childNodes).forEach(node => {
      if (node.nodeType === 3 && node.textContent.trim().length > 0) {
        node.textContent = '\n        ' + t(key) + '\n      ';
      }
    });
  });
  // Global page subtitle
  const globalSub = document.querySelector('#page-global .page-sub');
  if (globalSub) globalSub.textContent = t('globalSub');
  // Mobile title
  const activePage = document.querySelector('.nav-item.active')?.dataset.page || 'global';
  const mobileTitle = document.getElementById('mobile-title');
  if (mobileTitle) mobileTitle.textContent = t(activePage) || t('global');
  // Empty states
  const dashEmptyText = document.getElementById('dash-empty-text');
  if (dashEmptyText) dashEmptyText.innerHTML = t('semAtivos') + '<br><a href="#" class="link" data-page="adicionar">' + t('adicionaPrimeiro') + '</a>';
  const ativosEmptyText = document.getElementById('ativos-empty-text');
  if (ativosEmptyText) ativosEmptyText.innerHTML = t('semAtivos') + '<br><a href="#" class="link" data-page="adicionar">' + t('adicionaPrimeiro') + '</a>';
  // AI empty state
  const aiEmptyText = document.getElementById('ai-empty-text');
  if (aiEmptyText) aiEmptyText.textContent = t('aiEmptyText');
  // Placeholders
  const ph = {
    'f-ticker': 'phTicker', 'f-nome': 'phNome', 'f-qty': 'phQty',
    'f-preco-medio': 'phPreco', 'f-preco-atual': 'phPrecoAuto',
    'f-cash-val': 'phCashVal', 'f-cash-juro': 'phCashJuro',
    'portfolio-nome-input': 'phPortfolioNome'
  };
  Object.entries(ph).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.placeholder = t(key);
  });
  // Sync/signout button titles
  const btnSync = document.getElementById('btn-sync');
  if (btnSync) btnSync.title = t('sincronizar');
  const btnSignout = document.getElementById('btn-signout');
  if (btnSignout) btnSignout.title = t('sair');
  // Settings button text
  const btnSettings = document.getElementById('btn-settings');
  if (btnSettings) {
    const span = btnSettings.querySelector('span');
    if (span) span.textContent = t('definicoes');
  }
  // Last update label
  const lastUpdate = document.getElementById('last-update');
  if (lastUpdate && lastUpdate.textContent && !lastUpdate.querySelector('.sync-dot')) {
    const timePart = lastUpdate.textContent.replace(/^[^:]+:\s*/, '');
    if (timePart && timePart !== '—') lastUpdate.textContent = t('atualizadoLabel') + ' ' + timePart;
  }
}

function applyTheme(theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

function applySettings() {
  applyTheme(settings.theme);
  applyI18n();
  document.getElementById('btn-refresh-all').innerHTML = '↻ ' + t('atualizar');
  document.getElementById('btn-clear-key').textContent = t('apagarChave');
  // Update settings button text
  const btnSettings = document.getElementById('btn-settings');
  if (btnSettings) {
    const spans = btnSettings.querySelectorAll('span');
    if (spans.length) spans[spans.length-1].textContent = t('definicoes');
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function openSettings() {
  document.getElementById('settings-lang').value = settings.lang;
  document.getElementById('settings-currency').value = settings.currency;
  document.querySelectorAll('[data-theme]').forEach(b => b.classList.toggle('active', b.dataset.theme === settings.theme));
  document.querySelectorAll('[data-numfmt]').forEach(b => b.classList.toggle('active', b.dataset.numfmt === settings.numfmt));
  applyI18n(); // translate modal content before showing
  document.getElementById('settings-backdrop').style.display = 'flex';
}

document.getElementById('btn-settings').addEventListener('click', openSettings);
document.getElementById('settings-close').addEventListener('click', () => { document.getElementById('settings-backdrop').style.display = 'none'; });
document.getElementById('settings-backdrop').addEventListener('click', e => { if(e.target === document.getElementById('settings-backdrop')) document.getElementById('settings-backdrop').style.display = 'none'; });

document.querySelectorAll('[data-theme]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-theme]').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
}));
document.querySelectorAll('[data-numfmt]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-numfmt]').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
}));

document.getElementById('settings-save').addEventListener('click', () => {
  settings.theme    = document.querySelector('[data-theme].active')?.dataset.theme || 'dark';
  settings.lang     = document.getElementById('settings-lang').value;
  settings.currency = document.getElementById('settings-currency').value;
  settings.numfmt   = document.querySelector('[data-numfmt].active')?.dataset.numfmt || 'pt';
  saveSettings();
  applySettings();
  applyI18n();
  document.getElementById('settings-backdrop').style.display = 'none';
  toast('✓ ' + t('definicoes'));
  renderDashboard();
});

// ── Firebase sync ─────────────────────────────────────────────────
async function saveAll() {
  localStorage.setItem(PORTFOLIOS_KEY, JSON.stringify(portfolios));
  if (currentUser && window._firebase) {
    try {
      const { db, doc, setDoc } = window._firebase;
      await setDoc(doc(db, 'users', currentUser.uid), { portfolios: JSON.stringify(portfolios) });
    } catch(e) { console.warn('Firestore save failed:', e); }
  }
}

async function loadFromFirestore(uid) {
  if (!window._firebase) return false;
  try {
    const { db, doc, getDoc } = window._firebase;
    const snap = await getDoc(doc(db, 'users', uid));
    const localData = JSON.parse(localStorage.getItem(PORTFOLIOS_KEY) || 'null');

    if (snap.exists()) {
      const cloudData = JSON.parse(snap.data().portfolios || 'null');
      if (cloudData && cloudData.length) {
        // Use cloud data (more up to date)
        portfolios = cloudData;
        currentPortfolioId = portfolios[0].id;
        migratePortfolios();
        renderSidebar();
        renderDashboard();
        toast('✓ Dados sincronizados');
        return true;
      }
    }
    // Firestore empty — upload local data
    if (localData && localData.length) {
      portfolios = localData;
      await saveAll();
      toast('✓ Dados enviados para a cloud');
      renderSidebar();
      renderDashboard();
      return true;
    }
  } catch(e) { console.warn('Firestore load failed:', e); }
  return false;
}

// Wait for Firebase to be ready then setup auth
window.addEventListener('load', () => {
  setTimeout(async () => {
    if (!window._firebase) return;
    const { auth, onAuthStateChanged, provider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } = window._firebase;

    // Handle redirect result silently
    try {
      const result = await getRedirectResult(auth);
      if (result?.user) toast('✓ Sessão iniciada');
    } catch(e) { /* silently ignore */ }

    // Watch auth state — wrapped so extension errors don't surface
    try {
      onAuthStateChanged(auth, async user => {
        currentUser = user;
        const loginBtn   = document.getElementById('btn-google-login');
        const userInfo   = document.getElementById('user-info');
        const userName   = document.getElementById('user-name');
        const userAvatar = document.getElementById('user-avatar');

        if (user) {
          loginBtn.style.display  = 'none';
          userInfo.style.display  = 'flex';
          userName.textContent    = user.displayName || user.email;
          userAvatar.src          = user.photoURL || '';
          document.getElementById('last-update').innerHTML += '<span class="sync-dot" title="Sincronizado com Google"></span>';
          await loadFromFirestore(user.uid);
        } else {
          loginBtn.style.display  = 'flex';
          userInfo.style.display  = 'none';
        }
      }, e => { /* silently ignore auth errors on init */ });
    } catch(e) { /* silently ignore */ }

    document.getElementById('btn-google-login').addEventListener('click', async () => {
      try {
        await signInWithPopup(auth, provider);
      } catch(e) {
        // Any error → fallback to redirect
        try { await signInWithRedirect(auth, provider); }
        catch(e2) { toast('Erro ao iniciar sessão'); console.error(e2); }
      }
    });

    document.getElementById('btn-signout').addEventListener('click', async () => {
      try {
        await signOut(auth);
        currentUser = null;
        toast('Sessão terminada');
      } catch(e) { console.error(e); }
    });

    document.getElementById('btn-sync').addEventListener('click', async () => {
      if (!currentUser) { toast('Faz login primeiro'); return; }
      try {
        await saveAll();
        toast('✓ Dados enviados para a cloud');
      } catch(e) { toast('Erro ao sincronizar'); console.error(e); }
    });
  }, 500);
});

// ── Helpers ───────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2,10); }
function fmt(n) {
  const sym = currencySymbol();
  const num = Number(n);
  const opts = {minimumFractionDigits:2, maximumFractionDigits:2};
  let str;
  if (settings.numfmt === 'en') str = num.toLocaleString('en-GB', opts);
  else if (settings.numfmt === 'ch') str = num.toLocaleString('de-CH', opts);
  else str = num.toLocaleString('de-DE', opts); // pt format: 1.234,56
  return sym + str;
}
function fmtPct(n) {
  const num = Number(n);
  const opts = {minimumFractionDigits:2, maximumFractionDigits:2};
  let str;
  if (settings.numfmt === 'en') str = num.toLocaleString('en-GB', opts);
  else if (settings.numfmt === 'ch') str = num.toLocaleString('de-CH', opts);
  else str = num.toLocaleString('de-DE', opts);
  return (n>=0?'+':'')+str+'%';
}
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
      // Cash: sum cashVal directly
      if (a.tipo === 'Cash') {
        existing.cashVal = (parseFloat(existing.cashVal)||0) + (parseFloat(a.cashVal)||0);
        existing._indices.push(idx);
        return;
      }
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
  document.getElementById('last-update').textContent=t('atualizadoLabel')+' '+new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
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
  // Update mobile title
  const titles = { global:'Global', dashboard:'Dashboard', ativos:'Ativos', analise:'Análise IA', adicionar:'Adicionar', importar:'Importar' };
  const mobileTitle = document.getElementById('mobile-title');
  if (mobileTitle) mobileTitle.textContent = titles[id] || 'Portfolio';
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
  document.getElementById('g-total-sub').textContent=portfolios.length+' '+t('portfolios');
  document.getElementById('g-gl').textContent=fmt(gl);
  document.getElementById('g-gl').className='metric-value '+(gl>=0?'pos':'neg');
  document.getElementById('g-gl-pct').textContent=fmtPct(glPct);
  document.getElementById('g-gl-pct').className='metric-trend '+(gl>=0?'pos':'neg');
  document.getElementById('g-custo').textContent=fmt(custo);
  document.getElementById('g-cash').textContent=fmt(cash);
  document.getElementById('g-cash-pct').textContent=total>0?cashPct.toFixed(1)+'% '+t('doTotalLabel'):'—';
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
  document.getElementById('dash-sub').textContent=ativos.length+' '+t('posActivas');
  document.getElementById('m-total').textContent=fmt(total);
  document.getElementById('m-total-sub').textContent=ativos.length+' '+t('posicoes2');
  document.getElementById('m-gl').textContent=fmt(gl);
  document.getElementById('m-gl').className='metric-value '+(gl>=0?'pos':'neg');
  document.getElementById('m-gl-pct').textContent=fmtPct(glPct);
  document.getElementById('m-gl-pct').className='metric-trend '+(gl>=0?'pos':'neg');
  document.getElementById('m-custo').textContent=fmt(custo);
  document.getElementById('m-cash').textContent=fmt(cash);
  document.getElementById('m-cash-pct').textContent=total>0?cashPct.toFixed(1)+'% '+t('doTotalLabel'):'—';
  document.getElementById('last-update').textContent='Atualizado: '+new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
  syncToggles();
  renderEvoChart(); renderPieChart(); renderDashTable();
}

function renderDashTable() {
  const rawAtivos=getAtivos();
  const ativos=getAgrupar()?mergeAtivos(rawAtivos):rawAtivos;
  const tbody=document.getElementById('dash-tbody'),table=document.getElementById('dash-table'),empty=document.getElementById('dash-empty');
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

// Migrate existing portfolios: set agrupar=true if undefined
function migratePortfolios() {
  portfolios.forEach(p => { if(p.agrupar === undefined) p.agrupar = true; });
  saveAll();
}

function renderAtivos() {
  const rawAtivos=getAtivos(),p=currentP();
  const agrupar=getAgrupar();
  const merged=mergeAtivos(rawAtivos);
  const ativos=agrupar ? merged : rawAtivos.map((a,i)=>({...a,_indices:[i]}));
  const hasDupes=rawAtivos.length>merged.length;
  const toggle=document.getElementById('toggle-agrupar');
  if(toggle) toggle.checked=agrupar;
  syncToggles();
  document.getElementById('ativos-title').textContent=p.nome;
  document.getElementById('ativos-sub').textContent=rawAtivos.length+' '+t('posicoes2')+(hasDupes&&!agrupar?' ('+(rawAtivos.length-merged.length)+' duplicado(s))':'');
  const tbody=document.getElementById('ativos-tbody'),table=document.getElementById('ativos-table'),empty=document.getElementById('ativos-empty');
  tbody.innerHTML='';
  if(ativos.length===0){table.style.display='none';empty.style.display='block';return;}
  table.style.display='table';empty.style.display='none';
  const total=calcTotal();
  sortAtivos(ativos).forEach(a=>{
    const val=valorAtivo(a),custo=custoAtivo(a),gl=val-custo,glPct=custo>0?(gl/custo)*100:0,peso=total>0?(val/total)*100:0,cor=COLORS[a.tipo]||'#888';
    const pmDisplay=a.moedaCompra&&a.moedaCompra!=='EUR'?`<span style="font-size:11px;color:var(--text2)">${a.moedaCompra} ${Number(a.precoMedioOriginal||a.precoMedio).toFixed(2)}</span><br>${fmt(a.precoMedio)}`:fmt(a.precoMedio);
    const isGrouped = a._indices && a._indices.length > 1;
    const editIndices = a._indices ? a._indices.join(',') : '0';
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
    ativos[indices[0]]?.ticker + ' — ' + indices.length + ' ' + t('entradas');
  
  body.innerHTML = indices.map(function(idx, i) {
    const a = ativos[idx];
    if (!a) return '';
    const moedas = ['EUR','USD','GBP','GBX','JPY','CHF','CAD','AUD','BRL','SEK','NOK','DKK','HKD','SGD','CNY'];
    const moedaOpts = moedas.map(function(m){ return '<option value="'+m+'" '+(( a.moedaCompra||'EUR')===m?'selected':'')+'>'+m+'</option>'; }).join('');
    return '<div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin-bottom:12px">'
      + '<div style="font-size:11px;color:var(--text3);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em">'+t('entrada')+' '+(i+1)+'</div>'
      + '<input type="hidden" class="grouped-idx" value="'+idx+'">'
      + '<div class="form-row">'
      + '<div class="form-group"><label class="label">'+t('quantidade')+'</label><input class="input grouped-qty" type="number" step="any" value="'+a.qty+'"/></div>'
      + '<div class="form-group"><label class="label">'+t('moedaCompra')+'</label><select class="input grouped-moeda">'+moedaOpts+'</select></div>'
      + '<div class="form-group"><label class="label">'+t('precoMedio')+'</label><input class="input grouped-pm" type="number" step="any" value="'+(a.precoMedioOriginal||a.precoMedio)+'"/></div>'
      + '<div class="form-group"><label class="label">'+t('precoAtualEur')+'</label><input class="input grouped-pa" type="number" step="any" value="'+a.precoAtual+'"/></div>'
      + '</div>'
      + '<div style="text-align:right;margin-top:8px"><button class="btn btn-ghost" style="font-size:11px;color:var(--neg)" data-delete-idx="'+idx+'">'+t('apagarEntrada')+'</button></div>'
      + '</div>';
  }).join('');
  
  // Replace footer buttons
  const footer = document.getElementById('modal-backdrop').querySelector('.modal-footer');
  footer.innerHTML = '<span style="font-size:12px;color:var(--text2)">'+indices.length+' '+t('entradasAgrupadas')+'</span><button class="btn btn-primary" id="btn-grouped-guardar">'+t('guardarTodas')+'</button>';
  
  modal.style.display = 'flex';
  
  // Delete individual entry
  body.querySelectorAll('[data-delete-idx]').forEach(btn => {
    btn.addEventListener('click', function() {
      if (!confirm(t('apagarEntrada')+'?')) return;
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
  // Always restore original modal structure in case it was replaced by grouped modal
  const body=document.getElementById('modal-backdrop').querySelector('.modal-body');
  body.innerHTML=`
    <div class="form-row">
      <div class="form-group"><label class="label">Ticker</label><input class="input" id="edit-ticker" type="text"/></div>
      <div class="form-group"><label class="label">Nome</label><input class="input" id="edit-nome" type="text"/></div>
    </div>
    <input type="hidden" id="edit-idx"/>
    <div class="form-row" id="edit-row-normal">
      <div class="form-group"><label class="label">Quantidade</label><input class="input" id="edit-qty" type="number" step="any"/></div>
      <div class="form-group"><label class="label">Moeda</label><select class="input" id="edit-moeda"></select></div>
      <div class="form-group"><label class="label">Preço médio</label><input class="input" id="edit-preco-medio" type="number" step="any"/></div>
      <div class="form-group"><label class="label">Preço atual (€)</label><input class="input" id="edit-preco-atual" type="number" step="any"/></div>
    </div>
    <div class="form-row" id="edit-row-cash" style="display:none">
      <div class="form-group"><label class="label">Valor (€)</label><input class="input" id="edit-cash-val" type="number" step="any"/></div>
      <div class="form-group"><label class="label">Juro anual (%)</label><input class="input" id="edit-cash-juro" type="number" step="any"/></div>
    </div>`;
  const footer=document.getElementById('modal-backdrop').querySelector('.modal-footer');
  footer.innerHTML='<button class="btn btn-ghost" id="btn-apagar">Apagar</button><button class="btn btn-primary" id="btn-editar-guardar">Guardar</button>';
  attachModalListeners();
  // Now populate fields
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
    'Formato de resposta - JSON array apenas, sem texto antes ou depois:',
    '[{"ticker":"NOK","nome":"Nokia","tipo":"Acao","qty":2525,"precoMedio":11.87,"moeda":"EUR"}]',
    '',
    'REGRAS CRITICAS PARA O TICKER:',
    '1. Se o ticker estiver VISIVELMENTE na imagem (ex: "NOK", "AAPL", "NQSE.DE"), usa-o exatamente como aparece.',
    '2. Se so aparecer o NOME do ETF/ativo mas NAO o ticker, deixa ticker=""  (string vazia).',
    '3. NUNCA inventes ou adivinhes tickers. Se nao tiveres a certeza absoluta, deixa vazio.',
    '4. Exemplos de tickers visiveis: NOK, IQE.L, LPK.DE, BTC-USD, VWCE, AAPL',
    '5. Exemplos onde deves deixar vazio: "NASDAQ 100 ETF", "Semiconductor ETF", "Europe Defence cc"',
    '',
    'COMO CALCULAR O PRECO MEDIO:',
    'A imagem mostra: quantidade, valor atual em euros, e ganho/perda em euros e percentagem.',
    'Formula: precoMedio = (valorAtual - ganhoEuros) / quantidade',
    'Exemplo Nokia: valor=29897, ganho=-276, qty=2525 -> precoMedio = (29897-(-276))/2525 = 11.95',
    '',
    'SUFIXOS DE BOLSA (so se o ticker estiver visivel):',
    '- Acoes americanas NASDAQ/NYSE: sem sufixo (OUST, AAPL, NOK)',
    '- LSE Londres: .L (IQE.L)',
    '- Frankfurt/XETRA: .DE (LPK.DE)',
    '',
    'TIPO:',
    '- "Acao" para acoes individuais',
    '- "ETF" para ETFs e fundos',
    '- "Cripto" para criptomoedas',
    '- "Cash" para dinheiro/depositos',
    '',
    'Devolve APENAS o JSON array, sem texto, sem markdown, sem explicacoes.'
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

async function findTickerForImport(nome, precoMedio, idx) {
  const btn = document.querySelector(`[data-find="${idx}"]`);
  const input = document.getElementById(`imp-ticker-${idx}`);
  if (btn) { btn.textContent = '⏳'; btn.disabled = true; }

  try {
    // Search by name
    const results = await searchTickerAutocomplete(nome);
    if (!results || results.length === 0) {
      if (btn) { btn.textContent = '❌'; btn.disabled = false; }
      return;
    }

    // If we have a price, try to match by fetching the price of top candidates
    if (precoMedio && precoMedio > 0) {
      for (const r of results.slice(0, 4)) {
        try {
          const price = await fetchPriceRaw(r.symbol);
          if (price && precoMedio) {
            // Check if price is within 30% of our avg price (accounting for time difference)
            const ratio = price / precoMedio;
            if (ratio > 0.5 && ratio < 2.0) {
              input.value = r.symbol;
              input.style.borderColor = 'var(--pos)';
              input.style.background = 'rgba(76,175,130,0.08)';
              input.title = `${r.shortname} (${r.exchDisp}) — preço atual: €${price.toFixed(2)}`;
              if (btn) { btn.textContent = '✓'; btn.style.color = 'var(--pos)'; }
              return;
            }
          }
        } catch {}
      }
    }

    // No price match — show best result anyway
    const best = results[0];
    input.value = best.symbol;
    input.style.borderColor = 'var(--accent)';
    input.title = `${best.shortname} (${best.exchDisp}) — confirma se está correto`;
    if (btn) { btn.textContent = '?'; btn.style.color = 'var(--accent)'; btn.disabled = false; }
  } catch (e) {
    if (btn) { btn.textContent = '🔍'; btn.disabled = false; }
  }
}

function renderImportTable(positions) {
  const wrap=document.getElementById('import-table-wrap'),title=document.getElementById('import-result-title');
  if(!positions||positions.length===0){wrap.innerHTML='<div class="empty-state"><p>'+t('nenhumaDetetada')+'<br>'+t('tentaImagem')+'</p></div>';title.textContent=t('nenhumaDetetada');return;}
  title.textContent=positions.length+' '+t('posDetected');
  const emptyTickers = positions.filter(p => !p.ticker).length;
  if (emptyTickers > 0) {
    title.textContent += ' · ⚠️ ' + emptyTickers + ' ticker(s) por preencher';
  }
  wrap.innerHTML='<div class="table-scroll"><table class="import-table"><thead><tr><th>Ticker</th><th>'+t('nome')+'</th><th>'+t('thTipo')+'</th><th>'+t('thQtd')+'</th><th>'+t('precoMedio')+'</th><th>'+t('moedaCompra')+'</th><th></th></tr></thead><tbody>'+positions.map((p,i)=>{
    const tickerEmpty = !p.ticker;
    const tickerStyle = tickerEmpty ? 'width:80px;border-color:var(--neg);background:rgba(224,92,92,0.08)' : 'width:80px';
    const tickerPlaceholder = tickerEmpty ? '⚠️ ticker?' : '';
    return '<tr id="import-row-'+i+'"><td><input class="input" id="imp-ticker-'+i+'" value="'+(p.ticker||'')+'" style="'+tickerStyle+'" placeholder="'+tickerPlaceholder+'" autocomplete="off" title="'+(tickerEmpty?'Ticker não encontrado — preenche manualmente':'')+'"/></td><td><input class="input" id="imp-nome-'+i+'" value="'+(p.nome||'')+'" style="width:140px"/></td><td><select class="input" id="imp-tipo-'+i+'" style="width:90px"><option value="Ação" '+(p.tipo==='Ação'||p.tipo==='Acao'?'selected':'')+'>Ação</option><option value="ETF" '+(p.tipo==='ETF'?'selected':'')+'>ETF</option><option value="Cripto" '+(p.tipo==='Cripto'?'selected':'')+'>Cripto</option><option value="Cash" '+(p.tipo==='Cash'?'selected':'')+'>Cash</option></select></td><td><input class="input" id="imp-qty-'+i+'" value="'+(p.qty||'')+'" type="number" step="any" style="width:80px"/></td><td><input class="input" id="imp-pm-'+i+'" value="'+(p.precoMedio||'')+'" type="number" step="any" style="width:90px"/></td><td><select class="input" id="imp-moeda-'+i+'" style="width:80px">'+['EUR','USD','GBP','GBX','JPY','CHF','CAD','AUD','BRL','SEK','NOK','DKK','HKD','SGD','CNY'].map(m=>'<option value="'+m+'" '+((p.moeda||'EUR')===m?'selected':'')+'>'+m+'</option>').join('')+'</select></td><td><button class="btn-skip" data-skip="'+i+'">'+t('ignorar')+'</button></td></tr>';
  }).join('')+'</tbody></table></div>';
  document.querySelectorAll('[data-skip]').forEach(btn=>btn.addEventListener('click',function(){
    const i=btn.dataset.skip,row=document.getElementById('import-row-'+i);
    if(btn.classList.contains('skipped')){btn.classList.remove('skipped');btn.textContent=t('ignorar');row.classList.remove('import-row-skip');}
    else{btn.classList.add('skipped');btn.textContent='✓';row.classList.add('import-row-skip');}
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

  // Verificar se há tickers vazios em linhas não ignoradas
  const tickersInvalidos = [];
  for(let i=0;i<importPositions.length;i++){
    const skipBtn=document.querySelector('[data-skip="'+i+'"]');
    if(skipBtn?.classList.contains('skipped')) continue;
    const tickerVal=document.getElementById('imp-ticker-'+i)?.value.trim();
    if(!tickerVal) tickersInvalidos.push(i);
  }
  if(tickersInvalidos.length>0){
    // Destacar os inputs inválidos com shake suave
    tickersInvalidos.forEach(i=>{
      const inp=document.getElementById('imp-ticker-'+i);
      if(!inp) return;
      inp.focus();
      inp.style.transition='box-shadow 0.15s';
      inp.style.boxShadow='0 0 0 2px var(--neg)';
      setTimeout(()=>{ inp.style.boxShadow=''; },1200);
    });
    // Scroll para o aviso e fazer flash
    const avisoEl=document.getElementById('etf-ticker-warning');
    if(avisoEl){
      avisoEl.scrollIntoView({behavior:'smooth',block:'center'});
      avisoEl.classList.remove('flash');
      void avisoEl.offsetWidth; // forçar reflow para reiniciar animação
      avisoEl.classList.add('flash');
      avisoEl.addEventListener('animationend',()=>avisoEl.classList.remove('flash'),{once:true});
    }
    toast('⚠️ Preenche os tickers assinalados antes de guardar');
    return;
  }

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
function syncToggles() {
  const val = getAgrupar();
  const t1 = document.getElementById('toggle-agrupar');
  const t2 = document.getElementById('toggle-agrupar-dash');
  if(t1) t1.checked = val;
  if(t2) t2.checked = val;
}

function onToggleChange(checked) {
  currentP().agrupar = checked;
  saveAll();
  syncToggles();
  renderDashTable();
  renderAtivos();
}

const toggleAgrupar = document.getElementById('toggle-agrupar');
if(toggleAgrupar) toggleAgrupar.addEventListener('change', function() { onToggleChange(this.checked); });

const toggleAgruparDash = document.getElementById('toggle-agrupar-dash');
if(toggleAgruparDash) toggleAgruparDash.addEventListener('change', function() { onToggleChange(this.checked); });

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

// ── Mobile hamburger ──────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const sidebar   = document.getElementById('sidebar');
const overlay   = document.getElementById('sidebar-overlay');

function openSidebar()  { sidebar.classList.add('open'); overlay.classList.add('visible'); hamburger.classList.add('open'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('visible'); hamburger.classList.remove('open'); }

hamburger.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
overlay.addEventListener('click', closeSidebar);

// Close sidebar when nav item clicked on mobile
document.getElementById('sidebar-nav').addEventListener('click', () => {
  if (window.innerWidth <= 640) closeSidebar();
});

document.getElementById('mobile-refresh').addEventListener('click', () => {
  document.getElementById('btn-refresh-all').click();
});

// ── Init ──────────────────────────────────────────────────────────
applySettings();
migratePortfolios();
toggleCashFields();
renderSidebar();
prefetchAllRates().then(()=>renderDashboard());
