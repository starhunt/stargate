import { App, Modal, Setting, Notice } from 'obsidian'
import { SavedPrompt } from '../types'

interface EditPromptModalOptions {
    prompt?: SavedPrompt  // 편집 시 기존 프롬프트 정보
    onSubmit: (name: string, prompt: string, systemPrompt?: string, icon?: string) => void
}

export class EditPromptModal extends Modal {
    private name: string = ''
    private promptText: string = ''
    private systemPromptText: string = ''
    private icon: string = ''
    private isFullTemplate: boolean = false
    private options: EditPromptModalOptions

    constructor(app: App, options: EditPromptModalOptions) {
        super(app)
        this.options = options

        // 편집 모드인 경우 기존 값 설정
        if (options.prompt) {
            this.name = options.prompt.name
            this.promptText = options.prompt.prompt
            this.systemPromptText = options.prompt.systemPrompt || ''
            this.icon = options.prompt.icon || ''
            this.isFullTemplate = !!options.prompt.systemPrompt
        }
    }

    onOpen() {
        const { contentEl } = this
        const isEdit = !!this.options.prompt

        contentEl.empty()
        contentEl.addClass('stargate-edit-prompt-modal')

        // 제목
        contentEl.createEl('h2', { text: isEdit ? 'Edit Prompt' : 'Add Prompt' })

        // 프롬프트 유형 선택
        const typeSection = contentEl.createDiv({ cls: 'stargate-prompt-type-section' })
        this.renderTypeSelector(typeSection)

        // 프롬프트 이름
        new Setting(contentEl)
            .setName('Name')
            .setDesc('Display name for the prompt')
            .addText((text) => {
                text
                    .setPlaceholder('My Custom Prompt')
                    .setValue(this.name)
                    .onChange((value) => {
                        this.name = value
                    })
                text.inputEl.focus()
            })

        // 전체 템플릿용 필드들 (컨테이너로 감싸서 토글 가능하게)
        const fullTemplateFields = contentEl.createDiv({
            cls: `stargate-full-template-fields ${this.isFullTemplate ? '' : 'hidden'}`
        })

        // 아이콘 선택
        new Setting(fullTemplateFields)
            .setName('Icon')
            .setDesc('Emoji icon for the template button')
            .addText((text) => {
                text
                    .setPlaceholder('⭐')
                    .setValue(this.icon)
                    .onChange((value) => {
                        this.icon = value
                    })
                text.inputEl.style.width = '60px'
            })

        // 시스템 프롬프트
        new Setting(fullTemplateFields)
            .setName('System Prompt')
            .setDesc('Instructions for the AI model behavior')

        const systemTextareaContainer = fullTemplateFields.createDiv({ cls: 'stargate-textarea-container' })
        const systemTextarea = systemTextareaContainer.createEl('textarea', {
            cls: 'stargate-prompt-textarea',
            placeholder: 'You are a helpful assistant that...'
        })
        systemTextarea.value = this.systemPromptText
        systemTextarea.rows = 4
        systemTextarea.addEventListener('input', (e) => {
            this.systemPromptText = (e.target as HTMLTextAreaElement).value
        })

        // 프롬프트 내용
        new Setting(contentEl)
            .setName(this.isFullTemplate ? 'User Prompt Template' : 'Prompt')
            .setDesc(this.isFullTemplate
                ? 'Template with {{content}} placeholder'
                : 'The prompt text to use for AI analysis')

        const textareaContainer = contentEl.createDiv({ cls: 'stargate-textarea-container' })
        const textarea = textareaContainer.createEl('textarea', {
            cls: 'stargate-prompt-textarea',
            placeholder: this.isFullTemplate
                ? '다음 내용을 분석해주세요.\n\n{{content}}'
                : 'Enter your prompt here...'
        })
        textarea.value = this.promptText
        textarea.rows = 8
        textarea.addEventListener('input', (e) => {
            this.promptText = (e.target as HTMLTextAreaElement).value
        })

        // 버튼
        const buttonContainer = contentEl.createDiv({ cls: 'stargate-modal-buttons' })

        // 취소 버튼
        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' })
        cancelBtn.onclick = () => this.close()

        // 저장 버튼
        const saveBtn = buttonContainer.createEl('button', {
            text: isEdit ? 'Save' : 'Add',
            cls: 'mod-cta'
        })
        saveBtn.onclick = () => this.handleSubmit()
    }

    /**
     * 프롬프트 유형 선택기 렌더링
     */
    private renderTypeSelector(container: HTMLElement): void {
        container.createEl('p', {
            text: 'Prompt Type:',
            cls: 'stargate-type-label'
        })

        const buttonsEl = container.createDiv({ cls: 'stargate-type-buttons' })

        const quickBtn = buttonsEl.createEl('button', {
            text: '빠른 프롬프트',
            cls: `stargate-type-btn ${!this.isFullTemplate ? 'active' : ''}`
        })
        quickBtn.setAttribute('title', '커스텀 프롬프트 탭에 표시되는 간단한 프롬프트')

        const fullBtn = buttonsEl.createEl('button', {
            text: '전체 템플릿',
            cls: `stargate-type-btn ${this.isFullTemplate ? 'active' : ''}`
        })
        fullBtn.setAttribute('title', '템플릿 버튼 영역에 표시되는 완전한 템플릿 (시스템 프롬프트 포함)')

        quickBtn.onclick = () => {
            this.isFullTemplate = false
            quickBtn.addClass('active')
            fullBtn.removeClass('active')
            this.contentEl.querySelector('.stargate-full-template-fields')?.addClass('hidden')
        }

        fullBtn.onclick = () => {
            this.isFullTemplate = true
            fullBtn.addClass('active')
            quickBtn.removeClass('active')
            this.contentEl.querySelector('.stargate-full-template-fields')?.removeClass('hidden')
        }
    }

    private handleSubmit() {
        // 유효성 검사
        if (!this.name.trim()) {
            new Notice('Please enter a name')
            return
        }

        if (!this.promptText.trim()) {
            new Notice('Please enter a prompt')
            return
        }

        if (this.isFullTemplate) {
            if (!this.systemPromptText.trim()) {
                new Notice('Please enter a system prompt for full template')
                return
            }
            if (!this.promptText.includes('{{content}}')) {
                new Notice('User prompt must include {{content}} placeholder')
                return
            }
            this.options.onSubmit(
                this.name.trim(),
                this.promptText.trim(),
                this.systemPromptText.trim(),
                this.icon.trim() || '⭐'
            )
        } else {
            this.options.onSubmit(this.name.trim(), this.promptText.trim())
        }
        this.close()
    }

    onClose() {
        const { contentEl } = this
        contentEl.empty()
    }
}
