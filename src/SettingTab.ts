import { App, PluginSettingTab, Setting, Notice, Platform } from 'obsidian'
import StargatePlugin from './main'
import { PinnedSite, DEFAULT_NOTE_TEMPLATE, TemplateType } from './types'
import { EditSiteModal } from './modals/EditSiteModal'
import { EditPromptModal } from './modals/EditPromptModal'
import { EditTemplateModal } from './modals/EditTemplateModal'
import { AddProviderModal } from './modals/AddProviderModal'
import { AddModelModal } from './modals/AddModelModal'
import { ConfirmModal } from './modals/ConfirmModal'
import { getAnalysisTemplates, getTemplateById, getEffectiveTemplate } from './ai/templates'
import { t, setLocale, SupportedLocale } from './i18n'

export class StargateSettingTab extends PluginSettingTab {
    plugin: StargatePlugin

    constructor(app: App, plugin: StargatePlugin) {
        super(app, plugin)
        this.plugin = plugin
    }

    display(): void {
        const { containerEl } = this
        containerEl.empty()

        new Setting(containerEl).setName(t().settings.title).setHeading()

        // ── 언어 설정 ──
        this.displayLanguageSection(containerEl)

        // ── 브라우저 설정 ──
        this.displayPinnedSitesSection(containerEl)

        // ── AI 설정 (Desktop only) ──
        if (!Platform.isMobileApp) {
            this.displayAISettingsSection(containerEl)
        }

        // ── 분석 템플릿 ──
        this.displayAnalysisTemplatesSection(containerEl)

        // ── 저장된 프롬프트 ──
        this.displaySavedPromptsSection(containerEl)
    }

    /**
     * 언어 설정 섹션
     */
    private displayLanguageSection(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName(t().settings.language)
            .setDesc(t().settings.languageDesc)
            .addDropdown(dropdown => {
                dropdown.addOption('auto', t().settings.languageAuto)
                dropdown.addOption('ko', t().settings.languageKo)
                dropdown.addOption('en', t().settings.languageEn)
                dropdown.setValue(this.plugin.settings.language)
                dropdown.onChange(async (value) => {
                    this.plugin.settings.language = value as SupportedLocale
                    setLocale(value as SupportedLocale)
                    await this.plugin.saveSettings()
                    this.display() // UI 즉시 갱신
                })
            })
    }

