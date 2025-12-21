# Obsidian Web Clipper Pro - 개발 상세 계획서

## 1. 프로젝트 개요

### 1.1 목표
범용 웹 콘텐츠 캡처 및 LLM 기반 가공 후 Obsidian 노트로 저장하는 플러그인 개발

### 1.2 핵심 기능
| 기능 | 설명 |
|------|------|
| **웹뷰 브라우저** | 오른쪽 패널에 내장 브라우저 제공 |
| **콘텐츠 캡처** | 전체 페이지 / 선택 영역 / 클립보드 데이터 캡처 |
| **LLM 가공** | 다양한 LLM 프로바이더를 통한 콘텐츠 요약/변환 |
| **자동 분류** | 콘텐츠 분석 기반 폴더/태그 자동 분류 |
| **템플릿 시스템** | 사용자 정의 노트 템플릿 지원 |

### 1.3 배포 방식
- GitHub 저장소: `github.com/{username}/obsidian-web-clipper-pro`
- BRAT (Beta Reviewers Auto-update Tester) 플러그인 통한 배포
- 추후 Obsidian 커뮤니티 플러그인 등록

---

## 2. 기술 스택

```
├── 언어: TypeScript
├── 빌드: esbuild
├── UI: Obsidian API (ItemView, Modal, Setting)
├── 통신: postMessage API (플러그인 ↔ 웹뷰)
├── LLM: OpenAI, Anthropic, Gemini, GLM, Ollama 등
└── 저장: Obsidian Vault API
```

---

## 3. 프로젝트 구조

```
obsidian-web-clipper-pro/
├── src/
│   ├── main.ts                    # 플러그인 진입점
│   ├── settings.ts                # 설정 인터페이스 & 기본값
│   ├── constants.ts               # 상수 정의
│   │
│   ├── views/
│   │   ├── BrowserView.ts         # 메인 브라우저 뷰
│   │   ├── BrowserToolbar.ts      # 상단 툴바 컴포넌트
│   │   └── webview/
│   │       ├── inject.ts          # 웹페이지 주입 스크립트
│   │       └── content.html       # 웹뷰 래퍼 HTML
│   │
│   ├── modals/
│   │   ├── ClipperModal.ts        # 콘텐츠 가공 다이얼로그
│   │   ├── TemplateModal.ts       # 템플릿 선택 모달
│   │   ├── FolderSelectModal.ts   # 저장 경로 선택 모달
│   │   └── LLMProcessModal.ts     # LLM 처리 진행 모달
│   │
│   ├── services/
│   │   ├── LLMService.ts          # LLM API 통합 서비스
│   │   ├── ContentExtractor.ts    # 웹 콘텐츠 추출
│   │   ├── NoteManager.ts         # 노트 생성/관리
│   │   ├── TemplateEngine.ts      # 템플릿 렌더링
│   │   └── AutoClassifier.ts      # 자동 분류 로직
│   │
│   ├── utils/
│   │   ├── htmlToMarkdown.ts      # HTML → Markdown 변환
│   │   ├── sanitizer.ts           # 파일명/경로 정리
│   │   └── messageHandler.ts      # postMessage 핸들러
│   │
│   └── types/
│       ├── settings.ts            # 설정 타입
│       ├── content.ts             # 콘텐츠 타입
│       └── llm.ts                 # LLM 관련 타입
│
├── styles.css                     # 플러그인 스타일
├── manifest.json                  # 플러그인 메타데이터
├── versions.json                  # 버전 호환성 매핑
├── package.json                   # npm 의존성
├── tsconfig.json                  # TypeScript 설정
├── esbuild.config.mjs             # 빌드 설정
└── README.md                      # 사용 설명서
```

---

## 4. 핵심 컴포넌트 설계

### 4.1 BrowserView (메인 뷰)

