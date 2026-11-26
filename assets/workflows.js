(function engine(){
 const D=window.WORKFLOW_DATA, C=D.case,R=D.rules,$=id=>document.getElementById(id),fmt=(v,u)=>Number(v).toFixed(u==="%"?1:2)+" "+u,esc=x=>String(x).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 let trail=[{id:"start",via:"Starting candidate"}],status="",completed=null,inspected=0,reference=true,previous=true,selectedRow=null;
 function state(){return C.states[trail.at(-1).id]}
 function meets(v,r){return r.op===">="?v>=r.limit-1e-9:v<=r.limit+1e-9}
 function misses(values){return R.map((r,i)=>meets(values[i],r)?null:i).filter(i=>i!==null)}
 function table(){let s=state(),prev=trail.length>1?C.states[trail.at(-2).id]:null;
 const cell=(v,r)=>'<td class="'+(meets(v,r)?"wf-pass":"wf-fail")+'">'+fmt(v,r.unit)+' <span class="wf-status">'+(meets(v,r)?"Met":"Not met")+'</span></td>';
 $("wfTable").innerHTML='<table><thead><tr><th>Structure</th><th>Metric</th><th>Exercise criterion</th><th>'+esc(s.name)+'</th>'+(previous&&prev?'<th>'+esc(prev.name)+'</th>':'')+(reference?'<th>Original plan</th>':'')+'</tr></thead><tbody>'+R.map((r,i)=>'<tr><td><button class="wf-row" data-row="'+i+'" aria-label="Explain '+esc(r.s+" "+r.metric)+'">'+esc(r.s)+'</button></td><td>'+esc(r.metric)+'</td><td>'+ (r.op===">="?"≥":"≤")+' '+fmt(r.limit,r.unit)+'</td>'+cell(s.values[i],r)+(previous&&prev?cell(prev.values[i],r):'')+(reference?cell(C.reference[i],r):'')+'</tr>').join("")+'</tbody></table>';
 const fail=misses(s.values);$("wfSummary").textContent=(R.length-fail.length)+" of "+R.length+" displayed criteria met · "+fail.length+" not met";
 $("wfObjective").textContent=s.objective+" Gy (illustrative objective, not an evaluation limit)";
 $("wfPrevious").disabled=!prev;
 if(selectedRow!==null)explain(selectedRow);else $("wfExplain").textContent="Select a structure name to see what that metric means.";
 }
 function explain(i){selectedRow=i;let r=R[i],v=state().values[i];$("wfExplain").textContent=r.s+" · "+r.metric+" — "+r.why+" Current value: "+fmt(v,r.unit)+". Criterion "+(meets(v,r)?"met.":"not met.")}
 function render(){
  const s=state();$("wfStage").textContent=s.name;$("wfPrompt").textContent=completed?"Team debrief":s.prompt;$("wfHintText").textContent=s.hint;
  $("wfHint").open=false;$("wfBack").disabled=trail.length===1&&!completed;
  $("wfTrail").innerHTML=trail.map((e,i)=>'<li><button data-jump="'+i+'" '+(i===trail.length-1?'aria-current="step"':'')+'>'+esc(C.states[e.id].name)+'</button><small>'+esc(e.via)+'</small></li>').join("");
  $("wfChoices").innerHTML=completed?'<p><strong>Exercise review recorded.</strong> Restart or step back to compare another route.</p>':s.choices.map((c,i)=>'<button class="wf-choice" data-choice="'+i+'">'+esc(c.label)+'</button>').join("");
  $("wfFeedback").textContent=status||"Review the table before choosing an action.";
  $("wfDebrief").hidden=!completed;if(completed){const fail=misses(s.values);$("wfDebriefText").textContent=fail.length?"Unmet displayed criteria: "+fail.map(i=>R[i].s+" "+R[i].metric+" ("+fmt(s.values[i],R[i].unit)+")").join("; ")+". Discuss the trade-off and local escalation.":"All displayed training criteria are met. Discuss spatial dose distribution, all other relevant clinical criteria, independent checks and local approval before any real treatment."}
  table();
 }
 function choose(i){if(completed)return;let c=state().choices[i];if(!c)return;status=c.feedback;if(c.to){trail.push({id:c.to,via:c.label});selectedRow=null;}else if(c.finish){completed=c.finish;}render()}
 function jump(i){if(i<0||i>=trail.length)return;trail=trail.slice(0,i+1);completed=null;selectedRow=null;status="Returned to this candidate. Try a different decision.";render()}
 function reset(){trail=[{id:"start",via:"Starting candidate"}];status="";completed=null;selectedRow=null;$("wfNotes").value="";render()}
 $("wfChoices").addEventListener("click",e=>{const b=e.target.closest("[data-choice]");if(b)choose(Number(b.dataset.choice))});
 $("wfTable").addEventListener("click",e=>{const b=e.target.closest("[data-row]");if(b)explain(Number(b.dataset.row))});
 $("wfTrail").addEventListener("click",e=>{const b=e.target.closest("[data-jump]");if(b)jump(Number(b.dataset.jump))});
 $("wfBack").onclick=()=>{if(completed){completed=null;status="Review another action.";render()}else jump(trail.length-2)};
 $("wfReset").onclick=reset;$("wfReference").onchange=e=>{reference=e.target.checked;table()};$("wfPrevious").onchange=e=>{previous=e.target.checked;table()};
 $("wfExport").onclick=()=>{const s=state();const report=[C.title,"TRAINING ONLY — fictional scripted outcomes",C.source,"Decision history:",...trail.map((e,i)=>(i+1)+". "+e.via+" → "+C.states[e.id].name),"Final candidate: "+s.name,"Review disposition: "+(completed||"not recorded"),...R.map((r,i)=>r.s+" "+r.metric+": "+fmt(s.values[i],r.unit)+" ("+(meets(s.values[i],r)?"met":"not met")+")"),"Team notes:",$("wfNotes").value].join("\n");const u=URL.createObjectURL(new Blob([report],{type:"text/plain"})),a=document.createElement("a");a.href=u;a.download=C.id+"-review.txt";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
 render();
})();
