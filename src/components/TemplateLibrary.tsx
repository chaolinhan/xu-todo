import { CopyPlus, Download, FileStack, Pencil, Trash2, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { AppData, LocalTemplate } from '../types'
import { downloadTemplate, exampleTemplates, parseTemplate } from '../lib/templates'
interface Props {data:AppData;onUse:(template:LocalTemplate)=>void;onSave:(template:LocalTemplate)=>void;onDelete:(id:string)=>void}
function TemplateCard({template,example,onUse,onSave,onDelete}:{template:LocalTemplate;example?:boolean;onUse:()=>void;onSave:(template:LocalTemplate)=>void;onDelete:()=>void}) {
 const [editing,setEditing]=useState(false),[name,setName]=useState(template.name),[description,setDescription]=useState(template.description)
 const steps=template.tasks.reduce((total,task)=>total+(task.subtasks?.length??0),0)
 return <article className="template-card"><div className="template-card-top"><div className="template-symbol" style={{color:template.color}}><FileStack size={21}/></div><span>{example?'内置示例':template.kind==='task'?'任务模板':'项目模板'}</span>{!example&&<div><button className="icon-button" type="button" aria-label={`编辑模板：${template.name}`} onClick={()=>{setName(template.name);setDescription(template.description);setEditing(!editing)}}>{editing?<X size={15}/>:<Pencil size={15}/>}</button><button className="icon-button" type="button" aria-label={`删除模板：${template.name}`} onClick={onDelete}><Trash2 size={15}/></button></div>}</div>
 {editing?<form className="template-edit-form" onSubmit={e=>{e.preventDefault();if(!name.trim())return;onSave({...template,name:name.trim(),description:description.trim()});setEditing(false)}}><label>模板名称<input aria-label="模板名称" value={name} maxLength={100} onChange={e=>setName(e.target.value)}/></label><label>模板说明<textarea aria-label="模板说明" value={description} maxLength={1000} rows={2} onChange={e=>setDescription(e.target.value)}/></label><button className="secondary-button" type="submit" disabled={!name.trim()}>保存模板</button></form>:<><h3>{template.name}</h3><p>{template.description||'把常用流程留下，下次从容开始。'}</p><div className="template-card-stats"><span>{template.tasks.length} 项任务</span>{template.sections.length>0&&<span>{template.sections.length} 个版块</span>}{steps>0&&<span>{steps} 个步骤</span>}</div><footer><button className="template-use" type="button" onClick={onUse}><CopyPlus size={15}/>预览并使用</button><button className="icon-button" type="button" aria-label={`导出模板：${template.name}`} onClick={()=>downloadTemplate(template)}><Download size={15}/></button></footer></>}
 </article>
}
export function TemplateLibrary({data,onUse,onSave,onDelete}:Props) {
 const input=useRef<HTMLInputElement>(null),[status,setStatus]=useState('')
 const importFile=async(e:React.ChangeEvent<HTMLInputElement>)=>{
  const file=e.target.files?.[0];if(!file)return
  try{if(file.size>5*1024*1024)throw new Error('模板文件不能超过5MB');onSave(parseTemplate(await file.text()));setStatus('模板已添加到本机，现有任务未更改。')}
  catch(error){setStatus(error instanceof Error?error.message:'无法读取模板')}
  finally{e.target.value=''}
 }
 return <div className="template-library"><div className="template-library-intro"><div><span className="eyebrow">本机模板</span><h2>把可复用的步骤留下来</h2><p>从一份熟悉的清单开始，把注意力留给这一次。</p></div><button className="secondary-button" type="button" onClick={()=>input.current?.click()}><Upload size={15}/>导入模板</button><input ref={input} type="file" hidden accept="application/json,.json" aria-label="导入模板文件" onChange={importFile}/></div>
 {status&&<p className="template-status" role="status">{status}</p>}
 <section className="template-collection"><div className="template-section-heading"><h2>我的模板</h2><span>{data.templates?.length??0}</span></div>{data.templates?.length?<div className="template-grid">{data.templates.map(template=><TemplateCard key={template.id} template={template} onUse={()=>onUse(template)} onSave={onSave} onDelete={()=>onDelete(template.id)}/>)}</div>:<div className="template-empty"><FileStack size={28}/><div><strong>下一次，不必从零开始</strong><p>在任务详情中“保存为任务模板”，或在项目中“保存项目模板”。模板仅保存在此浏览器，支持单独导出和完整备份。</p></div></div>}</section>
 <section className="template-collection"><div className="template-section-heading"><h2>从这些开始</h2><span>可选示例</span></div><div className="template-grid">{exampleTemplates.map(template=><TemplateCard key={template.id} template={template} example onUse={()=>onUse(template)} onSave={onSave} onDelete={()=>{}}/>)}</div></section>
 </div>
}
