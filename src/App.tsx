import {useEffect,useState} from 'react';import {Routes,Route,Navigate} from 'react-router-dom';
import {sb,Ctx,T,configured} from './lib';import Home from './Home';import Auth from './Auth';import Admin from './Admin';import Member from './Member';
export default function App(){
 const [session,setSession]=useState<any>(null),[profile,setProfile]=useState<any>(null),[ready,setReady]=useState(false),[lang,setLang]=useState(localStorage.lang||'en');
 const load=async(s:any)=>{setSession(s);if(s){const {data}=await sb.from('profiles').select('*').eq('id',s.user.id).single();setProfile(data)}else setProfile(null);setReady(true)};
 useEffect(()=>{sb.auth.getSession().then(({data})=>load(data.session));const {data:l}=sb.auth.onAuthStateChange((_e,s)=>{load(s)});return()=>l.subscription.unsubscribe()},[]);
 const t=(k:string)=>T[lang][k]||k;const setL=(l:string)=>{localStorage.lang=l;setLang(l)};
 if(!configured)return <div className="p-8 max-w-xl mx-auto"><h1 className="text-xl font-bold text-red-700">Setup needed</h1><p className="mt-2">Create a file named <b>.env</b> in the project folder (copy .env.example) with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart <code>npm run dev</code>.</p></div>;
 if(!ready)return <div className="p-8">Loading…</div>;
 const adm=profile&&['admin','super_admin'].includes(profile.role)&&profile.status==='approved';
 const mem=profile&&profile.status==='approved';
 return <Ctx.Provider value={{session,profile,lang,setL,t,reload:()=>load(session)}}><Routes>
  <Route path="/" element={<Home/>}/><Route path="/auth" element={<Auth/>}/>
  <Route path="/admin" element={adm?<Admin/>:<Navigate to="/auth"/>}/>
  <Route path="/member" element={mem?<Member/>:<Navigate to="/auth"/>}/>
 </Routes></Ctx.Provider>}
