/**
 * Stargate Plugin Constants
 */

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
// AI Providers
// ============================================

export const AI_PROVIDERS = {
    openai: {
        name: 'OpenAI',
        defaultModel: 'gpt-4o',
        baseUrl: 'https://api.openai.com/v1/chat/completions'
    },
    anthropic: {
        name: 'Anthropic',
        defaultModel: 'claude-sonnet-4-20250514',
        baseUrl: 'https://api.anthropic.com/v1/messages'
    },
    gemini: {
        name: 'Google Gemini',
        defaultModel: 'gemini-2.0-flash',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
    },
    zai: {
        name: 'z.ai (GLM)',
        defaultModel: 'glm-4-flash',
        baseUrl: 'https://api.z.ai/api/coding/paas/v4/chat/completions'
    },
    ollama: {
        name: 'Ollama (Local)',
        defaultModel: 'llama3.2',
        baseUrl: 'http://localhost:11434/api/chat'
    }
} as const

// ============================================
// Default URLs
// ============================================

export const GOOGLE_URL = 'https://www.google.com'
export const BLANK_URL = 'about:blank'
