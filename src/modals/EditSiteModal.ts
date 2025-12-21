import { App, Modal, Setting, Notice } from 'obsidian'
import { PinnedSite } from '../types'

interface EditSiteModalOptions {
    site?: PinnedSite  // 편집 시 기존 사이트 정보
    onSubmit: (name: string, url: string) => void
}

export class EditSiteModal extends Modal {
    private name: string = ''
    private url: string = ''
    private options: EditSiteModalOptions

    constructor(app: App, options: EditSiteModalOptions) {
        super(app)
        this.options = options

        // 편집 모드인 경우 기존 값 설정
        if (options.site) {
            this.name = options.site.name
            this.url = options.site.url
        }
    }

    onOpen() {
        const { contentEl } = this
        const isEdit = !!this.options.site

        contentEl.empty()
        contentEl.addClass('stargate-edit-site-modal')

        // 제목
        contentEl.createEl('h2', { text: isEdit ? 'Edit Site' : 'Add Site' })

        // 사이트 이름
        new Setting(contentEl)
            .setName('Name')
            .setDesc('Display name for the tab')
            .addText((text) => {
                text
                    .setPlaceholder('Google')
                    .setValue(this.name)
                    .onChange((value) => {
                        this.name = value
                    })
                text.inputEl.focus()
            })

        // URL
        new Setting(contentEl)
            .setName('URL')
            .setDesc('Website URL (must start with http:// or https://)')
            .addText((text) => {
                text
                    .setPlaceholder('https://google.com')
                    .setValue(this.url)
                    .onChange((value) => {
                        this.url = value
                    })
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

    private handleSubmit() {
        // 유효성 검사
        if (!this.name.trim()) {
            new Notice('Please enter a name')
            return
        }

        if (!this.url.trim()) {
            new Notice('Please enter a URL')
            return
        }

        // URL 정규화
        let normalizedUrl = this.url.trim()
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = 'https://' + normalizedUrl
        }

        // URL 유효성 검사
        try {
            new URL(normalizedUrl)
        } catch {
            new Notice('Please enter a valid URL')
            return
        }

        this.options.onSubmit(this.name.trim(), normalizedUrl)
        this.close()
    }

    onClose() {
        const { contentEl } = this
        contentEl.empty()
    }
}
