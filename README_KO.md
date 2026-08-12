# Star Gate

[English](./README.md) | [한국어](./README_KO.md)

멀티탭 브라우저와 AI 분석 템플릿으로 웹 페이지를 노트로 캡처하는 웹 클리퍼입니다.

## 주요 기능

- 고정 탭과 임시 탭을 지원하는 멀티탭 내장 브라우저
- 브리핑, 개념정리, 인사이트, 지식맵, 심층분석 등 AI 분석 템플릿
- 원문/선택 영역을 빠르게 저장하는 Quick Save
- YouTube 메타데이터 추출
- AI 제공자, 모델, 노트 템플릿, 고정 사이트 설정

## 설치 방법

### 커뮤니티 플러그인

1. 설정 → 커뮤니티 플러그인을 엽니다.
2. **Star Gate**를 검색합니다.
3. 설치 후 활성화합니다.

### 수동 설치

1. 최신 [GitHub 릴리스](https://github.com/starhunt/stargate/releases/latest)에서 `main.js`, `manifest.json`, `styles.css`를 다운로드합니다.
2. `<vault>/.obsidian/plugins/stargate/` 폴더를 만듭니다.
3. 다운로드한 파일을 해당 폴더에 복사합니다.
4. 앱을 다시 시작하거나 플러그인을 새로고침한 뒤 **Star Gate**를 활성화합니다.

### 소스에서 빌드

```bash
git clone https://github.com/starhunt/stargate.git
cd stargate
npm install
npm run build
```

## 사용 방법

1. 커뮤니티 플러그인에서 **Star Gate**를 활성화합니다.
2. 명령어 팔레트, 리본/사이드바 아이콘, 또는 컨텍스트 메뉴에서 기능을 실행합니다.
3. 필요한 API 키, 폴더, 템플릿, 학습 옵션을 설정에서 구성합니다.

## 명령어

- `Open Browser`
- `Open Browser in New Tab`
- `Open AI Analysis`
- `Quick Save (Raw Content)`

## 개인정보 및 네트워크 사용

Star Gate can load web pages that you open in its embedded browser. AI analysis uses only the providers and services you configure. The plugin does not collect telemetry.

## 라이선스

MIT License. [LICENSE](./LICENSE)를 참고하세요.

---

## 이전 한국어 README

# Star Gate

Obsidian용 웹 클리퍼 플러그인 - 멀티탭 브라우저와 AI 분석 기능을 제공합니다.

## Installation

### From Community Plugins
1. Open Settings → Community plugins.
2. Search for **Star Gate**.
3. Install and enable the plugin.

### Manual installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest GitHub release.
2. Copy them into `<vault>/.obsidian/plugins/stargate/`.
3. Restart the app and enable **Star Gate** in Community plugins.

## Usage

1. Click the globe ribbon icon or run **Star Gate: Open Browser** from the command palette.
2. Open a web page in the multi-tab browser.
3. Use **AI Analysis** to summarize or transform captured content, or use **Quick Save** to save raw page content.
4. Configure providers, API keys, pinned sites, and templates in the plugin settings.

## 주요 기능

### 멀티탭 브라우저
- **고정 탭**: 자주 사용하는 사이트 등록
- **임시 탭**: 필요에 따라 추가/삭제
- **세션 분리**: 각 탭별 독립 로그인 세션

### AI 분석 템플릿
| 템플릿 | 설명 |
|--------|------|
| 📰 브리핑 | 뉴스, 리포트 빠른 파악 |
| 📘 개념정리 | 이론·개념 중심 정리 |
| 💡 인사이트 | 사고 확장 및 연결 |
| 🗺️ 지식맵 | 구조적 지식 배치 |
| 🔬 심층분석 | 비교, 문제 해결 분석 |
| 🧠 메타허브 | MOC 스타일 메타 노트 |
| 🎯 종합분석 | 모든 관점 통합 분석 |

### 콘텐츠 캡처
- **전체 페이지**: 페이지 전체 내용 캡처
- **선택 텍스트**: 드래그한 영역만 캡처
- **클립보드**: 복사한 내용 바로 분석

### YouTube 지원
YouTube URL 감지 시 자동으로 메타데이터 추출:
- 채널명
- 재생시간
- 영상 유형
- 태그

## 지원 AI Provider

빌트인 프리셋으로 제공되는 제공자와 기본 모델입니다.

| Provider | 기본 모델 |
|----------|----------|
| OpenAI | GPT-5.6 Luna |
| Anthropic | Claude Sonnet 5 |
| Google Gemini | Gemini 3.6 Flash |
| xAI (Grok) | Grok 4.5 |
| z.ai (GLM) | GLM-5.2 |
| Upstage (Solar) | Solar Pro 4 |
| Ollama (Local) | Llama 3.2 (로컬 LLM) |

설정에서 모델을 직접 추가하거나, OpenAI 호환 API를 쓰는 커스텀 제공자를 등록할 수도 있습니다.

## 설치 방법

### BRAT (권장)

1. [BRAT](https://github.com/TfTHacker/obsidian42-brat) 플러그인 설치
2. BRAT 설정 → "Add Beta plugin"
3. `starhunt/stargate` 입력
4. Community plugins에서 **Star Gate** 활성화

### 수동 설치

1. [Releases](https://github.com/starhunt/stargate/releases)에서 최신 버전 다운로드
2. `main.js`, `manifest.json`, `styles.css`를 Vault의 `.obsidian/plugins/stargate/` 폴더에 복사
3. Obsidian 재시작
4. Community plugins에서 **Star Gate** 활성화

## 사용 방법

### 브라우저 열기
- 왼쪽 리본의 🌐 아이콘 클릭
- 또는 명령어 팔레트 → "Star Gate: Open Browser"

### AI 분석
1. 브라우저에서 웹페이지 열기
2. ✨ 버튼 클릭 (또는 `Cmd/Ctrl + Shift + A`)
3. 템플릿 선택 → "생성" 클릭
4. 미리보기 확인 → "적용"

### Quick Save (원문 저장)
- 단축키: `Cmd/Ctrl + Shift + S` (웹뷰 포커스 상태)
- AI 처리 없이 원문 바로 저장

## 설정

### AI 설정
- **Default Provider**: 기본 AI 제공자 선택
- **API Key**: 각 Provider별 API 키 입력
- **Model**: 사용할 모델 지정
- **Default Template**: Quick Analysis용 기본 템플릿

### 고정 사이트
- 자주 방문하는 사이트를 고정 탭으로 등록

### 노트 템플릿
사용 가능한 변수:
- `{{title}}` - 노트 제목
- `{{source}}` - 원본 URL
- `{{date}}` - 생성 날짜
- `{{template}}` - 사용된 템플릿명
- `{{provider}}` - AI Provider
- `{{model}}` - AI 모델
- `{{content}}` - 분석 결과
- `{{original}}` - 원문 (선택 시)

YouTube 전용 변수:
- `{{channel}}` - 채널명
- `{{duration}}` - 재생시간
- `{{videoType}}` - 영상 유형
- `{{videoTags}}` - 태그

조건부 섹션: `{{#key}}...{{/key}}` (값이 있을 때만 출력)

## 단축키

| 단축키 | 기능 | 비고 |
|--------|------|------|
| `Cmd/Ctrl + Shift + A` | AI Analysis 모달 | 웹뷰 포커스 시 |
| `Cmd/Ctrl + Shift + S` | Quick Save | 웹뷰 포커스 시 |

## 요구사항

- Obsidian v0.15.0 이상
- 데스크톱 전용 (모바일 미지원)

## 라이선스

MIT License

## 문의

이슈나 제안사항은 [GitHub Issues](https://github.com/starhunt/stargate/issues)에 등록해주세요.

## Privacy and network use

Star Gate can load web pages that you open in its embedded browser. Any AI analysis or external web content retrieval depends on the websites and services you choose to use; no telemetry is collected by this plugin.

## License

MIT License. See [LICENSE](./LICENSE).
