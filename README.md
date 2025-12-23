# Star Gate

Obsidian용 웹 클리퍼 플러그인 - 멀티탭 브라우저와 AI 분석 기능을 제공합니다.

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

| Provider | 설명 |
|----------|------|
| OpenAI | GPT-4o 등 |
| Anthropic | Claude |
| Google Gemini | Gemini 2.0 Flash 등 |
| Groq | Llama 3.3 70B 등 (초고속) |
| z.ai (GLM) | GLM-4 |
| Ollama | 로컬 LLM |

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
