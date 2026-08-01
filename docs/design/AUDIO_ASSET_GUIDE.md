# AUDIO ASSET GUIDE

Guild Chronicle 오디오 에셋 관리 기준서.

---

## 파일 위치

모든 오디오 파일은 `public/audio/` 폴더 한 곳에 둔다.

```
public/
  audio/
    guild-hall-bgm.mp3
    ui-hover.mp3
    ui-select.mp3
    ui-quest-paper-open.mp3
```

---

## 코드 참조 규칙

코드에서 오디오 파일을 참조할 때는 `/audio/파일명.mp3` 형식을 사용한다.

```typescript
// 올바른 예
new Audio("/audio/ui-quest-paper-open.mp3")

// 잘못된 예 — 하위 경로 사용 금지
new Audio("/game-assets/audio/sfx/ui-quest-paper-open.mp3")
```

Vite는 `public/` 폴더의 파일을 빌드 결과물 루트에 복사하므로 `/audio/` 경로가 올바르게 해석된다.

---

## 오디오 모듈 구조 (`src/lib/audio.ts`)

### 싱글턴 패턴

각 음원은 모듈 레벨 변수에 캐시한다. 최초 재생 시점에 `HTMLAudioElement`를 생성한다.

```typescript
let hoverEl: HTMLAudioElement | null = null;
function getHover(): HTMLAudioElement {
  if (!hoverEl) hoverEl = new Audio("/audio/ui-hover.mp3");
  return hoverEl;
}
```

### 볼륨 계수

| 음원 | 계수 | 설명 |
|------|------|------|
| BGM | SFX 볼륨 독립 | `bgmVolume / 100` |
| hover | 0.55 | 부드럽게 |
| select | 1.0 | 기준음 |
| paper-open | 0.9 | 약간 낮게 |

### 모듈 레벨 SFX 상태

`_sfxVolume`과 `_sfxMuted`는 `useAudio` 훅이 갱신한다.  
독립 함수(`playHover`, `playSelect`, `playQuestPaperOpen`)는 이 변수를 참조한다.

### 중복 재생 방지

`_paperOpenPlaying` 플래그로 종이 펼침 효과음이 겹치는 것을 막는다.  
재생 중 다시 호출하면 `currentTime = 0`으로 리셋만 한다.

---

## 현재 음원 목록

| 파일명 | 용도 | 함수 |
|--------|------|------|
| `guild-hall-bgm.mp3` | 배경 음악 (반복) | BGM 시스템 |
| `ui-hover.mp3` | 버튼 마우스오버 | `playHover()` |
| `ui-select.mp3` | 버튼 클릭 / 선택 확정 | `playSelect()` |
| `ui-quest-paper-open.mp3` | 의뢰서 상세 모달 열기 | `playQuestPaperOpen()` |

---

## 새 음원 추가 절차

1. `public/audio/` 폴더에 파일을 추가한다.
2. `src/lib/audio.ts`에 싱글턴 변수와 getter 함수를 추가한다.
3. 재생 함수를 작성하고 export한다.
4. 이 가이드의 음원 목록 표에 추가한다.

---

## BGM 자동 시작

브라우저 정책상 사용자 입력이 없으면 오디오를 재생할 수 없다.  
`useAudio` 훅은 최초 `click` 또는 `keydown` 이벤트 시 BGM을 시작한다.  
이벤트 리스너는 `{ once: true }` 옵션으로 단 한 번만 발화한다.

---

## localStorage 볼륨 저장

| 키 | 기본값 | 설명 |
|----|--------|------|
| `guild-chronicle-bgm-volume` | 15 | BGM 볼륨 (0–100) |
| `guild-chronicle-sfx-volume` | 35 | SFX 볼륨 (0–100) |
| `guild-chronicle-bgm-muted` | false | BGM 음소거 |
| `guild-chronicle-sfx-muted` | false | SFX 음소거 |
