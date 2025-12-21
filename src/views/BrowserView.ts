import { ItemView, WorkspaceLeaf, Platform, Notice, setIcon } from 'obsidian'
import WebviewTag = Electron.WebviewTag
import StargatePlugin from '../main'
import { VIEW_TYPE_BROWSER, FAVICON_SERVICE_URL, OAUTH_DOMAINS, BLANK_URL } from '../constants'
import { PinnedSite, TempTab, TabState } from '../types'
import { createWebviewTag } from '../fns/createWebviewTag'
import { createIframe } from '../fns/createIframe'
import { isOAuthUrl } from '../fns/isOAuthUrl'
import { NewTabModal } from '../modals/NewTabModal'
import { AnalysisModal } from '../modals/AnalysisModal'

interface CachedFrame {
    frame: HTMLIFrameElement | WebviewTag
    isReady: boolean
    readyCallbacks: (() => void)[]
}

export class BrowserView extends ItemView {
    plugin: StargatePlugin
    private useIframe: boolean
    private frameDoc: Document
    private topBarEl: HTMLElement | null = null
    private contentAreaEl: HTMLElement | null = null
    private currentTabState: TabState | null = null

    // 탭별 webview 캐시
    private frameCache: Map<string, CachedFrame> = new Map()
    private activeFrameId: string | null = null

    constructor(leaf: WorkspaceLeaf, plugin: StargatePlugin) {
        super(leaf)
        this.plugin = plugin
        this.useIframe = Platform.isMobileApp
        this.frameDoc = this.contentEl.doc
    }

    getViewType(): string {
        return VIEW_TYPE_BROWSER
    }

    getDisplayText(): string {
        return 'Star Gate Browser'
    }

    getIcon(): string {
        return 'globe'
    }

    async onOpen(): Promise<void> {
        this.contentEl.empty()
        this.contentEl.addClass('stargate-browser-view')

        // 탑 바 생성
        this.drawTopBar()

        // 콘텐츠 영역 생성
        this.contentAreaEl = this.contentEl.createDiv({ cls: 'stargate-content-area' })

        // 첫 번째 탭 로드
        this.loadInitialTab()
    }

    async onClose(): Promise<void> {
        // 모든 캐시된 프레임 제거
        for (const [id, cached] of this.frameCache) {
            cached.frame.remove()
        }
        this.frameCache.clear()
        this.activeFrameId = null
    }

    /**
     * 탑 바 그리기
     */
    private drawTopBar(): void {
        this.topBarEl = this.contentEl.createDiv({ cls: 'stargate-top-bar' })

        // 탭 바 영역
        const tabBarEl = this.topBarEl.createDiv({ cls: 'stargate-tab-bar' })
        this.renderTabBar(tabBarEl)

        // 액션 버튼 영역
        const actionsEl = this.topBarEl.createDiv({ cls: 'stargate-actions' })
        this.renderActionButtons(actionsEl)
    }

    /**
     * 탭 바 렌더링
     */
    private renderTabBar(container: HTMLElement): void {
        container.empty()

        // 고정 탭들
        for (const site of this.plugin.settings.pinnedSites) {
            this.createTabButton(container, {
                id: site.id,
                title: site.name,
                url: site.url,
                favicon: site.favicon,
                isPinned: true
            })
        }

        // 임시 탭들
        for (const tab of this.plugin.settings.tempTabs) {
            this.createTabButton(container, {
                id: tab.id,
                title: tab.title,
                url: tab.url,
                isPinned: false
            })
        }

        // 새 탭 버튼
        const newTabBtn = container.createDiv({ cls: 'stargate-tab stargate-new-tab' })
        setIcon(newTabBtn, 'plus')
        newTabBtn.setAttribute('aria-label', 'New Tab')
        newTabBtn.onclick = () => this.showNewTabModal()
    }

