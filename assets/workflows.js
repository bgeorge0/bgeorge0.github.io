(function app(){
 const D=window.WORKFLOW_DATA,C=D.case,R=D.rules,$=id=>document.getElementById(id),esc=x=>String(x).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])),fmt=(v,u)=>Number(v).toFixed(u==="%"?1:2)+" "+u;
 const steps=["Mandatory OARs","PTVhigh coverage","Whole-PTV coverage","Original treatment intent"];
 let route=[{id:"start",phase:"max",via:"Operator 1 starts with the fully re-optimised plan"}],message="",completed="",previous=true,baseline=true,selected=null,choices=[];
 const current=()=>route.at(-1),state=()=>C.states[current().id],phase=()=>current().phase;
 const meets=(v,r)=>r.op===">"?v>r.limit:r.op===">="?v>=r.limit-1e-9:v<=r.limit+1e-9;
 const groupPass=g=>R.every((r,i)=>r.group!==g||meets(state().values[i],r));
 const unlocked=()=>route.some(e=>e.phase==="intent")&&["intent","rename","done"].includes(phase())&&["max","oar","high","whole"].every(groupPass);
 const add=(label,fn)=>choices.push({label,fn});
 function advance(id,p,via,why){route.push({id,phase:p,via});message=why;selected=null;render()}
 function next(p,via,why){advance(current().id,p,via,why)}
 function feedback(t){message=t;render()}
 function finish(mode,t){completed=mode;next("done",mode==="candidate"?"Rename training candidate":"Escalate / seek team review",t)}
 function table(){
  const s=state(),show=unlocked()&&baseline,prior=previous?[...route.slice(0,-1)].reverse().find(e=>e.id!==current().id):null;
  const cell=(v,r)=>'<td class="'+(meets(v,r)?"wf-pass":"wf-fail")+'">'+fmt(v,r.unit)+' <span class="wf-status">'+(meets(v,r)?"Met":"Not met")+'</span></td>';
  let last="";const groups={max:"Maximum dose",oar:"1 · Mandatory OARs",high:"2 · PTVhigh",whole:"3 · Whole PTV"};
  $("wfTable").innerHTML='<table><thead><tr><th>Structure</th><th>Metric</th><th>Exercise criterion</th><th>'+esc(s.name)+'</th>'+(prior?'<th>'+esc(C.states[prior.id].name)+'</th>':'')+(show?'<th>Original plan</th>':'')+'</tr></thead><tbody>'+[2,5,6,7,3,4,0,1].map(i=>{let r=R[i],h=r.group!==last?'<tr class="wf-group"><td colspan="'+(4+Number(!!prior)+Number(show))+'">'+groups[r.group]+'</td></tr>':"";last=r.group;return h+'<tr><td><button class="wf-row" data-row="'+i+'">'+esc(r.s)+'</button></td><td>'+esc(r.metric)+'</td><td>'+(r.op===">"?"&gt;":r.op===">="?"≥":"≤")+' '+fmt(r.limit,r.unit)+'</td>'+cell(s.values[i],r)+(prior?cell(C.states[prior.id].values[i],r):"")+(show?cell(C.reference[i],r):"")+'</tr>'}).join("")+'</tbody></table>';
  $("wfReference").disabled=!unlocked();$("wfReference").checked=show;$("wfBaselineStatus").textContent=unlocked()?"Original plan available for treatment-intent review.":"Original plan locked until the adapted plan has been assessed on its own merits.";
  $("wfPrevious").disabled=!route.slice(0,-1).some(e=>e.id!==current().id);
  $("wfSummary").textContent="Assess the criteria in order, not as a total pass score.";
  $("wfObjective").textContent=(s.objective||33)+" Gy · illustrative OAR objective"+(phase()==="editOar"?" (edit pending re-optimisation)":"");
  $("wfExplain").textContent=selected===null?"Select a structure to explain the metric.":R[selected].s+" · "+R[selected].metric+" — "+R[selected].why+" Current: "+fmt(s.values[selected],R[selected].unit)+".";
 }
 function question(g,yes,no,onYes,onNo){
  add(yes,()=>groupPass(g)?onYes():feedback("Not yet. At least one criterion in this group is unmet. Recheck the current adapted plan."));
  add(no,()=>!groupPass(g)?onNo():feedback("Recheck the displayed criteria in this group: they are met."));
 }
 const order={max:-1,oar:0,oarAction:0,high:1,highAction:1,whole:2,wholeAction:2,limitedSpatial:2,editOar:-1,editTarget:-1,spatial:2,intent:3,rename:3,done:4};
 function render(){
  const p=phase(),s=state();choices=[];let prompt="",hint="",finding="";
  switch(p){
  case "max":
   prompt="First action · normalise the fully re-optimised plan to maximum dose";hint="Operator 1 first normalises to the applicable maximum-dose criterion, not to coverage or the original plan.";
   add("Normalise to maximum dose",()=>advance(s.max,"oar","Normalise to maximum dose","All dose metrics may change. Start again with mandatory OAR tolerance."));
   add("Compare with the original plan first",()=>feedback("Not yet. Evaluate the adapted plan on its own merits before comparing the original."));
   add("Normalise to maximise PTV coverage",()=>feedback("The workflow starts with maximum-dose normalisation. Coverage alone must not determine scale."));break;
  case "oar":
   prompt="1 · Are mandatory OARs within tolerance?";hint="Check each displayed mandatory visceral OAR criterion. Check the maximum-dose criterion separately.";
   question("oar","All mandatory OAR criteria are within tolerance","At least one mandatory OAR criterion is outside tolerance",()=>groupPass("max")?next("high","Mandatory OARs within tolerance","Now assess PTVhigh coverage."):feedback("The maximum-dose criterion also requires review."),()=>next("oarAction","Mandatory OAR violation identified","Resolve mandatory OAR dose before judging target coverage."));break;
  case "oarAction":
   prompt="Mandatory OAR violation · what next?";hint="Normalise to the limiting OAR criterion. If multiple fail, use the most restrictive scale that meets all displayed mandatory OARs.";
   if(s.oar)add("Normalise to the limiting mandatory OAR dose constraint",()=>advance(s.oar,"oar","Normalise to limiting OAR","Scaling affects target coverage too. Recheck mandatory OARs, then PTVhigh."));
   add("Increase dose to improve target coverage",()=>feedback("That risks worsening the mandatory OAR violation."));
   add("Refer unresolved mandatory OAR violation to the team",()=>finish("escalation","Document the mandatory OAR issue and follow local escalation."));break;
  case "high":
   prompt="2 · Is PTVhigh coverage acceptable?";hint="Assess both PTVhigh V95% rows independently of overall PTV coverage. The diagram specifies >98%.";
   question("high","Both PTVhigh coverage criteria are acceptable","At least one PTVhigh criterion is not acceptable",()=>next("whole","PTVhigh coverage acceptable","Now assess overall PTV coverage."),()=>next("highAction","PTVhigh undercoverage identified","The OAR-limited plan has inadequate high-priority coverage. Change the optimisation balance rather than blindly scaling."));break;
  case "highAction":
   prompt="PTVhigh coverage inadequate · what next?";hint="The workflow loops back to optimisation after changing settings to reduce OAR dose.";
   if(s.oarEdit)add("Discuss and change optimiser settings to reduce OAR dose",()=>next("editOar","Review OAR objective with responsible operator","Objective change requested. Existing dose remains unchanged until optimisation."));
   add("Increase normalisation without revisiting OAR constraints",()=>feedback("This risks breaching mandatory OAR criteria again."));
   add("Refer the unresolved PTVhigh deficit to the team",()=>finish("escalation","The adapted candidate has not demonstrated acceptable PTVhigh coverage."));break;
  case "editOar":case "editTarget":
   prompt="Objective change · re-optimise before reassessment";hint="Coordinate the appropriate change with the responsible operator. Objective settings do not directly change an existing dose.";
   finding=p==="editOar"?"Scripted OAR objective change: "+(C.states[s.oarEdit].objective||31)+" Gy.":"Review GTV/PTVhigh decrease or increase thresholds as appropriate; the scripted result illustrates the effect, not a prescribed objective setting.";
   add("Run re-optimisation",()=>advance(p==="editOar"?s.oarEdit:s.targetEdit,"max","Re-optimise with revised objectives","New fully re-optimised candidate. Normalise to maximum dose again and restart the checks."));
   add("Use existing dose as if it reflected the change",()=>feedback("An objective is an instruction, not a measured dose. Re-optimise first."));break;
  case "whole":
   prompt="3 · Is overall PTV coverage good for this adapted plan?";hint="Check whole-PTV V100% against the >95% exercise aim. An OAR-limited compromise below aim needs contextual judgement rather than automatic rejection or acceptance.";
   question("whole","Whole-PTV coverage achieves the exercise aim","Whole-PTV coverage is below the exercise aim",()=>next("spatial","Whole-PTV coverage achieves aim","The displayed numerical criteria are met independently. Review isodoses before comparing treatment intent."),()=>next("wholeAction","Whole-PTV coverage below aim","Assess whether further optimisation or an OAR-limited clinical review is appropriate."));break;
  case "wholeAction":
   prompt="Whole-PTV coverage below aim · what next?";hint="For an OAR-limited plan with acceptable PTVhigh, the diagram allows initial isodose review. Assess the compromise on its own merits first.";
   if(s.targetEdit)add("Review GTV/PTVhigh decrease or increase objective thresholds, then re-optimise",()=>next("editTarget","Review target objective thresholds with responsible operator","Existing dose is unchanged until re-optimisation."));
   if(s.kind==="oar")add("Review the OAR-limited compromise and seek team assessment",()=>next("limitedSpatial","OAR-limited compromise requires review","PTVhigh is acceptable but whole-PTV coverage is below aim. Isodose review can inform judgement; baseline remains locked."));
   add("Compare with original to justify the deficit",()=>feedback("The original is not a shortcut around assessment of the adapted plan's own merits."));
   add("Escalate unresolved whole-PTV coverage",()=>finish("escalation","Record the whole-PTV deficit and OAR/target trade-off."));break;
  case "limitedSpatial":
   prompt="Initial isodose review · OAR-limited compromise";hint="A clinical judgement is needed; a below-aim result is not automatically unacceptable.";
   finding="Actual isodoses and an authorised assessment of this compromise are not available in this scripted exercise.";
   add("Document the compromise and request team review",()=>finish("escalation","Do not assume the compromise is good or reject it solely on the numerical aim. Seek contextual review."));break;
  case "spatial":
   prompt="Initial isodose review · any obvious issues?";hint="Review the location of cold dose and hotspots in actual practice. Here the finding is scripted, not a real dose map.";
   finding=C.spatialIssue?"Scripted isodose finding: a suspicious high-dose region near the visceral OAR requires investigation, despite passing displayed metrics.":"Scripted isodose finding: no obvious issue identified. Actual isodoses are not displayed or verified.";
   add("No obvious issue in the scripted finding",()=>C.spatialIssue?feedback("The scripted finding identifies a suspicious region; investigate it before proceeding."):next("intent","Initial scripted isodose review clear","Original plan comparison unlocked for treatment-intent assessment."));
   add("Investigate the finding or seek further spatial review",()=>finish("escalation","Further spatial review is appropriate if there is unresolved concern."));break;
  case "intent":
   prompt="4 · Does this plan achieve the treatment intent of the original?";hint="Compare purpose and dose balance, not whether every metric is better. The original can have its own compromises.";
   finding="Fictional original treatment intent: "+C.intent;
   add("Displayed dose balance is consistent with stated intent; document and continue candidate review",()=>next("rename","Treatment intent reviewed","The numerical balance is consistent with the stated intent in this exercise. This does not establish clinical approval."));
   add("Intent cannot be established from these data; seek review",()=>finish("escalation","Appropriate if more information is needed; actual spatial dose and clinical QA are not established here."));
   add("Require every metric to be better than the original",()=>feedback("Matching or exceeding every baseline number is not the same as achieving treatment intent."));break;
  case "rename":
   prompt="Rename the candidate plan";hint="The diagram ends with naming a candidate, not approval or treatment selection.";
   add("Rename to FractionX_optimised (training only)",()=>finish("candidate","Candidate named FractionX_optimised. Clinical review, independent checks, QA and local approval remain required."));
   add("Select for treatment immediately",()=>feedback("This exercise cannot authorise treatment."));break;
  case "done":prompt="Team debrief";hint="Review the sequence of decisions and outstanding checks.";break;
  }
  $("wfStage").textContent=p==="done"&&completed==="candidate"?"FractionX_optimised · training candidate":s.name;
  $("wfPrompt").textContent=prompt;$("wfHintText").textContent=hint;$("wfHint").open=false;$("wfFinding").hidden=!finding;$("wfFinding").textContent=finding;
  $("wfChoices").innerHTML=choices.map((c,i)=>'<button class="wf-choice" data-choice="'+i+'">'+esc(c.label)+'</button>').join("");
  $("wfFeedback").textContent=message||"Begin with the fully re-optimised candidate. Follow the workflow in order.";
  $("wfBack").disabled=route.length===1;$("wfTrail").innerHTML=route.map((e,i)=>'<li><button data-jump="'+i+'" '+(i===route.length-1?'aria-current="step"':'')+'>'+esc(e.via)+'</button><small>'+esc(C.states[e.id].name)+'</small></li>').join("");
  const at=order[p];$("wfSteps").innerHTML=steps.map((x,i)=>'<div class="wf-step '+(i===at?"wf-current":i<at&&p!=="done"?"wf-complete":"")+'"><b>'+(i+1)+'</b> '+esc(x)+(i===at?' <span>(current)</span>':'')+'</div>').join("");
  $("wfDebrief").hidden=p!=="done";if(p==="done")$("wfDebriefText").textContent=completed==="candidate"?"Training candidate named for further review. Discuss outstanding clinical checks.":"Escalation / further assessment recorded. Discuss unresolved adapted-plan requirements. No clinical approval has been given.";
  table();
 }
 function jump(i){if(i<0||i>=route.length)return;route=route.slice(0,i+1);if(phase()!=="done")completed="";selected=null;message="Returned to this step. Reassess before moving on.";render()}
 function reset(){route=[{id:"start",phase:"max",via:"Operator 1 starts with the fully re-optimised plan"}];completed="";message="";selected=null;baseline=true;$("wfNotes").value="";render()}
 $("wfChoices").addEventListener("click",e=>{const b=e.target.closest("[data-choice]");if(b)choices[Number(b.dataset.choice)]?.fn()});
 $("wfTable").addEventListener("click",e=>{const b=e.target.closest("[data-row]");if(b){selected=Number(b.dataset.row);table()}});
 $("wfTrail").addEventListener("click",e=>{const b=e.target.closest("[data-jump]");if(b)jump(Number(b.dataset.jump))});
 $("wfBack").onclick=()=>jump(route.length-2);$("wfReset").onclick=reset;$("wfReference").onchange=e=>{if(unlocked()){baseline=e.target.checked;table()}};$("wfPrevious").onchange=e=>{previous=e.target.checked;table()};
 $("wfExport").onclick=()=>{const report=[C.title,"TRAINING ONLY — fictional scripted outcomes","Decision history:",...route.map((e,i)=>(i+1)+". "+e.via+" — "+C.states[e.id].name),"Disposition: "+completed,"Final displayed criteria:",...R.map((r,i)=>r.s+" "+r.metric+": "+fmt(state().values[i],r.unit)+" ("+(meets(state().values[i],r)?"met":"not met")+")"),"Original comparison accessed: "+(route.some(e=>e.phase==="intent")?"yes":"no"),"Team notes:",$("wfNotes").value].join("\n");const u=URL.createObjectURL(new Blob([report],{type:"text/plain"})),a=document.createElement("a");a.href=u;a.download=C.id+"-review.txt";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
 render();
})();
