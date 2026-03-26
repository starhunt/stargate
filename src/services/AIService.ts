/**
 * AI Service - 동적 제공자/모델 기반 통합 (v2)
 */

import { requestUrl } from 'obsidian'
import { AIProviderDefinition, AIModelDefinition, AIApiFormat } from '../types'

export interface AIMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface AIResponse {
    content: string
    provider: string
    model: string
    error?: string
}

export class AIService {
    private providers: AIProviderDefinition[]
    private models: AIModelDefinition[]
    private defaultProviderId: string
    private defaultModelId: string

    constructor(
        providers: AIProviderDefinition[],
        models: AIModelDefinition[],
        defaultProviderId: string,
        defaultModelId: string,
    ) {
        this.providers = providers
        this.models = models
        this.defaultProviderId = defaultProviderId
        this.defaultModelId = defaultModelId
    }

    /**
     * 설정 업데이트
     */
    updateSettings(
        providers: AIProviderDefinition[],
        models: AIModelDefinition[],
        defaultProviderId: string,
        defaultModelId: string,
    ): void {
        this.providers = providers
        this.models = models
        this.defaultProviderId = defaultProviderId
        this.defaultModelId = defaultModelId
    }

    /**
     * 제공자 조회
     */
    getProvider(providerId: string): AIProviderDefinition | undefined {
        return this.providers.find(p => p.id === providerId)
    }

    /**
     * 모델 조회
     */
    getModel(modelId: string): AIModelDefinition | undefined {
        return this.models.find(m => m.id === modelId)
    }

    /**
     * Provider가 설정되어 있는지 확인
     */
    isProviderConfigured(providerId: string): boolean {
        const provider = this.getProvider(providerId)
        if (!provider) return false
        // none 인증 (Ollama 등)은 키 불필요
        if (provider.authType === 'none') return true
        return !!provider.apiKey
    }

    /**
     * 연결 테스트
     */
    async testConnection(
        providerId: string,
        modelId: string,
        overrideApiKey?: string,
    ): Promise<boolean> {
        const provider = this.getProvider(providerId)
        if (!provider) {
            console.error(`[Stargate] testConnection: Provider not found: ${providerId}`)
            return false
        }

        const effectiveKey = overrideApiKey || provider.apiKey
        console.log(`[Stargate] testConnection - Provider: ${provider.name} (${provider.id}), Model: ${modelId}, Format: ${provider.apiFormat}, BaseUrl: ${provider.baseUrl}, AuthType: ${provider.authType}, HasKey: ${!!effectiveKey}`)

        try {
            const messages: AIMessage[] = [
                { role: 'user', content: 'Hello, respond with "OK" only.' }
            ]
            const response = await this.callProvider(provider, modelId, messages, effectiveKey)
            if (response.error) {
                console.error(`[Stargate] testConnection failed:`, response.error)
            }
            return !response.error && response.content.length > 0
        } catch (error) {
            console.error(`[Stargate] testConnection error:`, error)
            return false
        }
    }

