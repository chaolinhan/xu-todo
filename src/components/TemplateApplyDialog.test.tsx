// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { TemplateApplyDialog } from './TemplateApplyDialog'
import { exampleTemplates } from '../lib/templates'
afterEach(cleanup)
it('previews without creating tasks and rejects a duplicate destination project name',()=>{
 const apply=vi.fn()
 render(<TemplateApplyDialog template={exampleTemplates[1]} data={{version:1,tasks:[],labels:[],projects:[{id:'p',name:'工作',color:'#123',createdAt:''}]}} onClose={()=>{}} onApply={apply}/>)
 expect(screen.getByText('准备发布内容')).toBeInTheDocument()
 expect(screen.getByText('确认范围与负责人')).toBeInTheDocument()
 expect(apply).not.toHaveBeenCalled()
 fireEvent.change(screen.getByRole('textbox',{name:'模板新项目名称'}),{target:{value:'工作'}})
 expect(screen.getByRole('button',{name:'创建 3 项任务'})).toBeDisabled()
 fireEvent.click(screen.getByRole('combobox',{name:'模板目标项目'}))
 fireEvent.click(screen.getByRole('option',{name:'工作'}))
 fireEvent.click(screen.getByRole('button',{name:'创建 3 项任务'}))
 expect(apply).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({projectId:'p',newProjectName:undefined}))
})
it('shows application errors and keeps the preview open for correction',()=>{
 render(<TemplateApplyDialog template={exampleTemplates[0]} data={{version:1,tasks:[],labels:[],projects:[]}} onClose={()=>{}} onApply={()=>{throw new Error('目标项目已变化')}}/>)
 fireEvent.click(screen.getByRole('button',{name:'创建 1 项任务'}))
 expect(screen.getByRole('alert')).toHaveTextContent('目标项目已变化')
 expect(screen.getByRole('dialog',{name:'使用模板'})).toBeInTheDocument()
})
