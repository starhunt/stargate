/**
 * 모델 추가/편집 모달
 */

import { App, Modal, Setting, Notice } from 'obsidian'
import { AIModelDefinition, AIProviderDefinition } from '../types'
import { AIService } from '../services/AIService'
import { t } from '../i18n'

export class AddModelModal extends Modal {
    private result: AIModelDefinition
    private providers: AIProviderDefinition[]
    private onSubmit: (result: AIModelDefinition, originalId?: string) => void | Promise<void>
    private isEdit: boolean
    private originalId?: string
    private existingModelIds: string[]
    private aiService?: AIService

    constructor(
        app: App,
        providers: AIProviderDefinition[],
        onSubmit: (result: AIModelDefinition, originalId?: string) => void | Promise<void>,
        existingModelIds: string[],
        editModel?: AIModelDefinition,
        aiService?: AIService,
    ) {
        super(app)
        this.providers = providers
        this.onSubmit = onSubmit
        this.isEdit = !!editModel
        this.originalId = editModel?.id
        this.existingModelIds = existingModelIds
        this.aiService = aiService
        this.result = editModel ? { ...editModel } : {
            id: '',
            name: '',
            providerId: providers[0]?.id || '',
            enabled: true,
            apiKey: '',
        }
    }

    onOpen(): void {
        const { contentEl, modalEl } = this
        modalEl.addClass('stargate-compact-modal')
        contentEl.addClass('stargate-model-modal')

        contentEl.createEl('h2', { text: this.isEdit ? t().modelModal.titleEdit : t().modelModal.titleAdd })

        // 제공자 선택
        new Setting(contentEl)
            .setName(t().modelModal.provider)
            .setDesc(t().modelModal.providerDesc)
            .addDropdown(dropdown => {
                this.providers.forEach(p => {
                    dropdown.addOption(p.id, p.name)
                })
                dropdown.setValue(this.result.providerId)
                dropdown.onChange(value => {
                    this.result.providerId = value
                })
                if (this.isEdit) {
                    dropdown.selectEl.disabled = true
                }
            })

        // 모델 이름
        new Setting(contentEl)
            .setName(t().modelModal.name)
            .setDesc(t().modelModal.nameDesc)
            .addText(text => {
                text
                    .setPlaceholder(t().modelModal.namePlaceholder)
                    .setValue(this.result.name)
                    .onChange(value => {
                        this.result.name = value
                    })
            })

        // 모델 ID
        new Setting(contentEl)
            .setName(t().modelModal.modelId)
            .setDesc(t().modelModal.modelIdDesc)
            .addText(text => {
                text
                    .setPlaceholder(t().modelModal.modelIdPlaceholder)
                    .setValue(this.result.id)
                    .onChange(value => {
                        this.result.id = value
                    })
            })

        // API 키 (선택) + 테스트 버튼
        const apiKeySetting = new Setting(contentEl)
            .setName(t().modelModal.apiKey)
            .setDesc(t().modelModal.apiKeyDesc)
            .addText(text => {
                text
                    .setPlaceholder(t().modelModal.apiKeyPlaceholder)
                    .setValue(this.result.apiKey || '')
                    .onChange(value => {
                        this.result.apiKey = value || undefined
                    })
                text.inputEl.type = 'password'
                text.inputEl.addClass('stargate-input-model-name')
            })

        // 테스트 버튼
        if (this.aiService) {
            apiKeySetting.addButton(button => {
                button.setButtonText(t().common.test).onClick(async () => {
                    if (!this.result.id) {
                        new Notice(t().notice.enterModelId)
                        return
                    }
                    if (!this.result.providerId) {
                        new Notice(t().notice.selectProvider)
                        return
                    }
                    const provider = this.providers.find(p => p.id === this.result.providerId)
                    const effectiveKey = this.result.apiKey || provider?.apiKey
                    if (!effectiveKey && provider?.authType !== 'none') {
                        new Notice(t().notice.apiKeyRequired)
                        return
                    }

                    button.setDisabled(true)
                    button.setButtonText(t().common.testing)
                    try {
                        const ok = await this.aiService!.testConnection(
                            this.result.providerId,
                            this.result.id,
                            this.result.apiKey || undefined,
                        )
                        new Notice(ok ? t().notice.connectionSuccess : t().notice.connectionFailed)
                        button.setButtonText(ok ? t().common.success : t().common.failure)
                    } catch (e) {
                        new Notice(t().notice.errorPrefix(String(e)))
                        button.setButtonText(t().common.failure)
                    }
                    button.setDisabled(false)
                    window.setTimeout(() => { button.setButtonText(t().common.test) }, 3000)
                })
            })
        }

        // 버튼
        const buttonContainer = contentEl.createDiv({ cls: 'stargate-modal-buttons' })

        const saveBtn = buttonContainer.createEl('button', {
            text: t().common.save,
            cls: 'mod-cta',
        })
        saveBtn.onclick = () => {
            if (!this.result.name) {
                new Notice(t().notice.enterModelName)
                return
            }
            if (!this.result.id) {
                new Notice(t().notice.enterModelIdRequired)
                return
            }
            if (!this.result.providerId) {
                new Notice(t().notice.selectProvider)
                return
            }
            const idChanged = this.isEdit && this.result.id !== this.originalId
            if ((!this.isEdit || idChanged) && this.existingModelIds.includes(this.result.id)) {
                new Notice(t().notice.duplicateModelId)
                return
            }
            if (!this.result.apiKey) {
                this.result.apiKey = undefined
            }
            void this.onSubmit(this.result, idChanged ? this.originalId : undefined)
            this.close()
        }

        const cancelBtn = buttonContainer.createEl('button', { text: t().common.cancel })
        cancelBtn.onclick = () => this.close()
    }

    onClose(): void {
        this.contentEl.empty()
    }
}
