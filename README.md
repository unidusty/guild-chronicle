# Guild Chronicle

판타지 세계의 모험가 길드를 운영하는 PC 경영 시뮬레이션 게임.

## 현재 버전

**0018-P — Project Documentation Refactor & Workflow System**

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 표시되는 주소로 접속한다. 기본 주소는 `http://localhost:5173`이다.

## 빌드 확인

```bash
npm run check
npm run build
```

## 기술 스택

- React 19 + TypeScript 5.8 + Vite 7
- 순수 CSS (프레임워크 없음)
- 상태: 순수 함수 `(state: GameState) => GameState`

## 프로젝트 구조

```
Guild Chronicle/
├── src/
│   ├── game/           순수 게임 로직
│   ├── features/       기능 단위 상태·화면 연결
│   └── components/     공용 UI
├── docs/               설계 문서
│   ├── 00_PROJECT/     프로젝트 운영
│   ├── 01_SYSTEM/      게임 시스템 설계
│   ├── 02_DATABASE/    데이터 구조
│   ├── 03_DESIGN/      구현 설계 가이드
│   └── 99_BRAINSTORM/  아이디어·미확정 기획
├── tasks/              작업지시서 관리
│   ├── todo/           대기 중
│   ├── doing/          진행 중
│   └── archive/        완료된 작업
└── public/             정적 에셋
```

## 문서

| 문서 | 경로 |
|------|------|
| 프로젝트 개요 | `docs/00_PROJECT/PROJECT_OVERVIEW.md` |
| 개발 규칙 | `docs/00_PROJECT/PROJECT_RULES.md` |
| 공식 용어 사전 | `docs/00_PROJECT/PROJECT_TERMINOLOGY.md` |
| 게임 비전 | `docs/00_PROJECT/GAME_VISION.md` |
| 로드맵 | `docs/00_PROJECT/ROADMAP.md` |
| 현재 상태 | `docs/00_PROJECT/PROJECT_STATUS.md` |
| 변경 이력 | `docs/00_PROJECT/CHANGELOG.md` |
| 게임 시스템 | `docs/01_SYSTEM/GAME_SYSTEM.md` |
| 설계 가이드 | `docs/03_DESIGN/` |

## 개발 방식

모든 개발은 **문서 먼저 → 구현 나중** 원칙으로 진행한다.

```
기획 → tasks/todo/ 작업지시서 → docs/ 설계 문서 → 코드 → tasks/archive/ 보관
```

→ 상세: `docs/00_PROJECT/PROJECT_WORKFLOW.md`
