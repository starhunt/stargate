/**
 * Iframe 생성
 * Mobile 환경에서 사용 (WebView 대신)
 */

interface IframeParams {
    url: string
}

export function createIframe(params: IframeParams, onReady: () => void): HTMLIFrameElement {
    const iframe = createEl('iframe', { cls: 'stargate-frame' })

    // 기본 속성 설정
    iframe.src = params.url

    // 샌드박스 설정 (보안)
    iframe.setAttribute(
        'sandbox',
        'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox'
    )

    // Referrer 정책
    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade')

    // Load 이벤트
    iframe.addEventListener('load', () => {
        onReady()
    })

    // 에러 처리
    iframe.addEventListener('error', (event) => {
        console.error('Iframe failed to load:', event)
    })

    return iframe
}
