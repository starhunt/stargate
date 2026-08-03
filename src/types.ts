/**
 * Stargate Plugin Types
 */

import type { SupportedLocale } from './i18n'

// ============================================
// Tab System Types
// ============================================

/**
 * 고정 사이트 (설정에서 등록, 닫기 불가)
 */
export interface PinnedSite {
    id: string              // 고유 ID (uuid)
    name: string            // 사이트 이름 (툴팁용)
    url: string             // URL
    favicon?: string        // 커스텀 favicon URL (optional)
    profileKey: string      // 세션 분리용 키
}

/**
 * 임시 탭 (새 탭으로 추가, 닫기 가능)
 */
export interface TempTab {
    id: string              // 'temp-{timestamp}'
    url: string
    title: string
    profileKey: string
}

/**
 * 현재 활성 탭 상태
 */
export interface TabState {
    id: string
    url: string
    title: string
    isPinned: boolean
}

// ============================================
// AI Types (v2 - 동적 제공자/모델)
// ============================================

/** AI 제공자 식별자 (string 기반, 커스텀 제공자 지원) */
export type AIProvider = string

/** API 호출 형식 */
export type AIApiFormat = 'openai' | 'anthropic' | 'gemini' | 'ollama'

/** 인증 방식 */
export type AIAuthType = 'bearer' | 'x-api-key' | 'query' | 'none'

/**
 * AI 제공자 정의
 */
export interface AIProviderDefinition {
    /** 고유 식별자 (예: 'gemini', 'openai', 'my-custom') */
    id: string
    /** 표시 이름 (예: 'Google Gemini') */
    name: string
    /** API 엔드포인트 기본 URL */
    baseUrl: string
    /** API 키 */
    apiKey: string
    /** 인증 방식 */
    authType: AIAuthType
    /** API 호출 형식 (기본: 'openai') */
    apiFormat: AIApiFormat
    /** 빌트인 프리셋 여부 (프리셋은 삭제 불가) */
    isBuiltIn: boolean
}

/**
 * AI 모델 정의
 */
export interface AIModelDefinition {
    /** 모델 ID (API 호출용, 예: 'gemini-3.6-flash') */
    id: string
    /** 표시 이름 (예: 'Gemini 3.6 Flash') */
    name: string
    /** 소속 제공자 ID */
    providerId: string
    /** 활성화 여부 */
    enabled: boolean
    /** 모델 전용 API 키 (미설정 시 제공자의 키 사용) */
    apiKey?: string
}

/**
 * 서비스 종료 모델 교체 규칙
 */
export interface DeprecatedModelMigration {
    /** 이 접두사로 시작하는 모델 ID를 교체 대상으로 본다 (예: 'gemini-2.5') */
    matchPrefixes: string[]
    /** 대체할 모델 */
    replacement: { id: string; name: string }
}

/**
 * AI 서비스 설정 (v2)
 */
export interface AIServiceConfig {
    providers: AIProviderDefinition[]
    models: AIModelDefinition[]
    defaultProviderId: string
    defaultModelId: string
}

/**
 * AI 글로벌 설정
 */
export interface AIGlobalSettings {
    maxTokens: number
    defaultLanguage: string
    defaultTemplate: TemplateType  // 빠른 분석용 기본 템플릿
    autoTags: boolean
    notesFolder: string
    noteTemplate: string
}

// ── v1 호환 타입 (마이그레이션용) ──

/** @deprecated v1 호환용 */
export type AIProviderType = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'xai' | 'zai' | 'ollama'

/** @deprecated v1 호환용 */
export interface AISettingsV1 {
    provider: AIProviderType
    apiKeys: Partial<Record<AIProviderType, string>>
    models: Partial<Record<AIProviderType, string>>
    maxTokens: number
    defaultLanguage: string
    defaultTemplate: TemplateType
    autoTags: boolean
    notesFolder: string
    noteTemplate: string
}

// ============================================
// Template Types
// ============================================

/**
 * 분석 템플릿 타입
 */
export type TemplateType =
    | 'briefing'
    | 'concept'
    | 'insight'
    | 'knowledge-map'
    | 'deep-analysis'
    | 'meta-hub'
    | 'comprehensive'

