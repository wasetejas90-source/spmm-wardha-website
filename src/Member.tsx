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
 const files=selected?docs.filter(d=>!d.category||d.category===selected.name||d.category===selected.id):[];
 return <div className="min-h-screen bg-ivory p-3 md:p-6">
  {viewer&&<ExcelViewer bucket={viewer.bucket} path={viewer.file_path} name={viewer.original_filename} allowDownload={false} onClose={backFromViewer}/>}
  <div className="max-w-6xl mx-auto space-y-4">
   <header className="bg-white rounded-xl shadow p-4 flex flex-wrap justify-between items-center gap-3"><div><p className="text-xs uppercase tracking-wider text-green-800">Savitribai Phule Mahila Mandal, Wardha</p><h1 className="text-2xl font-bold text-forest">Organization Under Our NGO</h1><p className="text-sm text-gray-600">Welcome, {profile.full_name}</p></div><div className="flex gap-2"><Link to="/" className="btn2">{t('home')}</Link><button className="btn" onClick={()=>sb.auth.signOut()}>{t('logout')}</button></div></header>
   {loading&&<p className="p-4 bg-white rounded-xl">Loading your dashboard…</p>}
   {!loading&&err&&<div className="p-3 bg-red-50 text-red-700 rounded-xl"><b>Some dashboard information could not be loaded.</b><p className="text-sm">{err}</p><button className="underline mt-2" onClick={()=>location.reload()}>Retry</button></div>}
   {!loading&&!selected&&!viewer&&<>
    {settingsLoaded&&financeVisible&&<section className="bg-white rounded-xl shadow p-4 space-y-4"><div><h2 className="text-xl font-bold text-forest">Financial Overview</h2><p className="text-xs text-gray-500">Based on recorded manual and imported transactions</p></div>
     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="rounded-xl bg-green-50 p-4"><p className="text-sm text-green-800">Total Income</p><p className="text-2xl font-bold text-green-900">{money(total.income)}</p></div>
      <div className="rounded-xl bg-amber-50 p-4"><p className="text-sm text-amber-800">Total Expenses</p><p className="text-2xl font-bold text-amber-900">{money(total.expense)}</p></div>
      <div className="rounded-xl bg-blue-50 p-4"><p className="text-sm text-blue-800">Remaining Balance</p><p className="text-2xl font-bold text-blue-900">{money(total.income-total.expense)}</p></div>
     </div>
     <div><h3 className="font-semibold mb-2">Income vs Expense</h3>{total.income+total.expense===0?<p className="text-sm text-gray-500">No financial transactions are available yet.</p>:<div className="space-y-3">
      {[{label:'Income',value:total.income,color:'bg-green-600'},{label:'Expenses',value:total.expense,color:'bg-amber-500'}].map(x=><div key={x.label}><div className="flex justify-between text-sm"><span>{x.label}</span><b>{money(x.value)}</b></div><div className="h-4 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${x.color}`} style={{width:`${Math.max(0,x.value/Math.max(total.income,total.expense)*100)}%`}}/></div></div>)}
     </div>}</div>
     {categoryTotals.length>0&&<div><h3 className="font-semibold mb-2">Category-wise Breakdown</h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-green-50"><th className="p-2 text-left">Category</th><th className="p-2 text-right">Income</th><th className="p-2 text-right">Expenses</th></tr></thead><tbody>{categoryTotals.map(([k,v]:any)=><tr key={k} className="border-t"><td className="p-2">{k}</td><td className="p-2 text-right">{money(v.income)}</td><td className="p-2 text-right">{money(v.expense)}</td></tr>)}</tbody></table></div></div>}
    </section>}
    <section><h2 className="text-lg font-bold text-forest mb-3">Organization Categories</h2>{programmes.length?<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{programmes.map(p=><button key={p.id} onClick={()=>openCategory(p)} className="bg-white border-2 border-green-100 hover:border-green-600 rounded-xl shadow-sm p-5 text-left"><span className="text-2xl">▦</span><b className="block mt-2 text-forest">{p.name}</b><small className="text-gray-500">Open records →</small></button>)}</div>:<p className="bg-white rounded-xl p-4">No categories have been published yet.</p>}</section>
    <section className="bg-white rounded-xl shadow p-4"><h2 className="font-bold mb-2">Published Documents</h2>{docs.length?docs.map(d=><div key={d.id} className="border-b py-2 flex justify-between gap-2"><span>{d.title}<small className="block text-gray-500">{d.original_filename}</small></span><button className="btn" onClick={()=>openFile(d)}>View</button></div>):<p className="text-sm text-gray-500">No published documents.</p>}</section>
    <section className="bg-white rounded-xl shadow p-4"><h2 className="font-bold mb-2">{t('news')}</h2>{news.map(n=><p key={n.id} className="border-b py-2"><b>{n.title_en}</b> · {n.published_on}</p>)}</section>
   </>}
   {!loading&&selected&&<><button className="text-forest font-semibold" onClick={backFromCategory}>← Back to categories</button>
    <section className="bg-white rounded-xl shadow p-4"><h2 className="text-2xl font-bold text-forest">{selected.name}</h2>{selected.description&&<p className="text-gray-600">{selected.description}</p>}</section>
    <section className="bg-white rounded-xl shadow p-4"><h3 className="text-lg font-bold text-forest mb-3">Manually Entered Records</h3>{rows.filter(x=>x.source==='manual').length?<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-green-50"><th className="p-2 text-left">Date</th><th className="p-2 text-left">Description</th><th className="p-2">Type</th><th className="p-2 text-right">Amount</th></tr></thead><tbody>{rows.filter(x=>x.source==='manual').map(x=><tr className="border-t" key={x.id}><td className="p-2">{x.txn_date}</td><td className="p-2">{x.description||x.remarks||'—'}</td><td className="p-2 text-center">{x.txn_type}</td><td className="p-2 text-right">{money(Number(x.amount))}</td></tr>)}</tbody></table></div>:<p className="text-sm text-gray-500">No manually entered records.</p>}</section>
    <section className="bg-white rounded-xl shadow p-4"><h3 className="text-lg font-bold text-forest mb-3">Imported Financial Records</h3>{rows.filter(x=>x.source==='excel_import').length?<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-amber-50"><th className="p-2 text-left">Date</th><th className="p-2 text-left">Description</th><th className="p-2">Type</th><th className="p-2 text-right">Amount</th></tr></thead><tbody>{rows.filter(x=>x.source==='excel_import').map(x=><tr className="border-t" key={x.id}><td className="p-2">{x.txn_date}</td><td className="p-2">{x.description||x.remarks||'—'}</td><td className="p-2 text-center">{x.txn_type}</td><td className="p-2 text-right">{money(Number(x.amount))}</td></tr>)}</tbody></table></div>:<p className="text-sm text-gray-500">No imported financial records.</p>}
     {files.length>0&&<div className="mt-4 border-t pt-3"><b>Published Excel files and documents</b>{files.map(d=><div key={d.id} className="flex justify-between items-center gap-2 py-2 border-b"><span className="text-sm">{d.title}<small className="block text-gray-500">{d.original_filename}</small></span><button className="btn" onClick={()=>openFile(d)}>Open / View</button></div>)}</div>}
    </section>
   </>}
  </div></div>
}
