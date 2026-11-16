import {useEffect,useState} from 'react';import {Link} from 'react-router-dom';import {sb,useApp,pub} from './lib';
export default function Home(){
 const {lang,setL,t,session}=useApp();const [c,setC]=useState<any>({}),[news,setNews]=useState<any[]>([]),[acts,setActs]=useState<any[]>([]),[sl,setSl]=useState<any[]>([]),[i,setI]=useState(0);
 useEffect(()=>{(async()=>{const h=await sb.from('homepage_content').select('*');setC(Object.fromEntries((h.data||[]).map((r:any)=>[r.key,r])));
  setNews((await sb.from('news').select('*').eq('is_published',true).order('published_on',{ascending:false}).limit(6)).data||[]);
  setActs((await sb.from('activities').select('*').eq('is_published',true).limit(6)).data||[]);
  setSl((await sb.from('slider_images').select('*').eq('is_published',true).order('sort_order')).data||[])})()},[]);
 useEffect(()=>{if(sl.length<2)return;const x=setInterval(()=>setI(v=>(v+1)%sl.length),5000);return()=>clearInterval(x)},[sl]);
 const g=(k:string,d:string)=>c[k]?(lang==='mr'&&c[k].value_mr?c[k].value_mr:c[k].value_en):d;
 const L=(r:any,k:string)=>(lang==='mr'&&r[k+'_mr'])||r[k+'_en'];
 return <div>
 <header className="bg-white shadow sticky top-0 z-10"><div className="max-w-6xl mx-auto p-3 flex flex-wrap items-center gap-3">
  <div className="flex-1 min-w-[200px]"><div className="font-bold text-forest">Savitribai Phule Mahila Mandal, Wardha</div><div className="text-forest">सावित्रीबाई फुले महिला मंडळ, वर्धा</div></div>
  <button onClick={()=>setL('en')} className={lang==='en'?'font-bold':''}>EN</button>|<button onClick={()=>setL('mr')} className={lang==='mr'?'font-bold':''}>मराठी</button>
  <Link className="btn" to="/auth">{session?'Dashboard':t('login')}</Link>{!session&&<Link className="btn2" to="/auth">{t('register')}</Link>}</div></header>
 <section className="bg-forest text-white bg-cover bg-center" style={sl[i]?{backgroundImage:`linear-gradient(#14532dcc,#14532dcc),url(${pub(sl[i].image_path)})`}:{}}><div className="max-w-6xl mx-auto px-4 py-20">
  <h1 className="text-3xl md:text-5xl font-serif">{g('hero_title','Empowering Women, Building a Better Society')}</h1>
  <p className="mt-3 text-lg">{g('hero_subtitle','Together for Education, Health and Equality')}</p>{sl[i]&&<p className="mt-2 text-gold">{L(sl[i],'caption')}</p>}</div></section>
 <main className="max-w-6xl mx-auto p-4 space-y-10">
  <section><h2 className="text-2xl font-bold text-forest mb-2">About Us</h2><p>{g('about','Edit this text from Admin > Homepage.')}</p></section>
  <section><h2 className="text-2xl font-bold text-forest mb-2">{t('acts')}</h2><div className="grid sm:grid-cols-3 gap-4">{acts.map(a=><div key={a.id} className="bg-white rounded-xl shadow p-4"><b>{L(a,'title')}</b><p className="text-sm">{L(a,'description')}</p></div>)}</div></section>
  <section><h2 className="text-2xl font-bold text-forest mb-2">{t('news')}</h2>{news.map(n=><div key={n.id} className="bg-white rounded-xl shadow p-4 mb-2"><b>{L(n,'title')}</b> <span className="text-xs text-gray-500">{n.published_on}</span><p className="text-sm">{L(n,'body')}</p></div>)}</section>
  <section><h2 className="text-2xl font-bold text-forest mb-2">{t('contact')}</h2><p className="whitespace-pre-line">{g('contact','')}</p></section>
 </main><footer className="bg-forest text-white text-center p-4">© Savitribai Phule Mahila Mandal, Wardha</footer></div>}
