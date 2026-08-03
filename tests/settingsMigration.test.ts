import { describe, expect, test } from 'bun:test'
import { migrateDeprecatedModels } from '../src/services/settingsMigration'
import { DEPRECATED_MODEL_MIGRATIONS, BUILT_IN_MODELS } from '../src/constants'
import type { AIModelDefinition } from '../src/types'

const model = (id: string, providerId = 'gemini', enabled = true): AIModelDefinition =>
    ({ id, name: id, providerId, enabled })

const RULES = DEPRECATED_MODEL_MIGRATIONS

describe('migrateDeprecatedModels', () => {
    test('종료된 Gemini 2.0 모델을 3.6 Flash로 교체한다', () => {
        const result = migrateDeprecatedModels([model('gemini-2.0-flash')], 'gemini-2.0-flash', RULES)

        expect(result.models).toEqual([
            { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', providerId: 'gemini', enabled: true },
        ])
        expect(result.defaultModelId).toBe('gemini-3.6-flash')
    })

    test('Gemini 2.5 계열(-lite, -pro, -001)도 모두 교체한다', () => {
        const result = migrateDeprecatedModels(
            [model('gemini-2.5-flash'), model('gemini-2.5-flash-lite'), model('gemini-2.5-pro'), model('gemini-2.0-flash-001')],
            'gemini-2.5-pro',
            RULES,
        )

        expect(result.models.map(m => m.id)).toEqual(['gemini-3.6-flash'])
        expect(result.defaultModelId).toBe('gemini-3.6-flash')
    })

    test('대체 모델이 이미 있으면 중복을 만들지 않는다', () => {
        const result = migrateDeprecatedModels(
            [model('gemini-2.0-flash'), model('gemini-3.6-flash')],
            'gemini-2.0-flash',
            RULES,
        )

        expect(result.models.map(m => m.id)).toEqual(['gemini-3.6-flash'])
        expect(result.defaultModelId).toBe('gemini-3.6-flash')
    })

    test('종료 대상이 아닌 모델과 커스텀 모델은 그대로 둔다', () => {
        const models = [
            model('gpt-5.6-luna', 'openai'),
            model('gemini-3.6-flash'),
            model('gemini-3.5-flash-cyber'),
            model('my-local-model', 'ollama'),
        ]
        const result = migrateDeprecatedModels(models, 'gpt-5.6-luna', RULES)

        expect(result.models).toEqual(models)
        expect(result.defaultModelId).toBe('gpt-5.6-luna')
        expect(result.changes).toEqual([])
    })

    test('프로바이더가 다르면 각각 교체하고 서로 합치지 않는다', () => {
        const result = migrateDeprecatedModels(
            [model('gemini-2.0-flash', 'gemini'), model('gemini-2.0-flash', 'my-proxy')],
            '',
            RULES,
        )

        expect(result.models).toEqual([
            { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', providerId: 'gemini', enabled: true },
            { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', providerId: 'my-proxy', enabled: true },
        ])
    })

    test('은퇴한 Grok 모델을 4.5로 교체한다', () => {
        const result = migrateDeprecatedModels(
            [
                model('grok-2-latest', 'xai'),
                model('grok-3', 'xai'),
                model('grok-4-fast-reasoning', 'xai'),
                model('grok-4-0709', 'xai'),
            ],
            'grok-2-latest',
            RULES,
        )

        expect(result.models.map(m => m.id)).toEqual(['grok-4.5'])
        expect(result.defaultModelId).toBe('grok-4.5')
    })

    test('현행 Grok(4.3 / 4.5 / 4.20)은 건드리지 않는다', () => {
        const models = [
            model('grok-4.5', 'xai'),
            model('grok-4.3', 'xai'),
            model('grok-4.20-0309-reasoning', 'xai'),
            model('grok-build-0.1', 'xai'),
        ]
        const result = migrateDeprecatedModels(models, 'grok-4.3', RULES)

        expect(result.models).toEqual(models)
        expect(result.defaultModelId).toBe('grok-4.3')
        expect(result.changes).toEqual([])
    })

    test('Gemini와 Grok 규칙이 한 번에 적용된다', () => {
        const result = migrateDeprecatedModels(
            [model('gemini-2.0-flash'), model('grok-2-latest', 'xai'), model('gpt-5.6-luna', 'openai')],
            'grok-2-latest',
            RULES,
        )

        expect(result.models.map(m => m.id)).toEqual(['gemini-3.6-flash', 'grok-4.5', 'gpt-5.6-luna'])
        expect(result.defaultModelId).toBe('grok-4.5')
    })

    test('모델 목록에 없는 기본 모델 ID도 교체한다 (고아 참조)', () => {
        const result = migrateDeprecatedModels([model('gpt-5.6-luna', 'openai')], 'gemini-2.5-flash', RULES)

        expect(result.defaultModelId).toBe('gemini-3.6-flash')
    })

    test('enabled 등 나머지 필드는 보존한다', () => {
        const result = migrateDeprecatedModels(
            [{ id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', providerId: 'gemini', enabled: false, apiKey: 'sk-test' }],
            '',
            RULES,
        )

        expect(result.models[0]).toEqual({
            id: 'gemini-3.6-flash',
            name: 'Gemini 3.6 Flash',
            providerId: 'gemini',
            enabled: false,
            apiKey: 'sk-test',
        })
    })

    test('입력 배열/객체를 변경하지 않는다', () => {
        const models = [model('gemini-2.0-flash')]
        const snapshot = structuredClone(models)

        migrateDeprecatedModels(models, 'gemini-2.0-flash', RULES)

        expect(models).toEqual(snapshot)
    })

    test('두 번 실행해도 결과가 같다 (멱등)', () => {
        const once = migrateDeprecatedModels([model('gemini-2.0-flash')], 'gemini-2.0-flash', RULES)
        const twice = migrateDeprecatedModels(once.models, once.defaultModelId, RULES)

        expect(twice.models).toEqual(once.models)
        expect(twice.defaultModelId).toBe(once.defaultModelId)
        expect(twice.changes).toEqual([])
    })
})

describe('BUILT_IN_MODELS', () => {
    test('빌트인 모델에는 종료된 모델이 없다', () => {
        const result = migrateDeprecatedModels(BUILT_IN_MODELS, '', RULES)
        expect(result.changes).toEqual([])
    })

    test('프로바이더당 기본 모델이 하나씩 정의되어 있다', () => {
        const providerIds = BUILT_IN_MODELS.map(m => m.providerId)
        expect(new Set(providerIds).size).toBe(providerIds.length)
    })
})
