# PROJECT RULES

## 게임 방향
- 이 게임은 액션 RPG가 아니라 길드 경영 시뮬레이션이다.
- 플레이어는 전투를 직접 조작하지 않는다.
- 모바일 수집형 게임처럼 보이는 UI를 만들지 않는다.

## 개발 원칙
- 한 번의 업데이트에서는 정해진 범위만 수정한다.
- 관련 없는 폴더와 파일을 동시에 손대지 않는다.
- 기능 구현 전에 데이터 구조와 규칙을 문서에 먼저 기록한다.

## 코드 구조
- `src/game`은 순수 게임 로직을 담당한다.
- `src/features`는 기능 단위 상태와 화면 연결을 담당한다.
- `src/components`는 공용 UI를 담당한다.
- 랜덤 생성 로직은 `src/game/generator`에 둔다.
- 의뢰 진행 로직은 `src/game/simulation/` 내 파일에만 둔다.

## 에셋 규칙
- 이미지 경로와 개수를 코드에 하드코딩하지 않는다.
- 에셋 폴더를 스캔해 자동으로 목록화한다.
- 에셋이 없어도 플레이스홀더로 실행된다.
- 파일명은 영문 소문자와 하이픈을 사용한다.
- 오디오 파일은 `public/audio/` 한 곳에만 둔다.
- 오디오 경로는 코드에서 `/audio/파일명.mp3` 형식을 사용한다.
- 설계 기준은 `docs/03_DESIGN/AUDIO_ASSET_GUIDE.md`를 따른다.

## 모험 기록 규칙
- 모험 기록(AdventureLog) 내러티브는 실제 게임 상태에서 파생한다.
- 내러티브 문장을 생성할 때 임의로 사실을 만들지 않는다.
- 같은 questId·day·category 조합은 언제나 동일한 템플릿을 선택한다 (결정적 해시).
- 내러티브는 `src/game/simulation/adventureLog.ts`에서만 생성한다.
- 모든 Scene 템플릿은 `adventureLog.ts` 내부 상수로 정의한다.
- 새 카테고리 추가 시 타입·템플릿·CSS·레이블 네 곳을 모두 업데이트한다.

## 이벤트 엔진 규칙
- 이벤트 정의는 `src/game/simulation/eventEngine.ts`의 `EVENT_POOL`에만 추가한다.
- 이벤트 ID 형식: `ev-{category}-{3자리 번호}` (예: `ev-combat-021`).
- 의뢰 유형 전용 이벤트는 `allowedQuestTypes`로 제한한다.
- 귀환(`returning`) 단계에서는 `environment` / `danger` 이벤트만 발생한다.
- 이벤트 반복 억제는 Event Memory(최근 8개)와 urgency weight를 통해 처리한다.

## Quest Director 규칙
- 의뢰는 반드시 논리적인 흐름을 거쳐 완료되어야 한다. 과정 없는 결과는 없다.
- 필수 단계(MandatoryStep)는 `questValidation.ts`에 정의한다.
- 귀환까지 남은 기간이 미완료 필수 단계 수 이하로 줄면 Director가 강제 이벤트를 생성한다.
- 개발 모드에서는 완료 시 미충족 필수 단계를 `console.warn`으로 알린다.
- Quest Director 강제 이벤트는 `rarity: "epic"` 이벤트를 생성하지 않는다.

## 기록 규칙
- 모험가의 초상화 ID는 생성 시 확정하고 저장한다.
- 은퇴, 이탈, 실종, 사망한 모험가도 기록에서 삭제하지 않는다.
- 중요한 사건은 길드 연대기와 개인 연대기에 함께 기록한다.
- 연대기에는 의미 있는 사건만 기록한다. 단순 날짜 변경은 기록하지 않는다.
