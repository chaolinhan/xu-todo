import { Filter, X } from 'lucide-react'
import { useState } from 'react'
import { compileFilter } from '../lib/filters'
import type { AppData, SavedFilter } from '../types'
interface Props { data:AppData; filter?:SavedFilter; initialQuery?:string; onClose:()=>void; onSave:(name:string,query:string,color:string)=>void }
const examples=['active & (今天 | 逾期)','active & (p1 | p2)','active & 无日期','completed']
export function FilterEditor({data,filter,initialQuery,onClose,onSave}:Props) {
  const [name,setName]=useState(filter?.name??'')
  const [query,setQuery]=useState(filter?.query??initialQuery??'active & (今天 | 逾期)')
  const [color,setColor]=useState(filter?.color??'#d64b3a')
  const compiled=compileFilter(query,data)
  const matches=data.tasks.filter(compiled.matches)
  const duplicate=data.filters?.some(f=>f.id!==filter?.id&&f.name===name.trim())
  return <div className="dialog-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="dialog-card filter-dialog" role="dialog" aria-modal="true" aria-labelledby="filter-title"><header className="dialog-header"><div><span className="eyebrow">让清单更懂你</span><h2 id="filter-title">{filter?'编辑':'新建'}过滤器</h2></div><button className="icon-button" aria-label="关闭" onClick={onClose}><X size={20}/></button></header>
    <form onSubmit={e=>{e.preventDefault();if(name.trim()&&!compiled.error&&!duplicate)onSave(name.trim(),query.trim(),color)}}>
      <label className="form-field">过滤器名称<input autoFocus maxLength={40} value={name} placeholder="例如：今天要紧的事" onChange={e=>setName(e.target.value)}/></label>
      {duplicate&&<p className="field-error" role="alert">已经有同名过滤器了，请换个名称。</p>}
      <label className="form-field">查询条件<textarea value={query} maxLength={500} rows={3} onChange={e=>setQuery(e.target.value)} aria-describedby="filter-help" spellCheck={false}/></label>
      <div className="query-examples">{examples.map(example=><button key={example} type="button" onClick={()=>setQuery(example)}>{example}</button>)}</div>
      <div className={`filter-preview ${compiled.error?'has-error':''}`} role="status"><Filter size={16}/>{compiled.error??`匹配 ${matches.length} 个任务，其中 ${matches.filter(t=>t.completed).length} 个已完成`}</div>
      <details className="query-help" id="filter-help"><summary>查询怎么写？</summary><p>用 & 表示同时满足，| 表示任一满足，! 表示排除，括号控制组合。支持 p1–p4、今天、明天、逾期、未来7天、无日期、无标签、重复任务、active（未完成）、completed（已完成）、#项目名、@标签名和 search:关键词。含空格或符号的名称请加双引号，例如 @"等待 回复"。</p><p>过滤器独立匹配所有任务；只想看待办时，在条件中加上 active。未来7天包含今天。</p></details>
      <fieldset className="color-picker"><legend>选择颜色</legend><div>{['#d64b3a','#d89a45','#7d8f69','#4c7186','#826a98','#b0677b'].map(c=><button type="button" key={c} className={color===c?'is-selected':''} style={{'--swatch':c} as React.CSSProperties} aria-label={`选择颜色 ${c}`} onClick={()=>setColor(c)}/>)}</div></fieldset>
      <footer className="dialog-actions"><span/><div><button className="text-button" type="button" onClick={onClose}>取消</button><button className="primary-button" disabled={!name.trim()||Boolean(compiled.error)||duplicate} type="submit">保存过滤器</button></div></footer>
    </form></section></div>
}
