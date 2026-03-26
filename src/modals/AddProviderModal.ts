/**
 * 제공자 추가/편집 모달
 */

import { App, Modal, Setting, Notice } from 'obsidian'
import { AIProviderDefinition, AIAuthType, AIApiFormat } from '../types'
import { BUILT_IN_PROVIDERS } from '../constants'
import { t } from '../i18n'

export class AddProviderModal extends Modal {
    private result: AIProviderDefinition
    private onSubmit: (result: AIProviderDefinition) => void
    private isEdit: boolean
    private existingIds: string[]

    constructor(
        app: App,
        onSubmit: (result: AIProviderDefinition) => void,
        existingIds: string[],
        editProvider?: AIProviderDefinition,
    ) {
        super(app)
        this.onSubmit = onSubmit
        this.isEdit = !!editProvider
        this.existingIds = existingIds
        this.result = editProvider ? { ...editProvider } : {
            id: '',
            name: '',
            baseUrl: '',
            apiKey: '',
            authType: 'bearer' as AIAuthType,
            apiFormat: 'openai' as AIApiFormat,
            isBuiltIn: false,
        }
    }

    onOpen(): void {
        const { contentEl, modalEl } = this
        modalEl.addClass('stargate-compact-modal')
        contentEl.addClass('stargate-provider-modal')

        contentEl.createEl('h2', { text: this.isEdit ? t().providerModal.titleEdit : t().providerModal.titleAdd })

        // 프리셋 선택 (신규 추가 시에만)
        if (!this.isEdit) {
            new Setting(contentEl)
                .setName(t().providerModal.provider)
                .setDesc(t().providerModal.providerDesc)
                .addDropdown(dropdown => {
                    dropdown.addOption('custom', t().common.custom)
                    BUILT_IN_PROVIDERS.forEach(p => {
                        if (!this.existingIds.includes(p.id)) {
                            dropdown.addOption(p.id, p.name)
                        }
                    })
                    dropdown.onChange(value => {
                        if (value === 'custom') {
                            this.result = {
                                id: '',
                                name: '',
                                baseUrl: '',
                                apiKey: this.result.apiKey,
                                authType: 'bearer',
                                apiFormat: 'openai',
                                isBuiltIn: false,
                            }
                        } else {
                            const preset = BUILT_IN_PROVIDERS.find(p => p.id === value)
                            if (preset) {
                                this.result = {
                                    ...preset,
                                    apiKey: this.result.apiKey,
                                }
                            }
                        }
                        this.renderForm(contentEl)
                    })
                })
        }

        this.renderForm(contentEl)
    }

    private renderForm(contentEl: HTMLElement): void {
        const formContainer = contentEl.querySelector('.stargate-provider-form')
        if (formContainer) {
            formContainer.remove()
        }

        const form = contentEl.createDiv({ cls: 'stargate-provider-form' })

        // 제공자 이름
        new Setting(form)
            .setName(t().providerModal.name)
            .setDesc(t().providerModal.nameDesc)
            .addText(text => {
                text
                    .setPlaceholder(t().providerModal.namePlaceholder)
                    .setValue(this.result.name)
                    .onChange(value => {
                        this.result.name = value
                        if (!this.result.isBuiltIn && !this.isEdit) {
                            this.result.id = value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
                        }
                    })
                if (this.result.isBuiltIn) {
                    text.inputEl.disabled = true
                }
            })

        // 기본 URL
        new Setting(form)
            .setName(t().providerModal.baseUrl)
            .setDesc(t().providerModal.baseUrlDesc)
            .addText(text => {
                text
                    .setPlaceholder(t().providerModal.baseUrlPlaceholder)
                    .setValue(this.result.baseUrl)
                    .onChange(value => {
                        this.result.baseUrl = value
                    })
            })

        // API 키 (authType: 'none'이면 숨김)
        if (this.result.authType !== 'none') {
            new Setting(form)
                .setName(t().providerModal.apiKey)
                .setDesc(t().providerModal.apiKeyDesc)
                .addText(text => {
                    text
                        .setPlaceholder(t().providerModal.apiKeyPlaceholder)
                        .setValue(this.result.apiKey)
                        .onChange(value => {
                            this.result.apiKey = value
                        })
                    text.inputEl.type = 'password'
                })
        }

        // 인증 방식 (커스텀 제공자만)
        if (!this.result.isBuiltIn) {
            new Setting(form)
                .setName(t().providerModal.authType)
                .setDesc(t().providerModal.authTypeDesc)
                .addDropdown(dropdown => {
                    dropdown.addOption('bearer', t().providerModal.authBearer)
                    dropdown.addOption('x-api-key', t().providerModal.authXApiKey)
                    dropdown.addOption('none', t().providerModal.authNone)
                    dropdown.setValue(this.result.authType)
                    dropdown.onChange(value => {
                        this.result.authType = value as AIAuthType
                        this.renderForm(contentEl)
                    })
                })

            // API 형식
            new Setting(form)
                .setName(t().providerModal.apiFormat)
                .setDesc(t().providerModal.apiFormatDesc)
                .addDropdown(dropdown => {
                    dropdown.addOption('openai', t().providerModal.apiFormatOpenAI)
                    dropdown.addOption('anthropic', t().providerModal.apiFormatAnthropic)
                    dropdown.setValue(this.result.apiFormat)
                    dropdown.onChange(value => {
                        this.result.apiFormat = value as AIApiFormat
                    })
                })
        }

        // 버튼
        const buttonContainer = form.createDiv({ cls: 'stargate-modal-buttons' })

        const saveBtn = buttonContainer.createEl('button', {
            text: t().common.save,
            cls: 'mod-cta',
        })
        saveBtn.onclick = () => {
            if (!this.result.name) {
                new Notice(t().notice.enterProviderName)
                return
            }
            if (!this.result.baseUrl) {
                new Notice(t().notice.enterBaseUrl)
                return
            }
            if (!this.isEdit && !this.result.id) {
                this.result.id = this.result.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
            }
            if (!this.isEdit && this.existingIds.includes(this.result.id)) {
                new Notice(t().notice.duplicateProviderId)
                return
            }
            this.onSubmit(this.result)
            this.close()
        }

        const cancelBtn = buttonContainer.createEl('button', { text: t().common.cancel })
        cancelBtn.onclick = () => this.close()
    }

    onClose(): void {
        this.contentEl.empty()
    }
}