    /**
     * 탭 버튼 생성
     */
    private createTabButton(
        container: HTMLElement,
        options: {
            id: string
            title: string
            url: string
            favicon?: string
            isPinned: boolean
        }
    ): void {
        const tabEl = container.createDiv({
            cls: `stargate-tab ${this.plugin.settings.activeTabId === options.id ? 'active' : ''}`
        })

        // Favicon
        const faviconEl = tabEl.createDiv({ cls: 'stargate-tab-favicon' })
        if (options.favicon) {
            faviconEl.style.backgroundImage = `url(${options.favicon})`
        } else {
            // Google Favicon 서비스 사용
            try {
                const domain = new URL(options.url).hostname
                faviconEl.style.backgroundImage = `url(${FAVICON_SERVICE_URL}${domain}&sz=32)`
            } catch {
                setIcon(faviconEl, 'globe')
            }
        }

        // 툴팁
        tabEl.setAttribute('aria-label', options.title)
        tabEl.setAttribute('title', options.title)

        // 클릭 이벤트
        tabEl.onclick = () => this.switchToTab(options.id)

        // 닫기 버튼 (임시 탭만)
        if (!options.isPinned) {
            const closeBtn = tabEl.createDiv({ cls: 'stargate-tab-close' })
            setIcon(closeBtn, 'x')
            closeBtn.onclick = (e) => {
                e.stopPropagation()
                this.closeTab(options.id)
            }
        }
    }

    /**
     * 액션 버튼 렌더링
     */
    private renderActionButtons(container: HTMLElement): void {
        // 설정 버튼
        const settingsBtn = container.createDiv({ cls: 'stargate-action-btn' })
        setIcon(settingsBtn, 'settings')
        settingsBtn.setAttribute('aria-label', 'Settings')
        settingsBtn.onclick = () => {
            // @ts-ignore
            this.app.setting.open()
            // @ts-ignore
            this.app.setting.openTabById('stargate')
        }

        // 분석 버튼
        const analyzeBtn = container.createDiv({ cls: 'stargate-action-btn' })
        setIcon(analyzeBtn, 'sparkles')
        analyzeBtn.setAttribute('aria-label', 'AI Analysis')
        analyzeBtn.onclick = () => this.showAnalysisModal()

        // 새로고침 버튼
        const refreshBtn = container.createDiv({ cls: 'stargate-action-btn' })
        setIcon(refreshBtn, 'refresh-cw')
        refreshBtn.setAttribute('aria-label', 'Refresh')
        refreshBtn.onclick = () => this.refreshCurrentPage()
    }

    /**
     * 초기 탭 로드
     */
    private loadInitialTab(): void {
        const { pinnedSites, tempTabs, activeTabId } = this.plugin.settings

        // 활성 탭이 있으면 해당 탭 로드
        if (activeTabId) {
            const pinnedSite = pinnedSites.find((s) => s.id === activeTabId)
            if (pinnedSite) {
                this.switchToTab(pinnedSite.id)
                return
            }

            const tempTab = tempTabs.find((t) => t.id === activeTabId)
            if (tempTab) {
                this.switchToTab(tempTab.id)
                return
            }
        }

        // 첫 번째 고정 사이트 로드
        if (pinnedSites.length > 0) {
            this.plugin.setActiveTab(pinnedSites[0].id)
            this.switchToTab(pinnedSites[0].id)
            return
        }

        // 빈 페이지
        this.showEmptyState()
    }

    /**
     * 빈 상태 표시
     */
    private showEmptyState(): void {
        if (!this.contentAreaEl) return

        // 모든 프레임 숨기기
        this.hideAllFrames()

        // 기존 empty state 제거
        const existingEmpty = this.contentAreaEl.querySelector('.stargate-empty-state')
        if (existingEmpty) {
            existingEmpty.remove()
        }

        const emptyEl = this.contentAreaEl.createDiv({ cls: 'stargate-empty-state' })
        emptyEl.createEl('h3', { text: 'Welcome to Star Gate' })
        emptyEl.createEl('p', { text: 'Add pinned sites in Settings or click + to open a new tab.' })

        const addBtn = emptyEl.createEl('button', { text: 'Open Settings' })
        addBtn.onclick = () => {
            // @ts-ignore
            this.app.setting.open()
            // @ts-ignore
            this.app.setting.openTabById('stargate')
        }
    }

    /**
     * 모든 프레임 숨기기
     */
    private hideAllFrames(): void {
        for (const [id, cached] of this.frameCache) {
            (cached.frame as HTMLElement).style.display = 'none'
        }
    }

