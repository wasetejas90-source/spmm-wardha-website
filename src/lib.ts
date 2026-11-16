import {createClient} from '@supabase/supabase-js';import {createContext,useContext} from 'react';
export const configured=!!(import.meta.env.VITE_SUPABASE_URL&&import.meta.env.VITE_SUPABASE_ANON_KEY);
export const sb=createClient(import.meta.env.VITE_SUPABASE_URL||'https://placeholder.supabase.co',import.meta.env.VITE_SUPABASE_ANON_KEY||'placeholder');
export const Ctx=createContext<any>(null);export const useApp=()=>useContext(Ctx);
export const T:any={en:{login:'Login',register:'Register',logout:'Logout',home:'Home',news:'Latest News',acts:'Activities',contact:'Contact',docs:'Documents',name:'Organization',mission:'Our Mission',vision:'Our Vision',welcome:'Welcome'},
mr:{login:'लॉगिन',register:'नोंदणी',logout:'बाहेर पडा',home:'मुख्यपृष्ठ',news:'ताज्या बातम्या',acts:'उपक्रम',contact:'संपर्क',docs:'कागदपत्रे',name:'संस्था',mission:'आमचे ध्येय',vision:'आमची दृष्टी',welcome:'स्वागत'}};
export const ALLOWED=['pdf','xlsx','xls','doc','docx','png','jpg','jpeg','csv'];export const MAX=25*1024*1024;
export const pub=(p:string)=>p?sb.storage.from('site-media').getPublicUrl(p).data.publicUrl:'';
