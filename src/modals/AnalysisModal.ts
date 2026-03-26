/**
 * AI 분석 모달
 */

import { App, Modal, Setting, Notice, TFile, MarkdownView } from 'obsidian'
import StargatePlugin from '../main'
import { TemplateType } from '../types'
import { getAnalysisTemplates, getTemplateById, getEffectiveTemplate, renderPrompt } from '../ai/templates'
import { AIService, AIMessage } from '../services/AIService'
import { t } from '../i18n'

type ContentSourceType = 'full' | 'selection' | 'clipboard'
type PromptTabType = 'template' | 'custom'
type InsertLocationType = 'new-note' | 'cursor' | 'end'

interface AnalysisModalOptions {
    content: string
    selectedText?: string
    url: string
    title: string
    quickMode?: boolean  // true면 바로 분석 실행 및 저장
}

type SelectedTemplateType = TemplateType | 'raw-save' | string  // string for user-defined template IDs

export class AnalysisModal extends Modal {
    private plugin: StargatePlugin
    private options: AnalysisModalOptions
    private aiService: AIService

    private selectedTemplateId: SelectedTemplateType | null = null
    private customPrompt: string = ''
    private selectedProviderId: string
    private selectedModelId: string
    private isAnalyzing = false

    // 편집 가능한 필드
    private editableTitle: string = ''
    private editableContent: string = ''

    // 옵션
    private includeOriginal: boolean = true
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
    private analyzeBtn: HTMLButtonElement | null = null

    constructor(app: App, plugin: StargatePlugin, options: AnalysisModalOptions) {
        super(app)
        this.plugin = plugin
        this.options = options
        this.aiService = plugin.aiService
        this.selectedProviderId = plugin.settings.defaultProviderId
        this.selectedModelId = plugin.settings.defaultModelId
        // 기본 템플릿 선택
        this.selectedTemplateId = plugin.settings.aiGlobal.defaultTemplate
        // 제목은 autoExtractTitle이 false일 때만 options.title 사용
        this.editableTitle = ''
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

        // 제목 설정: 자동추출 모드면 콘텐츠에서 추출, 아니면 options.title 사용
        if (this.autoExtractTitle) {
            this.editableTitle = this.extractTitleFromContent(this.editableContent)
        } else {
            this.editableTitle = this.options.title || ''
        }

        // 빠른 분석 모드: UI 없이 바로 실행
        if (this.options.quickMode) {
            this.selectedTemplateId = this.plugin.settings.aiGlobal.defaultTemplate
            contentEl.createEl('h2', { text: 'Quick Analysis' })
            const statusEl = contentEl.createDiv({ cls: 'stargate-quick-status' })
            statusEl.innerHTML = '<span class="stargate-spinner"></span><span>분석 중...</span>'
            statusEl.style.display = 'flex'
            statusEl.style.alignItems = 'center'
            statusEl.style.gap = '12px'
            statusEl.style.padding = '20px'
            statusEl.style.justifyContent = 'center'

            // 바로 분석 실행
            await this.runQuickAnalysis()
            return
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

        // 하단 액션 바 (Provider + 버튼)
        const actionBar = contentEl.createDiv({ cls: 'stargate-action-bar' })

        // 왼쪽: AI Provider + Model 선택
        const providerSection = actionBar.createDiv({ cls: 'stargate-provider-section' })
        providerSection.createEl('span', { text: t().analysis.provider, cls: 'stargate-provider-label' })
        const providerSelect = providerSection.createEl('select', { cls: 'stargate-provider-select' })
        for (const provider of this.plugin.settings.providers) {
            const option = providerSelect.createEl('option', { value: provider.id, text: provider.name })
            if (provider.id === this.selectedProviderId) {
                option.selected = true
            }
        }

        const modelSelect = providerSection.createEl('select', { cls: 'stargate-provider-select' })
        const updateModelSelect = () => {
            modelSelect.empty()
            const providerModels = this.plugin.settings.models.filter(
                m => m.providerId === this.selectedProviderId && m.enabled
            )
            for (const model of providerModels) {
                const option = modelSelect.createEl('option', { value: model.id, text: model.name })
                if (model.id === this.selectedModelId) {
                    option.selected = true
                }
            }
        }
        updateModelSelect()

        providerSelect.addEventListener('change', (e) => {
            this.selectedProviderId = (e.target as HTMLSelectElement).value
            // 해당 제공자의 첫 번째 모델로 변경
            const providerModels = this.plugin.settings.models.filter(
                m => m.providerId === this.selectedProviderId && m.enabled
            )
            this.selectedModelId = providerModels[0]?.id || ''
            updateModelSelect()
        })
        modelSelect.addEventListener('change', (e) => {
            this.selectedModelId = (e.target as HTMLSelectElement).value
        })

        // 오른쪽: 버튼
        const buttonContainer = actionBar.createDiv({ cls: 'stargate-modal-buttons' })

        const cancelBtn = buttonContainer.createEl('button', { text: '취소' })
        cancelBtn.onclick = () => this.close()

        this.analyzeBtn = buttonContainer.createEl('button', {
            cls: 'mod-cta stargate-analyze-btn'
        })
        this.analyzeBtn.innerHTML = '<span class="stargate-btn-text">생성</span>'
        this.analyzeBtn.onclick = () => this.runAnalysis()
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

        // 1. 메타데이터에서 제목 찾기 (예: **제목**: xxx, - **제목**: xxx, 제목: xxx)
        const titlePatterns = [
            /\*\*제목\*\*[:\s]+(.+)/i,
            /\*\*title\*\*[:\s]+(.+)/i,
            /^-?\s*제목[:\s]+(.+)/im,
            /^-?\s*title[:\s]+(.+)/im,
        ]
        for (const pattern of titlePatterns) {
            const match = content.match(pattern)
            if (match && match[1]) {
                return match[1].trim().substring(0, 100)
            }
        }

        const lines = content.trim().split('\n')

        // 2. 첫 번째 줄이 마크다운 헤딩이면 사용
        const headingMatch = lines[0].match(/^#{1,6}\s+(.+)/)
        if (headingMatch) {
            return headingMatch[1].trim().substring(0, 100)
        }

        // 3. 첫 번째 비어있지 않은 줄이 짧으면 (100자 이하) 제목으로 사용
        for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed.length > 0 && trimmed.length <= 100) {
                // 구분선이나 메타데이터 마커는 건너뛰기
                if (trimmed.match(/^[-=_*]{3,}$/) || trimmed.startsWith('📋') || trimmed.startsWith('---')) {
                    continue
                }
                return trimmed
            }
            if (trimmed.length > 0) break
        }

        // 4. 첫 번째 문장 추출 (마침표, 물음표, 느낌표로 끝나는 부분)
        const sentenceMatch = content.match(/^[^.!?]+[.!?]/)
        if (sentenceMatch && sentenceMatch[0].length <= 100) {
            return sentenceMatch[0].trim()
        }

        // 5. 처음 50자 + "..."
        return content.trim().substring(0, 50) + '...'
    }