    /**
     * 탭 전환 (캐시된 webview 사용)
     */
    private switchToTab(id: string): void {
        // 이미 같은 탭이면 무시
        if (this.activeFrameId === id) {
            return
        }

        const pinnedSite = this.plugin.settings.pinnedSites.find((s) => s.id === id)
        const tempTab = this.plugin.settings.tempTabs.find((t) => t.id === id)

        if (!pinnedSite && !tempTab) {
            return
        }

        // 현재 탭 상태 업데이트
        if (pinnedSite) {
            this.currentTabState = {
                id: pinnedSite.id,
                url: pinnedSite.url,
                title: pinnedSite.name,
                isPinned: true
            }
        } else if (tempTab) {
            this.currentTabState = {
                id: tempTab.id,
                url: tempTab.url,
                title: tempTab.title,
                isPinned: false
            }
        }

        this.plugin.setActiveTab(id)

        // Empty state 제거
        const emptyEl = this.contentAreaEl?.querySelector('.stargate-empty-state')
        if (emptyEl) {
            emptyEl.remove()
        }

        // 모든 프레임 숨기기
        this.hideAllFrames()

        // 캐시된 프레임이 있으면 표시, 없으면 생성
        if (this.frameCache.has(id)) {
            const cached = this.frameCache.get(id)!
            ;(cached.frame as HTMLElement).style.display = ''
            this.activeFrameId = id
        } else {
            // 새 프레임 생성
            const url = pinnedSite?.url || tempTab?.url || ''
            const profileKey = pinnedSite?.profileKey || tempTab?.profileKey || ''
            this.createFrame(id, url, profileKey)
        }

        this.refreshTabBar()
    }

    /**
     * 새 프레임 생성 및 캐시
     */
    private createFrame(id: string, url: string, profileKey: string): void {
        if (!this.contentAreaEl) return

        const cached: CachedFrame = {
            frame: null as any,
            isReady: false,
            readyCallbacks: []
        }

        const onReady = () => {
            cached.isReady = true
            cached.readyCallbacks.forEach((cb) => cb())
            cached.readyCallbacks = []
        }

        if (this.useIframe) {
            cached.frame = createIframe({ url }, onReady)
        } else {
            cached.frame = createWebviewTag({ url, profileKey }, onReady, this.frameDoc)

            // OAuth 및 팝업 처리
            if (cached.frame && 'addEventListener' in cached.frame) {
                const webview = cached.frame as WebviewTag

                webview.addEventListener('new-window', (e: any) => {
                    const targetUrl = e.url as string
                    if (!targetUrl) return

                    if (isOAuthUrl(targetUrl)) {
                        // OAuth URL은 같은 webview에서 로드
                        webview.src = targetUrl
                    } else {
                        // 일반 팝업은 새 탭으로
                        this.plugin.addTempTab(targetUrl, 'New Tab').then((tab) => {
                            this.switchToTab(tab.id)
                            this.refreshTabBar()
                        })
                    }
                })

                // 키보드 단축키 처리 (webview 포커스 상태에서도 작동)
                webview.addEventListener('before-input-event', (e: any) => {
                    const input = e.input
                    // Cmd/Ctrl + Shift + A: AI Analysis
                    if ((input.meta || input.control) && input.shift && input.key === 'a') {
                        e.preventDefault()
                        this.openAnalysisModal()
                    }
                    // Cmd/Ctrl + Shift + S: Quick Save
                    if ((input.meta || input.control) && input.shift && input.key === 's') {
                        e.preventDefault()
                        this.quickSave()
                    }
                })

                // 타이틀 업데이트
                webview.addEventListener('page-title-updated', (e: any) => {
                    const title = e.title
                    if (title && this.currentTabState && this.currentTabState.id === id) {
                        // 임시 탭의 경우 타이틀 업데이트
                        const tempTab = this.plugin.settings.tempTabs.find((t) => t.id === id)
                        if (tempTab) {
                            tempTab.title = title
                            this.currentTabState.title = title
                            this.plugin.saveSettings()
                            this.refreshTabBar()
                        }
                    }
                })
            }
        }

        // 캐시에 저장
        this.frameCache.set(id, cached)
        this.activeFrameId = id

        // DOM에 추가
        if (cached.frame) {
            this.contentAreaEl.appendChild(cached.frame as unknown as HTMLElement)
        }
    }

