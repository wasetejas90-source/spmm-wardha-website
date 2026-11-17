import {useEffect,useMemo,useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {sb,useApp} from './lib';import ExcelViewer from './ExcelViewer';
const money=(n:number)=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
export default function Member(){
 const {profile,t}=useApp(),nav=useNavigate(),loc=useLocation();
 const [programmes,setProgrammes]=useState<any[]>([]),[records,setRecords]=useState<any[]>([]),[docs,setDocs]=useState<any[]>([]),[news,setNews]=useState<any[]>([]);
 const [loading,setLoading]=useState(true),[err,setErr]=useState(''),[financeVisible,setFinanceVisible]=useState(false),[settingsLoaded,setSettingsLoaded]=useState(false),[financeSummary,setFinanceSummary]=useState<any>(null);
 const params=new URLSearchParams(loc.search),categoryId=params.get('category'),viewerId=params.get('viewer');
 const selected=programmes.find(p=>p.id===categoryId)||null,viewer=docs.find(d=>d.id===viewerId)||null;
 useEffect(()=>{let active=true;(async()=>{
  setLoading(true);setErr('');
  const loadAllRecords=async()=>{let all:any[]=[],offset=0;while(true){const page=await sb.from('financial_records').select('id,txn_date,programme_id,programme_name,category,description,txn_type,amount,source,remarks').order('txn_date',{ascending:false}).range(offset,offset+999);if(page.error)return {data:all,error:page.error};const batch=page.data||[];all=all.concat(batch);if(batch.length<1000)break;offset+=1000;}return {data:all,error:null};};
  const [p,r,d,n,s]=await Promise.all([
   sb.from('programmes').select('*').order('name'),
   loadAllRecords(),
   sb.from('documents').select('*').eq('is_published',true).eq('visibility','members').order('created_at',{ascending:false}),
   sb.from('news').select('*').eq('is_published',true).order('published_on',{ascending:false}).limit(5),
   sb.rpc('get_member_financial_overview')
  ]);
  if(!active)return;
  const errors=[p.error,r.error,d.error,n.error,s.error].filter(Boolean);
  if(errors.length)setErr(errors.map((e:any)=>e.message).join(' · '));
  setProgrammes(p.data||[]);setRecords(r.data||[]);setDocs(d.data||[]);setNews(n.data||[]);
  // get_member_financial_overview() returns the summary JSON directly when enabled,
  // and NULL when the Admin switch is OFF. It does not return { value: ... }.
  const financeData=s.error ? null : s.data;
  setFinanceVisible(Boolean(financeData));
  setFinanceSummary(financeData || null);
  setSettingsLoaded(true);setLoading(false);
 })();return()=>{active=false}},[profile?.id]);
 const total={income:Number(financeSummary?.income||0),expense:Number(financeSummary?.expenses||0)};
 const categoryTotals:any[]=(financeSummary?.categories||[]).map((x:any)=>[x.category,{income:Number(x.income||0),expense:Number(x.expenses||0)}]);
 const openCategory=(p:any)=>nav(`/member?category=${encodeURIComponent(p.id)}`);
 const openFile=(d:any)=>{if(/\.xlsx?$/i.test(d.original_filename||'')){nav(`/member?category=${encodeURIComponent(selected?.id||'')}&viewer=${encodeURIComponent(d.id)}`);return}
  (async()=>{const {data,error}=await sb.storage.from(d.bucket).createSignedUrl(d.file_path,300);if(error){alert(error.message);return}if(data?.signedUrl)window.open(data.signedUrl,'_blank','noopener,noreferrer')})();
 };
 const backFromViewer=()=>nav(selected?`/member?category=${encodeURIComponent(selected.id)}`:'/member',{replace:true});
 const backFromCategory=()=>nav('/member',{replace:true});
 const rows=selected?records.filter(x=>x.programme_id===selected.id||(!x.programme_id&&String(x.programme_name||'').toLowerCase()===String(selected.name).toLowerCase())):[];
 const files=selected?docs.filter(d=>{const category=String(d.category||'').trim().toLocaleLowerCase();return category!==''&&(category===String(selected.name||'').trim().toLocaleLowerCase()||category===String(selected.id||'').trim().toLocaleLowerCase())}):[];
 return <div className="min-h-screen bg-ivory p-3 md:p-6">
  {viewer&&<ExcelViewer bucket={viewer.bucket} path={viewer.file_path} name={viewer.original_filename} allowDownload={false} onClose={backFromViewer}/>}
  <div className="max-w-7xl mx-auto space-y-6 member-dashboard">
   <header className="bg-white rounded-2xl shadow-lg border border-green-100 p-5 md:p-7 flex flex-wrap justify-between items-center gap-4"><div><p className="text-sm uppercase tracking-wider font-bold text-green-800">Savitribai Phule Mahila Mandal, Wardha</p><h1 className="text-3xl md:text-4xl font-extrabold text-forest">Organization Under Our NGO</h1><p className="text-base md:text-lg text-gray-600 mt-1">Welcome, {profile.full_name}</p></div><div className="flex gap-2"><Link to="/" className="btn2">{t('home')}</Link><button className="btn" onClick={()=>sb.auth.signOut()}>{t('logout')}</button></div></header>
   {loading&&<p className="p-4 bg-white rounded-xl">Loading your dashboard…</p>}
   {!loading&&err&&<div className="p-3 bg-red-50 text-red-700 rounded-xl"><b>Some dashboard information could not be loaded.</b><p className="text-sm">{err}</p><button className="underline mt-2" onClick={()=>location.reload()}>Retry</button></div>}
   {!loading&&!selected&&!viewer&&<>
    {settingsLoaded&&financeVisible&&<section className="bg-white rounded-2xl shadow-lg border border-green-100 p-5 md:p-7 space-y-5"><div><h2 className="text-2xl md:text-3xl font-extrabold text-forest">Financial Overview</h2><p className="text-sm text-gray-500">Based on recorded manual and imported transactions</p></div>
     <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div className="rounded-2xl bg-green-50 border border-green-100 p-5 md:p-6 shadow-sm"><p className="text-sm text-green-800">Total Income</p><p className="text-3xl md:text-4xl font-extrabold text-green-900 mt-1">{money(total.income)}</p></div>
      <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5 md:p-6 shadow-sm"><p className="text-sm text-amber-800">Total Expenses</p><p className="text-3xl md:text-4xl font-extrabold text-amber-900 mt-1">{money(total.expense)}</p></div>
      <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5 md:p-6 shadow-sm sm:col-span-2 xl:col-span-1"><p className="text-sm text-blue-800">Remaining Balance</p><p className="text-3xl md:text-4xl font-extrabold text-blue-900 mt-1">{money(total.income-total.expense)}</p></div>
     </div>
     <div><h3 className="font-semibold mb-2">Income vs Expense</h3>{total.income+total.expense===0?<p className="text-sm text-gray-500">No financial transactions are available yet.</p>:<div className="space-y-3">
      {[{label:'Income',value:total.income,color:'bg-green-600'},{label:'Expenses',value:total.expense,color:'bg-amber-500'}].map(x=><div key={x.label}><div className="flex justify-between text-sm"><span>{x.label}</span><b>{money(x.value)}</b></div><div className="h-4 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${x.color}`} style={{width:`${Math.max(0,x.value/Math.max(total.income,total.expense)*100)}%`}}/></div></div>)}
     </div>}</div>
     {categoryTotals.length>0&&<div><h3 className="font-semibold mb-2">Category-wise Breakdown</h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-green-50"><th className="p-2 text-left">Category</th><th className="p-2 text-right">Income</th><th className="p-2 text-right">Expenses</th></tr></thead><tbody>{categoryTotals.map(([k,v]:any)=><tr key={k} className="border-t"><td className="p-2">{k}</td><td className="p-2 text-right">{money(v.income)}</td><td className="p-2 text-right">{money(v.expense)}</td></tr>)}</tbody></table></div></div>}
    </section>}
    <section><h2 className="text-2xl md:text-3xl font-extrabold text-forest mb-4">Organization Categories</h2>{programmes.length?<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{programmes.map(p=><button key={p.id} onClick={()=>openCategory(p)} className="member-category-card bg-white border border-green-100 hover:border-green-600 rounded-2xl shadow-md p-6 md:p-7 text-left transition"><span className="inline-flex items-center justify-center rounded-xl bg-green-50 text-forest text-3xl w-14 h-14">▦</span><b className="block mt-4 text-xl md:text-2xl text-forest">{p.name}</b><span className="block text-base text-gray-600 mt-2">Open reports and documents <span aria-hidden="true">→</span></span></button>)}</div>:<p className="bg-white rounded-xl p-5">No categories have been published yet.</p>}</section>
    <section className="bg-white rounded-2xl shadow-md border border-green-100 p-5 md:p-6"><h2 className="text-xl md:text-2xl font-bold mb-3">{t('news')}</h2>{news.map(n=><p key={n.id} className="border-b py-2"><b>{n.title_en}</b> · {n.published_on}</p>)}</section>
   </>}
   {!loading&&selected&&<><button className="text-forest font-semibold" onClick={backFromCategory}>← Back to categories</button>
    <section className="bg-white rounded-2xl shadow-lg border border-green-100 p-5 md:p-7"><h2 className="text-3xl md:text-4xl font-extrabold text-forest">{selected.name}</h2>{selected.description&&<p className="text-gray-600">{selected.description}</p>}</section>
    <section className="bg-white rounded-2xl shadow-md border border-green-100 p-5 md:p-6"><h3 className="text-xl md:text-2xl font-bold text-forest mb-4">Manually Entered Records</h3>{rows.filter(x=>x.source==='manual').length?<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-green-50"><th className="p-2 text-left">Date</th><th className="p-2 text-left">Description</th><th className="p-2">Type</th><th className="p-2 text-right">Amount</th></tr></thead><tbody>{rows.filter(x=>x.source==='manual').map(x=><tr className="border-t" key={x.id}><td className="p-2">{x.txn_date}</td><td className="p-2">{x.description||x.remarks||'—'}</td><td className="p-2 text-center">{x.txn_type}</td><td className="p-2 text-right">{money(Number(x.amount))}</td></tr>)}</tbody></table></div>:<p className="text-sm text-gray-500">No manually entered records.</p>}</section>
    <section className="bg-white rounded-2xl shadow-md border border-green-100 p-5 md:p-6"><h3 className="text-xl md:text-2xl font-bold text-forest mb-4">Imported Financial Records</h3>{rows.filter(x=>x.source==='excel_import').length?<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-amber-50"><th className="p-2 text-left">Date</th><th className="p-2 text-left">Description</th><th className="p-2">Type</th><th className="p-2 text-right">Amount</th></tr></thead><tbody>{rows.filter(x=>x.source==='excel_import').map(x=><tr className="border-t" key={x.id}><td className="p-2">{x.txn_date}</td><td className="p-2">{x.description||x.remarks||'—'}</td><td className="p-2 text-center">{x.txn_type}</td><td className="p-2 text-right">{money(Number(x.amount))}</td></tr>)}</tbody></table></div>:<p className="text-sm text-gray-500">No imported financial records.</p>}
     
    </section>
    <section className="bg-white rounded-2xl shadow-lg border border-green-100 p-5 md:p-6">
     <div className="flex flex-wrap justify-between items-center gap-2 mb-4"><h3 className="text-xl md:text-2xl font-bold text-forest">Published Documents</h3><span className="text-sm text-gray-600">{files.length} available</span></div>
     {files.length? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{files.map(d=><article key={d.id} className="rounded-xl border border-green-100 bg-ivory p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div className="min-w-0"><div className="font-bold text-lg text-forest break-words">{d.title}</div><p className="text-sm text-gray-600 break-words mt-1">{d.original_filename}</p><p className="text-xs text-gray-500 mt-2">{/\.pdf$/i.test(d.original_filename||'')?'PDF document':'Excel / document'}</p></div><button className="btn w-full sm:w-auto px-6" onClick={()=>openFile(d)}>View document</button></article>)}</div>:<p className="text-base text-gray-600">No published documents are assigned to this category yet.</p>}
    </section>
   </>}
  </div></div>
}
