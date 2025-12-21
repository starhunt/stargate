/**
 * AI 분석 모달
 */

import { App, Modal, Setting, Notice, TFile, MarkdownView } from 'obsidian'
import StargatePlugin from '../main'
import { TemplateType, AIProviderType } from '../types'
import { ANALYSIS_TEMPLATES, getTemplateById, getEffectiveTemplate, renderPrompt } from '../ai/templates'
import { AIService, AIMessage } from '../services/AIService'
import { AI_PROVIDERS } from '../constants'

type ContentSourceType = 'full' | 'selection' | 'clipboard'
type PromptTabType = 'template' | 'custom'
type InsertLocationType = 'new-note' | 'cursor' | 'end'

interface AnalysisModalOptions {
    content: string
    selectedText?: string
    url: string
    title: string
}

type SelectedTemplateType = TemplateType | 'raw-save' | string  // string for user-defined template IDs

export class AnalysisModal extends Modal {
    private plugin: StargatePlugin
    private options: AnalysisModalOptions
    private aiService: AIService

    private selectedTemplateId: SelectedTemplateType | null = null
    private customPrompt: string = ''
    private selectedProvider: AIProviderType
    private isAnalyzing = false

    // 편집 가능한 필드
    private editableTitle: string = ''
    private editableContent: string = ''

    // 옵션
    private includeOriginal: boolean = false
    private activePromptTab: PromptTabType = 'template'
    private insertLocation: InsertLocationType = 'new-note'
    private autoExtractTitle: boolean = true

    // 콘텐츠 소스
    private contentSource: ContentSourceType = 'full'
    private clipboardContent: string = ''

    // UI 참조
    private contentTextarea: HTMLTextAreaElement | null = null
    private charCountEl: HTMLElement | null = null
    private templatePromptDisplayEl: HTMLElement | null = null
    private promptTabsContainer: HTMLElement | null = null
    private titleInputEl: HTMLInputElement | null = null

    constructor(app: App, plugin: StargatePlugin, options: AnalysisModalOptions) {
        super(app)
        this.plugin = plugin
        this.options = options
        this.aiService = new AIService(plugin.settings.ai)
        this.selectedProvider = plugin.settings.ai.provider
        // 제목은 나중에 콘텐츠에서 자동 추출
        this.editableTitle = options.title || ''
    }

    async onOpen() {
        const { contentEl } = this
        contentEl.empty()
        contentEl.addClass('stargate-analysis-modal')

        // 클립보드 확인
        try {
            this.clipboardContent = await navigator.clipboard.readText()
        } catch {
            this.clipboardContent = ''
        }

        // 기본 소스 결정: 클립보드 > 선택 > 전체
        if (this.clipboardContent.trim()) {
            this.contentSource = 'clipboard'
        } else if (this.options.selectedText?.trim()) {
            this.contentSource = 'selection'
        } else {
            this.contentSource = 'full'
        }

        this.updateActiveContent()

        // 제목 자동 추출
        if (!this.editableTitle) {
            this.editableTitle = this.extractTitleFromContent(this.editableContent)
        }

        // 제목
        contentEl.createEl('h2', { text: 'AI Analysis' })

        // 제목 입력 (자동추출 체크박스 포함)
        this.renderTitleInput(contentEl)

        // URL 표시
        const urlEl = contentEl.createDiv({ cls: 'stargate-page-url-display' })
        urlEl.createEl('span', { text: 'Source: ', cls: 'stargate-url-label' })
        urlEl.createEl('span', { text: this.options.url, cls: 'stargate-url-value' })

        // 콘텐츠 소스 + 삽입 위치 (같은 줄)
        this.renderSourceAndInsertRow(contentEl)

        // 콘텐츠 편집 영역
        this.renderContentEditor(contentEl)

        // 템플릿 선택 (사용자 정의 템플릿 포함)
        contentEl.createEl('h3', { text: 'Analysis Template' })
        this.renderTemplateButtons(contentEl)

        // 원문 포함 체크박스
        this.renderIncludeOriginalCheckbox(contentEl)

        // 프롬프트 탭 (템플릿 프롬프트 / 커스텀 프롬프트)
        this.renderPromptTabs(contentEl)

        // AI Provider 선택
        new Setting(contentEl)
            .setName('AI Provider')
            .addDropdown((dropdown) => {
                for (const [key, provider] of Object.entries(AI_PROVIDERS)) {
                    dropdown.addOption(key, provider.name)
                }
                dropdown.setValue(this.selectedProvider)
                dropdown.onChange((value) => {
                    this.selectedProvider = value as AIProviderType
                })
            })

        // 버튼
        const buttonContainer = contentEl.createDiv({ cls: 'stargate-modal-buttons' })

        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' })
        cancelBtn.onclick = () => this.close()

        const analyzeBtn = buttonContainer.createEl('button', {
            text: 'Analyze',
            cls: 'mod-cta'
        })
        analyzeBtn.onclick = () => this.runAnalysis()
    }

