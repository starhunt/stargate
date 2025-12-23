/**
 * AI Service - 다양한 AI Provider 통합
 */

import { requestUrl } from 'obsidian'
import { AIProviderType, AISettings } from '../types'
import { AI_PROVIDERS } from '../constants'

export interface AIMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface AIResponse {
    content: string
    provider: AIProviderType
    model: string
    error?: string
}

export class AIService {
    private settings: AISettings

    constructor(settings: AISettings) {
        this.settings = settings
    }

    /**
     * 설정 업데이트
     */
    updateSettings(settings: AISettings): void {
        this.settings = settings
    }

    /**
     * Provider가 설정되어 있는지 확인
     */
    isProviderConfigured(provider: AIProviderType): boolean {
        // Ollama는 API 키 필요 없음
        if (provider === 'ollama') return true
        return !!this.settings.apiKeys[provider]
    }

    /**
     * AI 요청 보내기
     */
    async sendRequest(
        messages: AIMessage[],
        provider?: AIProviderType
    ): Promise<AIResponse> {
        const activeProvider = provider || this.settings.provider
        const apiKey = this.settings.apiKeys[activeProvider]
        const model = this.settings.models[activeProvider] || AI_PROVIDERS[activeProvider].defaultModel
        const baseUrl = AI_PROVIDERS[activeProvider].baseUrl

        if (!this.isProviderConfigured(activeProvider)) {
            return {
                content: '',
                provider: activeProvider,
                model,
                error: `API key not configured for ${AI_PROVIDERS[activeProvider].name}`
            }
        }

        try {
            console.log(`[Stargate] API Call - Provider: ${activeProvider}, Model: ${model}, URL: ${baseUrl}`)

            switch (activeProvider) {
                case 'openai':
                    return await this.callOpenAI(messages, apiKey!, model, baseUrl)
                case 'anthropic':
                    return await this.callAnthropic(messages, apiKey!, model, baseUrl)
                case 'gemini':
                    return await this.callGemini(messages, apiKey!, model, baseUrl)
                case 'groq':
                    return await this.callGroq(messages, apiKey!, model, baseUrl)
                case 'zai':
                    return await this.callZAI(messages, apiKey!, model, baseUrl)
                case 'ollama':
                    return await this.callOllama(messages, model, baseUrl)
                default:
                    throw new Error(`Unknown provider: ${activeProvider}`)
            }
        } catch (error) {
            return {
                content: '',
                provider: activeProvider,
                model,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    /**
     * OpenAI API 호출
     */
    private async callOpenAI(
        messages: AIMessage[],
        apiKey: string,
        model: string,
        baseUrl: string
    ): Promise<AIResponse> {
        const response = await requestUrl({
            url: baseUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens: 4096
            })
        })

        const data = response.json
        return {
            content: data.choices[0]?.message?.content || '',
            provider: 'openai',
            model
        }
    }

    /**
     * Anthropic API 호출
     */
    private async callAnthropic(
        messages: AIMessage[],
        apiKey: string,
        model: string,
        baseUrl: string
    ): Promise<AIResponse> {
        // Anthropic은 system 메시지를 별도로 처리
        const systemMessage = messages.find(m => m.role === 'system')
        const otherMessages = messages.filter(m => m.role !== 'system')

        const response = await requestUrl({
            url: baseUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model,
                max_tokens: 4096,
                system: systemMessage?.content || '',
                messages: otherMessages.map(m => ({
                    role: m.role,
                    content: m.content
                }))
            })
        })

        const data = response.json
        return {
            content: data.content[0]?.text || '',
            provider: 'anthropic',
            model
        }
    }

    /**
     * Google Gemini API 호출
     */
    private async callGemini(
        messages: AIMessage[],
        apiKey: string,
        model: string,
        baseUrl: string
    ): Promise<AIResponse> {
        const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`

        // Gemini 형식으로 변환
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
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents,
                systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                generationConfig: {
                    maxOutputTokens: 4096
                }
            })
        })

        const data = response.json
        return {
            content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
            provider: 'gemini',
            model
        }
    }

    /**
     * Groq API 호출 (OpenAI 호환)
     */
    private async callGroq(
        messages: AIMessage[],
        apiKey: string,
        model: string,
        baseUrl: string
    ): Promise<AIResponse> {
        const response = await requestUrl({
            url: baseUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens: 4096
            })
        })

        const data = response.json
        return {
            content: data.choices[0]?.message?.content || '',
            provider: 'groq',
            model
        }
    }

    /**
     * z.ai (GLM) API 호출
     */
    private async callZAI(
        messages: AIMessage[],
        apiKey: string,
        model: string,
        baseUrl: string
    ): Promise<AIResponse> {
        const response = await requestUrl({
            url: baseUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens: 4096
            })
        })

        const data = response.json
        return {
            content: data.choices[0]?.message?.content || '',
            provider: 'zai',
            model
        }
    }

    /**
     * Ollama API 호출 (로컬)
     */
    private async callOllama(
        messages: AIMessage[],
        model: string,
        baseUrl: string
    ): Promise<AIResponse> {
        const response = await requestUrl({
            url: baseUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages,
                stream: false
            })
        })

        const data = response.json
        return {
            content: data.message?.content || '',
            provider: 'ollama',
            model
        }
    }
}
