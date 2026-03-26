/**
 * AI 분석 템플릿 정의 (i18n 지원)
 */

import { AnalysisTemplate, CustomTemplate, TemplateType } from '../types'
import { t } from '../i18n'

// 로케일별 템플릿 데이터 (name, description, systemPrompt, userPromptTemplate)
interface TemplateLocaleData {
    name: string
    description: string
    systemPrompt: string
    userPromptTemplate: string
}

type TemplateLocaleMap = Record<string, Record<TemplateType, TemplateLocaleData>>

const TEMPLATE_LOCALE_DATA: TemplateLocaleMap = {
    ko: {
        briefing: {
            name: '브리핑',
            description: '브리핑 문서, 뉴스, 리포트 내용을 빠르게 파악합니다.',
            systemPrompt: `You are a briefing and summarization specialist.
Focus on clarity, context, and fast understanding.
핵심 메시지, 배경, 의미를 구조적으로 정리하세요.
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
        concept: {
            name: '개념정리',
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
        insight: {
            name: '인사이트',
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
        'knowledge-map': {
            name: '지식맵',
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
        'deep-analysis': {
            name: '심층분석',
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
        'meta-hub': {
            name: '메타허브',
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
        comprehensive: {
            name: '종합분석',
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
    },
    en: {
        briefing: {
            name: 'Briefing',
            description: 'Quickly grasp briefing documents, news, and reports.',
            systemPrompt: `You are a briefing and summarization specialist.
Focus on clarity, context, and fast understanding.
Extract key messages, background, and implications in a structured manner.
Use the Feynman Technique to ensure explainability.
Avoid unnecessary details and emotional language.`,
            userPromptTemplate: `Please organize the following content into a briefing note format.

## Briefing Note Structure
1. 🎯 Executive Summary (5-7 lines)
2. 📌 Key Points
   - Background
   - Core Content
   - Implications
3. 🧠 Feynman Technique Explanation
   - Simple explanation
   - Analogy or example
4. ❓ 2-3 Key Questions

## Content
{{content}}`
        },
        concept: {
            name: 'Concept',
            description: 'Organize theory and concept-based foundational knowledge.',
            systemPrompt: `You are a conceptual knowledge architect.
Define concepts clearly and explain their internal structure.
Highlight relationships between concepts.
Use the Feynman Technique to simplify without losing accuracy.
Prioritize precision over breadth.`,
            userPromptTemplate: `Please organize the following content into a concept note format.

## Concept Note Structure
1. 🔑 Core Concept Definition
2. 🧩 Concept Structure
   - Components
   - Operating principles or logical flow
3. 🔗 Related Concepts & Comparisons
4. 🧠 Feynman Technique Explanation
   - Simple explanation
   - Common misconceptions
5. 📌 Summary

## Content
{{content}}`
        },
        insight: {
            name: 'Insight',
            description: 'Expand thinking beyond surface information.',
            systemPrompt: `You are an insight generation facilitator.
Go beyond surface information to extract meaning.
Encourage new perspectives and connections.
Focus on implications, patterns, and thinking expansion.`,
            userPromptTemplate: `Please expand the following content into an insight note.

## Insight Note Structure
1. 🎯 Key Insights
2. 🔍 Hidden Meanings or Patterns
3. 🔗 Connected Concepts / Fields
4. 🚀 Expansion Ideas
5. ❓ 2-3 Thought-Expanding Questions

## Content
{{content}}`
        },
        'knowledge-map': {
            name: 'Knowledge Map',
            description: 'Arrange knowledge structurally and spatially.',
            systemPrompt: `You are a knowledge mapping specialist.
Organize information spatially and structurally.
Focus on hierarchy, sequence, and relationships.
Prepare content suitable for mind maps or diagrams.`,
            userPromptTemplate: `Please structure the following content into a knowledge map note.

## Knowledge Map Note Structure
1. 🧠 Central Topic
2. 🌿 Sub-concept Tree
3. ⏱️ Timeline or Flow (if applicable)
4. 🔗 Relationships Between Concepts
5. 📌 Structure Summary

## Content
{{content}}`
        },
        'deep-analysis': {
            name: 'Deep Analysis',
            description: 'Analysis notes for research, comparison, and problem-solving.',
            systemPrompt: `You are an analytical research assistant.
Break down problems systematically.
Compare options, identify causes, and evaluate outcomes.
Present structured and evidence-based analysis.`,
            userPromptTemplate: `Please organize the following content into a deep analysis note.

## Deep Analysis Note Structure
1. 🎯 Subject & Problem Definition
2. 🔍 Key Issue Analysis
3. ⚖️ Comparison or Alternative Evaluation
4. 📊 Evidence & Logical Reasoning
5. 🧠 Conclusions & Implications

## Content
{{content}}`
        },
        'meta-hub': {
            name: 'Meta Hub',
            description: 'Meta notes for connecting and managing knowledge.',
            systemPrompt: `You are a meta-knowledge organizer.
Create structure across multiple notes.
Identify categories, links, and navigation paths.
Design content suitable for MOC (Map of Content).`,
            userPromptTemplate: `Please organize the following content into a Meta Hub (MOC) note.

## Meta Hub Note Structure
1. 🧠 Core Topic Summary
2. 🗂️ Sub-note Classification
3. 🔗 Connection Structure (link relationships)
4. 🧭 Navigation Guide
5. 📌 Overall Structure Summary

## Content
{{content}}`
        },
        comprehensive: {
            name: 'Comprehensive',
            description: 'Synthesizes briefing, concept, and insight analyses.',
            systemPrompt: `You are a senior knowledge synthesizer and systems-thinking analyst.
Integrate multiple perspectives into a coherent whole.
Combine summary, conceptual structure, insights, analysis, and meta-organization.
Focus on relationships, patterns, trade-offs, and overarching conclusions.
Think in terms of systems, not isolated facts.
Produce a clear, structured, and navigable synthesis.`,
            userPromptTemplate: `Please organize the following content into a comprehensive analysis note.
(This is a higher-level note integrating briefing, concept, insight, analysis, knowledge map, and meta perspectives)

## Comprehensive Analysis Note Structure

1. 🎯 Executive Overview
- Summarize the topic in one paragraph
- Clearly state why it matters and the scope covered

2. 🧾 Consolidated Content Summary
- Organize key facts, claims, and information from a briefing perspective
- Focus on the big picture rather than details

3. 📘 Core Concept Structure
- Key concepts that compose this topic
- Explain relationships, hierarchies, and contrasts between concepts

4. 💡 Integrated Key Insights
- Higher-level insights derived from combining individual insights
- Recurring patterns, hidden assumptions, shifts in perspective

5. 🗺️ Knowledge Structure Map (text-based)
- Central concept → sub-areas → detailed topic structure
- Include timelines, flows, and cause-effect relationships if applicable

6. 🔬 Deep Analysis Summary
- Key issues or problems
- Options/alternatives/trade-offs
- Limitations and risks

7. 🧠 Meta Perspective
- Position of this topic within the broader knowledge system
- Connection points to other notes/fields
- Future expansion directions

8. 🚀 Conclusions & Application
- Comprehensive conclusions at this point
- Application suggestions for learning, practice, and thinking expansion
- Suggested notes to create or connect next

## Content
{{content}}`
        }
    }
}

// 템플릿 아이콘 (로케일 불변)
const TEMPLATE_ICONS: Record<TemplateType, string> = {
    briefing: '📰',
    concept: '📘',
    insight: '💡',
    'knowledge-map': '🗺️',
    'deep-analysis': '🔬',
    'meta-hub': '🧠',
    comprehensive: '🎯',
}

// 템플릿 ID 순서
const TEMPLATE_IDS: TemplateType[] = [
    'briefing', 'concept', 'insight', 'knowledge-map',
    'deep-analysis', 'meta-hub', 'comprehensive'
]

/**
 * 현재 로케일에 맞는 템플릿 목록 반환
 */
function getLocaleKey(): string {
    // t() 호출로 현재 로케일 추론 (en 번역의 고유 값으로 판별)
    return t().common.save === 'Save' ? 'en' : 'ko'
}

/**
 * 현재 로케일의 분석 템플릿 반환
 */
export function getAnalysisTemplates(): AnalysisTemplate[] {
    const locale = getLocaleKey()
    const data = TEMPLATE_LOCALE_DATA[locale] || TEMPLATE_LOCALE_DATA['ko']

    return TEMPLATE_IDS.map(id => ({
        id,
        icon: TEMPLATE_ICONS[id],
        ...data[id],
    }))
}

/**
 * 하위 호환용 - 현재 로케일 기반 (기존 ANALYSIS_TEMPLATES 참조처 호환)
 */
export const ANALYSIS_TEMPLATES: AnalysisTemplate[] = getAnalysisTemplates()

/**
 * 템플릿 ID로 기본 템플릿 찾기
 */
export function getTemplateById(id: string): AnalysisTemplate | undefined {
    return getAnalysisTemplates().find((t) => t.id === id)
}

/**
 * 기본 템플릿의 복사본 가져오기 (수정용)
 */
export function getDefaultTemplateById(id: TemplateType): AnalysisTemplate | undefined {
    const template = getAnalysisTemplates().find((t) => t.id === id)
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
