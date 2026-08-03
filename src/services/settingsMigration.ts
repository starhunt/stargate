/**
 * 설정 마이그레이션 로직 (Obsidian 의존성 없는 순수 함수)
 */

import { AIModelDefinition, DeprecatedModelMigration } from '../types'

export interface DeprecatedModelMigrationResult {
    models: AIModelDefinition[]
    defaultModelId: string
    /** 실제로 교체된 항목 (교체 발생 여부 판정용) */
    changes: { from: string; to: string }[]
}

/**
 * 서비스 종료 모델을 대체 모델로 교체한다.
 *
 * - 규칙 접두사에 걸리는 모델 ID를 대체 모델로 치환
 * - 치환 결과가 기존 모델과 겹치면 중복 제거 (프로바이더 + 모델 ID 기준, 앞선 항목 유지)
 * - 기본 모델이 종료된 모델이면 대체 모델로 이동
 *
 * 입력 배열/객체는 변경하지 않는다.
 */
export function migrateDeprecatedModels(
    models: AIModelDefinition[],
    defaultModelId: string,
    rules: DeprecatedModelMigration[],
): DeprecatedModelMigrationResult {
    let nextModels = models
    let nextDefaultModelId = defaultModelId
    const changes: { from: string; to: string }[] = []

    for (const rule of rules) {
        const isDeprecated = (modelId: string) =>
            rule.matchPrefixes.some(prefix => modelId.startsWith(prefix))

        const replaced = nextModels.map(model => {
            if (!isDeprecated(model.id)) return model
            changes.push({ from: model.id, to: rule.replacement.id })
            return { ...model, id: rule.replacement.id, name: rule.replacement.name }
        })

        const seen = new Set<string>()
        nextModels = replaced.filter(model => {
            const key = `${model.providerId}:${model.id}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })

        if (isDeprecated(nextDefaultModelId)) {
            changes.push({ from: nextDefaultModelId, to: rule.replacement.id })
            nextDefaultModelId = rule.replacement.id
        }
    }

    return { models: nextModels, defaultModelId: nextDefaultModelId, changes }
}
