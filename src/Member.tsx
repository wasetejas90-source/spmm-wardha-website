import {useEffect,useState} from 'react';import {Link} from 'react-router-dom';import {sb,useApp} from './lib';import ExcelViewer from './ExcelViewer';
export default function Member(){
 const {profile,t}=useApp();const [docs,setDocs]=useState<any[]>([]),[news,setNews]=useState<any[]>([]),[v,setV]=useState<any>(null);
 useEffect(()=>{(async()=>{setDocs((await sb.from('documents').select('*').eq('is_published',true).order('created_at',{ascending:false})).data||[]);
  setNews((await sb.from('news').select('*').eq('is_published',true).order('published_on',{ascending:false}).limit(5)).data||[])})()},[]);
 const open=async(d:any)=>{if(/\.xlsx?$/i.test(d.original_filename))return setV(d);const {data}=await sb.storage.from(d.bucket).createSignedUrl(d.file_path,120);if(data)window.open(data.signedUrl)};
 return <div className="max-w-4xl mx-auto p-4 space-y-4">{v&&<ExcelViewer bucket={v.bucket} path={v.file_path} name={v.original_filename} onClose={()=>setV(null)}/>}
  <div className="flex justify-between items-center"><h1 className="text-2xl font-bold text-forest">{t('welcome')}, {profile.full_name}</h1><div className="flex gap-2"><Link to="/" className="btn2">{t('home')}</Link><button className="btn" onClick={()=>sb.auth.signOut()}>{t('logout')}</button></div></div>
  <section className="bg-white rounded-xl shadow p-4"><h2 className="font-bold mb-2">My Profile</h2><p>{profile.email} · {profile.mobile||'-'} · {profile.designation||'-'}</p></section>
  <section className="bg-white rounded-xl shadow p-4"><h2 className="font-bold mb-2">{t('docs')} (read-only)</h2>{docs.map(d=><div key={d.id} className="flex justify-between border-b py-2"><span>{d.title}<br/><small>{d.original_filename}</small></span><button className="btn" onClick={()=>open(d)}>{/\.xlsx?$/i.test(d.original_filename)?'Open Full Screen':'View / Download'}</button></div>)}</section>
  <section className="bg-white rounded-xl shadow p-4"><h2 className="font-bold mb-2">{t('news')}</h2>{news.map(n=><p key={n.id}><b>{n.title_en}</b> – {n.published_on}</p>)}</section></div>}