    /**
     * 고정 사이트 섹션
     */
    private displayPinnedSitesSection(containerEl: HTMLElement): void {
        new Setting(containerEl).setName(t().settings.browserSettings).setHeading()

        // 세션 공유 설정
        new Setting(containerEl)
            .setName(t().settings.sharedSession)
            .setDesc(t().settings.sharedSessionDesc)
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.sharedSession)
                toggle.onChange(async (value) => {
                    this.plugin.settings.sharedSession = value
                    await this.plugin.saveSettings()
                    new Notice(t().notice.sessionModeChanged)
                })
            })

        new Setting(containerEl).setName(t().settings.pinnedSites).setHeading()
        containerEl.createEl('p', {
            text: t().settings.pinnedSitesDesc,
            cls: 'setting-item-description'
        })

        const pinnedSitesContainer = containerEl.createDiv({ cls: 'pinned-sites-container' })

        for (const site of this.plugin.settings.pinnedSites) {
            this.createPinnedSiteItem(pinnedSitesContainer, site)
        }

        new Setting(containerEl)
            .setName(t().settings.addSiteCount(this.plugin.settings.pinnedSites.length))
            .setDesc(t().settings.addSiteDesc)
            .addButton((button) => {
                button
                    .setButtonText(t().settings.addSite)
                    .onClick(() => this.showAddSiteModal())
            })
    }

    private createPinnedSiteItem(container: HTMLElement, site: PinnedSite): void {
        new Setting(container)
            .setName(site.name)
            .setDesc(site.url)
            .addButton((button) => {
                button.setButtonText(t().common.edit).onClick(() => this.showEditSiteModal(site))
            })
            .addButton((button) => {
                button
                    .setButtonText(t().common.delete)
                    .setWarning()
                    .onClick(() => {
                        ConfirmModal.open(this.app, t().notice.deleteConfirm(site.name), async () => {
                            await this.plugin.removePinnedSite(site.id)
                            this.display()
                        })
                    })
            })
    }

    private showAddSiteModal(): void {
        new EditSiteModal(this.app, {
            onSubmit: async (name, url) => {
                const success = await this.plugin.addPinnedSite({ name, url })
                if (success) {
                    new Notice(t().notice.siteAdded(name))
                    this.display()
                } else {
                    new Notice(t().notice.siteMaxReached)
                }
            }
        }).open()
    }

    private showEditSiteModal(site: PinnedSite): void {
        new EditSiteModal(this.app, {
            site,
            onSubmit: async (name, url) => {
                await this.plugin.updatePinnedSite(site.id, { name, url })
                new Notice(t().notice.siteUpdated(name))
                this.display()
            }
        }).open()
    }

    /**
     * AI 설정 섹션 (v2 - 동적 제공자/모델)
     */
    private displayAISettingsSection(containerEl: HTMLElement): void {
        new Setting(containerEl).setName(t().settings.aiSettings).setHeading()

        const { providers, models, defaultProviderId, defaultModelId } = this.plugin.settings

        // ── 기본 제공자/모델 선택 ──
        const defaultProvider = providers.find(p => p.id === defaultProviderId)
        const enabledModels = models.filter(m => m.enabled)

        // 기본 제공자
        new Setting(containerEl)
            .setName(t().settings.defaultProvider)
            .setDesc(t().settings.defaultProviderDesc)
            .addDropdown(dropdown => {
                for (const provider of providers) {
                    const status = provider.apiKey || provider.authType === 'none'
                        ? ''
                        : ` (${t().settings.apiKeyStatus.notConfigured})`
                    dropdown.addOption(provider.id, `${provider.name}${status}`)
                }
                dropdown.setValue(defaultProviderId)
                dropdown.onChange(async (value) => {
                    this.plugin.settings.defaultProviderId = value
                    // 해당 제공자의 첫 번째 모델로 기본 모델 변경
                    const providerModels = models.filter(m => m.providerId === value && m.enabled)
                    if (providerModels.length > 0) {
                        this.plugin.settings.defaultModelId = providerModels[0].id
                    }
                    await this.plugin.saveSettings()
                    this.display()
                })
            })

        // 기본 모델
        const providerModels = enabledModels.filter(m => m.providerId === defaultProviderId)
        new Setting(containerEl)
            .setName(t().settings.defaultModel)
            .setDesc(t().settings.defaultModelDesc)
            .addDropdown(dropdown => {
                for (const model of providerModels) {
                    dropdown.addOption(model.id, model.name)
                }
                if (providerModels.length === 0) {
                    dropdown.addOption('', t().common.none)
                }
                dropdown.setValue(defaultModelId)
                dropdown.onChange(async (value) => {
                    this.plugin.settings.defaultModelId = value
                    await this.plugin.saveSettings()
                })
            })

        // 연결 테스트
        if (defaultProvider) {
            new Setting(containerEl)
                .setName(t().settings.testConnection)
                .addButton(button => {
                    button.setButtonText(t().common.test).onClick(async () => {
                        button.setDisabled(true)
                        button.setButtonText(t().common.testing)
                        try {
                            const ok = await this.plugin.aiService.testConnection(
                                defaultProviderId,
                                defaultModelId,
                            )
                            new Notice(ok ? t().notice.connectionSuccess : t().notice.connectionFailed)
                            button.setButtonText(ok ? t().common.success : t().common.failure)
                        } catch {
                            new Notice(t().notice.connectionFailed)
                            button.setButtonText(t().common.failure)
                        }
                        button.setDisabled(false)
                        window.setTimeout(() => { button.setButtonText(t().common.test) }, 3000)
                    })
                })
        }

        // ── 제공자 관리 ──
        new Setting(containerEl).setName(t().settings.providerManagement).setHeading()

        const providersContainer = containerEl.createDiv({ cls: 'providers-container' })

        for (const provider of providers) {
            const hasKey = provider.apiKey || provider.authType === 'none'
            const isDefault = provider.id === defaultProviderId
            const statusText = hasKey
                ? t().settings.apiKeyStatus.configured
                : t().settings.apiKeyStatus.notConfigured
            const nameText = `${provider.name}${isDefault ? ` (${t().common.default})` : ''}`

            const setting = new Setting(providersContainer)
                .setName(nameText)
                .setDesc(statusText)
                .addButton(button => {
                    button.setIcon('pencil').setTooltip(t().common.edit).onClick(() => {
                        new AddProviderModal(
                            this.app,
                            async (result) => {
                                await this.plugin.upsertProvider(result)
                                new Notice(t().notice.providerUpdated(result.name))
                                this.display()
                            },
                            providers.map(p => p.id),
                            provider,
                        ).open()
                    })
                })

            if (!provider.isBuiltIn) {
                setting.addButton(button => {
                    button.setIcon('trash').setWarning().setTooltip(t().common.delete).onClick(() => {
                        ConfirmModal.open(this.app, t().notice.deleteConfirm(provider.name), async () => {
                            await this.plugin.removeProvider(provider.id)
                            new Notice(t().notice.providerDeleted(provider.name))
                            this.display()
                        })
                    })
                })
            }
        }

        // 제공자 추가 버튼
        new Setting(containerEl).addButton(button => {
            button.setButtonText(t().settings.addProvider).setCta().onClick(() => {
                new AddProviderModal(
                    this.app,
                    async (result) => {
                        await this.plugin.upsertProvider(result)
                        new Notice(t().notice.providerAdded(result.name))
                        this.display()
                    },
                    providers.map(p => p.id),
                ).open()
            })
        })

        // ── 모델 관리 ──
        new Setting(containerEl).setName(t().settings.modelManagement).setHeading()

        const modelsContainer = containerEl.createDiv({ cls: 'models-container' })

        for (const model of models) {
            const provider = providers.find(p => p.id === model.providerId)
            const isDefault = model.id === defaultModelId
            const hasDedicatedKey = !!model.apiKey
            const nameText = `${isDefault ? '★ ' : ''}${model.name}`
            const descParts = [provider?.name || model.providerId]
            if (hasDedicatedKey) descParts.push(t().settings.dedicatedKey)
            if (!model.enabled) descParts.push(t().common.disabled)

            const setting = new Setting(modelsContainer)
                .setName(nameText)
                .setDesc(descParts.join(' | '))
                .addButton(button => {
                    button.setIcon('pencil').setTooltip(t().common.edit).onClick(() => {
                        new AddModelModal(
                            this.app,
                            providers,
                            async (result, originalId) => {
                                await this.plugin.upsertModel(result, originalId)
                                new Notice(t().notice.modelUpdated(result.name))
                                this.display()
                            },
                            models.map(m => m.id),
                            model,
                            this.plugin.aiService,
                        ).open()
                    })
                })

            if (!isDefault) {
                setting.addButton(button => {
                    button.setIcon('star').setTooltip(t().settings.setAsDefault).onClick(async () => {
                        this.plugin.settings.defaultProviderId = model.providerId
                        this.plugin.settings.defaultModelId = model.id
                        await this.plugin.saveSettings()
                        this.display()
                    })
                })
            }

            setting.addToggle(toggle => {
                toggle.setValue(model.enabled).onChange(async (value) => {
                    model.enabled = value
                    await this.plugin.saveSettings()
                    this.display()
                })
            })

            setting.addButton(button => {
                button.setIcon('trash').setWarning().setTooltip(t().common.delete).onClick(() => {
                    ConfirmModal.open(this.app, t().notice.deleteConfirm(model.name), async () => {
                        await this.plugin.removeModel(model.id)
                        new Notice(t().notice.modelDeleted(model.name))
                        this.display()
                    })
                })
            })
        }

        // 모델 추가 버튼
        new Setting(containerEl).addButton(button => {
            button.setButtonText(t().settings.addModel).setCta().onClick(() => {
                new AddModelModal(
                    this.app,
                    providers,
                    async (result) => {
                        await this.plugin.upsertModel(result)
                        new Notice(t().notice.modelAdded(result.name))
                        this.display()
                    },
                    models.map(m => m.id),
                    undefined,
                    this.plugin.aiService,
                ).open()
            })
        })

        // ── 글로벌 AI 설정 ──
        new Setting(containerEl).setName(t().settings.aiSettings).setHeading()

        // Max Tokens
        new Setting(containerEl)
            .setName(t().settings.maxTokens)
            .setDesc(t().settings.maxTokensDesc)
            .addText((text) => {
                text
                    .setPlaceholder('64000')
                    .setValue(String(this.plugin.settings.aiGlobal.maxTokens || 64000))
                    .onChange(async (value) => {
                        const numValue = parseInt(value, 10)
                        this.plugin.settings.aiGlobal.maxTokens = isNaN(numValue) ? 64000 : numValue
                        await this.plugin.saveSettings()
                    })
                text.inputEl.type = 'number'
                text.inputEl.min = '1000'
                text.inputEl.max = '200000'
            })

        // Default Language
        new Setting(containerEl)
            .setName(t().settings.defaultLanguage)
            .setDesc(t().settings.defaultLanguageDesc)
            .addDropdown((dropdown) => {
                dropdown.addOption('ko', 'Korean')
                dropdown.addOption('en', 'English')
                dropdown.addOption('ja', 'Japanese')
                dropdown.addOption('zh', 'Chinese')
                dropdown.setValue(this.plugin.settings.aiGlobal.defaultLanguage)
                dropdown.onChange(async (value) => {
                    this.plugin.settings.aiGlobal.defaultLanguage = value
                    await this.plugin.saveSettings()
                })
            })

        // Default Template
        new Setting(containerEl)
            .setName(t().settings.defaultTemplate)
            .setDesc(t().settings.defaultTemplateDesc)
            .addDropdown((dropdown) => {
                for (const template of getAnalysisTemplates()) {
                    dropdown.addOption(template.id, `${template.icon} ${template.name}`)
                }
                dropdown.setValue(this.plugin.settings.aiGlobal.defaultTemplate)
                dropdown.onChange(async (value) => {
                    this.plugin.settings.aiGlobal.defaultTemplate = value as TemplateType
                    await this.plugin.saveSettings()
                })
            })

        // Notes Folder
        new Setting(containerEl)
            .setName(t().settings.notesFolder)
            .setDesc(t().settings.notesFolderDesc)
            .addText((text) => {
                text
                    .setPlaceholder('Clippings')
                    .setValue(this.plugin.settings.aiGlobal.notesFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.aiGlobal.notesFolder = value || 'Clippings'
                        await this.plugin.saveSettings()
                    })
            })

        // Note Template
        this.displayNoteTemplateSection(containerEl)
    }

    /**
     * 노트 템플릿 섹션
     */
    private displayNoteTemplateSection(containerEl: HTMLElement): void {
        new Setting(containerEl).setName(t().settings.noteTemplate).setHeading()

        const descEl = containerEl.createDiv({ cls: 'setting-item-description stargate-template-help' })

        const appendVariableList = (variables: [string, string][]): void => {
            const listEl = descEl.createEl('ul')
            for (const [name, description] of variables) {
                const itemEl = listEl.createEl('li')
                itemEl.createEl('code', { text: name })
                itemEl.appendText(` - ${description}`)
            }
        }

        descEl.createEl('p', { text: `${t().settings.templateVariables}:` })
        appendVariableList([
            ['{{title}}', 'Note title'],
            ['{{source}}', 'Source URL'],
            ['{{date}}', 'Creation date (ISO format)'],
            ['{{template}}', 'Analysis template name'],
            ['{{provider}}', 'AI provider used'],
            ['{{model}}', 'AI model used'],
            ['{{content}}', 'Analysis result'],
            ['{{original}}', 'Original content (if included)'],
        ])

        descEl.createEl('p').createEl('strong', { text: 'YouTube variables:' })
        appendVariableList([
            ['{{channel}}', 'Channel name'],
            ['{{duration}}', 'Video duration'],
            ['{{videoType}}', 'Video type'],
            ['{{videoTags}}', 'Video tags'],
        ])

        new Setting(containerEl)
            .setName(t().settings.noteTemplateDesc)

        const textareaEl = containerEl.createEl('textarea', {
            cls: 'stargate-template-editor'
        })
        textareaEl.value = this.plugin.settings.aiGlobal.noteTemplate || DEFAULT_NOTE_TEMPLATE
        textareaEl.rows = 15
        textareaEl.addEventListener('change', (e) => {
            this.plugin.settings.aiGlobal.noteTemplate = (e.target as HTMLTextAreaElement).value
            void this.plugin.saveSettings().then(() => {
                new Notice(t().notice.templateSaved)
            })
        })

        new Setting(containerEl)
            .setName('')
            .addButton((button) => {
                button.setButtonText(t().settings.resetToDefault).onClick(() => {
                    ConfirmModal.open(this.app, t().notice.resetTemplateConfirm, async () => {
                        this.plugin.settings.aiGlobal.noteTemplate = DEFAULT_NOTE_TEMPLATE
                        await this.plugin.saveSettings()
                        textareaEl.value = DEFAULT_NOTE_TEMPLATE
                        new Notice(t().notice.templateReset)
                    })
                })
            })
    }

    /**
     * 분석 템플릿 섹션
     */
    private displayAnalysisTemplatesSection(containerEl: HTMLElement): void {
        new Setting(containerEl).setName(t().settings.analysisTemplates).setHeading()
        containerEl.createEl('p', {
            text: t().settings.analysisTemplatesDesc,
            cls: 'setting-item-description'
        })

        const templatesContainer = containerEl.createDiv({ cls: 'analysis-templates-container' })

        for (const template of getAnalysisTemplates()) {
            const isCustomized = this.plugin.settings.customTemplates.some(t => t.id === template.id)

            new Setting(templatesContainer)
                .setName(`${template.icon} ${template.name}${isCustomized ? ' ★' : ''}`)
                .setDesc(template.description)
                .addButton((button) => {
                    button.setButtonText(t().common.edit).onClick(() => this.editTemplate(template.id))
                })
                .addButton((button) => {
                    button
                        .setButtonText(t().common.reset)
                        .setDisabled(!isCustomized)
                        .onClick(() => {
                            ConfirmModal.open(this.app, t().notice.resetConfirm(template.name), async () => {
                                await this.resetTemplate(template.id)
                                this.display()
                            })
                        })
                })
        }

        new Setting(containerEl)
            .setName(t().settings.resetAllTemplates)
            .setDesc(t().settings.resetAllTemplatesDesc)
            .addButton((button) => {
                button
                    .setButtonText(t().common.resetAll)
                    .setWarning()
                    .setDisabled(this.plugin.settings.customTemplates.length === 0)
                    .onClick(() => {
                        ConfirmModal.open(this.app, t().notice.resetAllConfirm, async () => {
                            this.plugin.settings.customTemplates = []
                            await this.plugin.saveSettings()
                            new Notice(t().notice.allTemplatesReset)
                            this.display()
                        })
                    })
            })
    }

    private editTemplate(id: TemplateType): void {
        const defaultTemplate = getTemplateById(id)
        if (!defaultTemplate) return

        const effectiveTemplate = getEffectiveTemplate(id, this.plugin.settings.customTemplates)

        new EditTemplateModal(this.app, {
            template: effectiveTemplate!,
            onSubmit: async (systemPrompt, userPromptTemplate) => {
                this.plugin.settings.customTemplates = this.plugin.settings.customTemplates.filter(t => t.id !== id)
                this.plugin.settings.customTemplates.push({ id, systemPrompt, userPromptTemplate })
                await this.plugin.saveSettings()
                new Notice(t().notice.templateSaved)
                this.display()
            }
        }).open()
    }

    private async resetTemplate(id: TemplateType): Promise<void> {
        this.plugin.settings.customTemplates = this.plugin.settings.customTemplates.filter(t => t.id !== id)
        await this.plugin.saveSettings()
        new Notice(t().notice.templateReset)
    }

    /**
     * 저장된 프롬프트 섹션
     */
    private displaySavedPromptsSection(containerEl: HTMLElement): void {
        new Setting(containerEl).setName(t().settings.savedPrompts).setHeading()
        containerEl.createEl('p', {
            text: t().settings.savedPromptsDesc,
            cls: 'setting-item-description'
        })

        const promptsContainer = containerEl.createDiv({ cls: 'saved-prompts-container' })

        for (const savedPrompt of this.plugin.settings.savedPrompts) {
            const isFullTemplate = !!savedPrompt.systemPrompt
            const typeLabel = isFullTemplate
                ? `${savedPrompt.icon || '⭐'} ${t().settings.fullTemplate}`
                : `📝 ${t().settings.quickPrompt}`
            const desc = savedPrompt.prompt.substring(0, 50) + (savedPrompt.prompt.length > 50 ? '...' : '')

            new Setting(promptsContainer)
                .setName(`${savedPrompt.name} (${typeLabel})`)
                .setDesc(desc)
                .addButton((button) => {
                    button.setButtonText(t().common.edit).onClick(() => this.editPrompt(savedPrompt.id))
                })
                .addButton((button) => {
                    button
                        .setButtonText(t().common.delete)
                        .setWarning()
                        .onClick(() => {
                            ConfirmModal.open(this.app, t().notice.deleteConfirm(savedPrompt.name), async () => {
                                await this.plugin.removePrompt(savedPrompt.id)
                                this.display()
                            })
                        })
                })
        }

        new Setting(containerEl).setName('').addButton((button) => {
            button.setButtonText(t().settings.addPrompt).onClick(() => this.addNewPrompt())
        })
    }

    private editPrompt(id: string): void {
        const prompt = this.plugin.settings.savedPrompts.find((p) => p.id === id)
        if (!prompt) return

        new EditPromptModal(this.app, {
            prompt,
            onSubmit: async (name, promptText, systemPrompt, icon) => {
                await this.plugin.updatePrompt(id, {
                    name,
                    prompt: promptText,
                    systemPrompt: systemPrompt || undefined,
                    icon: icon || undefined
                })
                new Notice(t().notice.promptUpdated)
                this.display()
            }
        }).open()
    }

    private addNewPrompt(): void {
        new EditPromptModal(this.app, {
            onSubmit: async (name, promptText, systemPrompt, icon) => {
                await this.plugin.savePrompt(name, promptText, systemPrompt, icon)
                new Notice(t().notice.promptSaved)
                this.display()
            }
        }).open()
    }
}