    /**
     * 제목 입력 필드 렌더링 (자동추출 체크박스 포함)
     */
    private renderTitleInput(container: HTMLElement): void {
        const titleSection = container.createDiv({ cls: 'stargate-title-section' })

        // 레이블 + 자동추출 체크박스
        const labelRow = titleSection.createDiv({ cls: 'stargate-title-label-row' })
        labelRow.createEl('label', { text: 'Title', cls: 'stargate-field-label' })

        const autoExtractEl = labelRow.createDiv({ cls: 'stargate-auto-extract' })
        const checkbox = autoExtractEl.createEl('input', {
            type: 'checkbox',
            cls: 'stargate-checkbox-small'
        })
        checkbox.id = 'auto-extract-title'
        checkbox.checked = this.autoExtractTitle
        const checkLabel = autoExtractEl.createEl('label', {
            text: '자동 추출',
            cls: 'stargate-checkbox-label-small'
        })
        checkLabel.setAttribute('for', 'auto-extract-title')

        checkbox.addEventListener('change', (e) => {
            this.autoExtractTitle = (e.target as HTMLInputElement).checked
            if (this.titleInputEl) {
                this.titleInputEl.readOnly = this.autoExtractTitle
                this.titleInputEl.classList.toggle('readonly', this.autoExtractTitle)
                if (this.autoExtractTitle) {
                    // 자동 추출로 전환 시 콘텐츠에서 제목 재추출
                    this.editableTitle = this.extractTitleFromContent(this.editableContent)
                    this.titleInputEl.value = this.editableTitle
                }
            }
        })

        // 제목 입력 필드
        this.titleInputEl = titleSection.createEl('input', {
            type: 'text',
            cls: `stargate-title-input ${this.autoExtractTitle ? 'readonly' : ''}`,
            value: this.editableTitle
        })
        this.titleInputEl.value = this.editableTitle
        this.titleInputEl.readOnly = this.autoExtractTitle
        this.titleInputEl.addEventListener('input', (e) => {
            if (!this.autoExtractTitle) {
                this.editableTitle = (e.target as HTMLInputElement).value
            }
        })
    }

