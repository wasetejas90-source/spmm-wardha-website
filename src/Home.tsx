import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {sb,useApp,pub} from './lib';

const defaults:any={
 org_name:'Savitribai Phule Mahila Mandal, Wardha', tagline:'',
 top_location:'Wardha, Maharashtra',top_email:'',top_phone:'',
 hero_title:'Empowering Women, Building a Better Society',
 hero_subtitle:'Together for Education, Health and Equality',
 hero_quote:'Education is the key to women’s empowerment.',hero_quote_author:'Savitribai Phule',
 hero_cta:'Empowering Women, Building a Better Society',
 admin_title:'ADMIN LOGIN',admin_desc:'Super Admin and authorised administrators',
 member_title:'MEMBER LOGIN',member_desc:'Approved NGO members',
 register_title:'NEW MEMBER? REGISTER HERE',register_desc:'Registration requests require admin approval.',
 leadership_title:'Our Leadership',about_title:'About Savitribai Phule Mahila Mandal',
 about:'We are committed to the empowerment of women, education, and social development. Our mission is to build a progressive, equal and educated society where every woman can thrive.',
 about_quote:'Together we can create a stronger, more informed and compassionate society.',
 activities_title:'Our Activities',news_title:'Latest News',join_title:'Join Us',
 join_text:'',
 footer_text:'© Savitribai Phule Mahila Mandal, Wardha. All Rights Reserved.',
 logo_path:'',hero_image:'',about_image:''
};
export default function Home(){
 const {lang,setL,t,session}=useApp();
 const [c,setC]=useState<any>(defaults),[leaders,setLeaders]=useState<any[]>([]),[news,setNews]=useState<any[]>([]),[acts,setActs]=useState<any[]>([]),[slides,setSlides]=useState<any[]>([]),[idx,setIdx]=useState(0);
 useEffect(()=>{(async()=>{
  const [h,l,n,a,s]=await Promise.all([
   sb.from('homepage_content').select('*'),
   sb.from('leadership').select('*').eq('is_published',true).order('sort_order'),
   sb.from('news').select('*').eq('is_published',true).order('published_on',{ascending:false}).limit(3),
   sb.from('activities').select('*').eq('is_published',true).order('created_at',{ascending:false}).limit(5),
   sb.from('slider_images').select('*').eq('is_published',true).order('sort_order')
  ]);
  const map:any={...defaults};(h.data||[]).forEach((r:any)=>{map[r.key]=lang==='mr'&&r.value_mr?r.value_mr:(r.value_en??'')});setC(map);
  setLeaders(l.data||[]);setNews(n.data||[]);setActs(a.data||[]);setSlides(s.data||[]);
 })()},[lang]);
 useEffect(()=>{if(slides.length<2)return;const id=setInterval(()=>setIdx(x=>(x+1)%slides.length),5000);return()=>clearInterval(id)},[slides]);
 const val=(key:string)=>c[key]||defaults[key]||'';
 const text=(r:any,key:string)=>(lang==='mr'&&r[key+'_mr'])||r[key+'_en']||'';
 const hero=slides.length?pub(slides[idx]?.image_path):pub(val('hero_image'));
 const goAuth=(mode:string)=>`/auth?mode=${mode}`;
 return <div className="spmm-home">
  <div className="spmm-top"><span>⌖ {val('top_location')}</span><span>✉ {val('top_email')}</span><span>☎ {val('top_phone')}</span><div className="ml-auto flex gap-4"><Link to={goAuth('login')}>♙ Login</Link><Link to={goAuth('register')}>✎ Register</Link></div></div>
  <header className="spmm-header">
   <Link to="/" className="spmm-brand">{val('logo_path')?<img src={pub(val('logo_path'))}/>:<div className="spmm-logo-placeholder">SPMM</div>}<div><strong>{val('org_name')}</strong></div></Link>
   <nav><a href="#home">Home</a><a href="#about">About</a><a href="#leadership">{val('leadership_title')}</a><a href="#activities">Activities</a><a href="#news">News</a><a href="#contact">Contact</a></nav>
   <div className="flex gap-2 text-sm"><button onClick={()=>setL('en')}>EN</button><button onClick={()=>setL('mr')}>मराठी</button></div>
  </header>
  <section id="home" className="spmm-hero spmm-hero-images-only" aria-label="Organization photo slideshow" style={hero?{backgroundImage:`url("${hero}")`}:{}}>
   {slides.length>1&&<><button aria-label="Previous photo" className="spmm-slide-arrow left" onClick={()=>setIdx((idx-1+slides.length)%slides.length)}>‹</button><button aria-label="Next photo" className="spmm-slide-arrow right" onClick={()=>setIdx((idx+1)%slides.length)}>›</button><div className="spmm-dots">{slides.map((s,i)=><button aria-label={`Show photo ${i+1}`} key={s.id} onClick={()=>setIdx(i)} className={idx===i?'active':''}/>)}</div></>}
   {slides.length===0&&!hero&&<div className="spmm-hero-empty">Add slideshow photos from Admin Dashboard → Homepage Management → Hero Slider</div>}
   {slides.length>0&&((lang==='mr'?slides[idx]?.caption_mr:slides[idx]?.caption_en)||'').trim()!==''&&<div className="spmm-hero-caption">{lang==='mr'?slides[idx]?.caption_mr:slides[idx]?.caption_en}</div>}
  </section>
  <section className="spmm-access">
   <Link to="/auth?mode=login&access=admin" className="spmm-access-card admin"><span>♙</span><h2>{val('admin_title')}</h2><p>{val('admin_desc')}</p><b>Login Here →</b></Link>
   <Link to="/auth?mode=login&access=member" className="spmm-access-card member"><span>♟♟</span><h2>{val('member_title')}</h2><p>{val('member_desc')}</p><b>Login Here →</b></Link>
   <Link to={goAuth('register')} className="spmm-access-card register"><span>▤</span><h2>{val('register_title')}</h2><p>{val('register_desc')}</p><b>Register Now →</b></Link>
  </section>
  <main className="spmm-main">
   <section id="leadership" className="spmm-section"><h2 className="spmm-heading">{val('leadership_title')}</h2><div className="spmm-leaders">
    {leaders.map((p,i)=><article className="spmm-leader" key={p.id}>{p.photo_path?<img src={pub(p.photo_path)}/>:<div className="spmm-no-photo">Photo</div>}<label>{p.title_en||'Leader'}</label><h3>{text(p,'name')}</h3><p>{text(p,'bio')}</p></article>)}
    {!leaders.length&&<p className="spmm-empty">Leadership profiles will appear here.</p>}
   </div></section>
   <section id="about" className="spmm-about"><div className="spmm-about-image">{val('about_image')&&<img src={pub(val('about_image'))}/>}</div><div><h2>❧ {val('about_title')}</h2><p>{val('about')}</p><Link to="/auth?mode=register">Learn More →</Link></div><blockquote>“{val('about_quote')}”</blockquote></section>
   <section id="activities" className="spmm-section"><h2 className="spmm-heading">{val('activities_title')}</h2><div className="spmm-activity-grid">{acts.map(a=><article className="spmm-activity" key={a.id}>{a.image_path&&<img src={pub(a.image_path)}/>}<b>{text(a,'title')}</b><p>{text(a,'description')}</p></article>)}{!acts.length&&<p className="spmm-empty">Activities will appear here.</p>}</div></section>
   <section id="news" className="spmm-section"><h2 className="spmm-heading">{val('news_title')}</h2><div className="spmm-news-grid">{news.map(n=><article className="spmm-news" key={n.id}>{n.image_path&&<img src={pub(n.image_path)}/>}<div><h3>{text(n,'title')}</h3><small>{n.published_on}</small><p>{text(n,'body')}</p></div></article>)}{!news.length&&<p className="spmm-empty">Latest news will appear here.</p>}</div></section>
   <section className="spmm-join"><div>🤝 <div><h2>Join Us</h2></div></div><Link to={goAuth('register')}>Register Now →</Link></section>
  </main>
  <footer id="contact" className="spmm-footer"><div><strong>{val('org_name')}</strong><p>{val('top_location')}</p></div><div>✉ {val('top_email')}<p>☎ {val('top_phone')}</p></div><div>Follow Us: {val('footer_text')}</div></footer>
 </div>
}
