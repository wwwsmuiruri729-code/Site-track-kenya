import { type ReactNode, type FormEvent, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  Activity, ArrowUpRight, ClipboardList, CloudSun, Construction, FolderKanban,
  LayoutDashboard, LoaderCircle, MapPin, Package, Pencil, Plus,
  Search, Trash2, Users, X, CalendarDays, AlertTriangle, RefreshCw,
} from 'lucide-react';
import {
  getGetDashboardQueryKey, getHealthCheckQueryKey, getListProjectsQueryKey,
  getListReportsQueryKey, getListMaterialsQueryKey, useGetDashboard, useHealthCheck,
  useListProjects, useListReports, useListMaterials, useCreateProject, useUpdateProject,
  useDeleteProject, useCreateReport, useUpdateReport, useDeleteReport, useCreateMaterial,
  useUpdateMaterial, useDeleteMaterial,
} from '@workspace/api-client-react';
import type { Project, DailyReport, MaterialDelivery, ProjectInput, ProjectUpdate, DailyReportInput, DailyReportUpdate, MaterialDeliveryInput, MaterialDeliveryUpdate } from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
type Entity = 'project' | 'report' | 'material';
type FormValues = Record<string, string>;
const todayISO = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const weekdayInKenya = () => new Intl.DateTimeFormat('en-KE', {
  timeZone: 'Africa/Nairobi',
  weekday: 'long',
}).format(new Date());
const money = (v?: number | null) => v == null ? 'Not recorded' : `KSh ${v.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
const dateLabel = (v?: string | null) => v ? new Date(`${v.slice(0, 10)}T00:00:00`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set';
const statusLabel = (v: string) => v === 'on_hold' ? 'On hold' : v.charAt(0).toUpperCase() + v.slice(1);
const initialValues = (entity: Entity, record?: Project | DailyReport | MaterialDelivery): FormValues => {
  if (entity === 'project') {
    const p = record as Project | undefined;
    return { name: p?.name ?? '', client: p?.client ?? '', location: p?.location ?? '', status: p?.status ?? 'active', budget: p?.budget?.toString() ?? '', progress: p?.progress?.toString() ?? '0', startDate: p?.startDate ?? '', targetEndDate: p?.targetEndDate ?? '' };
  }
  if (entity === 'report') {
    const r = record as DailyReport | undefined;
    return { projectId: r?.projectId?.toString() ?? '', reportDate: r?.reportDate?.slice(0, 10) ?? todayISO(), weather: r?.weather ?? '', workersCount: r?.workersCount?.toString() ?? '', workPerformed: r?.workPerformed ?? '', issues: r?.issues ?? '', nextDayPlan: r?.nextDayPlan ?? '' };
  }
  const m = record as MaterialDelivery | undefined;
  return { projectId: m?.projectId?.toString() ?? '', deliveryDate: m?.deliveryDate?.slice(0, 10) ?? todayISO(), materialName: m?.materialName ?? '', quantity: m?.quantity?.toString() ?? '', unit: m?.unit ?? '', supplier: m?.supplier ?? '', unitCost: m?.unitCost?.toString() ?? '', receivedBy: m?.receivedBy ?? '', deliveryNote: m?.deliveryNote ?? '' };
};
const forms: Record<Entity, { title: string; description: string; fields: { name: string; label: string; type?: string; required?: boolean; options?: [string, string][]; full?: boolean; min?: string; step?: string }[] }> = {
  project: { title: 'Project', description: 'Keep the site details current for everyone on the team.', fields: [
    { name: 'name', label: 'Project name', required: true, full: true }, { name: 'client', label: 'Client', required: true },
    { name: 'location', label: 'Location / county', required: true }, { name: 'status', label: 'Status', options: [['active', 'Active'], ['on_hold', 'On hold'], ['completed', 'Completed']] },
    { name: 'budget', label: 'Budget (KSh)', type: 'number', required: true, min: '0', step: '0.01' }, { name: 'progress', label: 'Progress (%)', type: 'number', min: '0', step: '1' },
    { name: 'startDate', label: 'Start date', type: 'date' }, { name: 'targetEndDate', label: 'Target completion', type: 'date' },
  ] },
  report: { title: 'Daily report', description: 'A clear record of what moved on site today.', fields: [
    { name: 'projectId', label: 'Project', options: [], required: true, full: true }, { name: 'reportDate', label: 'Report date', type: 'date', required: true },
    { name: 'weather', label: 'Weather', options: [['Sunny', 'Sunny'], ['Cloudy', 'Cloudy'], ['Rainy', 'Rainy'], ['Windy', 'Windy'], ['Other', 'Other']] },
    { name: 'workersCount', label: 'Workers on site', type: 'number', required: true, min: '0', step: '1' },
    { name: 'workPerformed', label: 'Work performed', type: 'textarea', required: true, full: true },
    { name: 'issues', label: 'Issues / delays', type: 'textarea', full: true }, { name: 'nextDayPlan', label: 'Plan for next day', type: 'textarea', full: true },
  ] },
  material: { title: 'Material delivery', description: 'Log what arrived, who supplied it and who received it.', fields: [
    { name: 'projectId', label: 'Project', options: [], required: true, full: true }, { name: 'deliveryDate', label: 'Delivery date', type: 'date', required: true },
    { name: 'materialName', label: 'Material', required: true }, { name: 'quantity', label: 'Quantity', type: 'number', required: true, min: '0.01', step: '0.01' },
    { name: 'unit', label: 'Unit', required: true }, { name: 'supplier', label: 'Supplier', required: true },
    { name: 'unitCost', label: 'Unit cost (KSh)', type: 'number', min: '0', step: '0.01' }, { name: 'receivedBy', label: 'Received by' },
    { name: 'deliveryNote', label: 'Delivery note / remarks', type: 'textarea', full: true },
  ] },
};
function Shell({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), retry: false } });
  const links = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/projects', label: 'Projects', icon: FolderKanban },
    { href: '/reports', label: 'Daily reports', icon: ClipboardList },
    { href: '/materials', label: 'Materials', icon: Package },
  ];
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">S</div><div><div className="brand-name">SiteTrack</div><div className="brand-sub">Kenya · Site operations</div></div></div>
      <div className="nav-label">Workspace</div>
      <nav className="nav-list">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${path === href ? 'active' : ''}`} data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></Link>)}</nav>
      <div className="sidebar-foot">Built for the people who<br />keep Kenya building.</div>
    </aside>
    <main className="main">
      <div className="topbar"><div className="crumb">Site operations / <span style={{ color: '#3e5c4d' }}>{links.find(x => x.href === path)?.label ?? 'Page'}</span></div><div className="today"><span className="live-dot" style={{ background: health.isError ? '#d2644d' : undefined }} />{health.isLoading ? 'Connecting to site data' : health.isError ? 'API connection issue' : 'Site data connected'}</div></div>
      {children}
    </main>
  </div>;
}
function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="subheading">{description}</p></div>{action}</div>;
}
function LoadingGrid() { return <div className="record-grid"><div className="skeleton" /><div className="skeleton" /></div>; }
function ErrorState({ retry }: { retry: () => void }) { return <div className="error-state"><div className="empty-icon"><AlertTriangle size={20} /></div><strong>Could not load site data</strong><p>Check your connection and try again.</p><button className="btn secondary" onClick={retry}><RefreshCw size={14} /> Try again</button></div>; }
function EmptyState({ title, note, onAdd, label }: { title: string; note: string; onAdd?: () => void; label?: string }) {
  return <div className="empty-state"><div className="empty-icon"><Construction size={20} /></div><strong>{title}</strong><p>{note}</p>{onAdd && <button className="btn" onClick={onAdd}><Plus size={15} />{label}</button>}</div>;
}
function Metric({ label, value, note, icon: Icon }: { label: string; value: string | number; note: string; icon: typeof Activity }) {
  return <div className="stat"><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div><Icon size={18} style={{ position: 'absolute', right: 18, top: 18, color: '#c6c7b8' }} /></div>;
}
function Dashboard() {
  const query = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });
  const projects = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });
  return <>
    <PageTitle eyebrow={`${weekdayInKenya()} · Site pulse`} title="Good morning, team." description="Here’s the latest from across your sites." />
    {query.isLoading ? <div className="stats-grid">{[1, 2, 3, 4].map(n => <div className="skeleton" key={n} />)}</div> : query.isError ? <ErrorState retry={() => query.refetch()} /> : query.data && <>
      <div className="stats-grid">
        <Metric label="Projects tracked" value={query.data.projectCount} note={`${query.data.activeProjects} currently active`} icon={FolderKanban} />
        <Metric label="Reports today" value={query.data.reportsToday} note="Across all projects" icon={ClipboardList} />
        <Metric label="Workers on site" value={query.data.workersToday} note="Reported today" icon={Users} />
        <Metric label="Deliveries this month" value={query.data.materialsThisMonth} note="Recorded material entries" icon={Package} />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head"><div className="panel-title">Recent site reports</div><Link href="/reports" className="text-link">All reports <ArrowUpRight size={13} style={{ verticalAlign: 'middle' }} /></Link></div>
          {!query.data.recentReports.length ? <EmptyState title="No reports yet" note="Daily records will appear here once the team logs site activity." /> : query.data.recentReports.slice(0, 6).map(report => <ReportRow key={report.id} report={report} />)}
        </section>
        <section className="panel">
          <div className="panel-head"><div className="panel-title">Active sites</div><Link href="/projects" className="text-link">View projects</Link></div>
          {projects.isLoading ? <div className="skeleton" /> : projects.isError ? <ErrorState retry={() => projects.refetch()} /> : (projects.data ?? []).filter(p => p.status === 'active').slice(0, 5).map(project => <div className="project-mini" key={project.id}><div className="project-line"><strong>{project.name}</strong><span>{project.progress}%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, project.progress)}%` }} /></div><div className="report-meta" style={{ marginTop: 7 }}><MapPin size={11} style={{ verticalAlign: 'middle' }} /> {project.location}</div></div>)}
          {projects.data?.every(p => p.status !== 'active') && <p className="report-meta">No active projects to show.</p>}
          <Link href="/reports" className="btn" style={{ width: '100%', marginTop: 13, textDecoration: 'none' }}><Plus size={15} /> Record today’s work</Link>
        </section>
      </div>
    </>}
  </>;
}
function ReportRow({ report }: { report: DailyReport }) {
  const date = new Date(`${report.reportDate.slice(0, 10)}T00:00:00`);
  return <div className="report-item"><div className="date-tile"><b>{date.getDate()}</b><span>{date.toLocaleDateString('en-KE', { month: 'short' })}</span></div><div className="report-copy"><strong>{report.projectName}</strong><p>{report.workPerformed}</p><div className="report-meta">{report.workersCount} workers{report.weather ? ` · ${report.weather}` : ''}</div></div></div>;
}
function useNotice() {
  const [notice, setNotice] = useState('');
  const show = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2800); };
  return { notice, show };
}
function FormDialog({ entity, record, projects, pending, error, onClose, onSave }: { entity: Entity; record?: Project | DailyReport | MaterialDelivery; projects: Project[]; pending: boolean; error: string; onClose: () => void; onSave: (values: FormValues) => void }) {
  const [values, setValues] = useState<FormValues>(() => initialValues(entity, record));
  const config = forms[entity];
  const set = (name: string, value: string) => setValues(current => ({ ...current, [name]: value }));
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    onSave(values);
  };
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
    <div className="modal-head"><div><h2 id="form-title">{record ? 'Edit' : 'Add'} {config.title.toLowerCase()}</h2><p>{config.description}</p></div><button className="close-btn" aria-label="Close" onClick={onClose}><X size={17} /></button></div>
    <form onSubmit={onSubmit}><div className="form-grid">{config.fields.map(field => {
      const isProjectSelect = field.name === 'projectId';
      const type = field.type;
      return <div className={`field ${field.full ? 'full' : ''}`} key={field.name}><label htmlFor={`field-${field.name}`}>{field.label}{field.required && ' *'}</label>
        {isProjectSelect ? <select id={`field-${field.name}`} required value={values[field.name] ?? ''} onChange={e => set(field.name, e.target.value)}><option value="">Choose a project</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select> :
        field.options ? <select id={`field-${field.name}`} required={field.required} value={values[field.name] ?? ''} onChange={e => set(field.name, e.target.value)}>{field.name === 'status' && null}{field.name === 'weather' && <option value="">Select weather</option>}{field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> :
        type === 'textarea' ? <textarea id={`field-${field.name}`} required={field.required} value={values[field.name] ?? ''} onChange={e => set(field.name, e.target.value)} maxLength={field.name === 'workPerformed' ? 3000 : 2000} /> :
        <input id={`field-${field.name}`} type={type ?? 'text'} required={field.required} min={field.min} max={field.name === 'progress' ? 100 : undefined} step={field.step} value={values[field.name] ?? ''} onChange={e => set(field.name, e.target.value)} />}
        {entity === 'project' && field.name === 'progress' && Number(values.progress) > 100 && <small>Progress cannot exceed 100%.</small>}
      </div>;
    })}</div>{error && <p style={{ color: '#b4483b', fontSize: 12, margin: '13px 0 0' }}>{error}</p>}
      <div className="modal-actions"><button type="button" className="btn secondary" onClick={onClose}>Cancel</button><button className="btn" disabled={pending}>{pending && <LoaderCircle size={14} className="animate-spin" />}{pending ? 'Saving…' : record ? 'Save changes' : 'Save record'}</button></div>
    </form>
  </section></div>;
}
function ProjectsPage() {
  const qc = useQueryClient(); const query = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });
  const create = useCreateProject(); const update = useUpdateProject(); const remove = useDeleteProject();
  const [editing, setEditing] = useState<Project | undefined>(); const [dialog, setDialog] = useState(false);
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState('all'); const { notice, show } = useNotice();
  const [error, setError] = useState('');
  const invalidate = () => { qc.invalidateQueries({ queryKey: getListProjectsQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); };
  const save = (v: FormValues) => {
    const payload = { name: v.name.trim(), client: v.client.trim(), location: v.location.trim(), status: v.status as ProjectInput['status'], budget: Number(v.budget), progress: Number(v.progress || 0), startDate: v.startDate || null, targetEndDate: v.targetEndDate || null };
    const opts = { onSuccess: () => { invalidate(); setDialog(false); setEditing(undefined); setError(''); show(editing ? 'Project updated' : 'Project created'); }, onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Could not save project.') };
    if (editing) update.mutate({ id: editing.id, data: payload as ProjectUpdate }, opts); else create.mutate({ data: payload as ProjectInput }, opts);
  };
  const del = (p: Project) => { if (window.confirm(`Delete “${p.name}”? This cannot be undone.`)) remove.mutate({ id: p.id }, { onSuccess: () => { invalidate(); show('Project deleted'); }, onError: () => show('Could not delete project') }); };
  const items = (query.data ?? []).filter(p => (filter === 'all' || p.status === filter) && `${p.name} ${p.client} ${p.location}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageTitle eyebrow="Project register" title="Projects" description="Every site, its people, progress and budget — in one place." action={<button className="btn" onClick={() => { setEditing(undefined); setError(''); setDialog(true); }}><Plus size={16} /> New project</button>} />
    <div className="toolbar"><div style={{ position: 'relative', flex: 1, minWidth: 160 }}><Search size={16} style={{ position: 'absolute', top: 13, left: 12, color: '#98a096' }} /><input aria-label="Search projects" data-testid="input-search-projects" className="search-input" style={{ paddingLeft: 37, width: '100%' }} placeholder="Find a project, client or location" value={search} onChange={e => setSearch(e.target.value)} /></div><select className="filter-select" aria-label="Filter project status" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option></select></div>
    {query.isLoading ? <LoadingGrid /> : query.isError ? <ErrorState retry={() => query.refetch()} /> : !items.length ? <EmptyState title={search || filter !== 'all' ? 'No matching projects' : 'Start with your first site'} note={search || filter !== 'all' ? 'Try another search or status filter.' : 'Add a project to keep progress, reports and deliveries together.'} onAdd={() => { setEditing(undefined); setDialog(true); }} label="Add a project" /> :
      <div className="record-grid">{items.map(p => <article className="record-card" key={p.id} data-testid={`card-project-${p.id}`}><div className="record-top"><div><h3>{p.name}</h3><p className="record-sub">{p.client}</p></div><span className={`status status-${p.status}`}>{statusLabel(p.status)}</span></div><div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#718077', fontSize: 12 }}><MapPin size={14} />{p.location}</div><div className="record-data"><div><div className="data-label">Budget</div><div className="data-value">{money(p.budget)}</div></div><div><div className="data-label">Timeline</div><div className="data-value">{dateLabel(p.targetEndDate)}</div></div></div><div className="project-line"><span>Progress</span><strong>{p.progress}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(p.progress, 100)}%` }} /></div><div className="record-actions"><button className="icon-btn" aria-label={`Edit ${p.name}`} onClick={() => { setEditing(p); setError(''); setDialog(true); }}><Pencil size={15} /></button><button className="icon-btn delete" aria-label={`Delete ${p.name}`} onClick={() => del(p)}><Trash2 size={15} /></button></div></article>)}</div>}
    {dialog && <FormDialog entity="project" record={editing} projects={[]} pending={create.isPending || update.isPending} error={error} onClose={() => setDialog(false)} onSave={save} />}{notice && <div className="toast">{notice}</div>}
  </>;
}
function ReportsPage() {
  const qc = useQueryClient(); const query = useListReports(undefined, { query: { queryKey: getListReportsQueryKey() } }); const projectsQ = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });
  const create = useCreateReport(); const update = useUpdateReport(); const remove = useDeleteReport();
  const [editing, setEditing] = useState<DailyReport | undefined>(); const [dialog, setDialog] = useState(false); const [projectFilter, setProjectFilter] = useState('all'); const [search, setSearch] = useState(''); const [error, setError] = useState(''); const { notice, show } = useNotice();
  const invalidate = () => { qc.invalidateQueries({ queryKey: getListReportsQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); };
  const save = (v: FormValues) => {
    const payload = { projectId: Number(v.projectId), reportDate: v.reportDate, weather: v.weather || (editing ? null : undefined), workersCount: Number(v.workersCount), workPerformed: v.workPerformed.trim(), issues: v.issues || (editing ? null : undefined), nextDayPlan: v.nextDayPlan || (editing ? null : undefined) };
    const options = { onSuccess: () => { invalidate(); setDialog(false); setEditing(undefined); setError(''); show(editing ? 'Report updated' : 'Report saved'); }, onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Could not save report.') };
    if (editing) update.mutate({ id: editing.id, data: payload as DailyReportUpdate }, options); else create.mutate({ data: payload as DailyReportInput }, options);
  };
  const del = (r: DailyReport) => { if (window.confirm(`Delete this report for ${r.projectName}?`)) remove.mutate({ id: r.id }, { onSuccess: () => { invalidate(); show('Report deleted'); }, onError: () => show('Could not delete report') }); };
  const projects = projectsQ.data ?? [];
  const items = (query.data ?? []).filter(r => (projectFilter === 'all' || r.projectId === Number(projectFilter)) && `${r.projectName} ${r.workPerformed} ${r.issues ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageTitle eyebrow="Daily site diary" title="Daily reports" description="A reliable end-of-day record for every active site." action={<button className="btn" onClick={() => { setEditing(undefined); setError(''); setDialog(true); }}><Plus size={16} /> New report</button>} />
    <div className="toolbar"><div style={{ position: 'relative', flex: 1, minWidth: 160 }}><Search size={16} style={{ position: 'absolute', top: 13, left: 12, color: '#98a096' }} /><input aria-label="Search reports" className="search-input" style={{ paddingLeft: 37, width: '100%' }} placeholder="Search work notes or project" value={search} onChange={e => setSearch(e.target.value)} /></div><select className="filter-select" aria-label="Filter reports by project" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}><option value="all">All projects</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
    {query.isLoading || projectsQ.isLoading ? <LoadingGrid /> : query.isError ? <ErrorState retry={() => query.refetch()} /> : projectsQ.isError ? <ErrorState retry={() => projectsQ.refetch()} /> : !items.length ? <EmptyState title="No daily reports yet" note="Capture completed work, crew numbers and tomorrow’s plan." onAdd={() => { setEditing(undefined); setDialog(true); }} label="Record a report" /> :
      <div className="record-grid">{items.map(r => <article className="record-card" key={r.id} data-testid={`card-report-${r.id}`}><div className="record-top"><div><h3>{r.projectName}</h3><p className="record-sub"><CalendarDays size={12} style={{ verticalAlign: 'middle' }} /> {dateLabel(r.reportDate)}</p></div><span className="status status-active">{r.workersCount} workers</span></div><p style={{ color: '#51645a', fontSize: 13, lineHeight: 1.6, margin: '0 0 12px' }}>{r.workPerformed}</p><div className="record-data"><div><div className="data-label"><CloudSun size={11} style={{ verticalAlign: 'middle' }} /> Weather</div><div className="data-value">{r.weather || 'Not recorded'}</div></div><div><div className="data-label">Next day</div><div className="data-value" style={{ fontWeight: 500 }}>{r.nextDayPlan || 'No plan entered'}</div></div></div>{r.issues && <div style={{ fontSize: 12, background: '#fbf2e8', color: '#876238', borderRadius: 8, padding: 10, marginTop: 8 }}><AlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />{r.issues}</div>}<div className="record-actions"><button className="icon-btn" aria-label="Edit report" onClick={() => { setEditing(r); setError(''); setDialog(true); }}><Pencil size={15} /></button><button className="icon-btn delete" aria-label="Delete report" onClick={() => del(r)}><Trash2 size={15} /></button></div></article>)}</div>}
    {dialog && <FormDialog entity="report" record={editing} projects={projects} pending={create.isPending || update.isPending} error={error} onClose={() => setDialog(false)} onSave={save} />}{notice && <div className="toast">{notice}</div>}
  </>;
}
function MaterialsPage() {
  const qc = useQueryClient(); const query = useListMaterials(undefined, { query: { queryKey: getListMaterialsQueryKey() } }); const projectsQ = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });
  const create = useCreateMaterial(); const update = useUpdateMaterial(); const remove = useDeleteMaterial();
  const [editing, setEditing] = useState<MaterialDelivery | undefined>(); const [dialog, setDialog] = useState(false); const [projectFilter, setProjectFilter] = useState('all'); const [search, setSearch] = useState(''); const [error, setError] = useState(''); const { notice, show } = useNotice();
  const invalidate = () => { qc.invalidateQueries({ queryKey: getListMaterialsQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); };
  const save = (v: FormValues) => {
    const payload = { projectId: Number(v.projectId), deliveryDate: v.deliveryDate, materialName: v.materialName.trim(), quantity: Number(v.quantity), unit: v.unit.trim(), supplier: v.supplier.trim(), unitCost: v.unitCost === '' ? null : Number(v.unitCost), receivedBy: v.receivedBy || (editing ? null : undefined), deliveryNote: v.deliveryNote || (editing ? null : undefined) };
    const options = { onSuccess: () => { invalidate(); setDialog(false); setEditing(undefined); setError(''); show(editing ? 'Delivery updated' : 'Delivery recorded'); }, onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Could not save delivery.') };
    if (editing) update.mutate({ id: editing.id, data: payload as MaterialDeliveryUpdate }, options); else create.mutate({ data: payload as MaterialDeliveryInput }, options);
  };
  const del = (m: MaterialDelivery) => { if (window.confirm(`Delete ${m.materialName} delivery from ${m.supplier}?`)) remove.mutate({ id: m.id }, { onSuccess: () => { invalidate(); show('Delivery deleted'); }, onError: () => show('Could not delete delivery') }); };
  const projects = projectsQ.data ?? [];
  const items = (query.data ?? []).filter(m => (projectFilter === 'all' || m.projectId === Number(projectFilter)) && `${m.projectName} ${m.materialName} ${m.supplier}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageTitle eyebrow="Incoming supplies" title="Materials" description="Track deliveries against the project they’re building." action={<button className="btn" onClick={() => { setEditing(undefined); setError(''); setDialog(true); }}><Plus size={16} /> Record delivery</button>} />
    <div className="toolbar"><div style={{ position: 'relative', flex: 1, minWidth: 160 }}><Search size={16} style={{ position: 'absolute', top: 13, left: 12, color: '#98a096' }} /><input aria-label="Search materials" className="search-input" style={{ paddingLeft: 37, width: '100%' }} placeholder="Search material or supplier" value={search} onChange={e => setSearch(e.target.value)} /></div><select className="filter-select" aria-label="Filter materials by project" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}><option value="all">All projects</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
    {query.isLoading || projectsQ.isLoading ? <LoadingGrid /> : query.isError ? <ErrorState retry={() => query.refetch()} /> : projectsQ.isError ? <ErrorState retry={() => projectsQ.refetch()} /> : !items.length ? <EmptyState title="No deliveries recorded" note="Log each delivery so quantities, suppliers and costs stay easy to check." onAdd={() => { setEditing(undefined); setDialog(true); }} label="Record a delivery" /> :
      <div className="record-grid">{items.map(m => <article className="record-card" key={m.id} data-testid={`card-material-${m.id}`}><div className="record-top"><div><h3>{m.materialName}</h3><p className="record-sub">{m.projectName}</p></div><span className="status status-completed">{dateLabel(m.deliveryDate)}</span></div><div className="record-data"><div><div className="data-label">Quantity</div><div className="data-value">{m.quantity.toLocaleString('en-KE')} {m.unit}</div></div><div><div className="data-label">Supplier</div><div className="data-value">{m.supplier}</div></div><div><div className="data-label">Unit cost</div><div className="data-value">{money(m.unitCost)}</div></div><div><div className="data-label">Received by</div><div className="data-value">{m.receivedBy || 'Not recorded'}</div></div></div>{m.deliveryNote && <p style={{ color: '#7c8379', fontSize: 12, borderTop: '1px solid #eeece4', paddingTop: 10, marginBottom: 0 }}>{m.deliveryNote}</p>}<div className="record-actions"><button className="icon-btn" aria-label="Edit delivery" onClick={() => { setEditing(m); setError(''); setDialog(true); }}><Pencil size={15} /></button><button className="icon-btn delete" aria-label="Delete delivery" onClick={() => del(m)}><Trash2 size={15} /></button></div></article>)}</div>}
    {dialog && <FormDialog entity="material" record={editing} projects={projects} pending={create.isPending || update.isPending} error={error} onClose={() => setDialog(false)} onSave={save} />}{notice && <div className="toast">{notice}</div>}
  </>;
}
function Router() {
  return <Shell><Switch><Route path="/" component={Dashboard} /><Route path="/projects" component={ProjectsPage} /><Route path="/reports" component={ReportsPage} /><Route path="/materials" component={MaterialsPage} /><Route component={NotFound} /></Switch></Shell>;
}
function App() {
  return <QueryClientProvider client={queryClient}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter></QueryClientProvider>;
}
export default App;
