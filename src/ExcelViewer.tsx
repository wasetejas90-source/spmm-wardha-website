import {useEffect,useMemo,useRef,useState} from 'react';
import ExcelJS from 'exceljs';
import type {CSSProperties} from 'react';
import {sb} from './lib';

const colName=(n:number)=>{let s='';while(n>0){s=String.fromCharCode(65+(n-1)%26)+s;n=Math.floor((n-1)/26)}return s};
const color=(c:any)=>{if(!c)return undefined;let v=c.argb||c.rgb;if(!v&&c.theme!==undefined)return undefined;if(!v)return undefined;v=String(v).replace('#','');if(v.length===8)v=v.slice(2);return v.length===6?'#'+v:undefined};
const cssBorder=(b:any)=>{if(!b||!b.style)return undefined;const widths:any={hair:'1px',thin:'1px',dotted:'1px',dash:'1px',medium:'2px',double:'3px',thick:'3px'};const styles:any={dotted:'dotted',dash:'dashed',dashDot:'dashed',dashDotDot:'dashed',slantDashDot:'dashed',double:'double'};return `${widths[b.style]||'1px'} ${styles[b.style]||'solid'} ${color(b.color)||'#b8c5bd'}`};
const fmt=(v:any,fmtCode?:string)=>{if(v===null||v===undefined)return '';if(v instanceof Date)return v.toLocaleDateString();if(typeof v==='number'&&fmtCode){if(fmtCode.includes('%'))return new Intl.NumberFormat('en-IN',{style:'percent',maximumFractionDigits:1}).format(v);if(fmtCode.includes('₹'))return '₹'+new Intl.NumberFormat('en-IN',{maximumFractionDigits:fmtCode.includes('.00')?2:0}).format(v);if(fmtCode.includes('#,##0'))return new Intl.NumberFormat('en-IN',{maximumFractionDigits:fmtCode.includes('.00')?2:0}).format(v)}if(typeof v==='object'&&v.text)return v.text;return String(v)};

