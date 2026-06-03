import { Plugin, WorkspaceLeaf } from 'obsidian'
import {
    PluginSettings, DEFAULT_SETTINGS, DEFAULT_AI_GLOBAL_SETTINGS,
    PinnedSite, TempTab, SavedPrompt,
    AIProviderDefinition, AIModelDefinition, AISettingsV1, AIProviderType,
} from './types'
import { PLUGIN_ID, VIEW_TYPE_BROWSER, DEFAULT_PROFILE_KEY, BUILT_IN_PROVIDERS, BUILT_IN_MODELS } from './constants'
import { BrowserView } from './views/BrowserView'
import { StargateSettingTab } from './SettingTab'
import { AIService } from './services/AIService'
import { setLocale, setDetectedLocale, SupportedLocale } from './i18n'

// Type export for commands
export type { BrowserView }

export default class StargatePlugin extends Plugin {
    settings: PluginSettings = DEFAULT_SETTINGS
    aiService!: AIService

    async onload() {

        await this.loadSettings()

        // i18n 초기화
        this.initI18n()

        // AI 서비스 초기화
        this.initializeAIService()

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
     * i18n 초기화
     */
    private initI18n(): void {
        // 언어 감지: Obsidian locale → localStorage → moment locale → 'en' 순
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obsidianLocale = (this.app as any).locale
            || window.localStorage.getItem('language')
            || (window as any).moment?.locale()
            || 'en'
        setDetectedLocale(obsidianLocale)

        // 수동 설정이 있으면 적용
        if (this.settings.language !== 'auto') {
            setLocale(this.settings.language)
        }
    }

    /**
     * AI 서비스 초기화
     */
    private initializeAIService(): void {
        this.aiService = new AIService(
            this.settings.providers,
            this.settings.models,
            this.settings.defaultProviderId,
            this.settings.defaultModelId,
        )
    }

    /**
     * AI 분석 모달 열기
     */
    private async openAIAnalysis(): Promise<void> {
        const view = this.getBrowserView()
        if (view) {
            await view.openAnalysisModal()
        } else {
            await this.activateBrowserView()
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
    }

    /**
     * 브라우저 뷰 활성화
     */
    async activateBrowserView(newLeaf = false): Promise<void> {
        const { workspace } = this.app

        let leaf: WorkspaceLeaf | null = null
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_BROWSER)

        if (leaves.length > 0 && !newLeaf) {
            leaf = leaves[0]
        } else {
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

        if (!loadedData) {
            // 첫 실행: 기본 설정 + 빌트인 프리셋
            this.settings = {
                ...DEFAULT_SETTINGS,
                providers: BUILT_IN_PROVIDERS.map(p => ({ ...p })),
                models: BUILT_IN_MODELS.map(m => ({ ...m })),
            }
        } else if (!loadedData.settingsVersion || loadedData.settingsVersion < 2) {
            // v1 → v2 마이그레이션
            this.settings = this.migrateV1ToV2(loadedData)
        } else {
            // v2 설정 로드
            this.settings = {
                ...DEFAULT_SETTINGS,
                ...loadedData,
                aiGlobal: {
                    ...DEFAULT_AI_GLOBAL_SETTINGS,
                    ...(loadedData.aiGlobal || {}),
                },
            }

            // 빌트인 프로바이더 동기화 (새 프리셋 추가 대응)
            this.syncBuiltInProviders()
            this.syncBuiltInModels()
        }

        // UUID 생성 (최초 실행 시)
        if (!this.settings.uuid) {
            this.settings.uuid = this.generateUUID()
            await this.saveSettings()
        }

        // 배열 초기화
        if (!this.settings.savedPrompts) this.settings.savedPrompts = []
        if (!this.settings.pinnedSites) this.settings.pinnedSites = []
        if (!this.settings.tempTabs) this.settings.tempTabs = []
        if (!this.settings.customTemplates) this.settings.customTemplates = []
    }

    /**
     * v1 → v2 설정 마이그레이션
     */
    private migrateV1ToV2(v1Data: Record<string, unknown>): PluginSettings {

        const v1Ai = (v1Data.ai || {}) as Partial<AISettingsV1>
        const v1ApiKeys = v1Ai.apiKeys || {}
        const v1Models = v1Ai.models || {}

        // 빌트인 프로바이더에 v1 API 키 매핑
        const providers: AIProviderDefinition[] = BUILT_IN_PROVIDERS.map(preset => {
            const v1Key = v1ApiKeys[preset.id as AIProviderType] || ''
            return { ...preset, apiKey: v1Key }
        })

        // 빌트인 모델에 v1 모델명 매핑
        const models: AIModelDefinition[] = BUILT_IN_MODELS.map(preset => ({ ...preset }))

        // v1에서 사용자가 변경한 모델명이 있으면 업데이트
        for (const [providerId, modelName] of Object.entries(v1Models)) {
            if (!modelName) continue
            const existingModel = models.find(m => m.providerId === providerId)
            if (existingModel && existingModel.id !== modelName) {
                // 기본 모델과 다르면 새 모델로 추가
                const alreadyExists = models.some(m => m.id === modelName)
                if (!alreadyExists) {
                    models.push({
                        id: modelName,
                        name: modelName,
                        providerId,
                        enabled: true,
                    })
                }
            }
        }

        // 기본 프로바이더/모델 매핑
        const v1Provider = v1Ai.provider || 'openai'
        const defaultProviderId = v1Provider
        const defaultModelId = v1Models[v1Provider as AIProviderType] ||
            BUILT_IN_MODELS.find(m => m.providerId === v1Provider)?.id ||
            'gpt-4o'

        return {
            settingsVersion: 2,
            uuid: (v1Data.uuid as string) || '',
            language: 'auto',
            pinnedSites: (v1Data.pinnedSites as PinnedSite[]) || [],
            tempTabs: (v1Data.tempTabs as TempTab[]) || [],
            activeTabId: (v1Data.activeTabId as string) || '',
            sharedSession: (v1Data.sharedSession as boolean) || false,
            providers,
            models,
            defaultProviderId,
            defaultModelId,
            aiGlobal: {
                maxTokens: v1Ai.maxTokens || 64000,
                defaultLanguage: v1Ai.defaultLanguage || 'ko',
                defaultTemplate: v1Ai.defaultTemplate || 'briefing',
                autoTags: v1Ai.autoTags ?? true,
                notesFolder: v1Ai.notesFolder || 'Clippings',
                noteTemplate: v1Ai.noteTemplate || DEFAULT_AI_GLOBAL_SETTINGS.noteTemplate,
            },
            savedPrompts: (v1Data.savedPrompts as SavedPrompt[]) || [],
            customTemplates: (v1Data.customTemplates as unknown[]) as PluginSettings['customTemplates'] || [],
        }
    }

    /**
     * 빌트인 프로바이더 동기화 (새 프리셋 추가 대응)
     */
    private syncBuiltInProviders(): void {
        for (const builtIn of BUILT_IN_PROVIDERS) {
            const existing = this.settings.providers.find(p => p.id === builtIn.id)
            if (!existing) {
                this.settings.providers.push({ ...builtIn })
            }
        }
    }

    /**
     * 빌트인 모델 동기화
     */
    private syncBuiltInModels(): void {
        for (const builtIn of BUILT_IN_MODELS) {
            const existing = this.settings.models.find(m => m.id === builtIn.id && m.providerId === builtIn.providerId)
            if (!existing) {
                this.settings.models.push({ ...builtIn })
            }
        }
    }

    /**
     * 설정 저장
     */
    async saveSettings(): Promise<void> {
        await this.saveData(this.settings)
        // AI 서비스 재초기화
        if (this.aiService) {
            this.aiService.updateSettings(
                this.settings.providers,
                this.settings.models,
                this.settings.defaultProviderId,
                this.settings.defaultModelId,
            )
        }
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
    // Provider Management
    // ============================================

    /**
     * 제공자 추가/수정
     */
    async upsertProvider(provider: AIProviderDefinition): Promise<void> {
        const index = this.settings.providers.findIndex(p => p.id === provider.id)
        if (index !== -1) {
            this.settings.providers[index] = provider
        } else {
            this.settings.providers.push(provider)
        }
        await this.saveSettings()
    }

    /**
     * 제공자 삭제
     */
    async removeProvider(providerId: string): Promise<void> {
        this.settings.providers = this.settings.providers.filter(p => p.id !== providerId)
        // 해당 제공자의 모델도 삭제
        this.settings.models = this.settings.models.filter(m => m.providerId !== providerId)
        // 기본 제공자가 삭제되면 첫 번째로 변경
        if (this.settings.defaultProviderId === providerId && this.settings.providers.length > 0) {
            this.settings.defaultProviderId = this.settings.providers[0].id
            const firstModel = this.settings.models.find(m => m.providerId === this.settings.defaultProviderId)
            this.settings.defaultModelId = firstModel?.id || ''
        }
        await this.saveSettings()
    }

    // ============================================
    // Model Management
    // ============================================

    /**
     * 모델 추가/수정
     */
    async upsertModel(model: AIModelDefinition, originalId?: string): Promise<void> {
        if (originalId) {
            // ID가 변경된 경우: 기존 것 삭제 후 추가
            this.settings.models = this.settings.models.filter(m => m.id !== originalId)
            if (this.settings.defaultModelId === originalId) {
                this.settings.defaultModelId = model.id
            }
        }

        const index = this.settings.models.findIndex(m => m.id === model.id)
        if (index !== -1) {
            this.settings.models[index] = model
        } else {
            this.settings.models.push(model)
        }
        await this.saveSettings()
    }

    /**
     * 모델 삭제
     */
    async removeModel(modelId: string): Promise<void> {
        this.settings.models = this.settings.models.filter(m => m.id !== modelId)
        if (this.settings.defaultModelId === modelId) {
            const fallback = this.settings.models.find(m => m.providerId === this.settings.defaultProviderId)
            this.settings.defaultModelId = fallback?.id || ''
        }
        await this.saveSettings()
    }

    // ============================================
    // Pinned Sites Management
    // ============================================

    async addPinnedSite(site: Omit<PinnedSite, 'id' | 'profileKey'>): Promise<boolean> {
        const newSite: PinnedSite = {
            id: `pinned-${Date.now()}`,
            profileKey: `${DEFAULT_PROFILE_KEY}-${Date.now()}`,
            ...site
        }

        this.settings.pinnedSites.push(newSite)
        await this.saveSettings()
        return true
    }

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

    async removePinnedSite(id: string): Promise<void> {
        this.settings.pinnedSites = this.settings.pinnedSites.filter((s) => s.id !== id)
        await this.saveSettings()
    }

    // ============================================
    // Temp Tabs Management
    // ============================================

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

    async removeTempTab(id: string): Promise<void> {
        this.settings.tempTabs = this.settings.tempTabs.filter((t) => t.id !== id)

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

    async setActiveTab(id: string): Promise<void> {
        this.settings.activeTabId = id
        await this.saveSettings()
    }

    // ============================================
    // Saved Prompts Management
    // ============================================

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

    async removePrompt(id: string): Promise<void> {
        this.settings.savedPrompts = this.settings.savedPrompts.filter((p) => p.id !== id)
        await this.saveSettings()
    }
}
