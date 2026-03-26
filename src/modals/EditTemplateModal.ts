/**
 * 분석 템플릿 편집 모달
 */

import { App, Modal, Setting, Notice } from 'obsidian'
import { AnalysisTemplate } from '../types'
import { t } from '../i18n'

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
        const { contentEl, modalEl } = this
        contentEl.empty()
        modalEl.addClass('stargate-edit-template-modal')

        // 제목
        contentEl.createEl('h2', {
            text: t().templateModal.editTitle(this.options.template.icon, this.options.template.name)
        })

        // 설명
        contentEl.createEl('p', {
            text: this.options.template.description,
            cls: 'setting-item-description'
        })

        // System Prompt 섹션
        const systemSection = contentEl.createDiv({ cls: 'stargate-template-section' })
        systemSection.createEl('h3', { text: t().templateModal.systemPrompt })
        systemSection.createEl('p', {
            text: t().templateModal.systemPromptDesc,
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
        userSection.createEl('h3', { text: t().templateModal.userPromptTemplate })

        const helpEl = userSection.createEl('p', { cls: 'setting-item-description' })
        helpEl.innerHTML = t().templateModal.userPromptDesc

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

        const cancelBtn = buttonContainer.createEl('button', { text: t().common.cancel })
        cancelBtn.onclick = () => this.close()

        const saveBtn = buttonContainer.createEl('button', {
            text: t().common.save,
            cls: 'mod-cta'
        })
        saveBtn.onclick = () => {
            if (!this.systemPrompt.trim()) {
                new Notice(t().templateModal.systemPromptEmpty)
                return
            }
            if (!this.userPromptTemplate.trim()) {
                new Notice(t().templateModal.userPromptEmpty)
                return
            }
            if (!this.userPromptTemplate.includes('{{content}}')) {
                new Notice(t().templateModal.userPromptMissingContent)
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