    /**
     * AI 요청 보내기
     */
    async sendRequest(
        messages: AIMessage[],
        providerId?: string,
        modelId?: string,
    ): Promise<AIResponse> {
        const activeProviderId = providerId || this.defaultProviderId
        const provider = this.getProvider(activeProviderId)

        if (!provider) {
            return {
                content: '',
                provider: activeProviderId,
                model: modelId || '',
                error: `Provider not found: ${activeProviderId}`
            }
        }

        // 모델 결정: 명시적 모델 > 기본 모델
        const activeModelId = modelId || this.defaultModelId
        const model = this.getModel(activeModelId)
        const effectiveModelId = activeModelId
        const effectiveKey = model?.apiKey || provider.apiKey

        if (!this.isProviderConfigured(activeProviderId) && !model?.apiKey) {
            return {
                content: '',
                provider: activeProviderId,
                model: effectiveModelId,
                error: `API key not configured for ${provider.name}`
            }
        }

        try {
            console.log(`[Stargate] API Call - Provider: ${provider.name}, Model: ${effectiveModelId}, Format: ${provider.apiFormat}`)
            return await this.callProvider(provider, effectiveModelId, messages, effectiveKey)
        } catch (error) {
            return {
                content: '',
                provider: activeProviderId,
                model: effectiveModelId,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    /**
     * 제공자별 API 호출 (apiFormat 기반 라우팅)
     */
    private async callProvider(
        provider: AIProviderDefinition,
        modelId: string,
        messages: AIMessage[],
        apiKey: string,
    ): Promise<AIResponse> {
        switch (provider.apiFormat) {
            case 'openai':
                return await this.callOpenAIFormat(provider, modelId, messages, apiKey)
            case 'anthropic':
                return await this.callAnthropicFormat(provider, modelId, messages, apiKey)
            case 'gemini':
                return await this.callGeminiFormat(provider, modelId, messages, apiKey)
            case 'ollama':
                return await this.callOllamaFormat(provider, modelId, messages)
            default:
                throw new Error(`Unknown API format: ${provider.apiFormat}`)
        }
    }

    /**
     * OpenAI 호환 API 호출 (OpenAI, Groq, xAI, z.ai 등)
     */
    private async callOpenAIFormat(
        provider: AIProviderDefinition,
        modelId: string,
        messages: AIMessage[],
        apiKey: string,
    ): Promise<AIResponse> {
        const url = `${provider.baseUrl}/chat/completions`
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        }

        if (provider.authType === 'bearer') {
            headers['Authorization'] = `Bearer ${apiKey}`
        } else if (provider.authType === 'x-api-key') {
            headers['x-api-key'] = apiKey
        }

        const response = await requestUrl({
            url,
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: modelId,
                messages,
                max_tokens: 4096,
            })
        })

        const data = response.json
        return {
            content: data.choices?.[0]?.message?.content || '',
            provider: provider.id,
            model: modelId,
        }
    }

    /**
     * Anthropic API 호출
     */
    private async callAnthropicFormat(
        provider: AIProviderDefinition,
        modelId: string,
        messages: AIMessage[],
        apiKey: string,
    ): Promise<AIResponse> {
        const url = `${provider.baseUrl}/messages`
        const systemMessage = messages.find(m => m.role === 'system')
        const otherMessages = messages.filter(m => m.role !== 'system')

        const response = await requestUrl({
            url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: modelId,
                max_tokens: 4096,
                system: systemMessage?.content || '',
                messages: otherMessages.map(m => ({
                    role: m.role,
                    content: m.content,
                }))
            })
        })

        const data = response.json
        return {
            content: data.content?.[0]?.text || '',
            provider: provider.id,
            model: modelId,
        }
    }

    /**
     * Google Gemini API 호출
     */
    private async callGeminiFormat(
        provider: AIProviderDefinition,
        modelId: string,
        messages: AIMessage[],
        apiKey: string,
    ): Promise<AIResponse> {
        const url = `${provider.baseUrl}/models/${modelId}:generateContent?key=${apiKey}`

        const contents = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }))

        const systemInstruction = messages.find(m => m.role === 'system')?.content

        const response = await requestUrl({
            url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents,
                systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                generationConfig: {
                    maxOutputTokens: 4096,
                },
            })
        })

        const data = response.json
        return {
            content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
            provider: provider.id,
            model: modelId,
        }
    }

    /**
     * Ollama API 호출 (로컬)
     */
    private async callOllamaFormat(
        provider: AIProviderDefinition,
        modelId: string,
        messages: AIMessage[],
    ): Promise<AIResponse> {
        const url = `${provider.baseUrl}/api/chat`

        const response = await requestUrl({
            url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelId,
                messages,
                stream: false,
            })
        })

        const data = response.json
        return {
            content: data.message?.content || '',
            provider: provider.id,
            model: modelId,
        }
    }
}
