// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { TemplateLibrary } from './TemplateLibrary'
import { exampleTemplates, serializeTemplate } from '../lib/templates'
afterEach(cleanup)
it('imports an independent template without applying it, and rejects unrelated backup files',async()=>{
 const save=vi.fn(),use=vi.fn()
 render(<TemplateLibrary data={{version:1,tasks:[],labels:[],projects:[]}} onUse={use} onSave={save} onDelete={()=>{}}/>)
 const input=screen.getByLabelText('导入模板文件')
 fireEvent.change(input,{target:{files:[{size:100,text:async()=>serializeTemplate(exampleTemplates[0])}]}})
 await waitFor(()=>expect(save).toHaveBeenCalledOnce())
 expect(save.mock.calls[0][0].id).not.toBe(exampleTemplates[0].id)
 expect(use).not.toHaveBeenCalled()
 fireEvent.change(input,{target:{files:[{size:100,text:async()=>JSON.stringify({format:'xiaoxu-backup'})}]}})
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('格式无效'))
 expect(save).toHaveBeenCalledOnce()
})
it('edits name and description locally without creating tasks',()=>{
 const save=vi.fn(),use=vi.fn()
 const template={...exampleTemplates[0],id:'mine'}
 render(<TemplateLibrary data={{version:1,tasks:[],labels:[],projects:[],templates:[template]}} onUse={use} onSave={save} onDelete={()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:'编辑模板：每周复盘'}))
 fireEvent.change(screen.getByRole('textbox',{name:'模板名称'}),{target:{value:'周日回顾'}})
 fireEvent.change(screen.getByRole('textbox',{name:'模板说明'}),{target:{value:'我的离线清单'}})
 fireEvent.click(screen.getByRole('button',{name:'保存模板'}))
 expect(save).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({id:'mine',name:'周日回顾',description:'我的离线清单'}))
 expect(use).not.toHaveBeenCalled()
})
