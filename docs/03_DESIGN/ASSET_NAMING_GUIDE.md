# ASSET NAMING GUIDE

Guild Chronicle 에셋 파일명 통일 기준서.

---

## 공통 규칙

- 모든 에셋 파일명은 **영문 소문자**만 사용한다.
- 단어 구분자: 초상화는 **언더스코어(`_`)**, 오디오·아이콘·UI 이미지는 **하이픈(`-`)** 사용.
- 공백, 대문자를 사용하지 않는다.
- 확장자는 소문자로 통일한다.

---

## 초상화

위치: `public/portraits/{종족}/{성별}/`

```
{종족}_{성별초기}_{직업}_{순번}.webp

예시:
  human_m_swordsman_01.webp
  elf_f_mage_02.webp
  dwarf_m_guardian_01.webp
```

| 필드 | 유효값 | 설명 |
|------|--------|------|
| 종족 | `human` `elf` `dwarf` | 소문자 |
| 성별초기 | `m` `f` | male=m, female=f |
| 직업 | 아래 표 참조 | 소문자 |
| 순번 | `01` `02` ... | 두 자리 숫자 |
| 확장자 | `.webp` | `.png` `.jpg`도 허용 |

| 유효한 직업 ID | 설명 |
|--------------|------|
| `warrior` | 전사 |
| `swordsman` | 검사 |
| `spearman` | 창병 |
| `archer` | 궁수 |
| `mage` | 마법사 |
| `paladin` | 성기사 |
| `rogue` | 도적 |
| `priest` | 사제 |
| `guardian` | 수호자 |

> `generate-manifest.js`는 이 형식을 파싱해 `race`, `gender`, `classId`를 추출한다.  
> 형식을 벗어난 파일은 매니페스트에 포함되지 않고 경고가 출력된다.

---

## 오디오

위치: `public/audio/`

```
{컨텍스트}-{행위}.mp3

예시:
  guild-hall-bgm.mp3    ← BGM: {장소}-bgm
  ui-hover.mp3          ← UI 효과음: ui-{행위}
  ui-select.mp3
  ui-quest-paper-open.mp3
```

접두사 규칙:

| 접두사 | 용도 |
|--------|------|
| `ui-` | UI 인터랙션 효과음 |
| `{장소}-bgm` | 배경 음악 |
| `amb-` | 환경음 (미래) |
| `sfx-` | 전투·사건 효과음 (미래) |

---

## 배경 이미지

위치: `public/backgrounds/` (현재 파일 없음)

```
{화면명}-bg.webp

예시:
  title-bg.webp
  guild-hall-bg.webp
```

---

## 아이콘 / UI 이미지

위치: `public/game-assets/icons/` (현재 파일 없음)

```
{컴포넌트}-{상태}.png

예시:
  rank-badge-s.png
  quest-pin-normal.png
```

---

## 자동 생성 파일

| 파일 | 생성 스크립트 | 규칙 |
|------|--------------|------|
| `src/generated/assetManifest.ts` | `tools/generate-manifest.js` | 직접 편집 금지 |

자동 생성 파일을 수동으로 편집하지 않는다.  
에셋을 추가·삭제한 뒤에는 반드시 `npm run manifest`를 실행한다.
