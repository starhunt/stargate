import { Plugin, WorkspaceLeaf } from 'obsidian'
import { PluginSettings, DEFAULT_SETTINGS, DEFAULT_AI_SETTINGS, PinnedSite, TempTab, SavedPrompt } from './types'
import { PLUGIN_ID, VIEW_TYPE_BROWSER, MAX_PINNED_SITES, DEFAULT_PROFILE_KEY } from './constants'
import { BrowserView } from './views/BrowserView'
import { StargateSettingTab } from './SettingTab'

// Type export for commands
export type { BrowserView }

export default class StargatePlugin extends Plugin {
    settings: PluginSettings = DEFAULT_SETTINGS

    async onload() {
        console.log('Loading Stargate plugin')

        await this.loadSettings()

        // 브라우저 뷰 등록
        this.registerView(VIEW_TYPE_BROWSER, (leaf) => new BrowserView(leaf, this))

        // 설정 탭 추가
        this.addSettingTab(new StargateSettingTab(this.app, this))

        // 리본 아이콘 추가
        this.addRibbonIcon('globe', 'Open Star Gate Browser', () => {
            this.activateBrowserView()
        })

        // 명령어 등록
        this.addCommand({
            id: 'open-browser',
            name: 'Open Browser',
            callback: () => this.activateBrowserView()
        })

        this.addCommand({
            id: 'open-browser-in-new-tab',
            name: 'Open Browser in New Tab',
            callback: () => this.activateBrowserView(true)
        })

        this.addCommand({
            id: 'open-ai-analysis',
            name: 'Open AI Analysis',
            callback: () => this.openAIAnalysis()
        })

        this.addCommand({
            id: 'quick-save',
            name: 'Quick Save (Raw Content)',
            callback: () => this.runQuickSave()
        })
    }

    /**
     * AI 분석 모달 열기
     */
    private async openAIAnalysis(): Promise<void> {
        const view = this.getBrowserView()
        if (view) {
            await view.openAnalysisModal()
        } else {
            // 브라우저 뷰가 없으면 먼저 열기
            await this.activateBrowserView()
            // 약간의 딜레이 후 다시 시도
            setTimeout(async () => {
                const view = this.getBrowserView()
                if (view) {
                    await view.openAnalysisModal()
                }
            }, 300)
        }
    }

    /**
     * 빠른 저장 실행
     */
    private async runQuickSave(): Promise<void> {
        const view = this.getBrowserView()
        if (view) {
            await view.quickSave()
        } else {
            // 브라우저 뷰가 없으면 먼저 열기
            await this.activateBrowserView()
            setTimeout(async () => {
                const view = this.getBrowserView()
                if (view) {
                    await view.quickSave()
                }
            }, 300)
        }
    }

