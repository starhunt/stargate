import { App, PluginSettingTab, Setting, Notice, Platform } from 'obsidian'
import StargatePlugin from './main'
import { MAX_PINNED_SITES, AI_PROVIDERS } from './constants'
import { AIProviderType, PinnedSite, DEFAULT_NOTE_TEMPLATE, TemplateType, CustomTemplate } from './types'
import { EditSiteModal } from './modals/EditSiteModal'
import { EditPromptModal } from './modals/EditPromptModal'
import { EditTemplateModal } from './modals/EditTemplateModal'
import { ANALYSIS_TEMPLATES, getTemplateById, getEffectiveTemplate } from './ai/templates'

export class StargateSettingTab extends PluginSettingTab {
    plugin: StargatePlugin

    constructor(app: App, plugin: StargatePlugin) {
        super(app, plugin)
        this.plugin = plugin
    }

    display(): void {
        const { containerEl } = this
        containerEl.empty()

        containerEl.createEl('h1', { text: 'Stargate Settings' })

        // ============================================
        // Pinned Sites Section
        // ============================================
        this.displayPinnedSitesSection(containerEl)

        // ============================================
        // AI Settings Section (Desktop only)
        // ============================================
        if (!Platform.isMobileApp) {
            this.displayAISettingsSection(containerEl)
        }

        // ============================================
        // Analysis Templates Section
        // ============================================
        this.displayAnalysisTemplatesSection(containerEl)

        // ============================================
        // Saved Prompts Section
        // ============================================
        this.displaySavedPromptsSection(containerEl)
    }

