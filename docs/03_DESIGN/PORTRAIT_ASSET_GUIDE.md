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
        swordsman-01.png
        warrior-01.png
      female/
        archer-01.png
    elf/
      male/
        mage-01.png
      female/
        ...
    dwarf/
      male/
        ...
      female/
        ...
```

---

## 파일명 규칙

`{직업}-{순번}.png`

- 직업은 영문 소문자 (예: `swordsman`, `archer`, `mage`)
- 순번은 두 자리 숫자 (예: `01`, `02`)
- 확장자: `.png` 권장 (`.jpg`도 허용)

예시: `swordsman-01.png`, `archer-02.png`

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
export const portraitManifest: PortraitManifestEntry[] = [
  { race: "human", gender: "male", classId: "swordsman", path: "/portraits/human/male/swordsman-01.png" },
  ...
];
```

---

## 초상화 ID 부여

모험가 생성 시점에 초상화 ID를 확정하고 `Adventurer.portrait: string | null` 필드에 저장한다.  
ID는 매니페스트의 `path` 값이다. 파일이 없으면 `null`이고 플레이스홀더가 표시된다.

```typescript
// 부여 예시 (generateAdventurer 내부)
const candidates = portraitManifest.filter(
  p => p.race === race && p.gender === gender && p.classId === classId
);
const portrait = candidates.length > 0
  ? candidates[Math.floor(Math.random() * candidates.length)].path
  : null;
```

한 번 부여한 초상화 ID는 변경하지 않는다. 파일이 삭제되면 플레이스홀더로 자동 대체된다.

---

## 현재 초상화 현황

`npm run manifest` 실행 시 콘솔에 종족·성별·직업별 파일 수가 출력된다.

```
[manifest] 53 portrait(s) found (53 base, 0 mod)
[manifest]   human/male: archer(1), mage(2), swordsman(2), ...
```

---

## 추가 시 체크리스트

1. 파일명이 `{직업}-{순번}.png` 규칙을 따르는지 확인한다.
2. 올바른 `{종족}/{성별}/` 폴더에 배치했는지 확인한다.
3. `npm run manifest`를 실행해 매니페스트를 갱신한다.
4. 개발 서버에서 해당 직업·종족·성별 모험가에 초상화가 표시되는지 확인한다.
