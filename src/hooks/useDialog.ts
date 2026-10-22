import { useEffect, useLayoutEffect, useRef } from 'react'

export function useDialog(onClose:()=>void, enabled=true) {
  const panel=useRef<HTMLElement>(null), close=useRef(onClose)
  close.current=onClose
  const previous=useRef(document.activeElement as HTMLElement|null)
  useLayoutEffect(()=>{
    if(enabled)(panel.current?.querySelector<HTMLElement>('input,textarea')??panel.current?.querySelector<HTMLElement>('button'))?.focus({preventScroll:true})
  },[enabled])
  useEffect(()=>{
    if(!enabled)return
    const key=(event:KeyboardEvent)=>{
      // Portalled calendars and menus handle their own focus and Escape first.
      if(!panel.current?.contains(event.target as Node))return
      if(event.key==='Escape') {event.preventDefault();event.stopImmediatePropagation();close.current();return}
      if(event.key!=='Tab')return
      const nodes=Array.from(panel.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled):not([type="hidden"]),textarea:not(:disabled),[tabindex="0"]')).filter(node=>node.getClientRects().length>0)
      const first=nodes[0],last=nodes.at(-1)
      if(!first||!last)return
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
    window.addEventListener('keydown',key,true)
    return ()=>{window.removeEventListener('keydown',key,true);if(previous.current?.isConnected)previous.current.focus({preventScroll:true})}
  },[enabled])
  return panel
}
