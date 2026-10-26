import { useState, useMemo, useEffect, createContext, useContext, type ReactNode, type FormEvent } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, useParams, Redirect, Router as WouterRouter } from 'wouter';
import {
  useGetCurrentUser, useLoginUser, useRegisterUser, useLogoutUser, useGetDashboard,
  useCreateScan, useGetScan, useFinalizeScan, useDownloadMaskedDocument, useDownloadPrivacyReport, useDeleteScan,
  useAskPrivacyAssistant, useListSampleDocuments, useListRules, useCreateRule, useDeleteRule,
  useListAuditRecords, useDeleteAccount, getGetCurrentUserQueryKey, getGetDashboardQueryKey,
  getListScansQueryKey, getGetScanQueryKey, getListRulesQueryKey, getListAuditRecordsQueryKey,
} from '@workspace/api-client-react';
import type { ScanReview } from '@workspace/api-client-react';
import {
  ShieldCheck, Shield, LayoutDashboard, FilePlus2, SlidersHorizontal, ScrollText, Settings,
  LogOut, FileText, ArrowUpRight, Search, LockKeyhole, Check, ChevronRight, UploadCloud,
  CircleAlert, Sparkles, Download, Trash2, Plus, X, Eye, EyeOff, UserRound, Clock3,
  FileCheck2, ShieldAlert, MessageCircle, Send, LoaderCircle, Fingerprint, ArrowLeft,
  RefreshCw, Info, ScanLine, CheckCircle2,
} from 'lucide-react';
import NotFound from '@/pages/not-found';

const qc = new QueryClient();
const ReviewContext = createContext<{ review: ScanReview | null; setReview: (r: ScanReview | null) => void }>({ review: null, setReview: () => {} });
const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const timeLabel = (value?: string) => value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
function saveTextFile(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Button({ children, onClick, variant = 'primary', type = 'button', disabled = false, className = '', ...props }: { children: ReactNode; onClick?: () => void; variant?: 'primary'|'soft'|'ghost'|'danger'; type?: 'button'|'submit'; disabled?: boolean; className?: string; [key: string]: any }) {
  return <button type={type} disabled={disabled} onClick={onClick} className={cx('btn', variant === 'primary' ? 'btn-primary' : variant === 'soft' ? 'btn-soft' : variant === 'danger' ? 'bg-red-50 text-red-700' : 'btn-ghost', className)} {...props}>{children}</button>;
}
function Loading({ label = 'Loading your workspace' }: { label?: string }) {
  return <div className="surface p-7 animate-pulse"><div className="h-5 w-40 rounded bg-muted mb-5"/><div className="h-3 w-3/4 rounded bg-muted mb-3"/><div className="h-3 w-1/2 rounded bg-muted"/><span className="sr-only">{label}</span></div>;
}
function ErrorBox({ retry, message = 'We couldn’t load this information.' }: { retry?: () => void; message?: string }) {
  return <div className="surface p-6 flex gap-3 items-start"><CircleAlert className="text-amber-700 shrink-0"/><div><b className="block mb-1">{message}</b><p className="text-sm text-muted-foreground">Your work is still private. Try again in a moment.</p>{retry && <Button variant="soft" className="mt-4" onClick={retry}><RefreshCw size={15}/>Try again</Button>}</div></div>;
}
function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="surface px-6 py-14 text-center"><div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary"><FileCheck2 size={23}/></div><h3 className="text-lg font-bold">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>{action && <div className="mt-5">{action}</div>}</div>;
}
function RiskTag({ level }: { level: string }) { return <span className={`tag tag-${level}`}>{level === 'high' && <ShieldAlert size={13}/ >}{level.charAt(0).toUpperCase() + level.slice(1)} risk</span>; }

