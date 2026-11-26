function penalty(d,t,mode){let e=d-t;if(mode==="min")e=Math.min(0,e);if(mode==="max")e=Math.max(0,e);return e*e}
function derivative(d,t,mode){let e=d-t;return 2*(mode==="min"?Math.min(0,e):mode==="max"?Math.max(0,e):e)}
function model(s){
 const rows=Array.from({length:80},(_,i)=>{
  const p=i/79, structure=p>=.37&&p<=.63?"PTV":Math.abs(p-(s==="near"?.73:.88))<.09?"OAR":"Normal";
  const bump=(c,w)=>Math.exp(-(((p-c)/w)**2));
  return {p,structure,a:[.12+.94*bump(.43,.23),.08+1.02*bump(.57,.20),.06+.78*bump(.50,.13)+.30*bump(.83,.13)]};
 });
 return rows;
}
function evaluate(rows,x,w,limit){
 const ds=rows.map(r=>r.a.reduce((v,a,j)=>v+a*x[j],0));
 const n={PTV:0,OAR:0,Normal:0};rows.forEach(r=>n[r.structure]++);
 let parts=[0,0,0,0],g=[0,0,0];
 rows.forEach((r,i)=>{
  const d=ds[i], terms=r.structure==="PTV"?[[0,50,"min",1],[1,53,"max",.6]]:r.structure==="OAR"?[[2,limit,"max",w]]:[[3,0,"max",.025]];
  terms.forEach(([k,t,m,weight])=>{
   const scale=weight/n[r.structure];parts[k]+=scale*penalty(d,t,m);
   r.a.forEach((a,j)=>g[j]+=scale*derivative(d,t,m)*a);
  });
 });
 return {ds,parts,g,cost:parts.reduce((a,b)=>a+b,0)};
}
function iterate(rows,x,w,limit){
 const a=evaluate(rows,x,w,limit);let step=1;
 for(let i=0;i<30;i++){
  const z=x.map((v,j)=>Math.max(0,v-step*a.g[j]));
  const b=evaluate(rows,z,w,limit);
  if(b.cost<=a.cost+1e-10)return z;
  step*=.5;
 }
 return x.slice();
}
function dvh(ds,t){return 100*ds.filter(d=>d>=t).length/ds.length}
function d95(ds){return ds.slice().sort((a,b)=>b-a)[Math.ceil(.95*ds.length)-1]}

"use strict";
const $=id=>document.getElementById(id), num=id=>Number($(id).value), fmt=(v,n=1)=>Number(v).toFixed(n), out=(id,v)=>{$(id).textContent=v}, bind=(ids,fn)=>ids.forEach(id=>$(id).addEventListener("input",fn)), blue="#2366bd",red="#c24d41",teal="#007b78",gold="#a66b10";
function plot(id,opt){
 const el=$(id), L=58,R=18,T=17,B=45,W=600-L-R,H=290-T-B;
 const X=v=>L+(v-opt.xmin)/(opt.xmax-opt.xmin)*W,Y=v=>T+H-(v-opt.ymin)/(opt.ymax-opt.ymin)*H;
 let svg='<defs><clipPath id="clip-'+id+'"><rect x="'+L+'" y="'+T+'" width="'+W+'" height="'+H+'"/></clipPath></defs>';
 for(let i=0;i<=5;i++){let xv=opt.xmin+(opt.xmax-opt.xmin)*i/5,yv=opt.ymin+(opt.ymax-opt.ymin)*i/5;let xx=X(xv),yy=Y(yv);svg+='<path d="M'+xx+' '+T+'V'+(T+H)+' M'+L+' '+yy+'H'+(L+W)+'" stroke="#e5edf2" fill="none"/><text x="'+xx+'" y="'+(T+H+19)+'" text-anchor="middle">'+tick(xv)+'</text><text x="'+(L-8)+'" y="'+(yy+4)+'" text-anchor="end">'+tick(yv)+'</text>'}
 svg+='<g clip-path="url(#clip-'+id+')">';
 (opt.bands||[]).forEach(b=>{svg+='<rect x="'+X(b[0])+'" y="'+T+'" width="'+(X(b[1])-X(b[0]))+'" height="'+H+'" fill="'+b[2]+'" opacity=".12"/>'});
 (opt.lines||[]).forEach(s=>{let d=s.points.map((p,i)=>(i?"L":"M")+X(p[0]).toFixed(2)+" "+Y(p[1]).toFixed(2)).join(" ");svg+='<path d="'+d+'" stroke="'+s.color+'" stroke-width="'+(s.width||2.5)+'" '+(s.dash?'stroke-dasharray="6 5"':'')+' fill="none" stroke-linejoin="round" stroke-linecap="round"/>'});
 (opt.dots||[]).forEach(p=>{svg+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="'+(p[3]||4)+'" fill="'+p[2]+'" stroke="white" stroke-width="1.3"/>'});
 svg+='</g><path d="M'+L+' '+T+'V'+(T+H)+'H'+(L+W)+'" stroke="#8296a5" fill="none"/><text x="'+(L+W/2)+'" y="282" text-anchor="middle">'+opt.xlabel+'</text><text x="13" y="'+(T+H/2)+'" transform="rotate(-90 13 '+(T+H/2)+')" text-anchor="middle">'+opt.ylabel+'</text>';
 el.innerHTML='<g font-family="system-ui,sans-serif" font-size="12" fill="#526779">'+svg+'</g>';
}
function tick(x){return Math.abs(x)>=1000?Number(x.toPrecision(3)).toLocaleString("en-GB"):Number(x.toPrecision(3)).toString()}
const sample=(a,b,f,n=150)=>Array.from({length:n+1},(_,i)=>{let x=a+(b-a)*i/n;return [x,f(x)]});
function dvhPoints(ds,max){let unique=[...new Set(ds)].sort((a,b)=>a-b),pts=[[0,100]],remaining=ds.length;unique.forEach(d=>{pts.push([d,100*remaining/ds.length]);remaining-=ds.filter(v=>v===d).length;pts.push([d,100*remaining/ds.length])});pts.push([max,0]);return pts}
