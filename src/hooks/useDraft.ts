import { useRef, useState, type SetStateAction } from 'react'

interface Stored<T> {base:string; value:T}
/** Drafts are separate from saved tasks and scoped to this browser origin. */
export function useDraft<T>(key:string, initial:T, valid:(value:unknown)=>value is T, base='') {
  const storageKey=`xiaoxu:draft:${key}`
  const original=useRef(initial)
  const [loaded]=useState<Stored<T>|undefined>(()=>{
    try {
      const raw=window.localStorage.getItem(storageKey)
      if(!raw)return
      const parsed=JSON.parse(raw)
      if(typeof parsed.base==='string'&&valid(parsed.value))return parsed
    }catch{/* An unavailable draft store must not block task access. */}
  })
  const [value,setValue]=useState<T>(loaded?.base===base?loaded.value:initial)
  const [restored,setRestored]=useState(Boolean(loaded&&loaded.base===base))
  const [conflict,setConflict]=useState(Boolean(loaded&&loaded.base!==base))
  const [error,setError]=useState('')
  const current=useRef(value)
  const persist=(next:T)=>{
    try {
      if(JSON.stringify(next)===JSON.stringify(original.current))window.localStorage.removeItem(storageKey)
      else window.localStorage.setItem(storageKey,JSON.stringify({base,value:next}))
      setError('')
    }catch{setError('草稿无法写入浏览器，关闭前请保存任务或复制内容。')}
  }
  const update=(next:SetStateAction<T>)=>{
    const result=typeof next==='function'?(next as (old:T)=>T)(current.current):next
    current.current=result;setValue(result);setConflict(false);persist(result)
  }
  const clear=()=>{
    try {window.localStorage.removeItem(storageKey);setError('')}catch{setError('无法清除浏览器草稿')}
    setRestored(false);setConflict(false)
  }
  const discard=()=>{clear();current.current=original.current;setValue(original.current)}
  const restore=()=>{if(loaded){current.current=loaded.value;setValue(loaded.value);setRestored(true);setConflict(false);persist(loaded.value)}}
  return {value,update,clear,discard,restore,restored,conflict,error,dirty:JSON.stringify(value)!==JSON.stringify(original.current)}
}
