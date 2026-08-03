# VISUAL STYLE GUIDE

Guild Chronicle 비주얼 스타일 기준서.  
UI 컴포넌트·색상·타이포그래피·에셋 스타일의 일관성을 유지하기 위한 기준이다.

---

## 핵심 방향

Guild Chronicle은 PC 경영 시뮬레이션이다.  
화려한 판타지 RPG가 아니라, **어두운 분위기의 전문적인 길드 관리 도구**처럼 보여야 한다.

- 절제된 다크 판타지. 화려함보다 품격.
- 정보가 항상 주인공이다. 장식은 정보를 방해하지 않는다.
- 캐릭터(모험가)가 화면의 중심이다. 초상화와 이름이 먼저 눈에 들어와야 한다.

---

## 색상 팔레트

### 배경

| 토큰 | 값 | 용도 |
|------|-----|------|
| 앱 배경 | `#101411` | 전체 배경 (radial-gradient 적용) |
| 사이드바 | `#151a17` | 사이드바 패널 |
| 카드/패널 | `rgba(24, 30, 26, .94)` | 정보 카드, 패널 |
| 인라인 아이템 | `#1b211d` | 목록 행, 보고서 항목 |

### 테두리

| 용도 | 값 |
|------|----|
| 주 구분선 | `#30372f` |
| 카드 테두리 | `#303830` |
| 서브 구분선 | `#292f2a` |
| 미구현 요소 테두리 | `#2a2f2b` |

### 텍스트

| 토큰 | 값 | 용도 |
|------|-----|------|
| 주요 텍스트 | `#e8e5dc` | 기본 텍스트 (따뜻한 아이보리) |
| 중요 텍스트 | `#e4e5df` | 모험가 이름, 강조 값 |
| 보조 텍스트 | `#b9c0b9` | 표 셀, 설명 |
| 흐린 텍스트 | `#7f897f` / `#6f7971` | 레이블, 보조 정보 |
| 비활성 텍스트 | `#4a524c` | 미구현 메뉴, 비활성 버튼 |
| 상단 레이블 | `#737d75` | `th`, 섹션 레이블 |

### 골드 계열 (핵심 강조색)

| 용도 | 값 |
|------|----|
| 활성 내비게이션 테두리 | `#b79b5a` |
| 브랜드 마크, 랭크 | `#ceb476` |
| 부제·아이브로우 레이블 | `#9c8757` |
| 텍스트 버튼, 링크 | `#a99565` |
| 주요 버튼 배경 | `#a78b4f` |
| 주요 버튼 테두리 | `#ac9255` |
| 골드 뱃지 텍스트 | `#cdb276` |

### 상태 색상

| 상태 | 텍스트 | 테두리 | 배경 |
|------|--------|--------|------|
| 활성 (active) | `#8db49a` | `#3d5b47` | `#203026` |
| 경고 (warning) | `#d5a178` | `#644b39` | `#30251e` |
| 유휴 (idle) | `#979f99` | `#454d46` | `#252a26` |
| 위험 (danger) | `#d69184` | `#624139` | `#4d302b` |

---

## 타이포그래피

### 폰트 패밀리

| 용도 | 폰트 |
|------|------|
| 기본 (UI, 본문) | Inter, Pretendard, "Apple SD Gothic Neo", sans-serif |
| 제목, 랭크, 브랜드 | Georgia, "Times New Roman", serif |

세리프 폰트(Georgia)는 게임적 무게감이 필요한 요소에만 사용한다.  
나머지 모든 텍스트는 산세리프(Inter/Pretendard)를 사용한다.

### 크기 토큰 (UI Scale 1.25 적용)

| 토큰 | 기준 | 실제(×1.25) | 용도 |
|------|------|-------------|------|
| `--font-tiny` | 12px | 15px | 레이블, 뱃지, 버전 |
| `--font-small` | 14px | 17.5px | 보조 정보, 버튼 |
| `--font-body` | 15px | 18.75px | 기본 본문 |
| `--font-important` | 16px | 20px | 이름, 강조 값 |
| `--font-card-title` | 17px | 21.25px | 카드 제목 |
| `--font-page-title` | 36px | 45px | 페이지 h1 |

### 규칙

- 새 텍스트 요소에는 반드시 토큰을 사용한다. `px` 직접 지정 금지.
- 한국어 텍스트는 `line-height: 1.5` 이상을 권장한다.
- 모든 영문 레이블은 소문자 또는 `letter-spacing: 0.1em` 이상을 적용한다.

---

## 컴포넌트 스타일

### 패널 (Panel)

