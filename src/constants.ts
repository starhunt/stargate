/**
 * Stargate Plugin Constants
 */

import { AIProviderDefinition, AIModelDefinition } from './types'

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
    { id: 'gpt-4o', name: 'GPT-4o', providerId: 'openai', enabled: true },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', providerId: 'anthropic', enabled: true },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', providerId: 'gemini', enabled: true },
    { id: 'grok-2-latest', name: 'Grok 2', providerId: 'xai', enabled: true },
    { id: 'glm-4-flash', name: 'GLM-4 Flash', providerId: 'zai', enabled: true },
    { id: 'llama3.2', name: 'Llama 3.2', providerId: 'ollama', enabled: true },
]

// ============================================
// Default URLs
// ============================================

export const GOOGLE_URL = 'https://www.google.com'
export const BLANK_URL = 'about:blank'