// Calculate the common Excel formulas used in uploaded budget/expense workbooks when
// the file has no cached formula results (a frequent cause of blank totals in browser previews).
function calculateWorkbook(wb:ExcelJS.Workbook){
 const cache=new Map<string,any>();
 const colNumber=(s:string)=>[...s].reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0);
 const parseRange=(ref:string,ws:ExcelJS.Worksheet)=>{
  const m=ref.trim().match(/^(?:'((?:[^']|'')+)'|([A-Za-z0-9_ ]+))!\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)$/i)
   ||ref.trim().match(/^\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)$/i);
  if(!m)return null;
  const hasSheet=m.length===7, targetName=hasSheet?(m[1]||m[2]).replace(/''/g,"'"):ws.name;
  const target=wb.getWorksheet(targetName)||ws;
  const c1=hasSheet?m[3]:m[1],r1=hasSheet?+m[4]:+m[2],c2=hasSheet?m[5]:m[3],r2=hasSheet?+m[6]:+m[4];
  const values:any[]=[];
  for(let r=r1;r<=r2;r++)for(let c=colNumber(c1);c<=colNumber(c2);c++)values.push(get(target,`${colName(c)}${r}`));
  return values;
 };
 const splitArgs=(s:string)=>{
  const out:string[]=[];let start=0,level=0,inString=false;
  for(let i=0;i<s.length;i++){const ch=s[i];if(ch==='"'){if(inString&&s[i+1]==='"'){i++;continue}inString=!inString}else if(!inString&&ch==='(')level++;else if(!inString&&ch===')')level--;else if(!inString&&level===0&&ch===','){out.push(s.slice(start,i).trim());start=i+1}}
  out.push(s.slice(start).trim());return out;
 };
 const criterionMatch=(actual:any,criterion:any)=>{
  if(criterion===undefined||criterion===null||criterion==='')return actual===''||actual===null||actual===undefined;
  const raw=String(criterion);const op=raw.match(/^(>=|<=|<>|>|<|=)(.*)$/);
  if(op){const expected=op[2].replace(/^"|"$/g,'');const a=Number(actual),b=Number(expected);if(expected!==''&&Number.isFinite(a)&&Number.isFinite(b)){switch(op[1]){case '>':return a>b;case '<':return a<b;case '>=':return a>=b;case '<=':return a<=b;case '<>':return a!==b;default:return a===b}}const aa=String(actual??'').toLowerCase(),bb=expected.toLowerCase();switch(op[1]){case '<>':return aa!==bb;case '>':return aa>bb;case '<':return aa<bb;case '>=':return aa>=bb;case '<=':return aa<=bb;default:return aa===bb}}
  return String(actual??'').toLowerCase()===raw.toLowerCase();
 };
 const get=(ws:ExcelJS.Worksheet,addr:string,depth=0):any=>{
  if(depth>40)return '';const key=ws.name+'!'+addr;if(cache.has(key))return cache.get(key);
  const raw:any=ws.getCell(addr).value;
  if(raw&&typeof raw==='object'&&'formula'in raw){if(raw.result!==undefined&&raw.result!==null)return raw.result;const result=calc(String(raw.formula||''),ws,depth+1);cache.set(key,result);return result}
  return raw instanceof Date?raw:raw??'';
 };
 const evaluate=(expression:string,ws:ExcelJS.Worksheet,depth:number):any=>{
  if(depth>40)return '';let s=expression.trim();if(s.startsWith('='))s=s.slice(1).trim();
  if(s.startsWith('(')&&s.endsWith(')'))return evaluate(s.slice(1,-1),ws,depth+1);
  if(/^"(?:[^"]|"")*"$/.test(s))return s.slice(1,-1).replace(/""/g,'"');
  if(/^-?\d+(?:\.\d+)?$/.test(s))return Number(s);
  if(/^(TRUE|FALSE)$/i.test(s))return /^TRUE$/i.test(s);
  const fn=s.match(/^([A-Z][A-Z0-9.]*)\((.*)\)$/i);
  if(fn){
   const name=fn[1].toUpperCase(),args=splitArgs(fn[2]);
   if(name==='IF'){const cond=evaluate(args[0]||'FALSE',ws,depth+1);return cond?evaluate(args[1]||'0',ws,depth+1):evaluate(args[2]||'0',ws,depth+1)}
   if(name==='SUM'){return args.reduce((total,arg)=>total+flatten(evaluate(arg,ws,depth+1)).reduce((n,v)=>n+(typeof v==='number'?v:0),0),0)}
   if(name==='COUNTA'){return args.reduce((n,arg)=>n+flatten(evaluate(arg,ws,depth+1)).filter(v=>v!==''&&v!==null&&v!==undefined).length,0)}
   if(name==='COUNTIF'){const range=flatten(evaluate(args[0]||'',ws,depth+1)),criterion=evaluate(args[1]||'""',ws,depth+1);return range.filter(v=>criterionMatch(v,criterion)).length}
   if(name==='SUMIF'){const range=flatten(evaluate(args[0]||'',ws,depth+1)),criterion=evaluate(args[1]||'""',ws,depth+1),sumRange=args[2]?flatten(evaluate(args[2],ws,depth+1)):range;return range.reduce((n,v,i)=>n+(criterionMatch(v,criterion)?(Number(sumRange[i])||0):0),0)}
   if(name==='SUMIFS'){const sumRange=flatten(evaluate(args[0]||'',ws,depth+1)),criteria=[];for(let i=1;i+1<args.length;i+=2)criteria.push({range:flatten(evaluate(args[i],ws,depth+1)),criterion:evaluate(args[i+1],ws,depth+1)});return sumRange.reduce((n,v,index)=>n+(criteria.every(c=>criterionMatch(c.range[index],c.criterion))?(Number(v)||0):0),0)}
   return '';
  }
  const range=parseRange(s,ws);if(range)return range;
  const cellRef=s.match(/^(?:'((?:[^']|'')+)'|([A-Za-z0-9_ ]+))!\$?([A-Z]+)\$?(\d+)$/)||s.match(/^\$?([A-Z]+)\$?(\d+)$/);
  if(cellRef){const cross=cellRef.length===5, targetName=cross?(cellRef[1]||cellRef[2]).replace(/''/g,"'"):ws.name, col=cross?cellRef[3]:cellRef[1],row=cross?cellRef[4]:cellRef[2];return get(wb.getWorksheet(targetName)||ws,`${col}${row}`,depth+1)}
  // Comparisons (used by IF) are evaluated after resolving their operands.
  const comparison=s.match(/^(.*?)(>=|<=|<>|=|>|<)(.*)$/);
  if(comparison){const a=evaluate(comparison[1],ws,depth+1),b=evaluate(comparison[3],ws,depth+1);return criterionMatch(a,comparison[2]+String(b))}
  // Arithmetic expressions are restricted to numbers and arithmetic operators after cell references are resolved.
  const replaced=s.replace(/(?:'((?:[^']|'')+)'|([A-Za-z0-9_ ]+))!\$?([A-Z]+)\$?(\d+)|\$?([A-Z]+)\$?(\d+)/g,(match,quoted,sheet,col1,row1,col2,row2)=>{
   const targetName=(quoted||sheet)?String(quoted||sheet).replace(/''/g,"'"):ws.name;
   return String(Number(get(wb.getWorksheet(targetName)||ws,`${col1||col2}${row1||row2}`,depth+1))||0);
  });
  if(/^[\d\s.+\-*/()]+$/.test(replaced)){try{return Function(`"use strict";return (${replaced})`)()}catch{return 0}}
  return '';
 };
 const flatten=(v:any):any[]=>Array.isArray(v)?v:[v];
 const calc=(formula:string,ws:ExcelJS.Worksheet,depth:number)=>evaluate(formula,ws,depth+1);
 return (ws:ExcelJS.Worksheet,cell:ExcelJS.Cell)=>{
  const v:any=cell.value;
  if(v&&typeof v==='object'&&'formula'in v){if(v.result!==undefined&&v.result!==null)return v.result;return get(ws,cell.address)}
  return v;
 };
}