    /**
     * 탭 닫기
     */
    private async closeTab(id: string): Promise<void> {
        // 캐시에서 프레임 제거
        const cached = this.frameCache.get(id)
        if (cached) {
            cached.frame.remove()
            this.frameCache.delete(id)
        }

        await this.plugin.removeTempTab(id)

        // 닫힌 탭이 현재 탭이었다면 다른 탭으로 전환
        if (this.activeFrameId === id) {
            this.activeFrameId = null

            if (this.plugin.settings.activeTabId) {
                this.switchToTab(this.plugin.settings.activeTabId)
            } else {
                this.showEmptyState()
            }
        }

        this.refreshTabBar()
    }

    /**
     * 탭 바 새로고침
     */
    private refreshTabBar(): void {
        if (this.topBarEl) {
            const tabBarEl = this.topBarEl.querySelector('.stargate-tab-bar')
            if (tabBarEl) {
                this.renderTabBar(tabBarEl as HTMLElement)
            }
        }
    }

    /**
     * 현재 페이지 새로고침
     */
    private refreshCurrentPage(): void {
        if (!this.activeFrameId) return

        const cached = this.frameCache.get(this.activeFrameId)
        if (!cached) return

        if (this.useIframe) {
            const iframe = cached.frame as HTMLIFrameElement
            iframe.src = iframe.src
        } else {
            ;(cached.frame as WebviewTag).reload()
        }
    }

    /**
     * 새 탭 모달
     */
    private showNewTabModal(): void {
        new NewTabModal(this.app, {
            onSubmit: async (url) => {
                const tab = await this.plugin.addTempTab(url, 'New Tab')
                this.switchToTab(tab.id)
                this.refreshTabBar()
            }
        }).open()
    }

    /**
     * AI 분석 모달 열기
     */
    async openAnalysisModal(): Promise<void> {
        // 현재 페이지 콘텐츠 및 선택 텍스트 가져오기
        const [content, selectedText] = await Promise.all([
            this.getPageContent(),
            this.getSelectedText()
        ])

        new AnalysisModal(this.app, this.plugin, {
            content: content || '',
            selectedText: selectedText || undefined,
            url: this.currentTabState?.url || '',
            title: this.currentTabState?.title || ''
        }).open()
    }

