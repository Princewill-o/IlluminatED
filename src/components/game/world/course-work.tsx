"use client";
import { useState } from "react";

import { assessCourseWork, courseWork, type CourseWork } from "@/lib/illum-world/course-work";
import type { RoleContract } from "@/lib/illum-world/role-contracts";

export function CourseWorkEditor({course, value, onChange}: {course: RoleContract;value: CourseWork;onChange: (work: CourseWork) => void}) {
 const [checked,setChecked]=useState(false);
 const task=courseWork(course),result=assessCourseWork(course,value);
 const change=(next: CourseWork)=>{setChecked(false);onChange(next);};
 return <section className="my-6 rounded-2xl border-2 border-[#5141b5] p-5" aria-labelledby="course-work-title">
  <h3 id="course-work-title" className="text-xl font-black">Practical work · Review and hand over</h3>
  <p className="mt-3">{task.brief}</p>
  <p className="mt-3 font-semibold">Scenario procedure · {task.action}</p>
  <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Item</th><th className="p-2">Evidence</th><th className="p-2">Work units</th><th className="p-2">Your decision</th></tr></thead><tbody>{task.rows.map(row=><tr key={row.id} className="border-t"><th className="p-2">{row.id} · {row.item}</th><td className="p-2">{row.evidence}</td><td className="p-2">{row.units}</td><td className="p-2"><select aria-label={`Decision for ${row.id}`} value={value.decisions[row.id]??""} onChange={event=>change({...value,decisions:{...value.decisions,[row.id]:event.target.value}})} className="min-h-11 rounded-lg border bg-white p-2"><option value="">Choose</option><option value="accept">Accept</option><option value="hold">Hold</option><option value="escalate">Escalate</option></select></td></tr>)}</tbody></table></div>
  <label className="mt-4 block font-bold">Total units ready to proceed<input inputMode="numeric" value={value.total} onChange={event=>change({...value,total:event.target.value})} className="ml-3 min-h-11 w-24 rounded-lg border bg-white p-2"/></label>
  <label className="mt-4 block font-bold">Who owns the next action?<input value={value.owner} maxLength={100} onChange={event=>change({...value,owner:event.target.value})} className="mt-1 block min-h-11 w-full rounded-lg border bg-white p-2"/></label>
  <label className="mt-4 block font-bold">Write your handover<textarea value={value.handover} maxLength={2000} onChange={event=>change({...value,handover:event.target.value})} rows={5} className="mt-1 block w-full rounded-lg border bg-white p-2"/></label>
  <p className="mt-2 text-sm">Include R2, R3, the evidence and your next actions. Automatic checks cover the decisions, calculation, owner and required references.</p>
  <button type="button" onClick={()=>setChecked(true)} className="mt-4 min-h-11 rounded-lg bg-[#5141b5] px-4 font-bold text-white">Check practical work</button>
  {checked&&<ul role="status" className="mt-3 space-y-2">{result.feedback.map(item=><li key={item}>{item}</li>)}</ul>}
 </section>;
}