export default function ExcelViewer({bucket,path,name,onClose,allowDownload=true}:any){
 const ref=useRef<HTMLDivElement>(null);const [wb,setWb]=useState<ExcelJS.Workbook|null>(null),[sheet,setSheet]=useState(''),[q,setQ]=useState(''),[z,setZ]=useState(100),[err,setErr]=useState(''),[blob,setBlob]=useState<Blob|null>(null),[busy,setBusy]=useState(true);
 useEffect(()=>{let live=true;(async()=>{try{const {data,error}=await sb.storage.from(bucket).download(path);if(error)throw error;if(!live)return;setBlob(data);const book=new ExcelJS.Workbook();await book.xlsx.load(await data.arrayBuffer());if(!live)return;setWb(book);setSheet(book.worksheets[0]?.name||'')}catch(e:any){if(live)setErr(e?.message||'Unable to open this Excel file.')}finally{if(live)setBusy(false)}})();const k=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!document.fullscreenElement)onClose()};window.addEventListener('keydown',k);return()=>{live=false;window.removeEventListener('keydown',k)}},[bucket,path]);
 const ws=wb?.getWorksheet(sheet);const compute=useMemo(()=>wb?calculateWorkbook(wb):null,[wb]);
 const dimensions=useMemo(()=>{if(!ws)return{maxRow:0,maxCol:0,merges:new Map<string,{rowSpan:number,colSpan:number}>(),covered:new Set<string>()};const maxRow=Math.max(ws.rowCount,ws.actualRowCount),maxCol=Math.max(ws.columnCount,ws.actualColumnCount);const merges=new Map<string,{rowSpan:number,colSpan:number}>(),covered=new Set<string>();for(const m of (((ws as any).model?.merges)||[])){const x=m.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);if(!x)continue;const n=(s:string)=>[...s].reduce((a,c)=>a*26+c.charCodeAt(0)-64,0);const c1=n(x[1]),r1=+x[2],c2=n(x[3]),r2=+x[4];merges.set(`${r1}:${c1}`,{rowSpan:r2-r1+1,colSpan:c2-c1+1});for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)if(r!==r1||c!==c1)covered.add(`${r}:${c}`)}return{maxRow,maxCol,merges,covered}},[ws]);
 const matches=useMemo(()=>{const s=new Set<string>();if(ws&&q.trim())ws.eachRow({includeEmpty:true},(row,r)=>{row.eachCell({includeEmpty:true},(cell,c)=>{const v=compute?.(ws,cell);if(String(v??'').toLowerCase().includes(q.toLowerCase()))s.add(`${r}:${c}`)})});return s},[ws,q,compute]);
 const dl=()=>{if(!blob)return;const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)};
 const pxWidth=(n:number)=>Math.max(35,Math.round((n||10)*7+5));
 const cellStyle=(cell:ExcelJS.Cell):CSSProperties=>{const s=cell.style||{},f=s.font||{},fill=s.fill as any,a=s.alignment||{},b=s.border||{};const bg=fill?.type==='pattern'?color(fill.fgColor):undefined;const st:React.CSSProperties={fontFamily:f.name||'Calibri',fontSize:f.size?`${f.size}pt`:undefined,fontWeight:f.bold?'bold':undefined,fontStyle:f.italic?'italic':undefined,color:color(f.color),backgroundColor:bg,textAlign:a.horizontal as any,verticalAlign:(a.vertical==='center'?'middle':a.vertical==='top'?'top':'bottom'),whiteSpace:a.wrapText?'normal':'pre',textDecoration:[f.underline?'underline':'',f.strike?'line-through':''].filter(Boolean).join(' ')||undefined,padding:'3px 5px',minWidth:undefined,maxWidth:undefined};if(b.left)st.borderLeft=cssBorder(b.left);if(b.right)st.borderRight=cssBorder(b.right);if(b.top)st.borderTop=cssBorder(b.top);if(b.bottom)st.borderBottom=cssBorder(b.bottom);if(a.wrapText)st.overflowWrap='anywhere';return st};
 return <div ref={ref} className="fixed inset-0 z-50 bg-white flex flex-col text-gray-800">
  <div className="flex flex-wrap items-center gap-2 p-2 bg-forest text-white text-sm shrink-0"><button className="px-2" onClick={onClose}>← Back</button><b className="truncate max-w-[30vw]">{name}</b><input className="text-black rounded px-2 py-1 flex-1 min-w-[90px]" placeholder="Find in workbook…" value={q} onChange={e=>setQ(e.target.value)}/><button onClick={()=>setZ(Math.max(50,z-10))}>−</button><span>{z}%</span><button onClick={()=>setZ(Math.min(200,z+10))}>+</button><button onClick={()=>document.fullscreenElement?document.exitFullscreen():ref.current?.requestFullscreen()}>⛶ Full Screen</button>{allowDownload&&<button onClick={dl}>⬇ Download</button>}<button onClick={onClose}>✕</button></div>
  {err&&<p className="p-4 text-red-600">{err}</p>}{busy&&<p className="p-4">Loading workbook…</p>}
  {ws&&<div className="flex-1 overflow-auto" style={{zoom:z/100}}><table className="border-collapse text-[13px]" style={{tableLayout:'fixed',width:'max-content',minWidth:'100%'}}><colgroup><col style={{width:42}}/>{Array.from({length:dimensions.maxCol},(_,i)=><col key={i} style={{width:pxWidth(ws.getColumn(i+1).width||10.5)}}/>)}</colgroup><thead className="sticky top-0 z-20"><tr><th className="bg-gray-200 border border-gray-300 sticky left-0 z-30 w-[42px]"></th>{Array.from({length:dimensions.maxCol},(_,i)=><th key={i} className="bg-forest text-white border border-white/30 px-2 py-1 text-center font-semibold">{colName(i+1)}</th>)}</tr></thead><tbody>{Array.from({length:dimensions.maxRow},(_,ri)=>{const row=ws.getRow(ri+1);return <tr key={ri} style={{height:row.height?`${row.height*4/3}px`:undefined,display:row.hidden?'none':undefined}}><th className="bg-gray-100 border border-gray-300 text-gray-500 sticky left-0 z-10 font-normal px-2 text-right">{ri+1}</th>{Array.from({length:dimensions.maxCol},(_,ci)=>{const cell=row.getCell(ci+1),key=`${ri+1}:${ci+1}`;if(dimensions.covered.has(key))return null;const span=dimensions.merges.get(key);const v=compute?.(ws,cell);const text=fmt(v,cell.numFmt);const matched=matches.has(key);return <td key={ci} rowSpan={span?.rowSpan} colSpan={span?.colSpan} style={{...cellStyle(cell),backgroundColor:matched?'#fff2a8':cellStyle(cell).backgroundColor||'#fff',height:row.height?`${row.height*4/3}px`:undefined}} className="border border-gray-300 align-middle">{text}</td>})}</tr>})}</tbody></table></div>}
  {!busy&&wb&&!ws&&<p className="p-4">This workbook has no readable sheet.</p>}
  <div className="flex items-center gap-1 p-1 border-t bg-gray-50 overflow-x-auto text-sm shrink-0">{wb?.worksheets.map(s=><button key={s.name} onClick={()=>{setSheet(s.name);setQ('')}} className={'px-3 py-1 rounded whitespace-nowrap '+(s.name===sheet?'bg-white border font-bold text-forest':'')}>{s.name}</button>)}<span className="ml-auto text-xs text-gray-500 whitespace-nowrap">View only · original file is never modified</span></div>
 </div>;
}
