/**
 * Stargate Plugin Constants
 */

import { AIProviderDefinition, AIModelDefinition, DeprecatedModelMigration } from './types'

// ============================================
// Plugin Info
// ============================================

export const PLUGIN_ID = 'stargate'
export const PLUGIN_NAME = 'Star Gate'
export const VIEW_TYPE_BROWSER = 'stargate-browser-view'

// ============================================
// Tab System
// ============================================

export const MAX_PINNED_SITES = Infinity  // 무제한
export const DEFAULT_PROFILE_KEY = 'stargate-default'

// ============================================
// Security - OAuth Domains
// ============================================

export const OAUTH_DOMAINS = [
    'accounts.google.com',
    'accounts.youtube.com',
    'appleid.apple.com',
    'login.microsoftonline.com',
    'login.live.com',
    'github.com/login',
    'github.com/sessions',
    'api.twitter.com',
    'twitter.com/i/oauth',
    'x.com/i/oauth',
    'facebook.com/dialog',
    'facebook.com/v',
    'oauth.kakao.com',
    'kauth.kakao.com',
    'nid.naver.com',
    'auth.atlassian.com',
    'id.atlassian.com',
    'login.salesforce.com',
    'slack.com/oauth',
    'discord.com/oauth2',
    'linkedin.com/oauth',
    'api.linkedin.com',
]

// ============================================
// Favicon
// ============================================

export const FAVICON_SERVICE_URL = 'https://www.google.com/s2/favicons?domain='
export const DEFAULT_FAVICON = 'globe'

// ============================================
// AI Providers (v2 - 빌트인 프리셋)
// ============================================

export const BUILT_IN_PROVIDERS: AIProviderDefinition[] = [
    {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        authType: 'bearer',
        apiFormat: 'openai',
        isBuiltIn: true,
    },
    {
        id: 'anthropic',
        name: 'Anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: '',
        authType: 'x-api-key',
        apiFormat: 'anthropic',
        isBuiltIn: true,
    },
    {
        id: 'gemini',
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: '',
        authType: 'query',
        apiFormat: 'gemini',
        isBuiltIn: true,
    },
{
        id: 'xai',
        name: 'xAI (Grok)',
        baseUrl: 'https://api.x.ai/v1',
        apiKey: '',
        authType: 'bearer',
        apiFormat: 'openai',
        isBuiltIn: true,
    },
    {
        id: 'zai',
        name: 'z.ai (GLM)',
        baseUrl: 'https://api.z.ai/api/coding/paas/v4',
        apiKey: '',
        authType: 'bearer',
        apiFormat: 'openai',
        isBuiltIn: true,
    },
    {
        id: 'upstage',
        name: 'Upstage (Solar)',
        baseUrl: 'https://api.upstage.ai/v1',
        apiKey: '',
        authType: 'bearer',
        apiFormat: 'openai',
        isBuiltIn: true,
    },
    {
        id: 'ollama',
        name: 'Ollama (Local)',
        baseUrl: 'http://localhost:11434',
        apiKey: '',
        authType: 'none',
        apiFormat: 'ollama',
        isBuiltIn: true,
    },
]

export const BUILT_IN_MODELS: AIModelDefinition[] = [
    { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna', providerId: 'openai', enabled: true },
    { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', providerId: 'anthropic', enabled: true },
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', providerId: 'gemini', enabled: true },
    { id: 'grok-4.5', name: 'Grok 4.5', providerId: 'xai', enabled: true },
    { id: 'glm-5.2', name: 'GLM-5.2', providerId: 'zai', enabled: true },
    // Upstage 공식 표기는 하이픈 없는 'solar-pro4' (블로그 URL의 solar-pro-4와 다름)
    { id: 'solar-pro4', name: 'Solar Pro 4', providerId: 'upstage', enabled: true },
    { id: 'llama3.2', name: 'Llama 3.2', providerId: 'ollama', enabled: true },
]

/**
 * 서비스가 종료된 모델 → 대체 모델 강제 교체 규칙 (설정 마이그레이션용)
 *
 * 이미 API가 404를 반환하는 모델을 사용자 설정에 남겨두면 AI 호출이 그대로 실패하므로,
 * 설정 로드 시 1회 자동 교체한다. 교체 후 사용자가 직접 되돌리면 다시 건드리지 않는다.
 */
export const DEPRECATED_MODEL_MIGRATIONS: DeprecatedModelMigration[] = [
    {
        // Gemini 2.0: 2026-06-01 종료 / Gemini 2.5: 2026-07-09부터 404
        matchPrefixes: ['gemini-2.0', 'gemini-2.5'],
        replacement: { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash' },
    },
    {
        // Grok 2: 모델 목록에서 제거됨 / Grok 3·grok-4-* 계열: 2026-05-15 은퇴 (grok-4.3으로 리다이렉트)
        // 'grok-4-'는 은퇴한 하이픈 표기(grok-4-fast, grok-4-0709 등)만 잡는다. 현행 grok-4.3/4.5는 점 표기라 걸리지 않는다.
        matchPrefixes: ['grok-2', 'grok-3', 'grok-4-'],
        replacement: { id: 'grok-4.5', name: 'Grok 4.5' },
    },
]

// ============================================
// Default URLs
// ============================================

export const GOOGLE_URL = 'https://www.google.com'
export const BLANK_URL = 'about:blank'
