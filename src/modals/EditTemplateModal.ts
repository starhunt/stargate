/**
 * 분석 템플릿 편집 모달
 */

import { App, Modal, Setting, Notice } from 'obsidian'
import { AnalysisTemplate } from '../types'

interface EditTemplateModalOptions {
    template: AnalysisTemplate
    onSubmit: (systemPrompt: string, userPromptTemplate: string) => void
}

export class EditTemplateModal extends Modal {
    private options: EditTemplateModalOptions
    private systemPrompt: string
    private userPromptTemplate: string

    constructor(app: App, options: EditTemplateModalOptions) {
        super(app)
        this.options = options
        this.systemPrompt = options.template.systemPrompt
        this.userPromptTemplate = options.template.userPromptTemplate
    }

    onOpen() {
        const { contentEl } = this
        contentEl.empty()
        contentEl.addClass('stargate-edit-template-modal')

        // 제목
        contentEl.createEl('h2', {
            text: `Edit Template: ${this.options.template.icon} ${this.options.template.name}`
        })

        // 설명
        contentEl.createEl('p', {
            text: this.options.template.description,
            cls: 'setting-item-description'
        })

        // System Prompt 섹션
        const systemSection = contentEl.createDiv({ cls: 'stargate-template-section' })
        systemSection.createEl('h3', { text: 'System Prompt' })
        systemSection.createEl('p', {
            text: 'Instructions for the AI model (role, behavior, formatting)',
            cls: 'setting-item-description'
        })

        const systemTextarea = systemSection.createEl('textarea', {
            cls: 'stargate-template-textarea'
        })
        systemTextarea.value = this.systemPrompt
        systemTextarea.rows = 6
        systemTextarea.addEventListener('input', (e) => {
            this.systemPrompt = (e.target as HTMLTextAreaElement).value
        })

        // User Prompt Template 섹션
        const userSection = contentEl.createDiv({ cls: 'stargate-template-section' })
        userSection.createEl('h3', { text: 'User Prompt Template' })

        const helpEl = userSection.createEl('p', { cls: 'setting-item-description' })
        helpEl.innerHTML = 'Template for user messages. Use <code>{{content}}</code> for the actual content.'

        const userTextarea = userSection.createEl('textarea', {
            cls: 'stargate-template-textarea'
        })
        userTextarea.value = this.userPromptTemplate
        userTextarea.rows = 12
        userTextarea.addEventListener('input', (e) => {
            this.userPromptTemplate = (e.target as HTMLTextAreaElement).value
        })

        // 버튼
        const buttonContainer = contentEl.createDiv({ cls: 'stargate-modal-buttons' })

        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' })
        cancelBtn.onclick = () => this.close()

        const saveBtn = buttonContainer.createEl('button', {
            text: 'Save',
            cls: 'mod-cta'
        })
        saveBtn.onclick = () => {
            if (!this.systemPrompt.trim()) {
                new Notice('System prompt cannot be empty')
                return
            }
            if (!this.userPromptTemplate.trim()) {
                new Notice('User prompt template cannot be empty')
                return
            }
            if (!this.userPromptTemplate.includes('{{content}}')) {
                new Notice('User prompt must include {{content}} variable')
                return
            }

            this.options.onSubmit(this.systemPrompt, this.userPromptTemplate)
            this.close()
        }
    }

    onClose() {
        const { contentEl } = this
        contentEl.empty()
    }
}
