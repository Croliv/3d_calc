import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Calculator, Layers3, Printer, Wallet, FileText,
  Settings, Sun, Moon, Plus, Trash2, Save, Download, Upload,
  TrendingUp, Clock3, Package, CircleDollarSign, Menu, X, Search,
  ChevronRight, CheckCircle2, AlertCircle
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getAll, put, remove, exportDatabase, importDatabase } from "./services/database";
import { calculatePrint, calculatePrice } from "./services/calculationEngine";
import { money, number } from "./utils/format";

const nav = [
  ["Dashboard", LayoutDashboard],
  ["Calculadora", Calculator],
  ["Materiais", Layers3],
  ["Impressoras", Printer],
  ["Orçamentos", FileText],
  ["Configurações", Settings]
];

const uid = () => crypto.randomUUID();
const initialMaterials = [
  { id: "pla-demo", name: "PLA", brand: "Genérico", color: "Branco", spoolGrams: 1000, spoolPrice: 100 },
  { id: "petg-demo", name: "PETG", brand: "Genérico", color: "Preto", spoolGrams: 1000, spoolPrice: 120 }
];
const initialPrinters = [
  { id: "printer-demo", name: "Impressora principal", model: "FDM", printerPrice: 3000, residual: 300, usefulHours: 5000, powerWatts: 120, maintenancePerHour: 0.15 }
];

function Field({ label, value, onChange, type = "number", suffix, min = 0, step = "any" }) {
  return <label className="field"><span>{label}</span><div className="input-wrap">
    <input type={type} value={value} min={min} step={step} onChange={e => onChange(type === "text" ? e.target.value : e.target.value)} />
    {suffix && <small>{suffix}</small>}
  </div></label>;
}

function Stat({ icon: Icon, label, value, detail, tone = "blue" }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>;
}

