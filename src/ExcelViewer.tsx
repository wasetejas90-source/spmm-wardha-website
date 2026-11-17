import {useEffect,useRef,useState} from 'react';import * as XLSX from 'xlsx';import {sb} from './lib';
const col=(n:number)=>{let s='';n++;while(n>0){s=String.fromCharCode(65+(n-1)%26)+s;n=Math.floor((n-1)/26)}return s};
export default function ExcelViewer({bucket,path,name,onClose,allowDownload=true}:any){
 const ref=useRef<HTMLDivElement>(null);const [wb,setWb]=useState<any>(null),[sheet,setSheet]=useState(''),[q,setQ]=useState(''),[z,setZ]=useState(100),[err,setErr]=useState(''),[blob,setBlob]=useState<Blob|null>(null),[sort,setSort]=useState<any>(null);
 useEffect(()=>{(async()=>{const {data,error}=await sb.storage.from(bucket).download(path);if(error)return setErr(error.message);setBlob(data);
  const w=XLSX.read(await data.arrayBuffer(),{type:'array',cellDates:true});setWb(w);setSheet(w.SheetNames[0])})();
  const k=(e:any)=>e.key==='Escape'&&!document.fullscreenElement&&onClose();window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[]);
 let rows:any[][]=wb&&sheet?XLSX.utils.sheet_to_json(wb.Sheets[sheet],{header:1,raw:false,defval:''}):[];
 const head=rows[0]||[];let body=rows.slice(1);
 if(q)body=body.filter(r=>r.some((c:any)=>String(c).toLowerCase().includes(q.toLowerCase())));
 if(sort)body=[...body].sort((a,b)=>String(a[sort.i]).localeCompare(String(b[sort.i]),undefined,{numeric:true})*sort.d);
 const shown=body.slice(0,3000);const nc=Math.max(...rows.map(r=>r.length),0);
 const dl=()=>{if(!blob)return;const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click()};
 return <div ref={ref} className="fixed inset-0 z-50 bg-white flex flex-col">
  <div className="flex flex-wrap items-center gap-2 p-2 bg-forest text-white text-sm">
   <button className="px-2" onClick={onClose}>← Back</button><b className="truncate max-w-[40vw]">{name}</b>
   <input className="text-black rounded px-2 py-1 flex-1 min-w-[100px]" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)}/>
   <button onClick={()=>setZ(Math.max(50,z-10))}>−</button><span>{z}%</span><button onClick={()=>setZ(Math.min(200,z+10))}>+</button>
   <button onClick={()=>document.fullscreenElement?document.exitFullscreen():ref.current?.requestFullscreen()}>⛶ Full Screen</button>
   {allowDownload&&<button onClick={dl}>⬇ Download</button>}<button onClick={onClose}>✕</button></div>
  {err&&<p className="p-4 text-red-600">{err}</p>}{!wb&&!err&&<p className="p-4">Loading…</p>}
  <div className="flex-1 overflow-auto" style={{fontSize:`${z}%`}}><table className="border-collapse text-[0.85em]"><thead className="sticky top-0 z-10"><tr><th className="bg-gray-200 border px-2 sticky left-0"></th>
   {Array.from({length:nc}).map((_,i)=><th key={i} onClick={()=>setSort({i,d:sort?.i===i?-sort.d:1})} className="bg-forest text-white border px-3 py-1 cursor-pointer whitespace-nowrap">{String(head[i]||col(i))}{sort?.i===i?(sort.d>0?' ▲':' ▼'):''}</th>)}</tr></thead>
   <tbody>{shown.map((r,ri)=><tr key={ri}><td className="bg-gray-100 border px-2 text-gray-500 sticky left-0">{ri+1}</td>{Array.from({length:nc}).map((_,ci)=><td key={ci} className="border px-3 py-1 whitespace-nowrap">{String(r[ci]??'')}</td>)}</tr>)}</tbody></table>
   {body.length>3000&&<p className="p-2 text-xs">Showing first 3000 of {body.length} rows (use search to narrow).</p>}</div>
  <div className="flex items-center gap-1 p-1 border-t bg-gray-50 overflow-x-auto text-sm">{wb?.SheetNames.map((s:string)=><button key={s} onClick={()=>setSheet(s)} className={'px-3 py-1 rounded '+(s===sheet?'bg-white border font-bold text-forest':'')}>{s}</button>)}<span className="ml-auto text-xs text-gray-500">View only · original file is never modified</span></div></div>}