    /**
     * 콘텐츠에서 제목 자동 추출
     */
    private extractTitleFromContent(content: string): string {
        if (!content || !content.trim()) {
            return 'Untitled'
        }

        const lines = content.trim().split('\n')

        // 1. 첫 번째 줄이 마크다운 헤딩이면 사용
        const headingMatch = lines[0].match(/^#{1,6}\s+(.+)/)
        if (headingMatch) {
            return headingMatch[1].trim().substring(0, 100)
        }

        // 2. 첫 번째 줄이 짧으면 (100자 이하) 제목으로 사용
        const firstLine = lines[0].trim()
        if (firstLine.length <= 100 && firstLine.length > 0) {
            return firstLine
        }

        // 3. 첫 번째 문장 추출 (마침표, 물음표, 느낌표로 끝나는 부분)
        const sentenceMatch = content.match(/^[^.!?]+[.!?]/)
        if (sentenceMatch && sentenceMatch[0].length <= 100) {
            return sentenceMatch[0].trim()
        }

        // 4. 처음 50자 + "..."
        return content.trim().substring(0, 50) + '...'
    }

    /**
     * 콘텐츠 소스 + 삽입 위치 한 줄로 렌더링
     */
    private renderSourceAndInsertRow(container: HTMLElement): void {
        const rowEl = container.createDiv({ cls: 'stargate-source-insert-row' })

        // 콘텐츠 소스 선택
        const sourceEl = rowEl.createDiv({ cls: 'stargate-content-source' })
        sourceEl.createEl('span', { text: 'Content:', cls: 'stargate-source-label' })

        const sourceButtonsEl = sourceEl.createDiv({ cls: 'stargate-source-buttons' })

        const sources: { key: ContentSourceType; label: string; available: boolean }[] = [
            { key: 'full', label: '전체', available: !!this.options.content },
            { key: 'selection', label: '선택', available: !!this.options.selectedText?.trim() },
            { key: 'clipboard', label: '클립보드', available: !!this.clipboardContent.trim() }
        ]

        for (const source of sources) {
            const btn = sourceButtonsEl.createEl('button', {
                text: source.label,
                cls: `stargate-source-btn ${this.contentSource === source.key ? 'active' : ''} ${!source.available ? 'disabled' : ''}`
            })

            if (source.available) {
                btn.onclick = () => {
                    this.contentSource = source.key
                    this.updateActiveContent()
                    this.updateContentEditor()
                    // 자동 추출 모드일 때만 제목도 업데이트
                    if (this.autoExtractTitle) {
                        this.editableTitle = this.extractTitleFromContent(this.editableContent)
                        if (this.titleInputEl) {
                            this.titleInputEl.value = this.editableTitle
                        }
                    }
                    sourceButtonsEl.querySelectorAll('.stargate-source-btn').forEach((b) => b.removeClass('active'))
                    btn.addClass('active')
                }
            } else {
                btn.setAttribute('disabled', 'true')
            }
        }

        // 삽입 위치 선택
        const insertEl = rowEl.createDiv({ cls: 'stargate-insert-location' })
        insertEl.createEl('span', { text: 'Insert:', cls: 'stargate-source-label' })

        const insertButtonsEl = insertEl.createDiv({ cls: 'stargate-source-buttons' })

        const locations: { key: InsertLocationType; label: string }[] = [
            { key: 'new-note', label: '새 노트' },
            { key: 'cursor', label: '커서' },
            { key: 'end', label: '노트 끝' }
        ]

        for (const loc of locations) {
            const btn = insertButtonsEl.createEl('button', {
                text: loc.label,
                cls: `stargate-source-btn ${this.insertLocation === loc.key ? 'active' : ''}`
            })

            btn.onclick = () => {
                this.insertLocation = loc.key
                insertButtonsEl.querySelectorAll('.stargate-source-btn').forEach((b) => b.removeClass('active'))
                btn.addClass('active')
            }
        }
    }

    // Legacy method - kept for compatibility
    private renderContentSourceSelector(container: HTMLElement): void {
        const selectorEl = container.createDiv({ cls: 'stargate-content-source' })
        selectorEl.createEl('span', { text: 'Content Source:', cls: 'stargate-source-label' })

        const buttonsEl = selectorEl.createDiv({ cls: 'stargate-source-buttons' })

        const sources: { key: ContentSourceType; label: string; available: boolean }[] = [
            { key: 'full', label: '전체', available: !!this.options.content },
            { key: 'selection', label: '선택', available: !!this.options.selectedText?.trim() },
            { key: 'clipboard', label: '클립보드', available: !!this.clipboardContent.trim() }
        ]

        for (const source of sources) {
            const btn = buttonsEl.createEl('button', {
                text: source.label,
                cls: `stargate-source-btn ${this.contentSource === source.key ? 'active' : ''} ${!source.available ? 'disabled' : ''}`
            })

            if (source.available) {
                btn.onclick = () => {
                    this.contentSource = source.key
                    this.updateActiveContent()
                    this.updateContentEditor()
                    // 제목도 새 콘텐츠에서 자동 추출
                    this.editableTitle = this.extractTitleFromContent(this.editableContent)
                    if (this.titleInputEl) {
                        this.titleInputEl.value = this.editableTitle
                    }
                    buttonsEl.querySelectorAll('.stargate-source-btn').forEach((b) => b.removeClass('active'))
                    btn.addClass('active')
                }
            } else {
                btn.setAttribute('disabled', 'true')
            }
        }
    }

    /**
     * 활성 콘텐츠 업데이트
     */
    private updateActiveContent(): void {
        switch (this.contentSource) {
            case 'clipboard':
                this.editableContent = this.clipboardContent
                break
            case 'selection':
                this.editableContent = this.options.selectedText || ''
                break
            case 'full':
            default:
                this.editableContent = this.options.content
                break
        }
    }

    /**
     * 콘텐츠 편집 영역 렌더링
     */
    private renderContentEditor(container: HTMLElement): void {
        const editorSection = container.createDiv({ cls: 'stargate-content-editor' })

        this.contentTextarea = editorSection.createEl('textarea', {
            cls: 'stargate-content-textarea',
            placeholder: 'Content to analyze...'
        })
        this.contentTextarea.value = this.editableContent
        this.contentTextarea.rows = 4
        this.contentTextarea.addEventListener('input', (e) => {
            this.editableContent = (e.target as HTMLTextAreaElement).value
            this.updateCharCount()
        })

        this.charCountEl = editorSection.createEl('div', {
            cls: 'stargate-char-count',
            text: `${this.editableContent.length} characters`
        })
    }

    /**
     * 콘텐츠 편집기 업데이트
     */
    private updateContentEditor(): void {
        if (this.contentTextarea) {
            this.contentTextarea.value = this.editableContent
        }
        this.updateCharCount()
    }

    /**
     * 글자 수 업데이트
     */
    private updateCharCount(): void {
        if (this.charCountEl) {
            this.charCountEl.textContent = `${this.editableContent.length} characters`
        }
    }

    /**
     * 템플릿 버튼 렌더링
     */
    private renderTemplateButtons(container: HTMLElement): void {
        const templatesEl = container.createDiv({ cls: 'stargate-templates' })

        // 기본 템플릿들
        for (const template of ANALYSIS_TEMPLATES) {
            const btn = templatesEl.createDiv({
                cls: `stargate-template-btn ${this.selectedTemplateId === template.id ? 'selected' : ''}`
            })

            btn.createEl('span', { text: template.icon, cls: 'stargate-template-icon' })
            btn.createEl('span', { text: template.name, cls: 'stargate-template-name' })

            btn.setAttribute('aria-label', template.description)
            btn.setAttribute('title', template.description)

            btn.onclick = () => {
                this.selectedTemplateId = template.id
                this.updateTemplateSelection()
                this.updateTemplatePromptDisplay()
            }
        }

        // 사용자 정의 전체 템플릿 (systemPrompt가 있는 것만)
        const userFullTemplates = this.plugin.settings.savedPrompts.filter(p => p.systemPrompt)
        if (userFullTemplates.length > 0) {
            for (const userTemplate of userFullTemplates) {
                const btn = templatesEl.createDiv({
                    cls: `stargate-template-btn stargate-user-template ${this.selectedTemplateId === userTemplate.id ? 'selected' : ''}`
                })

                btn.createEl('span', { text: userTemplate.icon || '⭐', cls: 'stargate-template-icon' })
                btn.createEl('span', { text: userTemplate.name, cls: 'stargate-template-name' })

                btn.setAttribute('title', `User template: ${userTemplate.name}`)

                btn.onclick = () => {
                    this.selectedTemplateId = userTemplate.id
                    this.updateTemplateSelection()
                    this.updateTemplatePromptDisplay()
                }
            }
        }

        // 원문 저장 버튼
        const rawBtn = templatesEl.createDiv({
            cls: `stargate-template-btn stargate-raw-save ${this.selectedTemplateId === 'raw-save' ? 'selected' : ''}`
        })
        rawBtn.createEl('span', { text: '📄', cls: 'stargate-template-icon' })
        rawBtn.createEl('span', { text: '원문 저장', cls: 'stargate-template-name' })
        rawBtn.setAttribute('title', 'AI 처리 없이 원문 그대로 저장')

        rawBtn.onclick = () => {
            this.selectedTemplateId = 'raw-save'
            this.updateTemplateSelection()
            this.updateTemplatePromptDisplay()
        }
    }

    /**
     * 사용자 정의 전체 템플릿 찾기
     */
    private getUserFullTemplate(id: string) {
        return this.plugin.settings.savedPrompts.find(p => p.id === id && p.systemPrompt)
    }

    /**
     * 원문 포함 체크박스 렌더링
     */
    private renderIncludeOriginalCheckbox(container: HTMLElement): void {
        const checkboxSection = container.createDiv({ cls: 'stargate-include-original' })

        const checkbox = checkboxSection.createEl('input', {
            type: 'checkbox',
            cls: 'stargate-checkbox'
        })
        checkbox.id = 'include-original-checkbox'
        checkbox.checked = this.includeOriginal
        checkbox.addEventListener('change', (e) => {
            this.includeOriginal = (e.target as HTMLInputElement).checked
        })

        const label = checkboxSection.createEl('label', {
            text: '분석 결과 하단에 원문 포함',
            cls: 'stargate-checkbox-label'
        })
        label.setAttribute('for', 'include-original-checkbox')
    }

    /**
     * 프롬프트 탭 렌더링
     */
    private renderPromptTabs(container: HTMLElement): void {
        this.promptTabsContainer = container.createDiv({ cls: 'stargate-prompt-tabs-container' })

        // 탭 헤더
        const tabHeader = this.promptTabsContainer.createDiv({ cls: 'stargate-prompt-tab-header' })

        const templateTabBtn = tabHeader.createEl('button', {
            text: '템플릿 프롬프트',
            cls: `stargate-prompt-tab-btn ${this.activePromptTab === 'template' ? 'active' : ''}`
        })
        templateTabBtn.onclick = () => this.switchPromptTab('template')

        const customTabBtn = tabHeader.createEl('button', {
            text: '커스텀 프롬프트',
            cls: `stargate-prompt-tab-btn ${this.activePromptTab === 'custom' ? 'active' : ''}`
        })
        customTabBtn.onclick = () => this.switchPromptTab('custom')

        // 탭 콘텐츠
        const tabContent = this.promptTabsContainer.createDiv({ cls: 'stargate-prompt-tab-content' })

        // 템플릿 프롬프트 탭
        const templateTab = tabContent.createDiv({
            cls: `stargate-prompt-tab ${this.activePromptTab === 'template' ? 'active' : ''}`,
            attr: { 'data-tab': 'template' }
        })
        this.templatePromptDisplayEl = templateTab.createEl('div', {
            cls: 'stargate-template-prompt-display',
            text: '템플릿을 선택하면 프롬프트 내용이 표시됩니다.'
        })
        this.updateTemplatePromptDisplay()

        // 커스텀 프롬프트 탭
        const customTab = tabContent.createDiv({
            cls: `stargate-prompt-tab ${this.activePromptTab === 'custom' ? 'active' : ''}`,
            attr: { 'data-tab': 'custom' }
        })

        // 우선 적용 안내 메시지
        customTab.createEl('div', {
            text: '※ 커스텀 프롬프트 입력 시 템플릿 대신 이 프롬프트가 적용됩니다.',
            cls: 'stargate-prompt-notice'
        })

        // 저장된 프롬프트
        if (this.plugin.settings.savedPrompts.length > 0) {
            const savedPromptsEl = customTab.createDiv({ cls: 'stargate-saved-prompts-section' })
            savedPromptsEl.createEl('label', { text: 'Saved Prompts', cls: 'stargate-field-label' })
            const promptsEl = savedPromptsEl.createDiv({ cls: 'stargate-saved-prompts' })

            for (const prompt of this.plugin.settings.savedPrompts) {
                const btn = promptsEl.createDiv({ cls: 'stargate-saved-prompt-btn' })
                btn.createEl('span', { text: prompt.name })
                btn.setAttribute('title', prompt.prompt)

                btn.onclick = () => {
                    this.customPrompt = prompt.prompt
                    const textArea = this.contentEl.querySelector('.stargate-custom-prompt-textarea') as HTMLTextAreaElement
                    if (textArea) {
                        textArea.value = prompt.prompt
                    }
                }
            }
        }

        // 커스텀 프롬프트 입력
        const customPromptInput = customTab.createDiv({ cls: 'stargate-custom-prompt-section' })
        customPromptInput.createEl('label', {
            text: 'Custom Prompt',
            cls: 'stargate-field-label'
        })

        const textarea = customPromptInput.createEl('textarea', {
            cls: 'stargate-custom-prompt-textarea',
            placeholder: '분석 방법을 자유롭게 입력하세요...'
        })
        textarea.value = this.customPrompt
        textarea.addEventListener('input', (e) => {
            this.customPrompt = (e.target as HTMLTextAreaElement).value
        })
    }

    /**
     * 프롬프트 탭 전환
     */
    private switchPromptTab(tab: PromptTabType): void {
        this.activePromptTab = tab

        // 탭 버튼 상태 업데이트
        const tabBtns = this.promptTabsContainer?.querySelectorAll('.stargate-prompt-tab-btn')
        tabBtns?.forEach((btn) => {
            btn.removeClass('active')
            if (btn.textContent?.includes(tab === 'template' ? '템플릿' : '커스텀')) {
                btn.addClass('active')
            }
        })

        // 탭 콘텐츠 표시
        const tabs = this.promptTabsContainer?.querySelectorAll('.stargate-prompt-tab')
        tabs?.forEach((tabEl) => {
            tabEl.removeClass('active')
            if (tabEl.getAttribute('data-tab') === tab) {
                tabEl.addClass('active')
            }
        })
    }

    /**
     * 템플릿 프롬프트 표시 업데이트
     */
    private updateTemplatePromptDisplay(): void {
        if (!this.templatePromptDisplayEl) return

        if (this.selectedTemplateId === 'raw-save') {
            this.templatePromptDisplayEl.textContent = 'AI 처리 없이 원문을 그대로 저장합니다.'
            this.templatePromptDisplayEl.addClass('stargate-prompt-raw')
        } else if (this.selectedTemplateId) {
            // 먼저 사용자 정의 전체 템플릿인지 확인
            const userFullTemplate = this.getUserFullTemplate(this.selectedTemplateId)
            if (userFullTemplate) {
                this.templatePromptDisplayEl.empty()
                this.templatePromptDisplayEl.removeClass('stargate-prompt-raw')

                this.templatePromptDisplayEl.createEl('div', {
                    text: `[${userFullTemplate.name}] (사용자 정의)`,
                    cls: 'stargate-prompt-template-name'
                })
                this.templatePromptDisplayEl.createEl('div', {
                    text: userFullTemplate.prompt.replace('{{content}}', '[콘텐츠]'),
                    cls: 'stargate-prompt-template-content'
                })
            } else {
                // 기본 템플릿 (사용자 정의 오버라이드 포함)
                const template = getEffectiveTemplate(
                    this.selectedTemplateId as TemplateType,
                    this.plugin.settings.customTemplates
                )
                if (template) {
                    this.templatePromptDisplayEl.empty()
                    this.templatePromptDisplayEl.removeClass('stargate-prompt-raw')

                    this.templatePromptDisplayEl.createEl('div', {
                        text: `[${template.name}]`,
                        cls: 'stargate-prompt-template-name'
                    })
                    this.templatePromptDisplayEl.createEl('div', {
                        text: template.userPromptTemplate.replace('{{content}}', '[콘텐츠]'),
                        cls: 'stargate-prompt-template-content'
                    })
                }
            }
        } else {
            this.templatePromptDisplayEl.textContent = '템플릿을 선택하면 프롬프트 내용이 표시됩니다.'
            this.templatePromptDisplayEl.removeClass('stargate-prompt-raw')
        }
    }

    /**
     * 템플릿 선택 UI 업데이트
     */
    private updateTemplateSelection(): void {
        const btns = this.contentEl.querySelectorAll('.stargate-template-btn')
        btns.forEach((btn) => btn.removeClass('selected'))

        if (this.selectedTemplateId) {
            if (this.selectedTemplateId === 'raw-save') {
                const rawBtn = this.contentEl.querySelector('.stargate-raw-save')
                rawBtn?.addClass('selected')
            } else {
                // 기본 템플릿 확인
                const selectedIndex = ANALYSIS_TEMPLATES.findIndex((t) => t.id === this.selectedTemplateId)
                if (selectedIndex >= 0 && btns[selectedIndex]) {
                    btns[selectedIndex].addClass('selected')
                } else {
                    // 사용자 정의 전체 템플릿 확인
                    const userTemplateBtn = this.contentEl.querySelector(`.stargate-user-template`)
                    const userFullTemplates = this.plugin.settings.savedPrompts.filter(p => p.systemPrompt)
                    const userIndex = userFullTemplates.findIndex(t => t.id === this.selectedTemplateId)
                    if (userIndex >= 0) {
                        const allUserBtns = this.contentEl.querySelectorAll('.stargate-user-template')
                        if (allUserBtns[userIndex]) {
                            allUserBtns[userIndex].addClass('selected')
                        }
                    }
                }
            }
        }
    }

    /**
     * AI 분석 실행
     */
    private async runAnalysis(): Promise<void> {
        if (!this.editableContent.trim()) {
            new Notice('No content to analyze')
            return
        }

        // 원문 저장 모드
        if (this.selectedTemplateId === 'raw-save') {
            this.showPreviewModal(this.editableContent, true)
            return
        }

        // 커스텀 프롬프트가 있으면 우선 사용
        const useCustomPrompt = this.customPrompt.trim().length > 0

        if (!useCustomPrompt && !this.selectedTemplateId) {
            new Notice('템플릿을 선택하거나 커스텀 프롬프트를 입력해주세요.')
            return
        }

        if (!this.aiService.isProviderConfigured(this.selectedProvider)) {
            new Notice(`Please configure API key for ${AI_PROVIDERS[this.selectedProvider].name} in settings`)
            return
        }

        if (this.isAnalyzing) return
        this.isAnalyzing = true

        const loadingEl = this.contentEl.createDiv({ cls: 'stargate-loading' })
        loadingEl.createEl('span', { text: 'Analyzing...' })

        try {
            let messages: AIMessage[]

            if (useCustomPrompt) {
                // 커스텀 프롬프트 사용
                messages = [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that analyzes content based on user instructions.'
                    },
                    {
                        role: 'user',
                        content: `${this.customPrompt}\n\n## Content\n${this.editableContent}`
                    }
                ]
            } else {
                // 먼저 사용자 정의 전체 템플릿인지 확인
                const userFullTemplate = this.getUserFullTemplate(this.selectedTemplateId!)
                if (userFullTemplate) {
                    const userPrompt = userFullTemplate.prompt.replace('{{content}}', this.editableContent)
                    messages = [
                        { role: 'system', content: userFullTemplate.systemPrompt! },
                        { role: 'user', content: userPrompt }
                    ]
                } else {
                    // 기본 템플릿 사용 (사용자 정의 오버라이드 포함)
                    const template = getEffectiveTemplate(
                        this.selectedTemplateId as TemplateType,
                        this.plugin.settings.customTemplates
                    )
                    if (!template) {
                        throw new Error('Template not found')
                    }

                    const userPrompt = renderPrompt(template, this.editableContent)
                    messages = [
                        { role: 'system', content: template.systemPrompt },
                        { role: 'user', content: userPrompt }
                    ]
                }
            }

            const response = await this.aiService.sendRequest(messages, this.selectedProvider)

            if (response.error) {
                throw new Error(response.error)
            }

            // 미리보기 모달 표시
            this.showPreviewModal(response.content, false)
        } catch (error) {
            new Notice(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        } finally {
            loadingEl.remove()
            this.isAnalyzing = false
        }
    }

    /**
     * 미리보기 모달 표시
     */
    private showPreviewModal(content: string, isRaw: boolean): void {
        new PreviewModal(this.app, {
            content,
            isRaw,
            onApply: async () => {
                await this.createNote(content, isRaw)
                new Notice(isRaw ? 'Content saved!' : 'Analysis complete! Note created.')
                this.close()
            },
            onRegenerate: () => {
                // 재생성 - 다시 분석 실행
                if (!isRaw) {
                    this.runAnalysis()
                }
            },
            onCancel: () => {
                // 취소 - 아무것도 안 함
            }
        }).open()
    }

    /**
     * 분석 결과를 노트로 저장
     */
    private async createNote(content: string, isRaw: boolean): Promise<void> {
        const { vault, workspace } = this.app

        let templateName: string
        const useCustomPrompt = this.customPrompt.trim().length > 0

        if (isRaw) {
            templateName = 'Raw'
        } else if (useCustomPrompt) {
            templateName = 'Custom'
        } else if (this.selectedTemplateId) {
            // 사용자 정의 전체 템플릿인지 먼저 확인
            const userFullTemplate = this.getUserFullTemplate(this.selectedTemplateId)
            if (userFullTemplate) {
                templateName = userFullTemplate.name
            } else {
                templateName = getEffectiveTemplate(
                    this.selectedTemplateId as TemplateType,
                    this.plugin.settings.customTemplates
                )?.name || 'Custom'
            }
        } else {
            templateName = 'Custom'
        }

        const variables: Record<string, string> = {
            title: this.editableTitle || 'Untitled',
            source: this.options.url,
            date: new Date().toISOString(),
            template: templateName,
            provider: isRaw ? '' : this.selectedProvider,
            content: content,
            original: this.includeOriginal && !isRaw ? this.editableContent : ''
        }

        // 삽입 위치에 따라 처리
        switch (this.insertLocation) {
            case 'cursor':
                await this.insertAtCursor(content, variables)
                break
            case 'end':
                await this.insertAtEnd(content, variables)
                break
            case 'new-note':
            default:
                await this.createNewNote(content, variables)
                break
        }
    }

    /**
     * 새 노트 생성
     */
    private async createNewNote(content: string, variables: Record<string, string>): Promise<void> {
        const { vault } = this.app
        const notesFolder = this.plugin.settings.ai.notesFolder

        const folderPath = notesFolder || 'Clippings'
        const folder = vault.getAbstractFileByPath(folderPath)
        if (!folder) {
            await vault.createFolder(folderPath)
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const sanitizedTitle = (this.editableTitle || 'Untitled')
            .replace(/[\\/:*?"<>|]/g, '')
            .substring(0, 50)
        const fileName = `${folderPath}/${sanitizedTitle} - ${timestamp}.md`

        const noteContent = this.renderNoteTemplate(
            this.plugin.settings.ai.noteTemplate,
            variables
        )

        const file = await vault.create(fileName, noteContent)
        const leaf = this.app.workspace.getLeaf(false)
        await leaf.openFile(file)
    }

    /**
     * 커서 위치에 삽입
     */
    private async insertAtCursor(content: string, variables: Record<string, string>): Promise<void> {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView)
        if (!activeView) {
            new Notice('No active note. Creating new note instead.')
            await this.createNewNote(content, variables)
            return
        }

        const editor = activeView.editor
        const insertContent = this.formatInsertContent(content, variables)
        editor.replaceSelection(insertContent)
    }

    /**
     * 현재 노트 끝에 삽입
     */
    private async insertAtEnd(content: string, variables: Record<string, string>): Promise<void> {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView)
        if (!activeView) {
            new Notice('No active note. Creating new note instead.')
            await this.createNewNote(content, variables)
            return
        }

        const editor = activeView.editor
        const lastLine = editor.lastLine()
        const insertContent = '\n\n' + this.formatInsertContent(content, variables)

        editor.setCursor(lastLine, editor.getLine(lastLine).length)
        editor.replaceSelection(insertContent)
    }

    /**
     * 삽입용 콘텐츠 포맷팅 (새 노트가 아닐 때)
     */
    private formatInsertContent(content: string, variables: Record<string, string>): string {
        const parts: string[] = []

        // 제목 (헤더)
        parts.push(`## ${variables.title}`)
        parts.push('')

        // 소스 URL
        if (variables.source) {
            parts.push(`> Source: ${variables.source}`)
            parts.push('')
        }

        // 분석 결과
        parts.push(variables.content)

        // 원문 포함
        if (variables.original) {
            parts.push('')
            parts.push('---')
            parts.push('')
            parts.push('### Original Content')
            parts.push('')
            parts.push(variables.original)
        }

        return parts.join('\n')
    }

    /**
     * 노트 템플릿 렌더링
     */
    private renderNoteTemplate(template: string, variables: Record<string, string>): string {
        let result = template

        for (const [key, value] of Object.entries(variables)) {
            const conditionalRegex = new RegExp(`\\{\\{#${key}\\}\\}([\\s\\S]*?)\\{\\{/${key}\\}\\}`, 'g')
            if (value && value.trim()) {
                result = result.replace(conditionalRegex, '$1')
            } else {
                result = result.replace(conditionalRegex, '')
            }
        }

        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
            result = result.replace(regex, value)
        }

        result = result.replace(/\n{3,}/g, '\n\n')

        return result
    }

    onClose() {
        const { contentEl } = this
        contentEl.empty()
    }
}

/**
 * 미리보기 모달
 */
interface PreviewModalOptions {
    content: string
    isRaw: boolean
    onApply: () => void
    onRegenerate: () => void
    onCancel: () => void
}

class PreviewModal extends Modal {
    private options: PreviewModalOptions