export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [theme, setTheme] = useState(localStorage.getItem("3dc-theme") || "dark");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [settings, setSettings] = useState({ kwhPrice: 1.0, currency: "BRL" });
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [materialModal, setMaterialModal] = useState(false);
  const [printerModal, setPrinterModal] = useState(false);
  const [form, setForm] = useState({
    title: "Peça personalizada", materialId: "pla-demo", printerId: "printer-demo",
    grams: "150", hours: "10", quantity: "1", labor: "0", extras: "0",
    failureRate: "5", fixedFee: "0", percentageFees: "0", targetMargin: "30"
  });
  const [materialForm, setMaterialForm] = useState({ name: "PLA", brand: "", color: "", spoolGrams: "1000", spoolPrice: "100" });
  const [printerForm, setPrinterForm] = useState({ name: "", model: "", printerPrice: "3000", residual: "300", usefulHours: "5000", powerWatts: "120", maintenancePerHour: "0.15" });

  const notify = (msg) => { setToast(msg); window.setTimeout(() => setToast(""), 2800); };
  const refresh = async () => {
    const [m, p, b, s] = await Promise.all([
      getAll("materials"), getAll("printers"), getAll("budgets"), getAll("settings")
    ]);
    if (!m.length) { for (const x of initialMaterials) await put("materials", x); }
    if (!p.length) { for (const x of initialPrinters) await put("printers", x); }
    setMaterials(await getAll("materials"));
    setPrinters(await getAll("printers"));
    setBudgets(b);
    const savedSettings = s.find(x => x.id === "main");
    if (savedSettings) setSettings(savedSettings.value);
  };
  useEffect(() => { refresh().catch(() => notify("Não foi possível abrir o banco local.")); }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("3dc-theme", theme); }, [theme]);

  const selectedMaterial = materials.find(x => x.id === form.materialId) || materials[0];
  const selectedPrinter = printers.find(x => x.id === form.printerId) || printers[0];
  const calc = useMemo(() => calculatePrint({
    ...form,
    grams: form.grams, hours: form.hours, quantity: form.quantity,
    labor: form.labor, extras: form.extras, failureRate: form.failureRate,
    spoolPrice: selectedMaterial?.spoolPrice, spoolGrams: selectedMaterial?.spoolGrams,
    powerWatts: selectedPrinter?.powerWatts, printerPrice: selectedPrinter?.printerPrice,
    residual: selectedPrinter?.residual, usefulHours: selectedPrinter?.usefulHours,
    maintenancePerHour: selectedPrinter?.maintenancePerHour, kwhPrice: settings.kwhPrice
  }), [form, selectedMaterial, selectedPrinter, settings]);
  const price = useMemo(() => calculatePrice({
    unitCost: calc.unitCost, fixedFee: form.fixedFee,
    percentageFees: form.percentageFees, targetMargin: form.targetMargin
  }), [calc, form.fixedFee, form.percentageFees, form.targetMargin]);

  const saveBudget = async () => {
    if (!selectedMaterial || !selectedPrinter) return notify("Cadastre ou selecione um material e uma impressora.");
    if (Number(form.grams) <= 0 || Number(form.hours) <= 0) return notify("Informe peso e duração maiores que zero.");
    const item = {
      id: uid(), title: form.title, createdAt: new Date().toISOString(),
      materialName: selectedMaterial.name, printerName: selectedPrinter.name,
      grams: Number(form.grams), hours: Number(form.hours), quantity: Number(form.quantity),
      unitCost: calc.unitCost, totalCost: calc.totalCost,
      suggestedPrice: price.valid ? price.price : null,
      profit: price.valid ? price.profit : null
    };
    await put("budgets", item);
    setBudgets(await getAll("budgets"));
    notify("Orçamento salvo com sucesso.");
  };
  const addMaterial = async () => {
    if (!materialForm.name.trim() || Number(materialForm.spoolGrams) <= 0 || Number(materialForm.spoolPrice) < 0) return notify("Confira os dados do material.");
    await put("materials", { ...materialForm, id: uid(), spoolGrams: Number(materialForm.spoolGrams), spoolPrice: Number(materialForm.spoolPrice) });
    setMaterials(await getAll("materials")); setMaterialModal(false); notify("Material cadastrado.");
  };
  const addPrinter = async () => {
    if (!printerForm.name.trim() || Number(printerForm.usefulHours) <= 0) return notify("Informe nome e vida útil válida.");
    await put("printers", { ...printerForm, id: uid(), printerPrice: Number(printerForm.printerPrice), residual: Number(printerForm.residual), usefulHours: Number(printerForm.usefulHours), powerWatts: Number(printerForm.powerWatts), maintenancePerHour: Number(printerForm.maintenancePerHour) });
    setPrinters(await getAll("printers")); setPrinterModal(false); notify("Impressora cadastrada.");
  };
  const deleteItem = async (store, id) => { await remove(store, id); await refresh(); notify("Registro removido."); };
  const backup = async () => {
    const data = await exportDatabase();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `3d-calculator-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
    notify("Backup exportado.");
  };
  const restore = async (file) => {
    try { await importDatabase(JSON.parse(await file.text())); await refresh(); notify("Backup restaurado."); }
    catch (e) { notify(e.message || "Não foi possível restaurar o backup."); }
  };

  const totalRevenue = budgets.reduce((s, b) => s + (b.suggestedPrice || 0) * (b.quantity || 1), 0);
  const totalCost = budgets.reduce((s, b) => s + (b.totalCost || 0), 0);
  const totalProfit = budgets.reduce((s, b) => s + (b.profit || 0) * (b.quantity || 1), 0);
  const chartData = budgets.slice(-7).map((b, i) => ({ name: b.title.slice(0, 12) || `Peça ${i+1}`, custo: Number(b.totalCost.toFixed(2)), venda: Number(((b.suggestedPrice || 0) * (b.quantity || 1)).toFixed(2)) }));

  const change = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const navTo = (name) => { setPage(name); setMobileOpen(false); };

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark">3D</div><div><b>3D Calculator</b><small>PRINT COST STUDIO</small></div><button className="mobile-close icon-btn" onClick={() => setMobileOpen(false)}><X size={18}/></button></div>
      <div className="nav-caption">MENU PRINCIPAL</div>
      <nav>{nav.map(([name, Icon]) => <button key={name} className={`nav-item ${page === name ? "active" : ""}`} onClick={() => navTo(name)}><Icon size={18}/><span>{name}</span>{page === name && <ChevronRight size={15} className="nav-arrow"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="local-status"><span className="status-dot"/> Dados armazenados neste dispositivo</div><div className="version">3D Calculator · versão 1.0.0</div></div>
    </aside>
    {mobileOpen && <div className="scrim" onClick={() => setMobileOpen(false)}/>}
    <main className="main">
      <header className="topbar"><button className="icon-btn mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={20}/></button><div className="breadcrumb">Workspace <ChevronRight size={14}/> <b>{page}</b></div><div className="top-actions"><span className="local-pill"><span className="status-dot"/> Local</span><button className="theme-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Alternar tema">{theme === "dark" ? <Sun size={17}/> : <Moon size={17}/>}<span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span></button></div></header>
      <div className="content">
        {page === "Dashboard" && <section>
          <div className="page-heading"><div><div className="eyebrow">VISÃO GERAL</div><h1>Dashboard</h1><p>Acompanhe os custos e a rentabilidade das suas impressões.</p></div><button className="primary-btn" onClick={() => navTo("Calculadora")}><Plus size={17}/> Novo cálculo</button></div>
          <div className="stats-grid">
            <Stat icon={FileText} label="Orçamentos salvos" value={budgets.length} detail="Registros no dispositivo" tone="blue"/>
            <Stat icon={Wallet} label="Custo acumulado" value={money(totalCost)} detail="Soma dos custos salvos" tone="orange"/>
            <Stat icon={TrendingUp} label="Lucro estimado" value={money(totalProfit)} detail="Nos orçamentos salvos" tone="green"/>
            <Stat icon={CircleDollarSign} label="Receita potencial" value={money(totalRevenue)} detail="Preços sugeridos salvos" tone="purple"/>
          </div>
          <div className="dashboard-grid">
            <div className="panel chart-panel"><div className="panel-head"><div><h3>Custos x preço sugerido</h3><p>Últimos orçamentos salvos</p></div><span className="panel-tag">BRL</span></div>
              {chartData.length ? <div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} barGap={7}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)"/><XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false}/><YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false}/><Tooltip formatter={(v) => money(v)} contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)" }}/><Bar dataKey="custo" name="Custo" fill="#f59e0b" radius={[5,5,0,0]}/><Bar dataKey="venda" name="Preço sugerido" fill="#3b82f6" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div> : <div className="empty-chart"><div className="empty-icon"><TrendingUp/></div><b>Seu gráfico aparecerá aqui</b><span>Salve um orçamento para começar a acompanhar os valores.</span><button className="text-btn" onClick={() => navTo("Calculadora")}>Criar primeiro cálculo <ChevronRight size={14}/></button></div>}
            </div>
            <div className="panel quick-panel"><div className="panel-head"><div><h3>Acesso rápido</h3><p>Atalhos do sistema</p></div></div>
              <button className="quick-link" onClick={() => navTo("Calculadora")}><div className="quick-icon blue"><Calculator/></div><div><b>Nova calculadora</b><span>Calcule o custo de uma peça</span></div><ChevronRight size={16}/></button>
              <button className="quick-link" onClick={() => {setMaterialModal(true); navTo("Materiais")}}><div className="quick-icon purple"><Layers3/></div><div><b>Cadastrar material</b><span>Adicione um filamento</span></div><ChevronRight size={16}/></button>
              <button className="quick-link" onClick={() => {setPrinterModal(true); navTo("Impressoras")}}><div className="quick-icon green"><Printer/></div><div><b>Cadastrar impressora</b><span>Configure seu equipamento</span></div><ChevronRight size={16}/></button>
            </div>
          </div>
          <div className="panel recent-panel"><div className="panel-head"><div><h3>Orçamentos recentes</h3><p>Últimos cálculos registrados</p></div><button className="text-btn" onClick={() => navTo("Orçamentos")}>Ver todos <ChevronRight size={14}/></button></div><BudgetTable budgets={budgets.slice(-5).reverse()} onDelete={id => deleteItem("budgets", id)}/></div>
        </section>}

        {page === "Calculadora" && <section>
          <div className="page-heading"><div><div className="eyebrow">PRECIFICAÇÃO</div><h1>Calculadora de impressão</h1><p>Informe os parâmetros da produção para calcular o custo e o preço recomendado.</p></div></div>
          <div className="calculator-layout">
            <div className="panel form-panel">
              <div className="section-title"><span className="step">01</span><div><h3>Dados da impressão</h3><p>Identificação e parâmetros básicos</p></div></div>
              <div className="form-grid"><Field label="Nome da peça" type="text" value={form.title} onChange={v=>change("title",v)}/><Field label="Quantidade" value={form.quantity} onChange={v=>change("quantity",v)} suffix="un." min="1"/></div>
              <div className="form-grid"><label className="field"><span>Material / filamento</span><select value={form.materialId} onChange={e=>change("materialId",e.target.value)}>{materials.map(m=><option key={m.id} value={m.id}>{m.name} · {m.color || "sem cor"}</option>)}</select></label><label className="field"><span>Impressora</span><select value={form.printerId} onChange={e=>change("printerId",e.target.value)}>{printers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
              <div className="form-grid"><Field label="Peso de filamento" value={form.grams} onChange={v=>change("grams",v)} suffix="g"/><Field label="Tempo de impressão" value={form.hours} onChange={v=>change("hours",v)} suffix="horas"/></div>
              <div className="section-title separated"><span className="step">02</span><div><h3>Custos adicionais</h3><p>Perdas, mão de obra e acabamento</p></div></div>
              <div className="form-grid"><Field label="Taxa de falhas" value={form.failureRate} onChange={v=>change("failureRate",v)} suffix="%"/><Field label="Mão de obra" value={form.labor} onChange={v=>change("labor",v)} suffix="R$"/></div>
              <div className="form-grid"><Field label="Outros custos" value={form.extras} onChange={v=>change("extras",v)} suffix="R$"/><Field label="Tarifa de energia" value={String(settings.kwhPrice)} onChange={v=>setSettings(s=>({...s,kwhPrice:v}))} suffix="R$/kWh"/></div>
              <div className="section-title separated"><span className="step">03</span><div><h3>Estratégia de venda</h3><p>Defina taxas e margem desejada</p></div></div>
              <div className="form-grid"><Field label="Taxas percentuais" value={form.percentageFees} onChange={v=>change("percentageFees",v)} suffix="%"/><Field label="Taxas fixas" value={form.fixedFee} onChange={v=>change("fixedFee",v)} suffix="R$"/></div>
              <Field label="Margem de lucro desejada" value={form.targetMargin} onChange={v=>change("targetMargin",v)} suffix="%"/>
              <div className="range-note">A margem é calculada sobre o preço final de venda, não sobre o custo.</div>
              <button className="primary-btn save-budget" onClick={saveBudget}><Save size={17}/> Salvar orçamento</button>
            </div>
            <div className="results-column">
              <div className="result-hero"><div className="result-label">PREÇO SUGERIDO POR UNIDADE</div><div className="result-price">{price.valid ? money(price.price) : "—"}</div><div className="result-sub">Com margem alvo de {number(form.targetMargin,0)}%</div>{!price.valid && <div className="error-line"><AlertCircle size={14}/>{price.message}</div>}</div>
              <div className="panel breakdown"><div className="panel-head"><div><h3>Composição do custo</h3><p>Detalhamento por unidade</p></div></div>
                <CostLine label="Filamento" value={calc.material} color="orange"/><CostLine label="Energia elétrica" value={calc.energy}/><CostLine label="Depreciação" value={calc.depreciation}/><CostLine label="Manutenção" value={calc.maintenance}/><CostLine label="Mão de obra" value={calc.labor}/><CostLine label="Outros custos" value={calc.extras}/>
                <div className="cost-total"><span>Custo por unidade</span><b>{money(calc.unitCost)}</b></div><div className="cost-total secondary"><span>Custo total · {form.quantity} unidade(s)</span><b>{money(calc.totalCost)}</b></div>
              </div>
              <div className="panel profit-panel"><div className="profit-row"><span>Lucro estimado por unidade</span><b className="positive">{price.valid ? money(price.profit) : "—"}</b></div><div className="profit-row"><span>Margem efetiva</span><b>{price.valid ? `${number(price.margin)}%` : "—"}</b></div><div className="profit-row"><span>Consumo de material com perdas</span><b>{number(calc.effectiveGrams)} g</b></div></div>
              <div className="tip-card"><AlertCircle size={17}/><span>Estimativa inicial: confirme o consumo real da impressora, tarifas e custos indiretos para obter uma precificação mais precisa.</span></div>
            </div>
          </div>
        </section>}

        {page === "Materiais" && <section><div className="page-heading"><div><div className="eyebrow">CADASTROS</div><h1>Materiais</h1><p>Gerencie seus filamentos e custos por grama.</p></div><button className="primary-btn" onClick={()=>setMaterialModal(true)}><Plus size={17}/> Novo material</button></div><div className="panel"><div className="panel-head"><div><h3>Filamentos cadastrados</h3><p>{materials.length} material(is) disponível(is)</p></div><div className="search-box"><Search size={15}/><input placeholder="Buscar material..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div><div className="table-wrap"><table><thead><tr><th>Material</th><th>Marca / cor</th><th>Peso do rolo</th><th>Preço do rolo</th><th>Custo por grama</th><th></th></tr></thead><tbody>{materials.filter(m=>(m.name+m.brand+m.color).toLowerCase().includes(search.toLowerCase())).map(m=><tr key={m.id}><td><b>{m.name}</b></td><td>{m.brand || "—"} / {m.color || "—"}</td><td>{number(m.spoolGrams,0)} g</td><td>{money(m.spoolPrice)}</td><td><b>{money(m.spoolPrice/m.spoolGrams)}</b></td><td><button className="icon-btn danger" onClick={()=>deleteItem("materials",m.id)}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div></div></section>}

        {page === "Impressoras" && <section><div className="page-heading"><div><div className="eyebrow">CADASTROS</div><h1>Impressoras</h1><p>Configure os equipamentos e seus custos operacionais.</p></div><button className="primary-btn" onClick={()=>setPrinterModal(true)}><Plus size={17}/> Nova impressora</button></div><div className="printer-grid">{printers.map(p=><div className="panel printer-card" key={p.id}><div className="printer-top"><div className="printer-symbol"><Printer/></div><button className="icon-btn danger" onClick={()=>deleteItem("printers",p.id)}><Trash2 size={16}/></button></div><h3>{p.name}</h3><p>{p.model || "Impressora 3D"}</p><div className="printer-metrics"><div><span>Valor de aquisição</span><b>{money(p.printerPrice)}</b></div><div><span>Potência cadastrada</span><b>{number(p.powerWatts,0)} W</b></div><div><span>Vida útil</span><b>{number(p.usefulHours,0)} h</b></div><div><span>Depreciação / hora</span><b>{money((p.printerPrice-p.residual)/p.usefulHours)}</b></div></div></div>)}</div></section>}

        {page === "Orçamentos" && <section><div className="page-heading"><div><div className="eyebrow">HISTÓRICO</div><h1>Orçamentos</h1><p>Consulte os cálculos salvos neste dispositivo.</p></div><button className="primary-btn" onClick={()=>navTo("Calculadora")}><Plus size={17}/> Novo orçamento</button></div><div className="panel"><div className="panel-head"><div><h3>Todos os orçamentos</h3><p>{budgets.length} registro(s)</p></div></div><BudgetTable budgets={[...budgets].reverse()} onDelete={id=>deleteItem("budgets",id)}/></div></section>}

        {page === "Configurações" && <section><div className="page-heading"><div><div className="eyebrow">SISTEMA</div><h1>Configurações</h1><p>Preferências, backup e manutenção dos dados.</p></div></div><div className="settings-grid"><div className="panel setting-card"><div className="setting-icon"><Wallet/></div><h3>Custos gerais</h3><p>Defina a tarifa padrão de energia utilizada nos cálculos.</p><Field label="Tarifa de energia elétrica" value={String(settings.kwhPrice)} onChange={v=>setSettings(s=>({...s,kwhPrice:v}))} suffix="R$/kWh"/><button className="primary-btn full" onClick={async()=>{await put("settings",{id:"main",value:{...settings,kwhPrice:Number(settings.kwhPrice)}});notify("Configurações salvas.")}}><Save size={16}/> Salvar configurações</button></div><div className="panel setting-card"><div className="setting-icon"><Download/></div><h3>Backup e restauração</h3><p>Exporte seus dados para guardar uma cópia ou restaure um backup anterior.</p><button className="secondary-btn full" onClick={backup}><Download size={16}/> Exportar backup JSON</button><label className="secondary-btn full upload-btn"><Upload size={16}/> Restaurar backup<input type="file" accept=".json,application/json" onChange={e=>e.target.files?.[0]&&restore(e.target.files[0])}/></label><div className="range-note">Os dados ficam armazenados no navegador deste dispositivo. Faça backups periódicos.</div></div><div className="panel setting-card"><div className="setting-icon"><CheckCircle2/></div><h3>Sobre o sistema</h3><p>3D Calculator é uma aplicação local para estimativa de custos e precificação de impressão 3D.</p><div className="about-line"><span>Versão</span><b>1.0.0</b></div><div className="about-line"><span>Armazenamento</span><b>IndexedDB local</b></div><div className="about-line"><span>Preparação para nuvem</span><b>Camada de dados isolada</b></div></div></div></section>}
      </div>
    </main>

    {materialModal && <Modal title="Novo material" onClose={()=>setMaterialModal(false)} onSave={addMaterial} saveLabel="Cadastrar material"><div className="modal-grid"><Field label="Tipo de material" type="text" value={materialForm.name} onChange={v=>setMaterialForm(s=>({...s,name:v}))}/><Field label="Marca" type="text" value={materialForm.brand} onChange={v=>setMaterialForm(s=>({...s,brand:v}))}/><Field label="Cor" type="text" value={materialForm.color} onChange={v=>setMaterialForm(s=>({...s,color:v}))}/><Field label="Peso líquido do rolo" value={materialForm.spoolGrams} onChange={v=>setMaterialForm(s=>({...s,spoolGrams:v}))} suffix="g"/><Field label="Preço de compra" value={materialForm.spoolPrice} onChange={v=>setMaterialForm(s=>({...s,spoolPrice:v}))} suffix="R$"/></div></Modal>}
    {printerModal && <Modal title="Nova impressora" onClose={()=>setPrinterModal(false)} onSave={addPrinter} saveLabel="Cadastrar impressora"><div className="modal-grid"><Field label="Nome do equipamento" type="text" value={printerForm.name} onChange={v=>setPrinterForm(s=>({...s,name:v}))}/><Field label="Modelo" type="text" value={printerForm.model} onChange={v=>setPrinterForm(s=>({...s,model:v}))}/><Field label="Valor de aquisição" value={printerForm.printerPrice} onChange={v=>setPrinterForm(s=>({...s,printerPrice:v}))} suffix="R$"/><Field label="Valor residual" value={printerForm.residual} onChange={v=>setPrinterForm(s=>({...s,residual:v}))} suffix="R$"/><Field label="Vida útil estimada" value={printerForm.usefulHours} onChange={v=>setPrinterForm(s=>({...s,usefulHours:v}))} suffix="horas"/><Field label="Potência média" value={printerForm.powerWatts} onChange={v=>setPrinterForm(s=>({...s,powerWatts:v}))} suffix="W"/><Field label="Manutenção por hora" value={printerForm.maintenancePerHour} onChange={v=>setPrinterForm(s=>({...s,maintenancePerHour:v}))} suffix="R$/h"/></div></Modal>}
    {toast && <div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
  </div>;
}

function CostLine({label,value,color}) { return <div className="cost-line"><span><i className={color || ""}/>{label}</span><b>{money(value)}</b></div>; }

function BudgetTable({budgets,onDelete}) {
  if (!budgets.length) return <div className="empty-table"><Package size={24}/><b>Nenhum orçamento salvo</b><span>Os cálculos registrados aparecerão nesta lista.</span></div>;
  return <div className="table-wrap"><table><thead><tr><th>Peça</th><th>Data</th><th>Material</th><th>Quantidade</th><th>Custo total</th><th>Preço / un.</th><th></th></tr></thead><tbody>{budgets.map(b=><tr key={b.id}><td><b>{b.title}</b><small className="cell-sub">{b.printerName}</small></td><td>{new Date(b.createdAt).toLocaleDateString("pt-BR")}</td><td>{b.materialName}</td><td>{b.quantity}</td><td>{money(b.totalCost)}</td><td><b>{b.suggestedPrice == null ? "—" : money(b.suggestedPrice)}</b></td><td><button className="icon-btn danger" onClick={()=>onDelete(b.id)} title="Excluir"><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>;
}

function Modal({title,children,onClose,onSave,saveLabel}) {
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modal"><div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X size={18}/></button></div><div className="modal-body">{children}</div><div className="modal-foot"><button className="secondary-btn" onClick={onClose}>Cancelar</button><button className="primary-btn" onClick={onSave}><Save size={16}/>{saveLabel}</button></div></div></div>;
}