    /**
     * 고정 사이트 섹션
     */
    private displayPinnedSitesSection(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: 'Pinned Sites' })
        containerEl.createEl('p', {
            text: `Register frequently visited sites (max ${MAX_PINNED_SITES}). These will appear as permanent tabs.`,
            cls: 'setting-item-description'
        })

        const pinnedSitesContainer = containerEl.createDiv({ cls: 'pinned-sites-container' })

        // 등록된 사이트 목록
        for (const site of this.plugin.settings.pinnedSites) {
            this.createPinnedSiteItem(pinnedSitesContainer, site)
        }

        // 사이트 추가 버튼
        const canAdd = this.plugin.settings.pinnedSites.length < MAX_PINNED_SITES
        new Setting(containerEl)
            .setName(`Add Site (${this.plugin.settings.pinnedSites.length}/${MAX_PINNED_SITES})`)
            .setDesc(canAdd ? 'Add a new pinned site' : 'Maximum sites reached')
            .addButton((button) => {
                button
                    .setButtonText('+ Add Site')
                    .setDisabled(!canAdd)
                    .onClick(() => this.showAddSiteModal())
            })
    }

    /**
     * 고정 사이트 아이템 생성
     */
    private createPinnedSiteItem(container: HTMLElement, site: PinnedSite): void {
        new Setting(container)
            .setName(site.name)
            .setDesc(site.url)
            .addButton((button) => {
                button.setButtonText('Edit').onClick(() => this.showEditSiteModal(site))
            })
            .addButton((button) => {
                button
                    .setButtonText('Delete')
                    .setWarning()
                    .onClick(async () => {
                        if (confirm(`Delete "${site.name}"?`)) {
                            await this.plugin.removePinnedSite(site.id)
                            this.display()
                        }
                    })
            })
    }

    /**
     * 사이트 추가 모달
     */
    private showAddSiteModal(): void {
        new EditSiteModal(this.app, {
            onSubmit: async (name, url) => {
                const success = await this.plugin.addPinnedSite({ name, url })
                if (success) {
                    new Notice(`"${name}" added`)
                    this.display()
                } else {
                    new Notice('Maximum sites reached')
                }
            }
        }).open()
    }

    /**
     * 사이트 편집 모달
     */
    private showEditSiteModal(site: PinnedSite): void {
        new EditSiteModal(this.app, {
            site,
            onSubmit: async (name, url) => {
                await this.plugin.updatePinnedSite(site.id, { name, url })
                new Notice(`"${name}" updated`)
                this.display()
            }
        }).open()
    }

    /**
     * AI 설정 섹션
     */
    private displayAISettingsSection(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: 'AI Settings' })

        // Provider 선택
        new Setting(containerEl)
            .setName('Default Provider')
            .setDesc('Select your preferred AI provider')
            .addDropdown((dropdown) => {
                for (const [key, value] of Object.entries(AI_PROVIDERS)) {
                    dropdown.addOption(key, value.name)
                }
                dropdown.setValue(this.plugin.settings.ai.provider)
                dropdown.onChange(async (value) => {
                    this.plugin.settings.ai.provider = value as AIProviderType
                    await this.plugin.saveSettings()
                })
            })

        // Provider별 API Key 및 Model 설정
        for (const [providerId, providerConfig] of Object.entries(AI_PROVIDERS)) {
            const currentKey = this.plugin.settings.ai.apiKeys[providerId as AIProviderType] || ''
            const currentModel = this.plugin.settings.ai.models[providerId as AIProviderType] || providerConfig.defaultModel
            const hasKey = currentKey.length > 0

            // API Key
            new Setting(containerEl)
                .setName(`${providerConfig.name} API Key`)
                .setDesc(hasKey ? '✓ API key configured' : 'Enter your API key')
                .addText((text) => {
                    text
                        .setPlaceholder('sk-...')
                        .setValue(currentKey)
                        .onChange(async (value) => {
                            this.plugin.settings.ai.apiKeys[providerId as AIProviderType] = value
                            await this.plugin.saveSettings()
                        })
                    text.inputEl.type = 'password'
                })

            // Model Name
            new Setting(containerEl)
                .setName(`${providerConfig.name} Model`)
                .setDesc(`Model to use (default: ${providerConfig.defaultModel})`)
                .addText((text) => {
                    text
                        .setPlaceholder(providerConfig.defaultModel)
                        .setValue(currentModel)
                        .onChange(async (value) => {
                            this.plugin.settings.ai.models[providerId as AIProviderType] = value || providerConfig.defaultModel
                            await this.plugin.saveSettings()
                        })
                })
        }

        // Max Tokens
        new Setting(containerEl)
            .setName('Max Tokens')
            .setDesc('Maximum tokens for AI response (default: 64000)')
            .addText((text) => {
                text
                    .setPlaceholder('64000')
                    .setValue(String(this.plugin.settings.ai.maxTokens || 64000))
                    .onChange(async (value) => {
                        const numValue = parseInt(value, 10)
                        this.plugin.settings.ai.maxTokens = isNaN(numValue) ? 64000 : numValue
                        await this.plugin.saveSettings()
                    })
                text.inputEl.type = 'number'
                text.inputEl.min = '1000'
                text.inputEl.max = '200000'
            })

        // Default Language
        new Setting(containerEl)
            .setName('Default Language')
            .setDesc('Language for AI analysis output')
            .addDropdown((dropdown) => {
                dropdown.addOption('ko', 'Korean')
                dropdown.addOption('en', 'English')
                dropdown.addOption('ja', 'Japanese')
                dropdown.addOption('zh', 'Chinese')
                dropdown.setValue(this.plugin.settings.ai.defaultLanguage)
                dropdown.onChange(async (value) => {
                    this.plugin.settings.ai.defaultLanguage = value
                    await this.plugin.saveSettings()
                })
            })

        // Default Template (for Quick Analysis)
        new Setting(containerEl)
            .setName('Default Template')
            .setDesc('Template to use for Quick Analysis shortcut')
            .addDropdown((dropdown) => {
                for (const template of ANALYSIS_TEMPLATES) {
                    dropdown.addOption(template.id, `${template.icon} ${template.name}`)
                }
                dropdown.setValue(this.plugin.settings.ai.defaultTemplate)
                dropdown.onChange(async (value) => {
                    this.plugin.settings.ai.defaultTemplate = value as TemplateType
                    await this.plugin.saveSettings()
                })
            })

        // Notes Folder
        new Setting(containerEl)
            .setName('Notes Folder')
            .setDesc('Folder to save clipped notes')
            .addText((text) => {
                text
                    .setPlaceholder('Clippings')
                    .setValue(this.plugin.settings.ai.notesFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.ai.notesFolder = value || 'Clippings'
                        await this.plugin.saveSettings()
                    })
            })

        // Note Template Section
        this.displayNoteTemplateSection(containerEl)
    }

    /**
     * 노트 템플릿 섹션
     */
    private displayNoteTemplateSection(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Note Template' })

        // 변수 설명
        const descEl = containerEl.createDiv({ cls: 'setting-item-description stargate-template-help' })
        descEl.innerHTML = `
            <p>Available variables:</p>
            <ul>
                <li><code>{{title}}</code> - Note title</li>
                <li><code>{{source}}</code> - Source URL</li>
                <li><code>{{date}}</code> - Creation date (ISO format)</li>
                <li><code>{{template}}</code> - Analysis template name</li>
                <li><code>{{provider}}</code> - AI provider used</li>
                <li><code>{{content}}</code> - Analysis result</li>
                <li><code>{{original}}</code> - Original content (if included)</li>
            </ul>
            <p>Conditional sections: <code>{{#key}}...{{/key}}</code> (shown only if value exists)</p>
        `

        // 템플릿 에디터
        const templateSetting = new Setting(containerEl)
            .setName('Template')
            .setDesc('Customize the note output format')

        const textareaEl = containerEl.createEl('textarea', {
            cls: 'stargate-template-editor'
        })
        textareaEl.value = this.plugin.settings.ai.noteTemplate || DEFAULT_NOTE_TEMPLATE
        textareaEl.rows = 15
        textareaEl.addEventListener('change', async (e) => {
            this.plugin.settings.ai.noteTemplate = (e.target as HTMLTextAreaElement).value
            await this.plugin.saveSettings()
            new Notice('Template saved')
        })

        // 리셋 버튼
        new Setting(containerEl)
            .setName('')
            .addButton((button) => {
                button.setButtonText('Reset to Default').onClick(async () => {
                    if (confirm('Reset template to default?')) {
                        this.plugin.settings.ai.noteTemplate = DEFAULT_NOTE_TEMPLATE
                        await this.plugin.saveSettings()
                        textareaEl.value = DEFAULT_NOTE_TEMPLATE
                        new Notice('Template reset')
                    }
                })
            })
    }

    /**
     * 분석 템플릿 섹션
     */
    private displayAnalysisTemplatesSection(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: 'Analysis Templates' })
        containerEl.createEl('p', {
            text: 'Customize the default analysis templates. Edited templates are marked with ★',
            cls: 'setting-item-description'
        })

        const templatesContainer = containerEl.createDiv({ cls: 'analysis-templates-container' })

        // 모든 기본 템플릿 표시
        for (const template of ANALYSIS_TEMPLATES) {
            const isCustomized = this.plugin.settings.customTemplates.some(t => t.id === template.id)
            const effectiveTemplate = getEffectiveTemplate(template.id, this.plugin.settings.customTemplates)

            new Setting(templatesContainer)
                .setName(`${template.icon} ${template.name}${isCustomized ? ' ★' : ''}`)
                .setDesc(template.description)
                .addButton((button) => {
                    button.setButtonText('Edit').onClick(() => this.editTemplate(template.id))
                })
                .addButton((button) => {
                    button
                        .setButtonText('Reset')
                        .setDisabled(!isCustomized)
                        .onClick(async () => {
                            if (confirm(`Reset "${template.name}" to default?`)) {
                                await this.resetTemplate(template.id)
                                this.display()
                            }
                        })
                })
        }

        // 전체 리셋 버튼
        new Setting(containerEl)
            .setName('Reset All Templates')
            .setDesc('Reset all customized templates to defaults')
            .addButton((button) => {
                button
                    .setButtonText('Reset All')
                    .setWarning()
                    .setDisabled(this.plugin.settings.customTemplates.length === 0)
                    .onClick(async () => {
                        if (confirm('Reset all templates to defaults?')) {
                            this.plugin.settings.customTemplates = []
                            await this.plugin.saveSettings()
                            new Notice('All templates reset')
                            this.display()
                        }
                    })
            })
    }

    /**
     * 템플릿 편집
     */
    private editTemplate(id: TemplateType): void {
        const defaultTemplate = getTemplateById(id)
        if (!defaultTemplate) return

        const effectiveTemplate = getEffectiveTemplate(id, this.plugin.settings.customTemplates)

        new EditTemplateModal(this.app, {
            template: effectiveTemplate!,
            onSubmit: async (systemPrompt, userPromptTemplate) => {
                // 기존 커스텀 템플릿 제거
                this.plugin.settings.customTemplates = this.plugin.settings.customTemplates.filter(t => t.id !== id)

                // 새 커스텀 템플릿 추가
                this.plugin.settings.customTemplates.push({
                    id,
                    systemPrompt,
                    userPromptTemplate
                })

                await this.plugin.saveSettings()
                new Notice(`"${defaultTemplate.name}" template updated`)
                this.display()
            }
        }).open()
    }

    /**
     * 템플릿 리셋
     */
    private async resetTemplate(id: TemplateType): Promise<void> {
        this.plugin.settings.customTemplates = this.plugin.settings.customTemplates.filter(t => t.id !== id)
        await this.plugin.saveSettings()
        new Notice('Template reset to default')
    }

    /**
     * 저장된 프롬프트 섹션
     */
    private displaySavedPromptsSection(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: 'Saved Prompts' })
        containerEl.createEl('p', {
            text: 'Custom prompts for AI analysis. Full templates (with system prompt) appear in template buttons area.',
            cls: 'setting-item-description'
        })

        const promptsContainer = containerEl.createDiv({ cls: 'saved-prompts-container' })

        // 저장된 프롬프트 목록
        for (const savedPrompt of this.plugin.settings.savedPrompts) {
            const isFullTemplate = !!savedPrompt.systemPrompt
            const typeLabel = isFullTemplate ? `${savedPrompt.icon || '⭐'} Full Template` : '📝 Quick Prompt'
            const desc = savedPrompt.prompt.substring(0, 50) + (savedPrompt.prompt.length > 50 ? '...' : '')

            new Setting(promptsContainer)
                .setName(`${savedPrompt.name} (${typeLabel})`)
                .setDesc(desc)
                .addButton((button) => {
                    button.setButtonText('Edit').onClick(() => this.editPrompt(savedPrompt.id))
                })
                .addButton((button) => {
                    button
                        .setButtonText('Delete')
                        .setWarning()
                        .onClick(async () => {
                            if (confirm(`Delete "${savedPrompt.name}"?`)) {
                                await this.plugin.removePrompt(savedPrompt.id)
                                this.display()
                            }
                        })
                })
        }

        // 프롬프트 추가 버튼
        new Setting(containerEl).setName('').addButton((button) => {
            button.setButtonText('+ Add Prompt').onClick(() => this.addNewPrompt())
        })
    }

    /**
     * 프롬프트 편집
     */
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
                new Notice('Prompt updated')
                this.display()
            }
        }).open()
    }

    /**
     * 새 프롬프트 추가
     */
    private addNewPrompt(): void {
        new EditPromptModal(this.app, {
            onSubmit: async (name, promptText, systemPrompt, icon) => {
                await this.plugin.savePrompt(name, promptText, systemPrompt, icon)
                new Notice('Prompt saved')
                this.display()
            }
        }).open()
    }
}
