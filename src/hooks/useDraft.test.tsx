// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup,fireEvent,render,screen } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
import { useDraft } from './useDraft'
afterEach(()=>{cleanup();window.localStorage.clear();vi.restoreAllMocks()})
const valid=(v:unknown):v is {text:string}=>Boolean(v&&typeof(v as {text?:unknown}).text==='string')
function Draft({id='one',base='base'}:{id?:string;base?:string}) {
 const draft=useDraft(id,{text:'原内容'},valid,base)
 return <><input aria-label="草稿" value={draft.value.text} onChange={e=>draft.update({text:e.target.value})}/><span>{draft.error}</span>{draft.conflict&&<button onClick={draft.restore}>恢复旧草稿</button>}<button onClick={draft.discard}>丢弃</button><button onClick={draft.clear}>保存完成</button></>
}
it('restores across unmounts, isolates tasks, and clears only after save or discard',()=>{
 const first=render(<Draft/>)
 fireEvent.change(screen.getByLabelText('草稿'),{target:{value:'未保存的内容'}})
 first.unmount()
 const other=render(<Draft id="other"/>)
 expect(screen.getByLabelText('草稿')).toHaveValue('原内容')
 other.unmount()
 const again=render(<Draft/>)
 expect(screen.getByLabelText('草稿')).toHaveValue('未保存的内容')
 fireEvent.click(screen.getByRole('button',{name:'保存完成'}))
 again.unmount();render(<Draft/>)
 expect(screen.getByLabelText('草稿')).toHaveValue('原内容')
})
it('does not silently overlay a stale draft onto changed source data',()=>{
 const first=render(<Draft/>)
 fireEvent.change(screen.getByLabelText('草稿'),{target:{value:'旧草稿'}})
 first.unmount();render(<Draft base="changed"/>)
 expect(screen.getByLabelText('草稿')).toHaveValue('原内容')
 fireEvent.click(screen.getByRole('button',{name:'恢复旧草稿'}))
 expect(screen.getByLabelText('草稿')).toHaveValue('旧草稿')
 fireEvent.click(screen.getByRole('button',{name:'丢弃'}))
 expect(screen.getByLabelText('草稿')).toHaveValue('原内容')
})
it('retains the live input and reports when draft storage fails',()=>{
 vi.spyOn(window.Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota')})
 render(<Draft/>)
 fireEvent.change(screen.getByLabelText('草稿'),{target:{value:'还在页面中'}})
 expect(screen.getByLabelText('草稿')).toHaveValue('还在页面中')
 expect(screen.getByText(/草稿无法写入浏览器/)).toBeInTheDocument()
})