    /**
     * YouTube URL인지 확인
     */
    private isYouTubeUrl(url: string): boolean {
        return /(?:youtube\.com|youtu\.be)/i.test(url)
    }

    /**
     * YouTube 메타데이터 추출
     */
    private extractYouTubeMetadata(url: string, content: string): {
        channel?: string
        duration?: string
        videoType?: string
        tags?: string
    } {
        if (!this.isYouTubeUrl(url)) {
            return {}
        }

        const metadata: {
            channel?: string
            duration?: string
            videoType?: string
            tags?: string
        } = {}

        // 채널명 추출 패턴들
        const channelPatterns = [
            /채널[:\s]*([^\n]+)/i,
            /channel[:\s]*([^\n]+)/i,
            /by\s+([^\n]+)/i,
            /^([^\n]+)\s*님의?\s*(?:채널|영상)/im
        ]
        for (const pattern of channelPatterns) {
            const match = content.match(pattern)
            if (match && match[1]) {
                metadata.channel = match[1].trim()
                break
            }
        }

        // 재생시간/길이 추출
        const durationPatterns = [
            /(?:재생\s*시간|길이|duration|length)[:\s]*([0-9:]+(?:\s*[시분초])?[0-9:]*)/i,
            /(\d{1,2}:\d{2}(?::\d{2})?)/  // HH:MM:SS or MM:SS 형식
        ]
        for (const pattern of durationPatterns) {
            const match = content.match(pattern)
            if (match && match[1]) {
                metadata.duration = match[1].trim()
                break
            }
        }

        // 영상 유형 추출
        const typePatterns = [
            /(?:유형|타입|type|category)[:\s]*([^\n]+)/i,
            /(?:shorts|라이브|live|스트리밍|streaming)/i
        ]
        for (const pattern of typePatterns) {
            const match = content.match(pattern)
            if (match) {
                if (match[1]) {
                    metadata.videoType = match[1].trim()
                } else {
                    metadata.videoType = match[0].trim()
                }
                break
            }
        }

        // 태그 추출
        const tagPatterns = [
            /(?:태그|tags?)[:\s]*([^\n]+)/i,
            /#([^\s#]+)/g  // 해시태그
        ]

        // 일반 태그 패턴
        const tagMatch = content.match(tagPatterns[0])
        if (tagMatch && tagMatch[1]) {
            // 쉼표나 공백으로 분리하고 따옴표로 감싸기
            const tags = tagMatch[1].split(/[,\s]+/)
                .filter(t => t.trim())
                .map(t => `"${t.trim()}"`)
                .join(', ')
            metadata.tags = tags
        } else {
            // 해시태그 추출
            const hashTags: string[] = []
            let hashMatch
            const hashPattern = /#([^\s#]+)/g
            while ((hashMatch = hashPattern.exec(content)) !== null) {
                if (hashMatch[1] && hashTags.length < 10) {
                    hashTags.push(`"${hashMatch[1]}"`)
                }
            }
            if (hashTags.length > 0) {
                metadata.tags = hashTags.join(', ')
            }
        }

        return metadata
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
        insertEl.createEl('span', { text: 'Insert:', cls: 'stargate-insert-label' })

        const insertButtonsEl = insertEl.createDiv({ cls: 'stargate-insert-buttons' })

        const locations: { key: InsertLocationType; label: string }[] = [
            { key: 'new-note', label: '새 노트' },
            { key: 'cursor', label: '커서' },
            { key: 'end', label: '노트 끝' }
        ]

        for (const loc of locations) {
            const btn = insertButtonsEl.createEl('button', {
                text: loc.label,
                cls: `stargate-insert-btn ${this.insertLocation === loc.key ? 'active' : ''}`
            })

            btn.onclick = () => {
                this.insertLocation = loc.key
                insertButtonsEl.querySelectorAll('.stargate-insert-btn').forEach((b) => b.removeClass('active'))
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
        this.contentTextarea.rows = 3
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
        for (const template of getAnalysisTemplates()) {
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
                const selectedIndex = getAnalysisTemplates().findIndex((t) => t.id === this.selectedTemplateId)
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

        if (!this.aiService.isProviderConfigured(this.selectedProviderId)) {
            const provider = this.aiService.getProvider(this.selectedProviderId)
            new Notice(t().notice.configureApiKey(provider?.name || this.selectedProviderId))
            return
        }

        if (this.isAnalyzing) return
        this.isAnalyzing = true

        // 버튼 상태 변경
        if (this.analyzeBtn) {
            this.analyzeBtn.disabled = true
            this.analyzeBtn.innerHTML = '<span class="stargate-spinner"></span><span class="stargate-btn-text">생성중...</span>'
        }

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

            const response = await this.aiService.sendRequest(messages, this.selectedProviderId, this.selectedModelId)

            if (response.error) {
                throw new Error(response.error)
            }

            // 미리보기 모달 표시
            this.showPreviewModal(response.content, false)
        } catch (error) {
            new Notice(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        } finally {
            // 버튼 상태 복원
            if (this.analyzeBtn) {
                this.analyzeBtn.disabled = false
                this.analyzeBtn.innerHTML = '<span class="stargate-btn-text">생성</span>'
            }
            this.isAnalyzing = false
        }
    }

    /**
     * 미리보기 모달 표시
     */
    private showPreviewModal(content: string, isRaw: boolean): void {
        const provider = this.aiService.getProvider(this.selectedProviderId)
        const modelDef = this.aiService.getModel(this.selectedModelId)

        new PreviewModal(this.app, {
            content,
            isRaw,
            provider: isRaw ? undefined : (provider?.name || this.selectedProviderId),
            model: isRaw ? undefined : (modelDef?.name || this.selectedModelId),
            onApply: async () => {
                await this.createNote(content, isRaw, modelDef?.name || this.selectedModelId)
                new Notice(isRaw ? t().notice.contentSaved : t().notice.analysisComplete)
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
    private async createNote(content: string, isRaw: boolean, model?: string): Promise<void> {
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

        // YouTube 메타데이터 추출
        const youtubeMetadata = this.extractYouTubeMetadata(this.options.url, this.editableContent)

        const variables: Record<string, string> = {
            title: this.editableTitle || 'Untitled',
            source: this.options.url,
            date: new Date().toISOString(),
            template: templateName,
            provider: isRaw ? '' : (this.aiService.getProvider(this.selectedProviderId)?.name || this.selectedProviderId),
            model: isRaw ? '' : (model || ''),
            content: content,
            original: this.includeOriginal && !isRaw ? this.editableContent : '',
            // YouTube 메타데이터
            channel: youtubeMetadata.channel || '',
            duration: youtubeMetadata.duration || '',
            videoType: youtubeMetadata.videoType || '',
            videoTags: youtubeMetadata.tags || ''
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
        const notesFolder = this.plugin.settings.aiGlobal.notesFolder

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
            this.plugin.settings.aiGlobal.noteTemplate,
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

    /**
     * 빠른 분석 실행 (미리보기 없이 바로 저장)
     */
    private async runQuickAnalysis(): Promise<void> {
        if (!this.editableContent.trim()) {
            new Notice('No content to analyze')
            this.close()
            return
        }

        if (!this.aiService.isProviderConfigured(this.selectedProviderId)) {
            const provider = this.aiService.getProvider(this.selectedProviderId)
            new Notice(t().notice.configureApiKey(provider?.name || this.selectedProviderId))
            this.close()
            return
        }

        try {
            // 기본 템플릿 사용
            const template = getEffectiveTemplate(
                this.selectedTemplateId as TemplateType,
                this.plugin.settings.customTemplates
            )
            if (!template) {
                throw new Error('Template not found')
            }

            const userPrompt = renderPrompt(template, this.editableContent)
            const messages: AIMessage[] = [
                { role: 'system', content: template.systemPrompt },
                { role: 'user', content: userPrompt }
            ]

            const response = await this.aiService.sendRequest(messages, this.selectedProviderId, this.selectedModelId)

            if (response.error) {
                throw new Error(response.error)
            }

            // 바로 노트 생성
            const modelDef = this.aiService.getModel(this.selectedModelId)
            await this.createNote(response.content, false, modelDef?.name || this.selectedModelId)

            new Notice(t().notice.analysisComplete)
            this.close()
        } catch (error) {
            new Notice(`Quick analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
            this.close()
        }
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
    provider?: string
    model?: string
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
        const { contentEl, modalEl } = this
        contentEl.empty()

        // 모달 전체 크기 설정
        modalEl.addClass('stargate-result-modal')

        // 제목
        const titleEl = contentEl.createEl('h2', {
            text: this.options.isRaw ? 'Content Preview' : 'Analysis Result'
        })
        titleEl.style.marginBottom = '12px'

        // Provider/Model 정보 표시 (AI 분석일 때만)
        if (!this.options.isRaw && (this.options.provider || this.options.model)) {
            const infoEl = contentEl.createDiv()
            infoEl.style.display = 'flex'
            infoEl.style.gap = '16px'
            infoEl.style.marginBottom = '12px'
            infoEl.style.fontSize = '12px'
            infoEl.style.color = 'var(--text-muted)'

            if (this.options.provider) {
                const providerEl = infoEl.createSpan()
                providerEl.innerHTML = `<strong>Provider:</strong> ${this.options.provider}`
            }
            if (this.options.model) {
                const modelEl = infoEl.createSpan()
                modelEl.innerHTML = `<strong>Model:</strong> ${this.options.model}`
            }
        }

        // 스크롤 가능한 콘텐츠 영역
        const scrollContainer = contentEl.createDiv()
        scrollContainer.style.height = 'calc(70vh - 100px)'
        scrollContainer.style.maxHeight = '500px'
        scrollContainer.style.overflowY = 'auto'
        scrollContainer.style.overflowX = 'hidden'
        scrollContainer.style.padding = '16px'
        scrollContainer.style.background = 'var(--background-secondary)'
        scrollContainer.style.borderRadius = '8px'
        scrollContainer.style.border = '1px solid var(--background-modifier-border)'

        // 콘텐츠 (pre 태그)
        const preEl = scrollContainer.createEl('pre')
        preEl.style.margin = '0'
        preEl.style.whiteSpace = 'pre-wrap'
        preEl.style.wordBreak = 'break-word'
        preEl.style.fontFamily = 'inherit'
        preEl.style.fontSize = '13px'
        preEl.style.lineHeight = '1.6'
        preEl.style.color = 'var(--text-normal)'
        preEl.textContent = this.options.content

        // 버튼 컨테이너
        const buttonContainer = contentEl.createDiv()
        buttonContainer.style.display = 'flex'
        buttonContainer.style.justifyContent = 'flex-end'
        buttonContainer.style.gap = '8px'
        buttonContainer.style.marginTop = '20px'

        // 취소 버튼
        const cancelBtn = buttonContainer.createEl('button', { text: '취소' })
        cancelBtn.onclick = () => {
            this.options.onCancel()
            this.close()
        }

        // 재생성 버튼 (AI 분석 결과일 때만)
        if (!this.options.isRaw) {
            const regenerateBtn = buttonContainer.createEl('button', { text: '재생성' })
            regenerateBtn.onclick = () => {
                this.close()
                this.options.onRegenerate()
            }
        }

        // 적용 버튼
        const applyBtn = buttonContainer.createEl('button', {
            text: '적용',
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
