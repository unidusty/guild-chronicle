# Guild Chronicle — 문서 구조

이 디렉토리는 Guild Chronicle 프로젝트의 공식 설계 문서를 보관한다.

---

## 폴더 구성

| 폴더 | 역할 |
|------|------|
| `00_PROJECT/` | 프로젝트 운영 — 비전, 규칙, 용어, 현황, 로드맵, 워크플로우, 변경 이력 |
| `01_SYSTEM/` | 게임 시스템 설계 — 핵심 규칙, 시스템 개요 |
| `02_DATABASE/` | 데이터 구조 — 엔티티 정의, 샘플 데이터, 테이블 |
| `03_DESIGN/` | 구현 설계 가이드 — 각 시스템의 상세 구현 기준 |
| `99_BRAINSTORM/` | 아이디어 및 미확정 기획 — 공식 설계 전 단계 |

---

## 빠른 참조

- 프로젝트 소개 → `00_PROJECT/PROJECT_OVERVIEW.md`
- 개발 규칙 → `00_PROJECT/PROJECT_RULES.md`
- 현재 상태 → `00_PROJECT/PROJECT_STATUS.md`
- 로드맵 → `00_PROJECT/ROADMAP.md`
- 변경 이력 → `00_PROJECT/CHANGELOG.md`
- 게임 시스템 → `01_SYSTEM/GAME_SYSTEM.md`
- 설계 가이드 → `03_DESIGN/`

---

## 문서 작성 원칙

- 공식 설계 문서는 `docs/` 하위에만 작성한다.
- 아이디어·미확정 기획은 `99_BRAINSTORM/`에 둔다.
- 현재 작업은 `/tasks/` 폴더에서 관리한다.
- 문서 내부 링크는 루트 기준 절대경로(`docs/03_DESIGN/XXX.md`)를 사용한다.
