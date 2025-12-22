/**
 * Electron WebView 태그 생성
 * Desktop 환경에서만 사용
 */

import WebviewTag = Electron.WebviewTag
import { GOOGLE_URL } from '../constants'

interface WebviewParams {
    url: string
    profileKey: string
    sharedSession?: boolean  // true면 모든 탭이 세션 공유
    userAgent?: string
    css?: string
    js?: string
}

export function createWebviewTag(
    params: WebviewParams,
    onReady: () => void,
    doc: Document
): WebviewTag {
    const webviewTag = doc.createElement('webview') as unknown as WebviewTag

    // 기본 속성 설정
    webviewTag.setAttribute('src', params.url)

    // 세션 분리 (partition)
    // sharedSession이 true면 모든 탭이 같은 세션 사용 (로그인 유지)
    // false면 각 사이트별 독립된 쿠키/스토리지 환경
    const partition = params.sharedSession
        ? 'persist:stargate-shared'
        : `persist:${params.profileKey}`
    webviewTag.setAttribute('partition', partition)

    // HTTP Referrer 설정
    webviewTag.setAttribute('httpreferrer', params.url || GOOGLE_URL)

    // 팝업 허용 (OAuth 리다이렉트 처리용)
    webviewTag.setAttribute('allowpopups', 'true')

    // User-Agent 설정
    // 명시적으로 설정하지 않으면 Electron 기본값 사용 (Chrome과 동일)
    // Google 서비스 등에서 감지 우회에 더 효과적
    if (params.userAgent) {
        webviewTag.setAttribute('useragent', params.userAgent)
    }

    // 스타일 설정
    webviewTag.style.width = '100%'
    webviewTag.style.height = '100%'
    webviewTag.style.border = 'none'

    // DOM Ready 이벤트
    webviewTag.addEventListener('dom-ready', () => {
        onReady()

        // 커스텀 CSS 주입
        if (params.css) {
            webviewTag.insertCSS(params.css)
        }

        // 커스텀 JS 주입
        if (params.js) {
            webviewTag.executeJavaScript(params.js)
        }
    })

    // 에러 처리
    webviewTag.addEventListener('did-fail-load', (event: any) => {
        console.error('Webview failed to load:', event.errorDescription)
    })

    // 콘솔 메시지 (디버깅용)
    webviewTag.addEventListener('console-message', (event: any) => {
        if (event.level === 2) {
            // Error level
            console.error('[Webview]', event.message)
        }
    })

    return webviewTag
}