```
┌─────────────────────────────────────────────────────────────┐
│  Web Clipper Pro                                    [_][□][X] │
├─────────────────────────────────────────────────────────────┤
│ ┌─ 네비게이션 바 ─────────────────────────────────────────┐ │
│ │ [←][→][↻] [                    URL 입력                ] [Go] │
│ └───────────────────────────────────────────────────────────┘ │
│ ┌─ 툴바 ───────────────────────────────────────────────────┐ │
│ │ [📄 전체] [✂️ 선택] [📋 클립보드] │ 저장: [폴더 선택 ▼]  │ │
│ │ ☑ 자동분류  ☑ LLM가공  │ 템플릿: [기본 ▼]  [⚙️ 설정]  │ │
│ └───────────────────────────────────────────────────────────┘ │
│ ┌─ 웹뷰 (iframe) ─────────────────────────────────────────┐ │
│ │                                                         │ │
│ │                    웹페이지 표시 영역                    │ │
│ │                                                         │ │
│ │                                                         │ │
│ │                                                         │ │
│ └───────────────────────────────────────────────────────────┘ │
│ ┌─ 상태바 ─────────────────────────────────────────────────┐ │
│ │ ✓ 준비됨 │ 마지막 저장: 2024-01-15 14:30                 │ │
│ └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 ClipperModal (가공 다이얼로그)

```
┌─────────────────────────────────────────────────────────────┐
│  콘텐츠 가공                                            [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📝 원본 콘텐츠                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [추출된 텍스트/HTML 미리보기]                       │   │
│  │ ...                                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🤖 LLM 가공 옵션                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 프롬프트 선택: [요약 ▼] [커스텀 프롬프트...]        │   │
│  │                                                     │   │
│  │ ○ 요약 (3문장)                                      │   │
│  │ ○ 상세 요약 (파인만 기법)                           │   │
│  │ ○ 핵심 포인트 추출                                  │   │
│  │ ○ 번역 (한국어)                                     │   │
│  │ ○ 커스텀 프롬프트                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📁 저장 옵션                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 폴더: [Clippings/] [📂]                             │   │
│  │ 파일명: [자동 생성된 제목]                          │   │
│  │ 태그: [web] [article] [+추가]                       │   │
│  │ ☑ 원본 URL 포함  ☑ 캡처 날짜 포함                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [LLM 가공 실행]  [원본 그대로 저장]  [취소]               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Settings Tab (설정 화면)

```
┌─────────────────────────────────────────────────────────────┐
│  Web Clipper Pro 설정                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ▼ 기본 설정                                               │
│    기본 저장 폴더: [Clippings]                             │
│    자동 분류 활성화: [ON]                                  │
│    기본 템플릿: [Standard ▼]                               │
│                                                             │
│  ▼ LLM 설정                                                │
│    프로바이더: [OpenAI ▼]                                  │
│    API Key: [••••••••••••••••]                             │
│    모델: [gpt-4o ▼]                                        │
│    Max Tokens: [4096]                                      │
│    [연결 테스트]                                           │
│                                                             │
│  ▼ 자동 분류 규칙                                          │
│    ┌───────────────────────────────────────────────────┐   │
│    │ 도메인         │ 폴더              │ 태그         │   │
│    ├───────────────────────────────────────────────────┤   │
│    │ youtube.com   │ Media/YouTube     │ video        │   │
│    │ github.com    │ Dev/GitHub        │ code, dev    │   │
│    │ medium.com    │ Articles/Medium   │ blog         │   │
│    │ news.*        │ News/{date}       │ news         │   │
│    └───────────────────────────────────────────────────┘   │
│    [+ 규칙 추가]                                           │
│                                                             │
│  ▼ 템플릿 관리                                             │
│    [Standard] [Article] [Code Snippet] [+ 새 템플릿]       │
│                                                             │
│  ▼ 단축키                                                  │
│    브라우저 열기: Ctrl+Shift+B                             │
│    빠른 캡처: Ctrl+Shift+C                                 │
│    선택 캡처: Ctrl+Shift+S                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 데이터 흐름

### 5.1 콘텐츠 캡처 → 저장 플로우

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   웹페이지   │────▶│  ContentExtractor │────▶│ ClipperModal │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │                    │
       │ postMessage        │ HTML/Text          │ 사용자 옵션
       ▼                    ▼                    ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ inject.ts   │     │ htmlToMarkdown │    │ LLMService  │
│ (선택영역)  │     │   변환기      │     │ (선택적)    │
└─────────────┘     └──────────────┘     └─────────────┘
                           │                    │
                           ▼                    ▼
                    ┌──────────────┐     ┌─────────────┐
                    │TemplateEngine│◀────│AutoClassifier│
                    └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ NoteManager  │
                    │  (저장)      │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Obsidian     │
                    │ Vault        │
                    └──────────────┘
```

### 5.2 postMessage 통신 프로토콜

```typescript
// 플러그인 → 웹뷰
interface PluginToWebview {
  type: 'INIT' | 'GET_SELECTION' | 'GET_FULL_PAGE' | 'HIGHLIGHT_MODE';
  payload?: any;
}

// 웹뷰 → 플러그인
interface WebviewToPlugin {
  type: 'PAGE_LOADED' | 'SELECTION_DATA' | 'FULL_PAGE_DATA' | 'ERROR';
  payload: {
    url: string;
    title: string;
    content?: string;
    html?: string;
    selection?: {
      text: string;
      html: string;
      rect: DOMRect;
    };
    metadata?: {
      author?: string;
      date?: string;
      description?: string;
      image?: string;
    };
  };
}
```

---

## 6. 핵심 기능 구현 상세

### 6.1 콘텐츠 추출 (ContentExtractor.ts)

```typescript
interface ExtractedContent {
  url: string;
  title: string;
  content: string;           // 마크다운 변환된 본문
  rawHtml: string;           // 원본 HTML
  metadata: {
    author: string | null;
    publishDate: string | null;
    description: string | null;
    image: string | null;
    siteName: string | null;
  };
  selection?: {              // 선택 영역 (있는 경우)
    text: string;
    html: string;
  };
}

class ContentExtractor {
  // 전체 페이지 추출
  extractFullPage(document: Document): ExtractedContent;

  // 선택 영역만 추출
  extractSelection(selection: Selection): ExtractedContent;

  // Reader Mode (본문만 추출)
  extractArticle(document: Document): ExtractedContent;

  // 메타데이터 추출 (Open Graph, Schema.org 등)
  private extractMetadata(document: Document): Metadata;
}
```

### 6.2 LLM 서비스 (LLMService.ts)

```typescript
interface LLMProvider {
  name: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxTokens: number;
}

interface ProcessingPrompt {
  id: string;
  name: string;
  template: string;
  description: string;
}

// 기본 제공 프롬프트
const DEFAULT_PROMPTS: ProcessingPrompt[] = [
  {
    id: 'summary-short',
    name: '간단 요약',
    template: '다음 내용을 3문장으로 요약해주세요:\n\n{{content}}',
    description: '핵심만 간단히'
  },
  {
    id: 'summary-detailed',
    name: '상세 요약 (파인만 기법)',
    template: `다음 내용을 파인만 기법으로 설명해주세요:

1. 핵심 개념 (쉬운 설명)
2. 비유/예시
3. 핵심 포인트 3가지

{{content}}`,
    description: '깊이 있는 이해를 위한 요약'
  },
  {
    id: 'key-points',
    name: '핵심 포인트',
    template: '다음 내용에서 핵심 포인트 5개를 bullet point로 추출해주세요:\n\n{{content}}',
    description: '빠른 스캔용'
  },
  {
    id: 'translate-ko',
    name: '한국어 번역',
    template: '다음 내용을 자연스러운 한국어로 번역해주세요:\n\n{{content}}',
    description: '영문 콘텐츠 번역'
  },
  {
    id: 'sq3r',
    name: 'SQ3R 학습 요약',
    template: `다음 내용을 SQ3R 방식으로 정리해주세요:

1. Survey (개요)
2. Question (핵심 질문 5개)
3. Read (섹션별 요약)
4. Recite (질문에 대한 답변)
5. Review (복습 체크리스트)

{{content}}`,
    description: '학습용 심층 정리'
  }
];

class LLMService {
  constructor(provider: LLMProvider);

  async process(content: string, promptTemplate: string): Promise<string>;

  async testConnection(): Promise<boolean>;

  // 지원 프로바이더
  private async callOpenAI(prompt: string): Promise<string>;
  private async callAnthropic(prompt: string): Promise<string>;
  private async callGemini(prompt: string): Promise<string>;
  private async callGLM(prompt: string): Promise<string>;
  private async callOllama(prompt: string): Promise<string>;
}
```

### 6.3 자동 분류 (AutoClassifier.ts)

```typescript
interface ClassificationRule {
  id: string;
  name: string;
  condition: {
    type: 'domain' | 'url_pattern' | 'content_keyword' | 'metadata';
    value: string | RegExp;
  };
  action: {
    folder: string;          // 경로 템플릿 (예: "News/{{date}}")
    tags: string[];
    template?: string;       // 사용할 템플릿 ID
  };
  priority: number;          // 우선순위 (낮을수록 먼저 적용)
}

// 기본 분류 규칙
const DEFAULT_RULES: ClassificationRule[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    condition: { type: 'domain', value: 'youtube.com' },
    action: { folder: 'Media/YouTube', tags: ['video', 'youtube'] },
    priority: 1
  },
  {
    id: 'github',
    name: 'GitHub',
    condition: { type: 'domain', value: 'github.com' },
    action: { folder: 'Dev/GitHub', tags: ['code', 'github'] },
    priority: 1
  },
  {
    id: 'medium',
    name: 'Medium',
    condition: { type: 'domain', value: 'medium.com' },
    action: { folder: 'Articles/Medium', tags: ['blog', 'article'] },
    priority: 1
  },
  {
    id: 'news',
    name: 'News Sites',
    condition: { type: 'url_pattern', value: /news|bbc|cnn|reuters/i },
    action: { folder: 'News/{{YYYY-MM}}', tags: ['news'] },
    priority: 2
  },
  {
    id: 'ai-keyword',
    name: 'AI/ML Content',
    condition: { type: 'content_keyword', value: 'machine learning|artificial intelligence|LLM|GPT' },
    action: { folder: 'Tech/AI', tags: ['ai', 'ml'] },
    priority: 3
  }
];

class AutoClassifier {
  constructor(rules: ClassificationRule[]);

  // URL과 콘텐츠 기반 분류
  classify(content: ExtractedContent): ClassificationResult;

  // 폴더 경로 템플릿 처리
  private resolveFolderTemplate(template: string, content: ExtractedContent): string;
}
```

### 6.4 템플릿 엔진 (TemplateEngine.ts)

```typescript
interface NoteTemplate {
  id: string;
  name: string;
  frontmatter: string;       // YAML 프론트매터 템플릿
  body: string;              // 본문 템플릿
}

// 기본 템플릿
const DEFAULT_TEMPLATES: NoteTemplate[] = [
  {
    id: 'standard',
    name: 'Standard',
    frontmatter: `---
title: "{{title}}"
source: {{url}}
author: {{author}}
date_saved: {{date_saved}}
date_published: {{date_published}}
tags: [{{tags}}]
---`,
    body: `# {{title}}

> Source: [{{site_name}}]({{url}})
> Saved: {{date_saved}}

{{content}}

---
## Notes

`
  },
  {
    id: 'article',
    name: 'Article',
    frontmatter: `---
title: "{{title}}"
source: {{url}}
type: article
author: {{author}}
date_saved: {{date_saved}}
date_published: {{date_published}}
tags: [{{tags}}, article]
---`,
    body: `# {{title}}

![[{{image}}]]

**Author:** {{author}}
**Published:** {{date_published}}
**Source:** [{{site_name}}]({{url}})

---

{{content}}

---
## Key Takeaways

-

## Related Notes

-
`
  },
  {
    id: 'llm-summary',
    name: 'LLM Summary',
    frontmatter: `---
title: "{{title}}"
source: {{url}}
type: summary
llm_model: {{llm_model}}
date_saved: {{date_saved}}
tags: [{{tags}}, llm-summary]
---`,
    body: `# {{title}}

> Original: [{{site_name}}]({{url}})
> Summarized with: {{llm_model}}

## Summary

{{llm_summary}}

---

## Original Content

{{content}}
`
  }
];

class TemplateEngine {
  constructor(templates: NoteTemplate[]);

  render(templateId: string, variables: Record<string, any>): string;

  // 변수 치환
  private replaceVariables(template: string, variables: Record<string, any>): string;
}
```

### 6.5 노트 관리자 (NoteManager.ts)

```typescript
class NoteManager {
  constructor(app: App);

  // 노트 생성
  async createNote(
    folderPath: string,
    fileName: string,
    content: string,
    options?: {
      overwrite?: boolean;
      appendIfExists?: boolean;
    }
  ): Promise<TFile>;

  // 폴더 생성 (없으면)
  async ensureFolder(path: string): Promise<TFolder>;

  // 파일명 정리 (특수문자 제거)
  sanitizeFileName(name: string): string;

  // 중복 체크
  async fileExists(path: string): Promise<boolean>;

  // 고유 파일명 생성
  async getUniqueFileName(folder: string, baseName: string): Promise<string>;
}
```

---

## 7. 설정 인터페이스

```typescript
interface WebClipperSettings {
  // 기본 설정
  defaultFolder: string;
  autoClassify: boolean;
  defaultTemplate: string;

  // LLM 설정
  llm: {
    enabled: boolean;
    provider: 'openai' | 'anthropic' | 'gemini' | 'glm' | 'ollama';
    apiKey: string;
    model: string;
    baseUrl?: string;
    maxTokens: number;
  };

  // 자동 분류 규칙
  classificationRules: ClassificationRule[];

  // 템플릿
  templates: NoteTemplate[];
  customPrompts: ProcessingPrompt[];

  // UI 설정
  showToolbar: boolean;
  defaultCaptureMode: 'full' | 'selection' | 'article';

  // 단축키
  hotkeys: {
    openBrowser: string;
    quickCapture: string;
    selectionCapture: string;
  };

  // 고급 설정
  includeImages: boolean;
  imageFolder: string;
  maxContentLength: number;
  debugMode: boolean;
}

const DEFAULT_SETTINGS: WebClipperSettings = {
  defaultFolder: 'Clippings',
  autoClassify: true,
  defaultTemplate: 'standard',

  llm: {
    enabled: false,
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o',
    maxTokens: 4096
  },

  classificationRules: DEFAULT_RULES,
  templates: DEFAULT_TEMPLATES,
  customPrompts: [],

  showToolbar: true,
  defaultCaptureMode: 'article',

  hotkeys: {
    openBrowser: 'Ctrl+Shift+B',
    quickCapture: 'Ctrl+Shift+C',
    selectionCapture: 'Ctrl+Shift+S'
  },

  includeImages: true,
  imageFolder: 'attachments',
  maxContentLength: 50000,
  debugMode: false
};
```

---

## 8. 명령어 (Commands)

| 명령어 ID | 이름 | 설명 | 단축키 |
|-----------|------|------|--------|
| `open-browser` | Open Web Clipper | 브라우저 패널 열기 | Ctrl+Shift+B |
| `quick-capture` | Quick Capture | 현재 페이지 즉시 캡처 | Ctrl+Shift+C |
| `selection-capture` | Capture Selection | 선택 영역 캡처 | Ctrl+Shift+S |
| `clipboard-capture` | Capture from Clipboard | 클립보드 내용 캡처 | Ctrl+Shift+V |
| `open-settings` | Open Settings | 설정 화면 열기 | - |

---

## 9. 개발 단계 (Phase)

### Phase 1: 기본 구조 (1주)
- [ ] 프로젝트 초기화 (manifest.json, package.json, tsconfig.json)
- [ ] 기본 플러그인 구조 (main.ts, settings.ts)
- [ ] BrowserView 기본 구현 (iframe 포함)
- [ ] Settings Tab 기본 구현
- [ ] BRAT 배포 설정

### Phase 2: 콘텐츠 캡처 (1주)
- [ ] ContentExtractor 구현
- [ ] HTML → Markdown 변환기
- [ ] postMessage 통신 구현
- [ ] 선택 영역 캡처 (inject.ts)
- [ ] 클립보드 캡처

### Phase 3: 저장 기능 (1주)
- [ ] NoteManager 구현
- [ ] TemplateEngine 구현
- [ ] ClipperModal (가공 다이얼로그)
- [ ] 기본 템플릿 3종

### Phase 4: LLM 통합 (1주)
- [ ] LLMService 구현 (OpenAI, Anthropic)
- [ ] LLMProcessModal 구현
- [ ] 기본 프롬프트 5종
- [ ] 커스텀 프롬프트 지원

### Phase 5: 자동 분류 (3일)
- [ ] AutoClassifier 구현
- [ ] 분류 규칙 UI
- [ ] 폴더 템플릿 처리

### Phase 6: 고급 기능 (1주)
- [ ] 추가 LLM 프로바이더 (Gemini, GLM, Ollama)
- [ ] 이미지 다운로드 및 첨부
- [ ] 히스토리 / 최근 캡처
- [ ] 다크모드 지원

### Phase 7: 테스트 & 배포 (3일)
- [ ] 단위 테스트
- [ ] 통합 테스트
- [ ] README 작성
- [ ] BRAT 배포
- [ ] 피드백 수집

---

## 10. 파일 생성 순서

```
1. manifest.json
2. package.json
3. tsconfig.json
4. esbuild.config.mjs
5. src/main.ts
6. src/settings.ts
7. src/constants.ts
8. src/types/*.ts
9. src/views/BrowserView.ts
10. src/services/NoteManager.ts
11. src/utils/htmlToMarkdown.ts
12. src/modals/ClipperModal.ts
13. src/services/ContentExtractor.ts
14. src/services/TemplateEngine.ts
15. src/services/LLMService.ts
16. src/services/AutoClassifier.ts
17. styles.css
18. README.md
```

---

## 11. 의존성

```json
{
  "devDependencies": {
    "@types/node": "^20.10.0",
    "builtin-modules": "^3.3.0",
    "esbuild": "^0.19.8",
    "obsidian": "latest",
    "typescript": "^5.3.0"
  },
  "dependencies": {
    "turndown": "^7.1.2"
  }
}
```

---

## 12. BRAT 배포 체크리스트

- [ ] GitHub 저장소 생성 (public)
- [ ] manifest.json 버전 설정 (0.1.0)
- [ ] versions.json 작성
- [ ] 릴리즈 생성 (tag: 0.1.0)
- [ ] 릴리즈에 파일 첨부:
  - manifest.json
  - main.js
  - styles.css
- [ ] README.md에 BRAT 설치 방법 기재

---

## 13. 확장 가능성

### 향후 기능 추가 고려
- **북마크 동기화**: 브라우저 북마크 가져오기
- **RSS 피드**: 피드 구독 및 자동 저장
- **Readwise 연동**: 하이라이트 동기화
- **다중 Vault 지원**: 여러 Vault에 저장
- **모바일 지원**: Obsidian Mobile 호환 (webview 제한 있음)
- **공유 기능**: 노트 공유 링크 생성

---

## 14. 참고 자료

- [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [BRAT Developer Guide](https://github.com/TfTHacker/obsidian42-brat/blob/main/BRAT-DEVELOPER-GUIDE.md)
- [Open Gate Plugin](https://github.com/nguyenvanduocit/obsidian-open-gate) (참고용)
- [Surfing Plugin](https://github.com/PKM-er/Obsidian-Surfing) (참고용)