/**
 * 분석 템플릿 정의
 */
export interface AnalysisTemplate {
    id: TemplateType
    name: string
    icon: string
    description: string
    systemPrompt: string
    userPromptTemplate: string
}

/**
 * 사용자 저장 프롬프트
 */
export interface SavedPrompt {
    id: string              // 'custom-{timestamp}'
    name: string
    prompt: string          // user prompt
    systemPrompt?: string   // system prompt (있으면 전체 템플릿)
    icon?: string           // 아이콘 (전체 템플릿용)
}

/**
 * 사용자 정의 템플릿 (기본 템플릿 오버라이드)
 */
export interface CustomTemplate {
    id: TemplateType        // 기본 템플릿 ID
    systemPrompt: string    // 사용자 정의 시스템 프롬프트
    userPromptTemplate: string  // 사용자 정의 사용자 프롬프트
}

/**
 * 분석 설정
 */
export interface AnalysisConfig {
    templateId: TemplateType | null
    customPrompt: string | null
    providerId: string
    modelId: string
    language: string
}

// ============================================
// Plugin Settings (v2)
// ============================================

/**
 * 플러그인 설정
 */
export interface PluginSettings {
    settingsVersion: number     // 현재 v3 (SETTINGS_VERSION)
    uuid: string
    language: SupportedLocale   // UI 언어 설정
    pinnedSites: PinnedSite[]
    tempTabs: TempTab[]
    activeTabId: string
    sharedSession: boolean
    // AI v2 설정
    providers: AIProviderDefinition[]
    models: AIModelDefinition[]
    defaultProviderId: string
    defaultModelId: string
    // AI 글로벌 설정
    aiGlobal: AIGlobalSettings
    savedPrompts: SavedPrompt[]
    customTemplates: CustomTemplate[]
}

/**
 * 기본 노트 템플릿
 */
export const DEFAULT_NOTE_TEMPLATE = `---
source: "{{source}}"
created: {{date}}
template: {{template}}
{{#provider}}provider: {{provider}}{{/provider}}
{{#model}}model: {{model}}{{/model}}
{{#channel}}channel: "{{channel}}"{{/channel}}
{{#duration}}duration: "{{duration}}"{{/duration}}
{{#videoType}}videoType: "{{videoType}}"{{/videoType}}
{{#videoTags}}videoTags: [{{videoTags}}]{{/videoTags}}
tags: [stargate/clipping]
---

# {{title}}

> Source: {{source}}
{{#channel}}> Channel: {{channel}}{{/channel}}
{{#duration}}> Duration: {{duration}}{{/duration}}

---

{{content}}

{{#original}}
---

## Original Content

{{original}}
{{/original}}

---

*Generated by Star Gate*
`

/**
 * 기본 AI 글로벌 설정
 */
export const DEFAULT_AI_GLOBAL_SETTINGS: AIGlobalSettings = {
    maxTokens: 64000,
    defaultLanguage: 'ko',
    defaultTemplate: 'briefing',
    autoTags: true,
    notesFolder: 'Clippings',
    noteTemplate: DEFAULT_NOTE_TEMPLATE,
}

/**
 * 현재 설정 스키마 버전
 * - v2: 프로바이더/모델 다중 정의 구조 도입
 * - v3: 서비스 종료 모델(Gemini 2.0/2.5) 강제 교체
 */
export const SETTINGS_VERSION = 3

/**
 * 기본 플러그인 설정
 */
export const DEFAULT_SETTINGS: PluginSettings = {
    settingsVersion: SETTINGS_VERSION,
    uuid: '',
    language: 'auto',
    pinnedSites: [],
    tempTabs: [],
    activeTabId: '',
    sharedSession: false,
    providers: [],      // 초기화 시 BUILT_IN_PROVIDERS로 채움
    models: [],         // 초기화 시 BUILT_IN_MODELS로 채움
    defaultProviderId: 'openai',
    defaultModelId: 'gpt-5.6-luna',
    aiGlobal: DEFAULT_AI_GLOBAL_SETTINGS,
    savedPrompts: [],
    customTemplates: [],
}
