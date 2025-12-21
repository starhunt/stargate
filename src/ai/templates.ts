/**
 * AI 분석 템플릿 정의
 */

import { AnalysisTemplate, CustomTemplate, TemplateType } from '../types'

export const ANALYSIS_TEMPLATES: AnalysisTemplate[] = [
    {
        id: 'briefing',
        name: '브리핑',
        icon: '📰',
        description: '브리핑 문서, 뉴스, 리포트 내용을 빠르게 파악합니다.',
        systemPrompt: `You are a briefing and summarization specialist.
Focus on clarity, context, and fast understanding.
Extract 핵심 메시지, 배경, 의미를 구조적으로 정리하세요.
Use the Feynman Technique to ensure explainability.
Avoid unnecessary details and emotional language.`,
        userPromptTemplate: `다음 내용을 브리핑 노트 형식으로 정리해주세요.

## 브리핑 노트 구성
1. 🎯 핵심 내용 요약 (5~7줄)
2. 📌 주요 포인트
   - 배경
   - 핵심 내용
   - 시사점
3. 🧠 파인만 기법으로 이해하기
   - 쉬운 설명
   - 비유 또는 예시
4. ❓ 핵심 질문 2~3개

## 내용
{{content}}`
    },
    {
        id: 'concept',
        name: '개념정리',
        icon: '📘',
        description: '이론·개념 중심의 기준 지식을 정리합니다.',
        systemPrompt: `You are a conceptual knowledge architect.
Define concepts clearly and explain their internal structure.
Highlight relationships between concepts.
Use the Feynman Technique to simplify without losing accuracy.
Prioritize precision over breadth.`,
        userPromptTemplate: `다음 내용을 개념 노트 형식으로 정리해주세요.

## 개념 노트 구성
1. 🔑 핵심 개념 정의
2. 🧩 개념 구조
   - 구성 요소
   - 작동 원리 또는 논리 흐름
3. 🔗 관련 개념 및 대비
4. 🧠 파인만 기법 설명
   - 쉬운 설명
   - 오해하기 쉬운 포인트
5. 📌 요약 정리

## 내용
{{content}}`
    },
    {
        id: 'insight',
        name: '인사이트',
        icon: '💡',
        description: '정보를 넘어 사고를 확장합니다.',
        systemPrompt: `You are an insight generation facilitator.
Go beyond surface information to extract meaning.
Encourage new perspectives and connections.
Focus on implications, patterns, and thinking expansion.`,
        userPromptTemplate: `다음 내용을 인사이트 노트로 확장해주세요.

## 인사이트 노트 구성
1. 🎯 핵심 인사이트
2. 🔍 숨겨진 의미 또는 패턴
3. 🔗 연결되는 개념 / 분야
4. 🚀 확장 아이디어
5. ❓ 사고를 확장하는 질문 2~3개

## 내용
{{content}}`
    },
    {
        id: 'knowledge-map',
        name: '지식맵',
        icon: '🗺️',
        description: '지식을 구조적으로 배치합니다.',
        systemPrompt: `You are a knowledge mapping specialist.
Organize information spatially and structurally.
Focus on hierarchy, sequence, and relationships.
Prepare content suitable for mind maps or diagrams.`,
        userPromptTemplate: `다음 내용을 지식맵 노트로 구조화해주세요.

## 지식맵 노트 구성
1. 🧠 중심 주제
2. 🌿 하위 개념 트리
3. ⏱️ 타임라인 또는 흐름 (있다면)
4. 🔗 개념 간 관계
5. 📌 구조 요약

## 내용
{{content}}`
    },
    {
        id: 'deep-analysis',
        name: '심층분석',
        icon: '🔬',
        description: '조사, 비교, 문제 해결을 위한 분석 노트입니다.',
        systemPrompt: `You are an analytical research assistant.
Break down problems systematically.
Compare options, identify causes, and evaluate outcomes.
Present structured and evidence-based analysis.`,
        userPromptTemplate: `다음 내용을 심층분석 노트로 정리해주세요.

## 심층분석 노트 구성
1. 🎯 분석 대상 및 문제 정의
2. 🔍 주요 쟁점 분석
3. ⚖️ 비교 또는 대안 평가
4. 📊 근거 및 논리 정리
5. 🧠 결론 및 시사점

## 내용
{{content}}`
    },
    {
        id: 'meta-hub',
        name: '메타허브',
        icon: '🧠',
        description: '지식을 연결하고 관리하는 메타 노트입니다.',
        systemPrompt: `You are a meta-knowledge organizer.
Create structure across multiple notes.
Identify categories, links, and navigation paths.
Design content suitable for MOC (Map of Content).`,
        userPromptTemplate: `다음 내용을 메타허브(MOC) 노트로 정리해주세요.

## 메타허브 노트 구성
1. 🧠 핵심 주제 요약
2. 🗂️ 하위 노트 분류
3. 🔗 연결 구조 (링크 관계 설명)
4. 🧭 탐색 가이드
5. 📌 전체 구조 요약

## 내용
{{content}}`
    },
    {
        id: 'comprehensive',
        name: '종합분석',
        icon: '🎯',
        description: '브리핑, 개념, 인사이트 분석을 종합합니다.',
        systemPrompt: `You are a senior knowledge synthesizer and systems-thinking analyst.
Integrate multiple perspectives into a coherent whole.
Combine summary, conceptual structure, insights, analysis, and meta-organization.
Focus on relationships, patterns, trade-offs, and overarching conclusions.
Think in terms of systems, not isolated facts.
Produce a clear, structured, and navigable synthesis.`,
        userPromptTemplate: `다음 내용을 종합분석 노트 형식으로 정리해주세요.
(브리핑·개념·인사이트·분석·지식맵·메타 관점을 통합하는 상위 노트입니다)

## 종합분석 노트 구성

1. 🎯 전체 개요 (Executive Overview)
- 이 주제를 한 단락으로 요약
- 왜 중요한지, 어떤 범위를 다루는지 명확히 제시

2. 🧾 핵심 내용 종합 요약
- 주요 사실, 주장, 정보들을 브리핑 관점에서 정리
- 세부보다는 큰 흐름 중심

3. 📘 핵심 개념 구조
- 이 주제를 구성하는 주요 개념들
- 개념 간 관계, 계층, 대비 구조 설명

4. 💡 핵심 인사이트 통합
- 개별 인사이트들을 묶어 도출되는 상위 통찰
- 반복되는 패턴, 숨겨진 전제, 관점의 전환

5. 🗺️ 지식 구조 맵 (텍스트 기반)
- 중심 개념 → 하위 영역 → 세부 주제 구조
- 타임라인, 흐름, 원인-결과 관계가 있다면 함께 제시

6. 🔬 심층 분석 요약
- 주요 쟁점 또는 문제
- 선택지/대안/트레이드오프
- 한계점과 리스크

7. 🧠 메타 관점 정리
- 이 주제가 전체 지식 체계에서 차지하는 위치
- 다른 노트/분야와의 연결 포인트
- 향후 확장 가능한 방향

8. 🚀 결론 및 활용 방향
- 현재 시점에서의 종합적 결론
- 학습, 실무, 사고 확장 측면에서의 활용 제안
- 다음에 생성하거나 연결하면 좋은 노트 제안

## 내용
{{content}}`
    }
]

