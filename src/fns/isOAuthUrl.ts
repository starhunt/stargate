/**
 * OAuth URL 판별
 * OAuth 도메인은 같은 webview에서 처리해야 세션이 유지됨
 */

import { OAUTH_DOMAINS } from '../constants'

export function isOAuthUrl(url: string): boolean {
    if (!url) return false

    try {
        const urlObj = new URL(url)
        const hostname = urlObj.hostname
        const pathname = urlObj.pathname

        // 전체 URL에서 OAuth 도메인 패턴 확인
        const fullPath = hostname + pathname

        return OAUTH_DOMAINS.some((domain) => {
            // 정확한 도메인 매칭 또는 경로 포함
            if (domain.includes('/')) {
                // 경로가 포함된 패턴 (예: 'github.com/login')
                return fullPath.includes(domain)
            } else {
                // 도메인만 있는 패턴
                return hostname === domain || hostname.endsWith('.' + domain)
            }
        })
    } catch {
        return false
    }
}
