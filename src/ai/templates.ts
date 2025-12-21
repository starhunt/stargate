/**
 * AI 분석 템플릿 정의
 */

import { AnalysisTemplate, CustomTemplate, TemplateType } from '../types'

export const ANALYSIS_TEMPLATES: AnalysisTemplate[] = [
    {
        id: 'basic-summary',
        name: '기본 요약',
        icon: '📋',
        description: '페이지 내용을 간결하게 요약합니다.',
        systemPrompt: `You are a helpful assistant that summarizes web content concisely and accurately.
Focus on the main points and key information.
Use bullet points for clarity.
Explain technical terms in simple language.`,
        userPromptTemplate: `다음 웹 페이지 내용을 간결하게 요약해주세요.

## 요약 형식
- 3-5개의 핵심 포인트로 정리
- 전문 용어가 있다면 간단히 설명
- 핵심 내용 강조

## 내용
{{content}}`
    },
    {
        id: 'study-note',
        name: '학습 노트',
        icon: '📚',
        description: '학습에 최적화된 형태로 정리합니다.',
        systemPrompt: `You are an educational content specialist.
Transform content into an effective study format.
Use clear headings and structured organization.
Include practice questions for better retention.`,
        userPromptTemplate: `다음 내용을 학습에 최적화된 노트 형식으로 정리해주세요.

## 학습 노트 구성
1. **핵심 개념**: 가장 중요한 개념들
2. **중요 포인트**: 기억해야 할 내용들
3. **예시/사례**: 이해를 돕는 구체적인 예시
4. **Q&A**: 스스로 테스트할 수 있는 질문과 답변 3개
5. **복습 키워드**: 핵심 키워드 목록

## 내용
{{content}}`
    },
    {
        id: 'analysis-report',
        name: '분석 리포트',
        icon: '📊',
        description: '심층 분석 리포트를 생성합니다.',
        systemPrompt: `You are a professional analyst creating detailed reports.
Provide thorough analysis with clear structure.
Include insights and implications.
Use professional language and formatting.`,
        userPromptTemplate: `다음 내용에 대한 심층 분석 리포트를 작성해주세요.

## 리포트 구성
1. **개요**: 주제 소개 및 배경
2. **주요 발견사항**: 핵심 내용 분석
3. **심층 분석**: 의미와 맥락 해석
4. **시사점**: 중요한 함의와 영향
5. **결론 및 제안**: 정리와 다음 단계 제안

## 내용
{{content}}`
    },
    {
        id: 'idea-note',
        name: '아이디어 노트',
        icon: '💡',
        description: '아이디어 발굴 및 확장에 초점을 맞춥니다.',
        systemPrompt: `You are a creative thinking facilitator.
Help expand ideas and find connections.
Encourage innovative thinking.
Suggest practical applications.`,
        userPromptTemplate: `다음 내용에서 아이디어를 발굴하고 확장해주세요.

## 아이디어 노트 구성
1. **핵심 아이디어**: 내용에서 발견한 주요 아이디어들
2. **관련 아이디어**: 연결되는 다른 개념이나 아이디어
3. **적용 방안**: 실제로 활용할 수 있는 방법
4. **발전 가능성**: 더 발전시킬 수 있는 방향
5. **연결점**: 다른 분야와의 연결 가능성

## 내용
{{content}}`
    },
    {
        id: 'action-items',
        name: '액션 아이템',
        icon: '✅',
        description: '실행 가능한 태스크 목록을 추출합니다.',
        systemPrompt: `You are a productivity expert.
Extract actionable tasks from content.
Prioritize tasks clearly.
Provide time estimates when possible.`,
        userPromptTemplate: `다음 내용에서 실행 가능한 태스크 목록을 추출해주세요.

## 액션 아이템 형식
1. **즉시 실행** (오늘 내): 바로 할 수 있는 항목들
2. **단기 목표** (이번 주): 가까운 시일 내 처리할 항목
3. **중기 목표** (이번 달): 계획이 필요한 항목
4. **장기 목표** (그 이후): 지속적으로 추진할 항목

각 항목에 대해:
- [ ] 구체적인 액션 (예상 소요시간)

## 내용
{{content}}`
    },
    {
        id: 'qa-format',
        name: 'Q&A 형식',
        icon: '❓',
        description: '질문과 답변 형태로 재구성합니다.',
        systemPrompt: `You are an expert at creating educational Q&A content.
Generate insightful questions and comprehensive answers.
Cover different aspects of the topic.
Vary question types for comprehensive understanding.`,
        userPromptTemplate: `다음 내용을 질문과 답변 형태로 재구성해주세요.

## Q&A 형식
최소 5개의 Q&A를 생성해주세요.

각 Q&A는 다음 형식으로:
### Q: [질문]
**A:** [답변]

질문 유형을 다양하게:
- 정의/개념 질문
- 이유/원인 질문
- 방법/과정 질문
- 비교/대조 질문
- 적용/응용 질문

## 내용
{{content}}`
    },
    {
        id: 'mindmap',
        name: '마인드맵',
        icon: '🧠',
        description: '계층적 마인드맵 구조로 정리합니다.',
        systemPrompt: `You are an expert at organizing information into mind maps.
Create clear hierarchical structures.
Use indentation to show relationships.
Keep nodes concise but meaningful.`,
        userPromptTemplate: `다음 내용을 마인드맵 형식으로 정리해주세요.

## 마인드맵 형식
Markdown 들여쓰기를 사용하여 계층 구조를 표현합니다.

예시:
- **중심 주제**
  - 주요 가지 1
    - 세부 항목 1-1
    - 세부 항목 1-2
      - 키워드
  - 주요 가지 2
    - 세부 항목 2-1

## 작성 규칙
- 중심 주제에서 시작
- 주요 개념을 가지(Branch)로 표현
- 세부 내용은 하위 항목으로
- 각 항목은 간결하게 (1-5단어)
- 연관성 있는 항목들끼리 그룹화

## 내용
{{content}}`
    },
    {
        id: 'briefing',
        name: '브리핑 문서',
        icon: '📑',
        description: '임원/팀 보고용 간결한 브리핑 문서를 생성합니다.',
        systemPrompt: `You are an executive briefing specialist.
Create concise, high-impact briefing documents.
Focus on key decisions and actions needed.
Use professional business language.`,
        userPromptTemplate: `다음 내용을 임원/팀 브리핑용 문서로 작성해주세요.

## 브리핑 문서 형식

### 핵심 요약
(1-2문장으로 가장 중요한 내용)

### 배경/상황
(왜 이것이 중요한지)

### 주요 포인트
1.
2.
3.
(최대 5개)

### 권장 조치 / 다음 단계
- 즉각적인 조치가 필요한 사항
- 검토가 필요한 사항

### 리스크 / 고려사항
- 잠재적 위험 요소
- 주의해야 할 점

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
