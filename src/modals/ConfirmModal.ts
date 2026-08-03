/**
 * 확인 모달
 *
 * 브라우저 confirm()은 Obsidian 플러그인 가이드라인에서 금지되어 있고
 * 팝아웃 창/모바일에서 동작이 일관되지 않아 Modal로 대체한다.
 */

import { App, Modal } from 'obsidian'
import { t } from '../i18n'

export class ConfirmModal extends Modal {
    private message: string
    private onConfirm: () => void | Promise<void>
    private confirmed = false

    constructor(app: App, message: string, onConfirm: () => void | Promise<void>) {
        super(app)
        this.message = message
        this.onConfirm = onConfirm
    }

    /**
     * confirm() 대체 헬퍼 — 확인을 누른 경우에만 콜백이 실행된다
     */
    static open(app: App, message: string, onConfirm: () => void | Promise<void>): void {
        new ConfirmModal(app, message, onConfirm).open()
    }

    onOpen(): void {
        const { contentEl } = this
        contentEl.empty()
        contentEl.addClass('stargate-confirm-modal')

        contentEl.createEl('p', { text: this.message, cls: 'stargate-confirm-message' })

        const buttonContainer = contentEl.createDiv({ cls: 'stargate-modal-buttons' })

        const cancelBtn = buttonContainer.createEl('button', { text: t().common.cancel })
        cancelBtn.onclick = () => this.close()

        const confirmBtn = buttonContainer.createEl('button', {
            text: t().common.confirm,
            cls: 'mod-warning',
        })
        confirmBtn.onclick = () => {
            this.confirmed = true
            this.close()
        }
        confirmBtn.focus()
    }

    onClose(): void {
        this.contentEl.empty()
        // 닫힌 뒤에 실행해야 모달이 겹치지 않는다
        if (this.confirmed) {
            void this.onConfirm()
        }
    }
}