    constructor(app: App, options: PreviewModalOptions) {
        super(app)
        this.options = options
    }

    onOpen() {
        const { contentEl } = this
        contentEl.empty()
        contentEl.addClass('stargate-preview-modal')

        contentEl.createEl('h2', { text: this.options.isRaw ? 'Content Preview' : 'Analysis Result' })

        // 미리보기 영역
        const previewEl = contentEl.createDiv({ cls: 'stargate-preview-content' })
        previewEl.createEl('pre', {
            text: this.options.content,
            cls: 'stargate-preview-text'
        })

        // 버튼
        const buttonContainer = contentEl.createDiv({ cls: 'stargate-modal-buttons' })

        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' })
        cancelBtn.onclick = () => {
            this.options.onCancel()
            this.close()
        }

        if (!this.options.isRaw) {
            const regenerateBtn = buttonContainer.createEl('button', { text: 'Regenerate' })
            regenerateBtn.onclick = () => {
                this.close()
                this.options.onRegenerate()
            }
        }

        const applyBtn = buttonContainer.createEl('button', {
            text: 'Apply',
            cls: 'mod-cta'
        })
        applyBtn.onclick = () => {
            this.close()
            this.options.onApply()
        }
    }

    onClose() {
        const { contentEl } = this
        contentEl.empty()
    }
}
