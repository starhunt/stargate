import { beforeAll, describe, expect, mock, test } from 'bun:test'
import type { PluginSettings } from '../src/types'

// Obsidian 런타임은 테스트 환경에 없으므로 src에서 쓰는 export를 더미로 대체한다
// (src/**/*.ts 의 `from 'obsidian'` import 목록과 일치해야 한다)
mock.module('obsidian', () => ({
    App: class { },
    ItemView: class { },
    MarkdownView: class { },
    Modal: class { },
    Notice: class { },
    Platform: { isMobile: false },
    Plugin: class { },
    PluginSettingTab: class { },
    requestUrl: async () => ({ status: 200, json: {}, text: '' }),
    setIcon: () => { },
    Setting: class { },
    TFile: class { },
    WorkspaceLeaf: class { },
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let StargatePlugin: any

beforeAll(async () => {
    StargatePlugin = (await import('../src/main')).default
})

/** loadData()가 주어진 데이터를 반환하는 플러그인 인스턴스를 만든다 */
function createPlugin(savedData: Record<string, unknown> | null) {
    const plugin = Object.create(StargatePlugin.prototype)
    let persisted: PluginSettings | null = null

    plugin.loadData = async () => savedData
    plugin.saveData = async (data: PluginSettings) => { persisted = data }

    return {
        plugin,
        settings: () => plugin.settings as PluginSettings,
        persisted: () => persisted,
    }
}

describe('loadSettings - 서비스 종료 모델 강제 교체', () => {
    test('v2 사용자의 gemini-2.0-flash가 3.6으로 교체되고 저장된다', async () => {
        const ctx = createPlugin({
            settingsVersion: 2,
            uuid: 'existing-uuid',
            defaultProviderId: 'gemini',
            defaultModelId: 'gemini-2.0-flash',
            providers: [],
            models: [
                { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', providerId: 'gemini', enabled: true },
            ],
        })

        await ctx.plugin.loadSettings()

        const geminiModels = ctx.settings().models.filter(m => m.providerId === 'gemini')
        expect(geminiModels.map(m => m.id)).toEqual(['gemini-3.6-flash'])
        expect(ctx.settings().defaultModelId).toBe('gemini-3.6-flash')
        expect(ctx.settings().settingsVersion).toBe(3)

        // 마이그레이션 결과가 즉시 영속화되어야 한다
        expect(ctx.persisted()?.defaultModelId).toBe('gemini-3.6-flash')
        expect(ctx.persisted()?.settingsVersion).toBe(3)
    })

    test('gemini-2.5-flash 사용자도 3.6으로 이동한다', async () => {
        const ctx = createPlugin({
            settingsVersion: 2,
            uuid: 'existing-uuid',
            defaultProviderId: 'gemini',
            defaultModelId: 'gemini-2.5-flash',
            providers: [],
            models: [
                { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', providerId: 'gemini', enabled: true },
            ],
        })

        await ctx.plugin.loadSettings()

        expect(ctx.settings().defaultModelId).toBe('gemini-3.6-flash')
        expect(ctx.settings().models.filter(m => m.id.startsWith('gemini-2.')).length).toBe(0)
    })

    test('이미 v3인 설정은 다시 건드리지 않는다 (사용자가 되돌린 경우 존중)', async () => {
        const ctx = createPlugin({
            settingsVersion: 3,
            uuid: 'existing-uuid',
            defaultProviderId: 'gemini',
            defaultModelId: 'gemini-2.5-flash',
            providers: [],
            models: [
                { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', providerId: 'gemini', enabled: true },
            ],
        })

        await ctx.plugin.loadSettings()

        expect(ctx.settings().defaultModelId).toBe('gemini-2.5-flash')
        expect(ctx.persisted()).toBeNull()   // 변경이 없으면 저장도 없다
    })

    test('v2 사용자의 grok-2-latest가 4.5로 교체되고 저장된다', async () => {
        const ctx = createPlugin({
            settingsVersion: 2,
            uuid: 'existing-uuid',
            defaultProviderId: 'xai',
            defaultModelId: 'grok-2-latest',
            providers: [],
            models: [{ id: 'grok-2-latest', name: 'Grok 2', providerId: 'xai', enabled: true }],
        })

        await ctx.plugin.loadSettings()

        expect(ctx.settings().models.filter(m => m.providerId === 'xai').map(m => m.id)).toEqual(['grok-4.5'])
        expect(ctx.settings().defaultModelId).toBe('grok-4.5')
        expect(ctx.persisted()?.defaultModelId).toBe('grok-4.5')
    })

    test('종료 모델을 안 쓰던 v2 사용자의 선택은 유지된다', async () => {
        const ctx = createPlugin({
            settingsVersion: 2,
            uuid: 'existing-uuid',
            defaultProviderId: 'openai',
            defaultModelId: 'gpt-4o',
            providers: [],
            models: [{ id: 'gpt-4o', name: 'GPT-4o', providerId: 'openai', enabled: true }],
        })

        await ctx.plugin.loadSettings()

        expect(ctx.settings().defaultModelId).toBe('gpt-4o')
        expect(ctx.settings().models.some(m => m.id === 'gpt-4o')).toBe(true)
        // 새 빌트인 모델은 추가된다
        expect(ctx.settings().models.some(m => m.id === 'gpt-5.6-luna')).toBe(true)
        expect(ctx.settings().models.some(m => m.id === 'grok-4.5')).toBe(true)
    })

    test('첫 실행은 새 빌트인 기본값을 사용한다', async () => {
        const ctx = createPlugin(null)

        await ctx.plugin.loadSettings()

        expect(ctx.settings().settingsVersion).toBe(3)
        expect(ctx.settings().defaultModelId).toBe('gpt-5.6-luna')
        expect(ctx.settings().models.map(m => m.id)).toEqual([
            'gpt-5.6-luna', 'claude-sonnet-5', 'gemini-3.6-flash', 'grok-4.5', 'glm-5.2', 'llama3.2',
        ])
    })

    test('v1 사용자의 종료된 Gemini 모델도 교체된다', async () => {
        const ctx = createPlugin({
            uuid: 'v1-uuid',
            ai: {
                provider: 'gemini',
                apiKeys: { gemini: 'test-key' },
                models: { gemini: 'gemini-2.0-flash' },
            },
        })

        await ctx.plugin.loadSettings()

        expect(ctx.settings().settingsVersion).toBe(3)
        expect(ctx.settings().defaultModelId).toBe('gemini-3.6-flash')
        expect(ctx.settings().models.filter(m => m.id.startsWith('gemini-2.')).length).toBe(0)
        expect(ctx.settings().providers.find(p => p.id === 'gemini')?.apiKey).toBe('test-key')
    })
})
