# PORTRAIT ASSET GUIDE

Guild Chronicle 초상화 에셋 관리 기준서.

---

## 파일 위치

초상화는 `public/portraits/` 폴더 아래 `{종족}/{성별}/` 구조로 저장한다.

```
public/
  portraits/
    human/
      male/
        human_m_swordsman_01.webp
        human_m_warrior_01.webp
      female/
        human_f_archer_01.webp
    elf/
      male/
        elf_m_mage_01.webp
      female/
        elf_f_priest_01.webp
    dwarf/
      male/
        dwarf_m_guardian_01.webp
      female/
        dwarf_f_rogue_01.webp
```

---

## 파일명 규칙

`{종족}_{성별초기}_{직업}_{순번}.webp`

| 필드 | 유효값 | 설명 |
|------|--------|------|
| 종족 | `human` `elf` `dwarf` | 소문자 |
| 성별초기 | `m` `f` | male→m, female→f |
| 직업 | `warrior` `swordsman` `spearman` `archer` `mage` `paladin` `rogue` `priest` `guardian` | 소문자 |
| 순번 | `01` `02` ... | 두 자리 숫자 |
| 확장자 | `.webp` 권장 | `.png` `.jpg` `.jpeg`도 허용 |

예시: `human_m_swordsman_01.webp`, `elf_f_mage_02.webp`

파일명 전체 패턴을 벗어나면 매니페스트 스크립트가 파일을 건너뛴다.

---

## 자동 매니페스트 생성

초상화를 추가하거나 삭제한 뒤에는 반드시 매니페스트를 재생성해야 한다.

```bash
npm run manifest
```

이 명령은 `tools/generate-manifest.js`를 실행해 `src/generated/assetManifest.ts`를 갱신한다.  
코드에 경로와 파일 목록을 직접 하드코딩하지 않는다.

---

## 매니페스트 구조

```typescript
// src/generated/assetManifest.ts (자동 생성, 직접 편집 금지)
export interface PortraitEntry {
  id: string;       // "{race}-{gender}-{파일명(확장자 제외)}"
  path: string;     // "/portraits/{race}/{gender}/{파일명}"
  race: string;
  gender: string;
  classId: string;
  source: "base" | "mod";
}

export const assetManifest: AssetManifest = {
  generatedAt: "...",
  portraits: [
    {
      id: "human-male-human_m_swordsman_01",
      path: "/portraits/human/male/human_m_swordsman_01.webp",
      race: "human",
      gender: "male",
      classId: "swordsman",
      source: "base"
    },
    ...
  ]
};
```

---

## 초상화 ID 부여

모험가 생성 시점에 초상화를 확정하고 `Adventurer.portrait: string | null` 필드에 저장한다.  
`portrait` 값은 매니페스트의 `path` 값이다. 파일이 없으면 `null`이고 플레이스홀더가 표시된다.

```typescript
// generateAdventurer 내부
const candidates = assetManifest.portraits.filter(
  p => p.race === race && p.gender === gender && p.classId === classId
);
const portrait = candidates.length > 0
  ? candidates[Math.floor(Math.random() * candidates.length)].path
  : null;
```

한 번 부여한 초상화 경로는 변경하지 않는다. 파일이 삭제되면 플레이스홀더로 자동 대체된다.

---

## 모드 초상화 (Mod Override)

`public/mods/portraits/` 폴더는 베이스 초상화를 덮어쓰는 모드용 폴더다.  
같은 `id`를 가진 mod 파일이 있으면 base 파일을 대신한다.

```
public/mods/portraits/{종족}/{성별}/{파일명}
```

---

## 현재 초상화 현황

`npm run manifest` 실행 시 콘솔에 종족·성별·직업별 파일 수가 출력된다.

```
[manifest] 53 portrait(s) found (53 base, 0 mod)
[manifest]   dwarf/female: archer(1), guardian(1), mage(1), paladin(1), ...
[manifest]   human/male:   swordsman(2), warrior(1), ...
```

---

## 추가 시 체크리스트

1. 파일명이 `{종족}_{m|f}_{직업}_{순번}.webp` 규칙을 따르는지 확인한다.
2. 올바른 `{종족}/{성별}/` 폴더에 배치했는지 확인한다.
3. `npm run manifest`를 실행해 매니페스트를 갱신한다.
4. 개발 서버에서 해당 직업·종족·성별 모험가에 초상화가 표시되는지 확인한다.

---

## 초상화 비주얼 기준

초상화 스타일 가이드는 `docs/03_DESIGN/VISUAL_STYLE_GUIDE.md` > 초상화 스타일 참조.

- 썸네일 크기: 34×34px, 테두리 `#4d574e`
- 이미지 없을 때: 배경 `#222923`, 골드 이니셜 표시
- 상세 화면: `object-fit: cover`로 영역 채움