/**
 * 템플릿 ID로 기본 템플릿 찾기
 */
export function getTemplateById(id: string): AnalysisTemplate | undefined {
    return ANALYSIS_TEMPLATES.find((t) => t.id === id)
}

/**
 * 기본 템플릿의 복사본 가져오기 (수정용)
 */
export function getDefaultTemplateById(id: TemplateType): AnalysisTemplate | undefined {
    const template = ANALYSIS_TEMPLATES.find((t) => t.id === id)
    if (template) {
        return { ...template }
    }
    return undefined
}

/**
 * 사용자 정의 템플릿이 있으면 적용한 템플릿 반환
 */
export function getEffectiveTemplate(
    id: TemplateType,
    customTemplates: CustomTemplate[]
): AnalysisTemplate | undefined {
    const defaultTemplate = getTemplateById(id)
    if (!defaultTemplate) return undefined

    const customTemplate = customTemplates.find((t) => t.id === id)
    if (customTemplate) {
        return {
            ...defaultTemplate,
            systemPrompt: customTemplate.systemPrompt,
            userPromptTemplate: customTemplate.userPromptTemplate
        }
    }

    return defaultTemplate
}

/**
 * 프롬프트에 콘텐츠 주입
 */
export function renderPrompt(template: AnalysisTemplate, content: string): string {
    return template.userPromptTemplate.replace('{{content}}', content)
}