function AppRouter() {
  const [review, setReview] = useState<ScanReview | null>(null);
  const [path] = useLocation();
  useEffect(() => {
    const routeId = path.match(/^\/scans\/([^/]+)$/)?.[1];
    if (review && routeId !== review.id) setReview(null);
  }, [path, review?.id]);
  return <ReviewContext.Provider value={{review,setReview}}>
    <Switch>
      <Route path="/login"><AuthPage mode="login"/></Route>
      <Route path="/register"><AuthPage mode="register"/></Route>
      <Route path="/"><Redirect to="/dashboard"/></Route>
      <Route path="/dashboard"><Protected><Dashboard/></Protected></Route>
      <Route path="/scans/new"><Protected><NewScan/></Protected></Route>
      <Route path="/scans/:scanId"><Protected><ScanPage/></Protected></Route>
      <Route path="/rules"><Protected><RulesPage/></Protected></Route>
      <Route path="/audit"><Protected><AuditPage/></Protected></Route>
      <Route path="/settings"><Protected><SettingsPage/></Protected></Route>
      <Route component={NotFound}/>
    </Switch>
  </ReviewContext.Provider>;
}
function Protected({ children }: { children: ReactNode }) {
  const user = useGetCurrentUser();
  const [path] = useLocation();
  if (user.isLoading) return <div className="min-h-[100dvh] grid place-items-center p-6"><div className="w-full max-w-sm"><Loading label="Checking your session"/></div></div>;
  if (user.isError || !user.data) return <Redirect to={`/login?next=${encodeURIComponent(path)}`}/>;
  return <Shell user={user.data}>{children}</Shell>;
}
const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/scans/new', label: 'New scan', icon: FilePlus2 },
  { href: '/rules', label: 'Detection rules', icon: SlidersHorizontal },
  { href: '/audit', label: 'Activity log', icon: ScrollText },
  { href: '/settings', label: 'Settings', icon: Settings },
];
function Shell({ user, children }: { user: { name: string; email: string }; children: ReactNode }) {
  const [path] = useLocation();
  const logout = useLogoutUser();
  const queryClient = useQueryClient();
  const [,setPath] = useLocation();
  return <div className="min-h-[100dvh] md:flex">
    <aside className="bg-sidebar text-sidebar-foreground md:fixed md:inset-y-0 md:flex md:w-[248px] md:flex-col">
      <div className="flex items-center justify-between px-5 py-5 md:justify-start md:gap-3 md:px-6 md:py-7">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><ShieldCheck size={20}/></div>
        <div className="md:flex-1"><div className="font-bold tracking-tight">PrivacyGuard</div><div className="text-[10px] uppercase tracking-[.2em] opacity-55">AI workspace</div></div>
        <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] text-white/65">PRIVATE</span>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3 md:pt-5">
        <div className="hidden px-3 pb-2 text-[10px] font-bold uppercase tracking-[.18em] text-white/35 md:block">Workspace</div>
        {navItems.map(({href,label,icon:Icon})=><Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ','-')}`} className={cx('flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors md:w-full',path===href || (href==='/scans/new'&&path.startsWith('/scans/'))?'bg-sidebar-accent text-white':'text-white/65 hover:bg-white/5 hover:text-white')}><Icon size={17}/><span>{label}</span>{href==='/scans/new'&&<ArrowUpRight size={14} className="ml-auto opacity-50"/>}</Link>)}
      </nav>
      <div className="hidden mt-auto p-4 md:block">
        <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/85"><LockKeyhole size={14} className="text-sidebar-primary"/>Private by design</div>
          <p className="text-[11px] leading-relaxed text-white/50">Original text stays in temporary memory during review, then is deleted on completion or within 30 minutes.</p>
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-sidebar-accent text-xs font-bold">{user.name.slice(0,1).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{user.name}</div><div className="truncate text-[11px] text-white/45">{user.email}</div></div>
          <button data-testid="button-sign-out" title="Sign out" className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white" onClick={()=>logout.mutate(undefined,{onSuccess:()=>{queryClient.clear();setPath('/login')}})}><LogOut size={16}/></button>
        </div>
      </div>
    </aside>
    <main className="min-h-[calc(100dvh-112px)] flex-1 px-4 pb-12 pt-6 md:ml-[248px] md:px-10 md:pt-9 lg:px-14">
      <div className="mx-auto max-w-[1180px]">{children}</div>
      <div className="mx-auto mt-14 max-w-[1180px] border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">PrivacyGuard’s detection is not a guarantee that all sensitive data has been found, and it is not a compliance assessment. Always review the sanitized copy before sharing.</div>
    </main>
  </div>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end animate-in"><div><div className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-primary">{eyebrow}</div><h1 className="text-3xl font-extrabold sm:text-[38px]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>{action}</header>;
}
function Dashboard() {
  const q=useGetDashboard();
  if(q.isLoading) return <><PageHeading eyebrow="Your workspace" title="A clear view of your data" description="Loading your privacy activity."/><Loading/></>;
  if(q.isError||!q.data) return <><PageHeading eyebrow="Your workspace" title="A clear view of your data" description="Your privacy activity, at a glance."/><ErrorBox retry={()=>q.refetch()}/></>;
  const d=q.data;
  return <><PageHeading eyebrow="Your workspace" title="A clear view of your data" description="Every scan is a decision you control. Review what was found, then choose what leaves your workspace." action={<Link href="/scans/new" className="btn btn-primary" data-testid="link-start-scan"><Plus size={16}/>Start a scan</Link>}/>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 animate-in">
      {[['Documents reviewed',d.totalScans,FileText],['Awaiting your review',d.pendingReviews,Eye],['Findings identified',d.totalFindings,Fingerprint],['Sanitized copies',d.completedScans,ShieldCheck]].map(([label,value,Icon]:any,i)=><div className="surface p-5" key={label}><div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">{label}<Icon size={16} className={i===1?'text-amber-700':'text-primary'}/></div><div className="mt-4 text-3xl font-bold tracking-tight">{value}</div><div className="mt-2 text-xs text-muted-foreground">{i===1?'Ready when you are':'Across your workspace'}</div></div>)}
    </div>
    <section className="mt-7 grid gap-5 lg:grid-cols-[1.55fr_.8fr]">
      <div className="surface overflow-hidden"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-bold">Recent scans</h2><p className="mt-1 text-xs text-muted-foreground">Your latest document activity</p></div><Link href="/scans/new" className="text-xs font-bold text-primary hover:underline">New scan <ChevronRight size={13} className="inline"/></Link></div>
      {d.recentScans.length===0?<div className="p-5"><Empty title="Your first scan starts here" body="Upload a PDF or text file, or explore with a synthetic sample document." action={<Link href="/scans/new" className="btn btn-primary">Scan a document</Link>}/></div>:<div className="divide-y divide-border">{d.recentScans.map(s=><Link key={s.id} href={`/scans/${s.id}`} data-testid={`row-scan-${s.id}`} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/40"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><FileText size={18}/></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{s.filename}</div><div className="mt-1 text-xs text-muted-foreground">{dateLabel(s.createdAt)} · {s.findingsCount} findings</div></div><RiskTag level={s.riskLevel}/><ChevronRight size={16} className="text-muted-foreground"/></Link>)}</div>}</div>
      <div className="space-y-5">
        <div className="surface p-5"><div className="flex items-start justify-between"><div><h2 className="font-bold">Risk landscape</h2><p className="mt-1 text-xs text-muted-foreground">By document risk level</p></div><Shield size={17} className="text-primary"/></div><div className="mt-6 space-y-4">{(['high','medium','low'] as const).map((level)=>{const count=d.riskCounts[level];const percent=d.totalScans?Math.round(count/d.totalScans*100):0;return <div key={level}><div className="mb-1.5 flex justify-between text-xs"><span className="capitalize font-semibold">{level}</span><span className="font-mono text-muted-foreground">{count}</span></div><div className="h-2 rounded-full bg-muted"><div className={`h-full rounded-full ${level==='high'?'bg-[#bc7060]':level==='medium'?'bg-[#c4a35f]':'bg-[#719c7d]'}`} style={{width:`${percent}%`}}/></div></div>})}</div></div>
        <div className="rounded-[18px] bg-[#e8efff] p-5"><div className="flex gap-3"><LockKeyhole size={18} className="mt-0.5 text-primary shrink-0"/><div><div className="font-bold text-sm">Your review stays yours</div><p className="mt-1.5 text-xs leading-5 text-[#405578]">Original text stays in temporary memory during review, then is deleted on completion or within 30 minutes.</p></div></div></div>
      </div>
    </section>
  </>;
}

function NewScan() {
  const [file,setFile]=useState<File|null>(null); const [fileError,setFileError]=useState<string|null>(null); const [detectNames,setDetectNames]=useState(false); const [drag,setDrag]=useState(false);
  const samples=useListSampleDocuments(); const create=useCreateScan(); const [,go]=useLocation(); const {setReview}=useContext(ReviewContext);const client=useQueryClient();
  const chooseFile=(candidate?:File)=>{if(!candidate){setFile(null);setFileError(null);return}const extension=candidate.name.toLowerCase().split('.').pop();if(extension!=='pdf'&&extension!=='txt'){setFile(null);setFileError('Choose a PDF or TXT file.');return}if(candidate.size>8*1024*1024){setFile(null);setFileError('Files must be 8 MB or smaller.');return}setFile(candidate);setFileError(null)};
  const begin=(upload:File)=>create.mutate({data:{file:upload,detectNames}},{onSuccess:(result:any)=>{setReview(result as ScanReview);client.invalidateQueries({queryKey:getGetDashboardQueryKey()});client.invalidateQueries({queryKey:getListScansQueryKey()});go(`/scans/${result.id}`)}});
  const handle=(e:FormEvent)=>{e.preventDefault();if(file)begin(file)};
  return <><PageHeading eyebrow="New document" title="Bring a document into review" description="Nothing is masked automatically. You decide what to protect before a sanitized copy is saved."/>
    <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
      <form onSubmit={handle} className="surface p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span><h2 className="font-bold">Upload a document</h2></div>
        <label onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);chooseFile(e.dataTransfer.files[0])}} className={cx('flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-8 text-center transition-colors',drag?'border-primary bg-secondary':'border-border bg-background/70 hover:bg-secondary/50')}>
          <input data-testid="input-document" type="file" accept=".pdf,.txt,application/pdf,text/plain" className="sr-only" onChange={e=>chooseFile(e.target.files?.[0])}/>
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary"><UploadCloud size={23}/></div>
          <div className="text-sm font-bold">{file?file.name:'Drop a PDF or TXT file here'}</div><div className="mt-2 text-xs text-muted-foreground">{file?`${(file.size/1024).toFixed(0)} KB · Ready to review`:'or click to choose from your device'}</div>
          {file&&<button type="button" data-testid="button-remove-file" className="mt-3 text-xs font-semibold text-primary underline" onClick={e=>{e.preventDefault();chooseFile()}}>Remove file</button>}
        </label>
        {fileError&&<p role="alert" className="mt-3 text-sm text-red-700">{fileError}</p>}
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-secondary/60 p-4"><input data-testid="toggle-detect-names" type="checkbox" checked={detectNames} onChange={e=>setDetectNames(e.target.checked)} className="mt-0.5 accent-[#2656d9]"/><span><span className="block text-sm font-semibold">Include possible names</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Names can be ambiguous. Enable this only when you want name detection included.</span></span></label>
        {create.isError&&<p className="mt-4 text-sm text-red-700">We couldn’t start the scan. Check the file and try again.</p>}
        <Button type="submit" data-testid="button-start-scan" disabled={!file||create.isPending} className="mt-5 w-full">{create.isPending?<><LoaderCircle size={16} className="animate-spin"/>Preparing private review</>:<><ScanLine size={16}/>Continue to review</>}</Button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">PDF and TXT · Maximum 8 MB · Original text is deleted on completion or within 30 minutes</p>
      </form>
      <div className="space-y-5">
        <div className="surface p-5 sm:p-7"><div className="mb-5 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-xs font-bold text-primary">2</span><h2 className="font-bold">Explore with a sample</h2></div><p className="mb-4 text-sm leading-6 text-muted-foreground">Synthetic examples let you see the review experience without using a real document.</p>
          {samples.isLoading?<Loading label="Loading sample documents"/>:samples.isError?<ErrorBox retry={()=>samples.refetch()} message="Sample documents are unavailable."/>:!samples.data?.length?<Empty title="No samples available" body="You can still upload your own PDF or TXT document."/>:<div className="space-y-2">{samples.data.map(s=><button key={s.id} data-testid={`button-sample-${s.id}`} onClick={()=>begin(new File([s.content],s.filename,{type:'text/plain'}))} disabled={create.isPending} className="group flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:border-primary/40 hover:bg-secondary/40 disabled:opacity-50"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e9f1ff] text-[#3d5d9a]"><FileText size={18}/></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{s.title}</div><div className="mt-1 truncate text-xs text-muted-foreground">{s.description}</div></div><ArrowUpRight size={16} className="text-muted-foreground group-hover:text-primary"/></button>)}</div>}
        </div>
        <div className="rounded-2xl border border-[#d9e5ff] bg-[#edf3ff] p-5"><div className="flex gap-3"><Info size={17} className="mt-0.5 text-[#365a9d] shrink-0"/><p className="text-xs leading-5 text-[#354b70]">Automated detection can miss sensitive details or flag text incorrectly. Review each finding carefully; this is not a compliance assessment.</p></div></div>
      </div>
    </div>
  </>;
}

function ScanPage() {
  const {scanId=''}=useParams<{scanId:string}>(); const {review,setReview}=useContext(ReviewContext);
  const detail=useGetScan(scanId,{query:{queryKey:getGetScanQueryKey(scanId)}});
  const activeReview=review?.id===scanId&&(!detail.data||detail.data.status==='pending_review')?review:null;
  const [selected,setSelected]=useState<Record<string,boolean>>({});
  const [style,setStyle]=useState<'redact'|'category'|'partial'>('redact');
  const [tab,setTab]=useState<'compare'|'masked'>('compare');
  const finalize=useFinalizeScan(); const ask=useAskPrivacyAssistant(); const download=useDownloadMaskedDocument(scanId,{query:{queryKey:['download',scanId],enabled:false}}); const report=useDownloadPrivacyReport(scanId,{query:{queryKey:['report',scanId],enabled:false}}); const remove=useDeleteScan();
  const [question,setQuestion]=useState(''); const [answer,setAnswer]=useState<any>(null); const client=useQueryClient(); const [,go]=useLocation();
  const findings=activeReview?.findings||[];
  const selectedIds=activeReview?findings.filter(f=>selected[f.id]??f.selected).map(f=>f.id):[];
  const toggle=(id:string,checked:boolean)=>setSelected(old=>({...old,[id]:checked}));
  const toggleAll=()=>{const all=findings.every(f=>selected[f.id]??f.selected);const next:Record<string,boolean>={};findings.forEach(f=>next[f.id]=!all);setSelected(next)};
  const output=useMemo(()=>{
    if(!activeReview) return detail.data?.maskedText || '';
    let text=activeReview.originalText;
    const chosen=activeReview.findings.filter(f=>selectedIds.includes(f.id)).sort((a,b)=>b.start-a.start);
    for(const finding of chosen){
      const current=text.slice(finding.start,finding.end);
      let replacement=style==='category'?(finding.maskWith??`[${finding.label.toUpperCase()} REDACTED]`):style==='partial'?'•'.repeat(Math.min(current.length,64)):'[REDACTED]';
      if(replacement.toLocaleLowerCase().includes(current.toLocaleLowerCase()))replacement='[REDACTED]';
      text=text.slice(0,finding.start)+replacement+text.slice(finding.end);
    }
    return text;
  },[activeReview,detail.data?.maskedText,selectedIds.join('|'),style]);
  const doFinalize=()=>finalize.mutate({scanId,data:{selectedFindingIds:selectedIds,maskStyle:style}},{onSuccess:()=>{client.invalidateQueries({queryKey:getGetScanQueryKey(scanId)});client.invalidateQueries({queryKey:getGetDashboardQueryKey()});client.invalidateQueries({queryKey:getListScansQueryKey()});setReview(null)}});
  const downloadFile=async()=>{const result=await download.refetch();if(typeof result.data==='string')saveTextFile(result.data,'privacyguard-sanitized.txt')};
  const downloadReportFile=async()=>{const result=await report.refetch();if(typeof result.data==='string')saveTextFile(result.data,'privacyguard-analysis.txt')};
  const deleteCurrent=()=>{if(confirm('Delete this scan, its saved masked output, and its analysis metadata? This cannot be undone.'))remove.mutate({scanId},{onSuccess:()=>{setReview(null);client.invalidateQueries({queryKey:getGetDashboardQueryKey()});client.invalidateQueries({queryKey:getListScansQueryKey()});go('/dashboard')}})};
  const submitQuestion=(e:FormEvent)=>{e.preventDefault();if(!question.trim())return;ask.mutate({scanId,data:{question}},{onSuccess:r=>{setAnswer(r);setQuestion('')}})};
  if(detail.isLoading)return <><PageHeading eyebrow="Document review" title="Opening your scan" description="Loading saved scan details."/><Loading/></>;
  if(detail.isError||!detail.data)return <ErrorBox retry={()=>detail.refetch()} message="This scan could not be opened."/>
  const scan=detail.data;
  const scanStatusLabel=scan.status==='expired'?'Review expired':scan.status==='completed'?(scan.selectedCount>0?'Sanitized copy saved':'Scan complete · no document output stored'):'Review in progress';
  return <>
    <div className="mb-6"><Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary"><ArrowLeft size={14}/>All scans</Link></div>
    <PageHeading eyebrow="Document review" title={scan.filename} description={`${scan.format.toUpperCase()} · Added ${dateLabel(scan.createdAt)} · ${scan.findingsCount} findings`} action={<RiskTag level={scan.riskLevel}/>}/>
    <div className="mb-6 grid gap-3 sm:grid-cols-3"><div className="surface p-4"><span className="text-xs text-muted-foreground">Risk score</span><div className="mt-1 text-2xl font-bold">{scan.riskScore}<span className="text-sm font-medium text-muted-foreground"> / 100</span></div></div><div className="surface p-4"><span className="text-xs text-muted-foreground">Selected to mask</span><div className="mt-1 text-2xl font-bold">{activeReview?selectedIds.length:scan.selectedCount}</div></div><div className="surface p-4"><span className="text-xs text-muted-foreground">Status</span><div className="mt-2 text-sm font-bold">{scanStatusLabel}</div></div></div>
    {!activeReview&&(scan.status==='pending_review'||scan.status==='expired')&&<div className="mb-5 rounded-xl border border-[#d9e5ff] bg-[#edf3ff] p-4 text-sm leading-6 text-[#354b70]"><b>{scan.status==='expired'?'Review session expired.':'Review session ended.'}</b> Original text is deliberately not retained. Upload the document again to review its findings. Existing scan metadata remains available for your report.</div>}
    {activeReview&&findings.length===0&&<div className="mb-5 rounded-xl border border-[#d9e5ff] bg-[#edf3ff] p-4 text-sm leading-6 text-[#354b70]"><b>No supported patterns were detected.</b> Completing this scan stores metadata only; no document output will be saved.</div>}
    {activeReview&&<div className="mb-6 grid gap-5 xl:grid-cols-[1.55fr_.85fr]">
      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div><h2 className="font-bold">Review detected information</h2><p className="mt-1 text-xs text-muted-foreground">Choose each item to include in the sanitized copy.</p></div><button onClick={toggleAll} className="text-xs font-bold text-primary hover:underline">{findings.every(f=>selected[f.id]??f.selected)?'Clear all':'Select all'}</button></div>
        <div className="divide-y divide-border">{findings.map(f=><label key={f.id} data-testid={`finding-${f.id}`} className="flex cursor-pointer gap-3 px-5 py-4 hover:bg-secondary/30"><input type="checkbox" checked={selected[f.id]??f.selected} onChange={e=>toggle(f.id,e.target.checked)} className="mt-1 accent-[#2656d9]"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold">{f.label}</span><span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">{f.type.replaceAll('_',' ')}</span><span className="ml-auto font-mono text-[10px] text-muted-foreground">{Math.round(f.confidence*100)}% match</span></div><div className="mt-2 truncate font-mono text-xs text-muted-foreground">{f.preview}</div></div></label>)}</div>
        <div className="border-t border-border bg-background/60 p-5"><div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><div className="text-sm font-bold">Masking style</div><div className="mt-1 text-xs text-muted-foreground">Applied when you save the sanitized copy.</div></div><select className="field w-auto min-w-[180px] py-2 text-sm" value={style} onChange={e=>setStyle(e.target.value as any)}><option value="redact">Full redaction</option><option value="category">Replace with category</option><option value="partial">Partial masking</option></select></div>
          {finalize.isError&&<p role="alert" className="mb-3 text-sm text-red-700">Could not save this copy. The temporary review may have expired; upload the document again to retry.</p>}
          {findings.length>0&&selectedIds.length===0&&<p className="mb-3 text-xs text-muted-foreground">Select at least one finding before saving a sanitized copy.</p>}
          {scan.status==='pending_review'?<Button data-testid="button-finalize-scan" onClick={doFinalize} disabled={finalize.isPending||(findings.length>0&&selectedIds.length===0)} className="w-full">{finalize.isPending?<><LoaderCircle size={16} className="animate-spin"/>Saving your choices</>:findings.length===0?<><CheckCircle2 size={16}/>Complete scan</>:<><ShieldCheck size={16}/>Save sanitized copy <span className="opacity-70">({selectedIds.length})</span></>}</Button>:<div className="flex items-center gap-2 text-sm font-semibold text-primary"><CheckCircle2 size={17}/>{scanStatusLabel}</div>}
        </div>
      </div>
      <div className="space-y-5">
        <div className="surface overflow-hidden"><div className="flex gap-1 border-b border-border p-2"><button onClick={()=>setTab('compare')} className={cx('rounded-lg px-3 py-2 text-xs font-bold',tab==='compare'?'bg-secondary text-primary':'text-muted-foreground')}>Original & masked</button><button onClick={()=>setTab('masked')} className={cx('rounded-lg px-3 py-2 text-xs font-bold',tab==='masked'?'bg-secondary text-primary':'text-muted-foreground')}>Masked preview</button></div>
          <div className="p-4"><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"><EyeOff size={14}/>{tab==='masked'?'Sanitized preview':'Original text · temporary'}</div><div className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-xl bg-background p-4 font-mono text-xs leading-6">{tab==='masked'?output:activeReview.originalText}</div><p className="mt-3 text-[10px] leading-4 text-muted-foreground">{tab==='masked'?'This preview reflects your current selections.':'Original text is temporarily held in memory and cleared after review or within 30 minutes.'}</p></div>
        </div>
        <div className="surface p-5"><div className="flex items-center gap-2"><Sparkles size={17} className="text-primary"/><h2 className="font-bold">Privacy Assistant</h2></div><p className="mt-2 text-xs leading-5 text-muted-foreground">Ask about detected patterns and masking choices. The assistant receives this question in the context of this scan.</p>
          {answer&&<div className="mt-4 rounded-xl bg-secondary/65 p-3 text-xs leading-5"><div className="font-semibold">{answer.answer}</div><div className="mt-2 border-t border-border pt-2 text-muted-foreground">{answer.privacyNote}</div></div>}
          <form onSubmit={submitQuestion} className="mt-4 flex gap-2"><input data-testid="input-assistant-question" className="field min-w-0 text-xs" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1000} placeholder="Ask about a finding…"/><Button type="submit" disabled={!question.trim()||ask.isPending} className="px-3">{ask.isPending?<LoaderCircle size={16} className="animate-spin"/>:<Send size={15}/>}</Button></form>
        </div>
      </div>
    </div>}
    <div className="surface p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-bold">Saved scan details</h2><p className="mt-1 text-xs text-muted-foreground">{scan.riskExplanation}</p></div><div className="flex flex-wrap gap-2">{scan.status==='completed'&&scan.selectedCount>0&&<Button data-testid="button-download-masked" variant="soft" onClick={downloadFile} disabled={download.isFetching}><Download size={15}/>{download.isFetching?'Preparing…':'Download sanitized copy'}</Button>}<Button data-testid="button-download-report" variant="soft" onClick={downloadReportFile} disabled={report.isFetching}><Download size={15}/>{report.isFetching?'Preparing…':'Download analysis report'}</Button><Button data-testid="button-delete-scan" variant="danger" onClick={deleteCurrent} disabled={remove.isPending}><Trash2 size={15}/>{remove.isPending?'Deleting…':'Delete scan'}</Button></div></div>
      {(download.isError||report.isError||remove.isError)&&<p role="alert" className="mt-3 text-sm text-red-700">That action could not be completed. Please try again.</p>}
      <div className="mt-5 flex flex-wrap gap-2">{scan.findingCounts.map(c=><span key={c.type} className="rounded-lg bg-secondary px-3 py-2 text-xs"><b>{c.count}</b> {c.label}</span>)}</div>
      {scan.status==='completed'&&scan.selectedCount>0&&<div className="mt-4 rounded-xl bg-background p-4"><div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Saved masked text</div><div className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs leading-5">{scan.maskedText}</div></div>}
    </div>
  </>;
}

function RulesPage() {
  const rules=useListRules();const create=useCreateRule();const remove=useDeleteRule();const client=useQueryClient();const [open,setOpen]=useState(false);const [label,setLabel]=useState('');const [pattern,setPattern]=useState('');const [maskWith,setMask]=useState('[MASKED]');
  const submit=(e:FormEvent)=>{e.preventDefault();create.mutate({data:{label,pattern,maskWith}},{onSuccess:()=>{client.invalidateQueries({queryKey:getListRulesQueryKey()});setOpen(false);setLabel('');setPattern('');setMask('[MASKED]')}})};
  return <><PageHeading eyebrow="Detection controls" title="Your custom rules" description="Add patterns for information unique to your work. Rules help surface possible matches; they do not guarantee detection." action={<Button onClick={()=>setOpen(!open)}><Plus size={16}/>Add a rule</Button>}/>
    {open&&<form onSubmit={submit} className="surface mb-6 p-5 animate-in"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Create a detection rule</h2><button type="button" onClick={()=>setOpen(false)} aria-label="Close"><X size={18}/></button></div><div className="grid gap-4 md:grid-cols-3"><label className="text-xs font-semibold">Rule name<input required maxLength={60} className="field mt-2" value={label} onChange={e=>setLabel(e.target.value)} placeholder="Project reference"/></label><label className="text-xs font-semibold">Pattern (regular expression)<input required maxLength={200} className="field mt-2 font-mono" value={pattern} onChange={e=>setPattern(e.target.value)} placeholder="e.g. PRJ-\\d{5}"/></label><label className="text-xs font-semibold">Replace with<input required maxLength={50} className="field mt-2 font-mono" value={maskWith} onChange={e=>setMask(e.target.value)} /></label></div>{create.isError&&<p className="mt-3 text-sm text-red-700">Rule could not be saved. Check the pattern and try again.</p>}<div className="mt-4 flex justify-end"><Button type="submit" disabled={create.isPending}>{create.isPending?'Saving…':'Save rule'}</Button></div></form>}
    <div className="surface overflow-hidden"><div className="border-b border-border px-5 py-4"><h2 className="font-bold">Custom patterns</h2><p className="mt-1 text-xs text-muted-foreground">Patterns are applied during document review.</p></div>
      {rules.isLoading?<div className="p-5"><Loading/></div>:rules.isError?<div className="p-5"><ErrorBox retry={()=>rules.refetch()}/></div>:!rules.data?.length?<div className="p-5"><Empty title="No custom rules yet" body="Create a rule to identify patterns specific to your documents." action={<Button variant="soft" onClick={()=>setOpen(true)}><Plus size={15}/>Create a rule</Button>}/></div>:<div className="divide-y divide-border">{rules.data.map(r=><div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"><Fingerprint size={18}/></div><div className="min-w-0 flex-1"><div className="font-bold text-sm">{r.label}</div><div className="mt-1 break-all font-mono text-xs text-muted-foreground">{r.pattern}</div></div><div className="rounded-lg bg-background px-3 py-2 font-mono text-xs">{r.maskWith}</div><span className={`tag ${r.enabled?'tag-low':'bg-muted text-muted-foreground'}`}>{r.enabled?'Enabled':'Disabled'}</span><button data-testid={`button-delete-rule-${r.id}`} onClick={()=>{if(confirm(`Delete the “${r.label}” rule?`))remove.mutate({ruleId:r.id},{onSuccess:()=>client.invalidateQueries({queryKey:getListRulesQueryKey()})})}} disabled={remove.isPending} aria-label={`Delete ${r.label}`} className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-700"><Trash2 size={16}/></button></div>)}</div>}
    </div>
     <div className="mt-5 flex gap-3 rounded-xl bg-[#edf3ff] p-4 text-xs leading-5 text-[#354b70]"><Info size={16} className="mt-0.5 shrink-0"/><p>Patterns support a deliberately limited regular-expression subset to reduce risk from overly complex matching. Test custom patterns carefully. Detection is not a guarantee that every matching or sensitive value will be found.</p></div>
  </>;
}
function AuditPage() {
  const q=useListAuditRecords({limit:100},{query:{queryKey:getListAuditRecordsQueryKey({limit:100})}});
  return <><PageHeading eyebrow="Transparency" title="Activity log" description="A record of actions taken in your PrivacyGuard workspace."/>
    <div className="surface overflow-hidden"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-bold">Recent activity</h2><p className="mt-1 text-xs text-muted-foreground">Latest events for your account</p></div><ScrollText size={18} className="text-primary"/></div>
    {q.isLoading?<div className="p-5"><Loading/></div>:q.isError?<div className="p-5"><ErrorBox retry={()=>q.refetch()}/></div>:!q.data?.length?<div className="p-5"><Empty title="No activity recorded yet" body="Workspace actions will appear here as you review documents and manage your settings."/></div>:<div className="divide-y divide-border">{q.data.map((event,i)=><div key={event.id} data-testid={`audit-record-${event.id}`} className="flex gap-4 px-5 py-5"><div className="flex flex-col items-center"><div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-primary"><Clock3 size={16}/></div>{i<q.data!.length-1&&<div className="mt-2 w-px flex-1 bg-border"/>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-bold text-sm">{event.action.replaceAll('_',' ')}</div><time className="text-xs text-muted-foreground">{timeLabel(event.createdAt)}</time></div><p className="mt-1 text-sm leading-5 text-muted-foreground">{event.detail}</p>{event.scanId&&<Link href={`/scans/${event.scanId}`} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary">View scan <ArrowUpRight size={13}/></Link>}</div></div>)}</div>}</div>
  </>;
}
function SettingsPage() {
  const q=useGetCurrentUser();const del=useDeleteAccount();const logout=useLogoutUser();const client=useQueryClient();const [,go]=useLocation();const [confirmText,setConfirmText]=useState('');
  return <><PageHeading eyebrow="Workspace preferences" title="Account & privacy" description="Review your account information and understand how document data is handled."/>
    {q.isLoading?<Loading/>:q.isError||!q.data?<ErrorBox retry={()=>q.refetch()}/>:<div className="space-y-5">
      <section className="surface p-5 sm:p-7"><div className="mb-5 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"><UserRound size={19}/></div><div><h2 className="font-bold">Account details</h2><p className="text-xs text-muted-foreground">Your signed-in profile</p></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-background p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</div><div data-testid="text-account-name" className="mt-2 text-sm font-semibold">{q.data.name}</div></div><div className="rounded-xl bg-background p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email address</div><div data-testid="text-account-email" className="mt-2 text-sm font-semibold">{q.data.email}</div></div></div></section>
      <section className="surface p-5 sm:p-7"><div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8efff] text-primary"><LockKeyhole size={19}/></div><div><h2 className="font-bold">Retention & privacy boundaries</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Original document text is available only during review and is not retained in the database. Temporary review data expires after 30 minutes. Saved scans keep metadata and, when findings are selected, the sanitized output; you can delete individual scans or your account.</p><div className="mt-4 rounded-xl bg-background p-4 text-xs leading-5"><b>Detection is not a guarantee.</b> It may miss sensitive information or identify text incorrectly, and it is not a compliance assessment. Only selected findings are masked; review the output before sharing.</div></div></div></section>
      <section className="rounded-[18px] border border-red-200 bg-[#fbf0ed] p-5 sm:p-7"><div className="flex gap-3"><Trash2 size={18} className="mt-1 text-red-700"/><div className="flex-1"><h2 className="font-bold text-red-900">Delete account</h2><p className="mt-1 text-sm leading-6 text-red-900/70">Permanently delete your account and associated stored data. This cannot be undone.</p><label className="mt-4 block max-w-sm text-xs font-semibold text-red-900">Type DELETE to confirm<input data-testid="input-delete-confirmation" className="field mt-2 border-red-200" value={confirmText} onChange={e=>setConfirmText(e.target.value)} placeholder="DELETE"/></label>{del.isError&&<p className="mt-3 text-sm text-red-800">Account deletion failed. Please try again.</p>}<Button variant="danger" disabled={confirmText!=='DELETE'||del.isPending} className="mt-4" onClick={()=>{if(confirmText==='DELETE'&&confirm('Permanently delete your account and stored data?'))del.mutate(undefined,{onSuccess:()=>{client.clear();go('/login')}})}}><Trash2 size={15}/>{del.isPending?'Deleting account…':'Delete account permanently'}</Button></div></div></section>
    </div>}
  </>;
}

function AuthPage({mode}:{mode:'login'|'register'}) {
  const isRegister=mode==='register';const login=useLoginUser();const register=useRegisterUser();const [,go]=useLocation();const client=useQueryClient();const [name,setName]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const pending=login.isPending||register.isPending;const error=login.isError||register.isError;
  const submit=(e:FormEvent)=>{e.preventDefault();const onSuccess=()=>{client.invalidateQueries({queryKey:getGetCurrentUserQueryKey()});go('/dashboard')};if(isRegister)register.mutate({data:{name,email,password}},{onSuccess});else login.mutate({data:{email,password}},{onSuccess})};
  return <div className="min-h-[100dvh] bg-background md:grid md:grid-cols-[1.03fr_.97fr]">
    <section className="relative hidden overflow-hidden bg-[#122c62] px-12 py-10 text-[#f7f9ff] md:flex md:flex-col md:justify-between lg:px-16"><div className="absolute -right-36 -top-32 h-[520px] w-[520px] rounded-full border border-white/10"/><div className="absolute -right-16 top-[-70px] h-[360px] w-[360px] rounded-full border border-white/10"/><div className="relative flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#91b8ff] text-[#10285a]"><ShieldCheck size={21}/></div><div className="font-bold">PrivacyGuard <span className="font-normal text-white/55">AI</span></div></div>
      <div className="relative max-w-xl pb-8"><div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-[#91b8ff]"><LockKeyhole size={14}/>A quieter way to protect data</div><h1 className="text-5xl font-extrabold leading-[1.08] tracking-[-.055em] lg:text-6xl">Your documents.<br/>Your decisions.</h1><p className="mt-6 max-w-md text-sm leading-7 text-white/65">See what may be sensitive. Choose what to mask. Keep control at every step.</p><div className="mt-11 grid max-w-md grid-cols-2 gap-3"><div className="rounded-2xl border border-white/10 bg-white/[.05] p-4"><EyeOff size={18} className="mb-4 text-[#91b8ff]"/><div className="text-sm font-bold">Review, don’t assume</div><div className="mt-1 text-xs leading-5 text-white/50">Every finding is yours to decide.</div></div><div className="rounded-2xl border border-white/10 bg-white/[.05] p-4"><LockKeyhole size={18} className="mb-4 text-[#91b8ff]"/><div className="text-sm font-bold">Originals stay temporary</div><div className="mt-1 text-xs leading-5 text-white/50">Original text is deleted on completion or within 30 minutes.</div></div></div></div><div className="relative text-[11px] text-white/40">DETECTION IS NOT A GUARANTEE OR COMPLIANCE ASSESSMENT.</div>
    </section>
    <section className="grid min-h-[100dvh] place-items-center px-5 py-10"><div className="w-full max-w-[410px] animate-in"><Link href="/login" className="mb-10 flex items-center gap-2 font-bold md:hidden"><ShieldCheck className="text-primary"/>PrivacyGuard <span className="font-normal text-muted-foreground">AI</span></Link><div className="mb-8"><div className="mb-3 text-[11px] font-bold uppercase tracking-[.18em] text-primary">{isRegister?'Get started':'Welcome back'}</div><h2 className="text-3xl font-extrabold">{isRegister?'Create your account':'Sign in to your workspace'}</h2><p className="mt-2 text-sm text-muted-foreground">{isRegister?'Set up a private space for document review.':'Your privacy workspace is ready when you are.'}</p></div>
      <form onSubmit={submit} className="space-y-4">{isRegister&&<label className="block text-xs font-semibold">Full name<input data-testid="input-name" className="field mt-2" autoComplete="name" required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>}<label className="block text-xs font-semibold">Email address<input data-testid="input-email" className="field mt-2" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label className="block text-xs font-semibold">Password<input data-testid="input-password" className="field mt-2" type="password" autoComplete={isRegister?'new-password':'current-password'} required minLength={isRegister?10:1} value={password} onChange={e=>setPassword(e.target.value)} placeholder={isRegister?'At least 10 characters':'Your password'}/></label>
        {error&&<div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">We couldn’t {isRegister?'create your account':'sign you in'}. Check your details and try again.</div>}
        <Button type="submit" disabled={pending} className="mt-2 w-full py-3">{pending?<><LoaderCircle size={16} className="animate-spin"/>{isRegister?'Creating account…':'Signing in…'}</>:<>{isRegister?'Create account':'Sign in'}<ChevronRight size={16}/></>}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">{isRegister?'Already have an account?':'New to PrivacyGuard?'} <Link href={isRegister?'/login':'/register'} className="font-bold text-primary hover:underline">{isRegister?'Sign in':'Create account'}</Link></p>
      <div className="mt-10 flex items-center justify-center gap-2 text-[11px] text-muted-foreground"><LockKeyhole size={13}/>Your session is protected and private</div>
    </div></section>
  </div>;
}

function App() {
  return <QueryClientProvider client={qc}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/,'')}><AppRouter/></WouterRouter></QueryClientProvider>;
}
export default App;