    /**
     * 빠른 저장 (원문 바로 저장)
     */
    async quickSave(): Promise<void> {
        // 클립보드 확인
        let clipboardContent = ''
        try {
            clipboardContent = await navigator.clipboard.readText()
        } catch {
            clipboardContent = ''
        }

        const [content, selectedText] = await Promise.all([
            this.getPageContent(),
            this.getSelectedText()
        ])

        // 우선순위: 클립보드 > 선택 텍스트 > 전체 내용
        const textToSave = clipboardContent?.trim() || selectedText?.trim() || content?.trim()
        if (!textToSave) {
            new Notice('No content to save')
            return
        }

        // 제목 추출 (콘텐츠에서 자동 추출)
        const title = this.extractTitleFromContent(textToSave)
        const url = this.currentTabState?.url || ''
        const notesFolder = this.plugin.settings.ai.notesFolder || 'Clippings'

        // 폴더 확인/생성
        const folder = this.app.vault.getAbstractFileByPath(notesFolder)
        if (!folder) {
            await this.app.vault.createFolder(notesFolder)
        }

        // 파일명 생성
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const sanitizedTitle = title.replace(/[\\/:*?"<>|]/g, '').substring(0, 50)
        const fileName = `${notesFolder}/${sanitizedTitle} - ${timestamp}.md`

        // YouTube 메타데이터 추출
        const ytMeta = this.extractYouTubeMetadata(url, textToSave)

        // 노트 내용 생성
        let frontmatter = `---
source: "${url}"
created: ${new Date().toISOString()}
template: Raw`

        if (ytMeta.channel) frontmatter += `\nchannel: "${ytMeta.channel}"`
        if (ytMeta.duration) frontmatter += `\nduration: "${ytMeta.duration}"`
        if (ytMeta.videoType) frontmatter += `\nvideoType: "${ytMeta.videoType}"`
        if (ytMeta.tags) frontmatter += `\nvideoTags: [${ytMeta.tags}]`

        frontmatter += `\ntags: [stargate/clipping]
---`

        let bodyInfo = `> Source: ${url}`
        if (ytMeta.channel) bodyInfo += `\n> Channel: ${ytMeta.channel}`
        if (ytMeta.duration) bodyInfo += `\n> Duration: ${ytMeta.duration}`

        const noteContent = `${frontmatter}

# ${title}

${bodyInfo}

---

${textToSave}

---

*Generated by Star Gate*
`

        const file = await this.app.vault.create(fileName, noteContent)
        const leaf = this.app.workspace.getLeaf(false)
        await leaf.openFile(file)

        new Notice('Content saved!')
    }

    /**
     * 콘텐츠에서 제목 자동 추출
     */
    private extractTitleFromContent(content: string): string {
        if (!content || !content.trim()) {
            return 'Untitled'
        }

        // 1. 메타데이터에서 제목 찾기
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

        // 3. 첫 번째 비어있지 않은 줄이 짧으면 제목으로 사용
        for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed.length > 0 && trimmed.length <= 100) {
                if (trimmed.match(/^[-=_*]{3,}$/) || trimmed.startsWith('📋') || trimmed.startsWith('---')) {
                    continue
                }
                return trimmed
            }
            if (trimmed.length > 0) break
        }

        // 4. 첫 번째 문장 추출
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

        // 채널명 추출
        const channelPatterns = [
            /채널[:\s]*([^\n]+)/i,
            /channel[:\s]*([^\n]+)/i,
            /by\s+([^\n]+)/i
        ]
        for (const pattern of channelPatterns) {
            const match = content.match(pattern)
            if (match && match[1]) {
                metadata.channel = match[1].trim()
                break
            }
        }

        // 재생시간 추출
        const durationPatterns = [
            /(?:재생\s*시간|길이|duration|length)[:\s]*([0-9:]+)/i,
            /(\d{1,2}:\d{2}(?::\d{2})?)/
        ]
        for (const pattern of durationPatterns) {
            const match = content.match(pattern)
            if (match && match[1]) {
                metadata.duration = match[1].trim()
                break
            }
        }

        // 영상 유형 추출
        const typeMatch = content.match(/(?:유형|타입|type|category)[:\s]*([^\n]+)/i)
        if (typeMatch && typeMatch[1]) {
            metadata.videoType = typeMatch[1].trim()
        }

        // 태그 추출
        const tagMatch = content.match(/(?:태그|tags?)[:\s]*([^\n]+)/i)
        if (tagMatch && tagMatch[1]) {
            const tags = tagMatch[1].split(/[,\s]+/)
                .filter(t => t.trim())
                .map(t => `"${t.trim()}"`)
                .join(', ')
            metadata.tags = tags
        }

        return metadata
    }

    // Legacy method for backward compatibility
    private async showAnalysisModal(): Promise<void> {
        await this.openAnalysisModal()
    }

    /**
     * 현재 페이지 콘텐츠 가져오기
     */
    async getPageContent(): Promise<string | null> {
        if (!this.activeFrameId || this.useIframe) return null

        const cached = this.frameCache.get(this.activeFrameId)
        if (!cached) return null

        return new Promise((resolve) => {
            const webview = cached.frame as WebviewTag

            const execute = () => {
                webview.executeJavaScript(`document.body.innerText`).then(resolve).catch(() => resolve(null))
            }

            if (cached.isReady) {
                execute()
            } else {
                cached.readyCallbacks.push(execute)
            }
        })
    }

    /**
     * 선택된 텍스트 가져오기
     */
    async getSelectedText(): Promise<string | null> {
        if (!this.activeFrameId || this.useIframe) return null

        const cached = this.frameCache.get(this.activeFrameId)
        if (!cached) return null

        return new Promise((resolve) => {
            const webview = cached.frame as WebviewTag

            const execute = () => {
                webview
                    .executeJavaScript(`window.getSelection()?.toString() || ''`)
                    .then((text) => resolve(text || null))
                    .catch(() => resolve(null))
            }

            if (cached.isReady) {
                execute()
            } else {
                cached.readyCallbacks.push(execute)
            }
        })
    }
}
