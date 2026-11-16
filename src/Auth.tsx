import {useState} from 'react';import {useNavigate} from 'react-router-dom';import {sb,useApp} from './lib';
export default function Auth(){
 const {profile,t}=useApp(),nav=useNavigate();const [mode,setMode]=useState('login'),[f,setF]=useState<any>({}),[msg,setMsg]=useState('');
 const s=(k:string)=>(e:any)=>setF({...f,[k]:e.target.value});
 const go=async(e:any)=>{e.preventDefault();setMsg('');
  if(mode==='register'){const {error}=await sb.auth.signUp({email:f.email,password:f.password,options:{data:{full_name:f.full_name,mobile:f.mobile,designation:f.designation}}});setMsg(error?error.message:'Registered. Your application is Pending admin approval.');}
  else if(mode==='reset'){const {error}=await sb.auth.resetPasswordForEmail(f.email,{redirectTo:location.origin+'/auth'});setMsg(error?error.message:'Reset link sent to your email.')}
  else{const {error}=await sb.auth.signInWithPassword({email:f.email,password:f.password});if(error)setMsg(error.message);else nav('/member')}};
 if(profile){const ok=profile.status==='approved';return <div className="max-w-md mx-auto p-6 space-y-3"><h2 className="text-xl font-bold">{profile.full_name}</h2>
  {ok?<><a className="btn block text-center" href="/member">Member Dashboard</a>{['admin','super_admin'].includes(profile.role)&&<a className="btn2 block text-center" href="/admin">Admin Dashboard</a>}</>:<p className="bg-yellow-100 p-3 rounded">Status: <b>{profile.status}</b>. Access is available after admin approval.</p>}
  <button className="btn" onClick={()=>sb.auth.signOut()}>{t('logout')}</button></div>}
 return <form onSubmit={go} className="max-w-md mx-auto p-6 space-y-3"><h2 className="text-2xl font-bold text-forest">{t(mode==='register'?'register':'login')}</h2>
  {mode==='register'&&<><input className="inp" placeholder="Full name" required onChange={s('full_name')}/><input className="inp" placeholder="Mobile" onChange={s('mobile')}/><input className="inp" placeholder="Organization / designation" onChange={s('designation')}/></>}
  <input className="inp" type="email" placeholder="Email" required onChange={s('email')}/>
  {mode!=='reset'&&<input className="inp" type="password" minLength={8} placeholder="Password (min 8)" required onChange={s('password')}/>}
  <button className="btn w-full">{mode==='reset'?'Send reset link':t(mode)}</button>{msg&&<p className="text-sm">{msg}</p>}
  <div className="text-sm flex gap-3"><a href="#" onClick={e=>{e.preventDefault();setMode('login')}}>{t('login')}</a><a href="#" onClick={e=>{e.preventDefault();setMode('register')}}>{t('register')}</a><a href="#" onClick={e=>{e.preventDefault();setMode('reset')}}>Forgot password?</a></div></form>}
