import { App, Modal, Setting, Notice } from 'obsidian'

interface NewTabModalOptions {
    onSubmit: (url: string) => void
}

export class NewTabModal extends Modal {
    private url: string = ''
    private options: NewTabModalOptions

    constructor(app: App, options: NewTabModalOptions) {
        super(app)
        this.options = options
    }

    onOpen() {
        const { contentEl } = this

        contentEl.empty()
        contentEl.addClass('stargate-new-tab-modal')

        // 제목
        contentEl.createEl('h2', { text: 'Open New Tab' })

        // URL 입력
        new Setting(contentEl)
            .setName('URL')
            .setDesc('Enter the website URL')
            .addText((text) => {
                text
                    .setPlaceholder('https://example.com')
                    .setValue(this.url)
                    .onChange((value) => {
                        this.url = value
                    })
                text.inputEl.focus()

                // Enter 키로 제출
                text.inputEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        this.handleSubmit()
                    }
                })
            })

        // 버튼
        const buttonContainer = contentEl.createDiv({ cls: 'stargate-modal-buttons' })

        // 취소 버튼
        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' })
        cancelBtn.onclick = () => this.close()

        // 열기 버튼
        const openBtn = buttonContainer.createEl('button', {
            text: 'Open',
            cls: 'mod-cta'
        })
        openBtn.onclick = () => this.handleSubmit()
    }

    private handleSubmit() {
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

        this.options.onSubmit(normalizedUrl)
        this.close()
    }

    onClose() {
        const { contentEl } = this
        contentEl.empty()
    }
}