```css
border: 1px solid #303830;
background: rgba(24, 30, 26, .94);
box-shadow: 0 18px 50px rgba(0, 0, 0, .14);
padding: calc(22px * var(--ui-scale));
```

### 기본 버튼

```css
border: 1px solid #3a423a;
background: #1c221e;
color: #c8cec8;
padding: calc(11px * var(--ui-scale)) calc(18px * var(--ui-scale));
```

### 주요 버튼 (Primary)

```css
border-color: #ac9255;
background: #a78b4f;
color: #111510;
font-weight: 700;
```

### 내비게이션 아이템

- 기본: 배경 없음, 텍스트 `#8f9890`
- 활성: 좌측 테두리 `#b79b5a`, 배경 `linear-gradient(90deg, #252b25, transparent)`, 텍스트 `#eee9dc`
- 비활성: 텍스트 `#4a524c`, 클릭 불가

### 상태 뱃지 (Status)

```css
padding: calc(4px * var(--ui-scale)) calc(10px * var(--ui-scale));
border: 1px solid;
font-size: var(--font-small);
```

상태별 색상은 [색상 팔레트 > 상태 색상] 참조.

### 아이브로우 레이블 (Eyebrow)

```css
color: #9c8757;
font-size: var(--font-tiny);
font-weight: 700;
letter-spacing: .15em;
text-transform: uppercase;
```

페이지 제목 위에 표시하는 카테고리 레이블. 예: `GUILD HALL`, `ADVENTURERS`.

---

## 초상화 스타일

### 썸네일 (목록, 파티 카드 등)

```css
width: 34px;
height: 34px;
border: 1px solid #4d574e;
background: #222923;
overflow: hidden;
```

이미지 없을 때: 배경 `#222923`, 골드 텍스트(`#bca66f`) 이니셜 표시.

### 상세 화면 초상화

- 모험가 상세 화면 좌측에 위치.
- 비율을 유지하며 영역을 채운다 (`object-fit: cover`).
- 프레임(테두리)은 `#4d574e` 단색. 장식 프레임은 현재 사용하지 않는다.
- 초상화 파일 형식·위치: `docs/03_DESIGN/PORTRAIT_ASSET_GUIDE.md` 참조.

---

## 아이콘 스타일

현재 아이콘 파일은 없다. CSS 텍스트, 기호, 또는 단순한 문자를 사용한다.

향후 아이콘 추가 시:
- 파일 위치: `public/game-assets/icons/`
- 크기: 24×24 또는 32×32 기준, SVG 권장
- 색상: 단색 마스크 방식으로 CSS `color` 적용 가능하도록

---

## 레이아웃 원칙

### 정보 계층

```
캐릭터(초상화·이름) → 핵심 정보(랭크·상태) → 세부 정보(능력치·특성)
```

시선이 이 순서로 흐르도록 배치한다.

### 그리드

- 대시보드: `grid-template-columns: minmax(620px, 1.65fr) minmax(300px, .85fr)`
- 메트릭 카드: `repeat(4, 1fr)`
- 의뢰 카드: 자유 그리드, 카드 최소 너비 기준

### 최소 너비

`body`는 `min-width: 1180px`. 이하 해상도는 지원하지 않는다.

---

## 금지 사항

- 밝은 배경 금지. 모든 배경은 `#101411` 계열의 어두운 그린.
- 색상 직접 지정 금지. 반드시 위 팔레트 또는 CSS 변수 사용.
- 장식용 이미지(렌더링, 일러스트)를 UI 요소 배경에 사용 금지.
- 폰트 크기 `px` 직접 지정 금지. `var(--font-*)` 토큰 사용.
- 레퍼런스 이미지를 색상·폰트·프레임까지 복제하지 않는다. 레이아웃만 참고.

---

## 분위기 키워드

`절제된` · `어두운` · `고풍스러운` · `전문적인` · `판타지`

화려하거나 가볍지 않다. 오래된 석조 길드 홀에 걸린 낡은 장부 같은 느낌.

---

## 관련 문서

- 타이틀 화면 설계 → `docs/03_DESIGN/TITLE_SCREEN_GUIDE.md`
- 초상화 에셋 관리 → `docs/03_DESIGN/PORTRAIT_ASSET_GUIDE.md`
- 오디오 에셋 관리 → `docs/03_DESIGN/AUDIO_ASSET_GUIDE.md`
- 에셋 파일명 규칙 → `docs/03_DESIGN/ASSET_NAMING_GUIDE.md`
- UI 레퍼런스 원칙 → `docs/03_DESIGN/UI_REFERENCE.md`