    /**
     * BrowserView 인스턴스 가져오기
     */
    private getBrowserView(): BrowserView | null {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_BROWSER)
        if (leaves.length > 0) {
            return leaves[0].view as BrowserView
        }
        return null
    }

    onunload() {
        console.log('Unloading Stargate plugin')
    }

    /**
     * 브라우저 뷰 활성화
     */
    async activateBrowserView(newLeaf = false): Promise<void> {
        const { workspace } = this.app

        let leaf: WorkspaceLeaf | null = null
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_BROWSER)

        if (leaves.length > 0 && !newLeaf) {
            // 기존 뷰가 있으면 활성화
            leaf = leaves[0]
        } else {
            // 새 뷰 생성 (오른쪽 패널)
            leaf = workspace.getRightLeaf(false)
            if (leaf) {
                await leaf.setViewState({ type: VIEW_TYPE_BROWSER, active: true })
            }
        }

        if (leaf) {
            workspace.revealLeaf(leaf)
        }
    }

    /**
     * 설정 로드
     */
    async loadSettings(): Promise<void> {
        const loadedData = await this.loadData()

        this.settings = {
            ...DEFAULT_SETTINGS,
            ...loadedData
        }

        // AI 설정 병합 (중첩 객체 포함)
        this.settings.ai = {
            ...DEFAULT_AI_SETTINGS,
            ...(loadedData?.ai || {}),
            // apiKeys와 models는 별도로 깊은 병합
            apiKeys: {
                ...DEFAULT_AI_SETTINGS.apiKeys,
                ...(loadedData?.ai?.apiKeys || {})
            },
            models: {
                ...DEFAULT_AI_SETTINGS.models,
                ...(loadedData?.ai?.models || {})
            }
        }

        // UUID 생성 (최초 실행 시)
        if (!this.settings.uuid) {
            this.settings.uuid = this.generateUUID()
            await this.saveSettings()
        }

        // savedPrompts 초기화
        if (!this.settings.savedPrompts) {
            this.settings.savedPrompts = []
        }

        // pinnedSites 초기화
        if (!this.settings.pinnedSites) {
            this.settings.pinnedSites = []
        }

        // tempTabs 초기화
        if (!this.settings.tempTabs) {
            this.settings.tempTabs = []
        }
    }

    /**
     * 설정 저장
     */
    async saveSettings(): Promise<void> {
        await this.saveData(this.settings)
    }

    /**
     * UUID 생성
     */
    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0
            const v = c === 'x' ? r : (r & 0x3) | 0x8
            return v.toString(16)
        })
    }

    // ============================================
    // Pinned Sites Management
    // ============================================

    /**
     * 고정 사이트 추가
     */
    async addPinnedSite(site: Omit<PinnedSite, 'id' | 'profileKey'>): Promise<boolean> {
        if (this.settings.pinnedSites.length >= MAX_PINNED_SITES) {
            return false
        }

        const newSite: PinnedSite = {
            id: `pinned-${Date.now()}`,
            profileKey: `${DEFAULT_PROFILE_KEY}-${Date.now()}`,
            ...site
        }

        this.settings.pinnedSites.push(newSite)
        await this.saveSettings()
        return true
    }

    /**
     * 고정 사이트 수정
     */
    async updatePinnedSite(id: string, updates: Partial<PinnedSite>): Promise<void> {
        const index = this.settings.pinnedSites.findIndex((s) => s.id === id)
        if (index !== -1) {
            this.settings.pinnedSites[index] = {
                ...this.settings.pinnedSites[index],
                ...updates
            }
            await this.saveSettings()
        }
    }

    /**
     * 고정 사이트 삭제
     */
    async removePinnedSite(id: string): Promise<void> {
        this.settings.pinnedSites = this.settings.pinnedSites.filter((s) => s.id !== id)
        await this.saveSettings()
    }

    // ============================================
    // Temp Tabs Management
    // ============================================

    /**
     * 임시 탭 추가
     */
    async addTempTab(url: string, title: string): Promise<TempTab> {
        const newTab: TempTab = {
            id: `temp-${Date.now()}`,
            url,
            title,
            profileKey: `${DEFAULT_PROFILE_KEY}-temp-${Date.now()}`
        }

        this.settings.tempTabs.push(newTab)
        this.settings.activeTabId = newTab.id
        await this.saveSettings()
        return newTab
    }

    /**
     * 임시 탭 삭제
     */
    async removeTempTab(id: string): Promise<void> {
        this.settings.tempTabs = this.settings.tempTabs.filter((t) => t.id !== id)

        // 활성 탭이 삭제된 경우 다른 탭으로 전환
        if (this.settings.activeTabId === id) {
            if (this.settings.pinnedSites.length > 0) {
                this.settings.activeTabId = this.settings.pinnedSites[0].id
            } else if (this.settings.tempTabs.length > 0) {
                this.settings.activeTabId = this.settings.tempTabs[0].id
            } else {
                this.settings.activeTabId = ''
            }
        }

        await this.saveSettings()
    }

    /**
     * 활성 탭 설정
     */
    async setActiveTab(id: string): Promise<void> {
        this.settings.activeTabId = id
        await this.saveSettings()
    }

    // ============================================
    // Saved Prompts Management
    // ============================================

    /**
     * 프롬프트 저장
     */
    async savePrompt(name: string, prompt: string, systemPrompt?: string, icon?: string): Promise<SavedPrompt> {
        const newPrompt: SavedPrompt = {
            id: `custom-${Date.now()}`,
            name,
            prompt,
            ...(systemPrompt && { systemPrompt }),
            ...(icon && { icon })
        }

        this.settings.savedPrompts.push(newPrompt)
        await this.saveSettings()
        return newPrompt
    }

    /**
     * 프롬프트 수정
     */
    async updatePrompt(id: string, updates: Partial<SavedPrompt>): Promise<void> {
        const index = this.settings.savedPrompts.findIndex((p) => p.id === id)
        if (index !== -1) {
            this.settings.savedPrompts[index] = {
                ...this.settings.savedPrompts[index],
                ...updates
            }
            await this.saveSettings()
        }
    }

    /**
     * 프롬프트 삭제
     */
    async removePrompt(id: string): Promise<void> {
        this.settings.savedPrompts = this.settings.savedPrompts.filter((p) => p.id !== id)
        await this.saveSettings()
    }
}
