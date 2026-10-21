import { Filter, Pencil, Plus, Tag, Trash2, ArrowUpRight } from 'lucide-react'
import { compileFilter } from '../lib/filters'
import type { AppData, Label, SavedFilter, ViewKey } from '../types'

interface Props {
  data: AppData
  onView: (view:ViewKey) => void
  onFilter: (filter?:SavedFilter, query?:string) => void
  onDeleteFilter: (filter:SavedFilter) => void
  onLabel: (label?:Label) => void
  onDeleteLabel: (label:Label) => void
}
const recipes = [
  {name:'当下要紧',query:'active & (逾期 | 今天) & (p1 | p2)',description:'今天和逾期任务中的高优先级事项'},
  {name:'留一点空白',query:'active & 无日期',description:'还没有安排日期的待办'},
  {name:'计划内已完成',query:'completed & 未来7天',description:'截止日期在未来七天内的已完成任务'},
]
export function OrganizationHub({data,onView,onFilter,onDeleteFilter,onLabel,onDeleteLabel}:Props) {
  return <div className="organization-hub">
    <section className="organize-section"><header><div><h2><Filter size={18}/>我的过滤器</h2><p>把常用条件存下来，打开就是你想看的任务。</p></div><button className="secondary-button" onClick={()=>onFilter()}><Plus size={15}/>新建过滤器</button></header>
      {(data.filters?.length??0)>0 ? <div className="collection-rows">{data.filters!.map(filter=>{const compiled=compileFilter(filter.query,data);return <article className="collection-row" key={filter.id}><button className="collection-open" onClick={()=>onView(`filter:${filter.id}`)}><span className="collection-symbol" style={{color:filter.color}}><Filter size={18}/></span><span><strong>{filter.name}</strong><small className={compiled.error?'field-error':''}>{compiled.error??filter.query}</small></span><span className="collection-count">{data.tasks.filter(compiled.matches).length}</span></button><button className="icon-button" aria-label={`编辑过滤器：${filter.name}`} onClick={()=>onFilter(filter)}><Pencil size={15}/></button><button className="icon-button" aria-label={`删除过滤器：${filter.name}`} onClick={()=>onDeleteFilter(filter)}><Trash2 size={15}/></button></article>})}</div> : <div className="organize-empty">还没有过滤器。可以从下面的一条灵感开始。</div>}
      <div className="filter-recipes">{recipes.map(recipe=><button key={recipe.name} onClick={()=>onFilter(undefined,recipe.query)}><span>{recipe.name}<ArrowUpRight size={15}/></span><small>{recipe.description}</small></button>)}</div>
    </section>
    <section className="organize-section"><header><div><h2><Tag size={18}/>我的标签</h2><p>让不同项目里的同类任务，在这里相遇。</p></div><button className="secondary-button" onClick={()=>onLabel()}><Plus size={15}/>新建标签</button></header>
      {data.labels.length ? <div className="collection-rows">{data.labels.map(label=><article key={label.id} className="collection-row"><button className="collection-open" onClick={()=>onView(`label:${label.id}`)}><span className="collection-symbol" style={{color:label.color}}><Tag size={18}/></span><span><strong>{label.name}</strong><small>{data.tasks.filter(t=>!t.completed&&t.labelIds.includes(label.id)).length} 个待办任务</small></span></button><button className="icon-button" aria-label={`编辑标签：${label.name}`} onClick={()=>onLabel(label)}><Pencil size={15}/></button><button className="icon-button" aria-label={`删除标签：${label.name}`} onClick={()=>onDeleteLabel(label)}><Trash2 size={15}/></button></article>)}</div> : <div className="organize-empty">添加一个标签，让任务更容易找到。</div>}
    </section>
  </div>
}
