import type {
  EntityId,
  GameState,
  Party,
  Quest,
  QuestCategory,
  QuestChronicleEntry,
  QuestProgress,
  QuestResult,
  QuestResultGrade,
} from "../../types/game";

// ── Stable template selection ─────────────────────────────────────────────────

function pickByHash<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h * 31) + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

// ── Narrative templates ───────────────────────────────────────────────────────
// Variables: {party}, {region}, {title}

type CategoryTemplateMap = Partial<Record<QuestCategory, string[]>> & { default: string[] };
type TemplateMap = Record<QuestResultGrade, CategoryTemplateMap>;

const TEMPLATES: TemplateMap = {
  great_success: {
    default:     ["{party}는 {title} 의뢰를 완벽히 완수하였다.", "{party}는 기대 이상의 활약으로 임무를 대성공으로 마쳤다."],
    hunt:        ["{party}는 {region}의 위협을 완전히 섬멸하였다.", "{party}의 압도적인 활약으로 {region} 토벌이 대성공으로 마무리되었다.", "{party}는 적 하나 남기지 않고 {region}을 평정하였다."],
    escort:      ["{party}는 의뢰인을 아무런 피해 없이 완벽하게 목적지까지 보호하였다.", "{party}의 철저한 경호로 {region} 호위 임무가 대성공으로 마무리되었다."],
    search:      ["{party}는 {region}에서 신속히 목표물을 발견하여 탁월한 성과를 남겼다.", "{party}는 {title} 수색 의뢰를 기대 이상으로 완수하였다."],
    delivery:    ["{party}는 단 한 건의 사고도 없이 의뢰물을 완벽하게 전달하였다.", "{party}는 {title} 배달 의뢰를 흠잡을 데 없이 완수하였다."],
    rescue:      ["{party}는 {region}에서 실종자들을 전원 구조하였다.", "{party}의 신속한 대응으로 모든 실종자가 무사히 길드로 귀환하였다."],
    exploration: ["{party}는 {region} 탐사에서 놀라운 발견을 이루어냈다.", "{party}는 {title} 탐사 의뢰에서 기대를 뛰어넘는 성과를 거두었다."],
  },
  success: {
    default:     ["{party}는 {title} 의뢰를 성공적으로 완수하였다.", "{party}는 임무를 마치고 무사히 귀환하였다."],
    hunt:        ["{party}는 {region}에 출몰하던 적을 성공적으로 토벌하였다.", "{party}는 {region}의 위협을 제거하고 귀환하였다.", "{party}는 {title} 토벌 의뢰를 무사히 완수하였다."],
    escort:      ["{party}는 의뢰인을 무사히 목적지까지 호위하였다.", "{party}는 {region}까지의 호위 임무를 성공적으로 마쳤다."],
    search:      ["{party}는 {region}에서 목표를 찾아내어 임무를 완수하였다.", "{party}는 {title} 수색 의뢰를 성공적으로 마쳤다."],
    delivery:    ["{party}는 의뢰물을 안전하게 전달하고 귀환하였다.", "{party}는 {title} 배달 의뢰를 완수하였다."],
    rescue:      ["{party}는 {region}에서 실종자를 무사히 구조하였다.", "{party}의 활약으로 실종자들이 길드로 귀환하였다."],
    exploration: ["{party}는 {region}을 탐사하고 성과를 거두어 돌아왔다.", "{party}는 {title} 탐사 의뢰를 성공적으로 완수하였다."],
  },
  narrow_success: {
    default:     ["{party}는 어려운 상황에서도 임무를 완수하고 귀환하였다.", "{party}는 상당한 고전 끝에 간신히 임무를 마쳤다."],
    hunt:        ["{party}는 고전 끝에 {region}의 적을 간신히 토벌하였다.", "{party}는 쉽지 않은 싸움 끝에 {title} 의뢰를 완수하였다."],
    escort:      ["{party}는 여러 위협에 맞서며 의뢰인을 목적지까지 호위하였다.", "{party}는 어렵게 호위 임무를 마치고 귀환하였다."],
    search:      ["{party}는 오랜 수색 끝에 간신히 목표를 찾아냈다.", "{party}는 어려운 상황에서도 탐색 임무를 완수하였다."],
    delivery:    ["{party}는 우여곡절 끝에 의뢰물을 목적지에 전달하였다.", "{party}는 예상치 못한 방해에도 불구하고 {title} 의뢰를 끝마쳤다."],
    rescue:      ["{party}는 위험을 무릅쓰고 실종자를 겨우 구해냈다.", "{party}는 많은 어려움을 겪었지만 구조 임무를 완수하였다."],
    exploration: ["{party}는 힘겨운 탐사 끝에 임무를 마치고 귀환하였다.", "{party}는 상당한 어려움을 겪으며 {region} 탐사를 마쳤다."],
  },
  retreat: {
    default:     ["{party}는 길드장의 명령에 따라 임무를 중단하고 귀환하였다.", "길드장의 판단으로 {party}는 안전하게 철수하였다.", "{party}는 {title} 의뢰를 중단하고 길드로 돌아왔다.", "{party}는 상황이 여의치 않아 철수를 결정하였다."],
    hunt:        ["{party}는 {region}에서 예상보다 강한 적을 만나 길드장 명령으로 철수하였다.", "길드장의 철수 명령에 따라 {party}는 {region}에서 귀환하였다."],
    escort:      ["{party}는 안전을 우선시하여 의뢰를 중단하고 귀환하였다.", "길드장의 판단으로 {party}는 {title} 호위 임무를 중단하였다."],
    search:      ["{party}는 수색 도중 길드장의 명령을 받고 귀환하였다.", "{party}는 {title} 의뢰를 중단하고 철수하였다."],
    delivery:    ["{party}는 배달 의뢰를 중단하고 안전하게 귀환하였다.", "길드장의 판단으로 {party}는 {title} 의뢰를 중단하였다."],
    rescue:      ["{party}는 구조 임무를 중단하고 길드로 귀환하였다.", "길드장의 명령에 따라 {party}는 현장에서 철수하였다."],
    exploration: ["{party}는 탐사 중 길드장의 명령으로 철수하였다.", "길드장의 판단으로 {party}는 {region} 탐사를 중단하였다."],
  },
  failure: {
    default:     ["{party}는 임무를 완수하지 못하고 귀환하였다.", "{party}는 {title} 의뢰에서 목표 달성에 실패하였다."],
    hunt:        ["{party}는 임무를 수행하였으나 {region}의 적을 완전히 토벌하지 못하였다.", "{party}는 {title} 토벌 의뢰에서 목표를 달성하지 못하였다."],
    escort:      ["{party}는 최선을 다하였으나 호위 임무를 완수하지 못하였다.", "{party}는 {title} 호위 의뢰에 실패하였다."],
    search:      ["{party}는 {region}을 수색하였으나 목표를 찾지 못하였다.", "{party}는 {title} 수색 의뢰를 완수하지 못하였다."],
    delivery:    ["{party}는 의뢰물을 목적지까지 전달하는 데 실패하였다.", "{party}는 {title} 배달 의뢰를 완수하지 못하였다."],
    rescue:      ["{party}는 최선을 다하였으나 구조에 실패하고 귀환하였다.", "{party}는 {region}에서 실종자를 찾지 못하고 돌아왔다."],
    exploration: ["{party}는 {region} 탐사를 완수하지 못하고 귀환하였다.", "{party}는 {title} 탐사 의뢰를 완수하지 못하였다."],
  },
  great_failure: {
    default:     ["{party}는 큰 피해를 입고 임무를 중단하였다.", "{party}는 {title} 의뢰에서 심각한 어려움에 처하였다."],
    hunt:        ["{party}는 {region}에서 강적을 만나 큰 피해를 입고 퇴각하였다.", "{party}는 {title} 토벌 의뢰에서 상당한 피해를 입고 실패하였다."],
    escort:      ["{party}는 {title} 호위 의뢰에서 심각한 어려움에 처하였다.", "{party}는 큰 피해를 입고 호위 임무를 완수하지 못하였다."],
    search:      ["{party}는 {title} 수색 의뢰에서 예상치 못한 큰 위험에 직면하였다.", "{party}는 심각한 위험 속에서 간신히 귀환하였다."],
    delivery:    ["{party}는 {title} 배달 의뢰에서 심각한 방해를 받아 실패하였다.", "{party}는 큰 피해를 입고 귀환하였다."],
    rescue:      ["{party}는 {title} 구조 의뢰에서 큰 위기에 처하였다.", "{party}는 구조 실패와 함께 심각한 위험 속에서 귀환하였다."],
    exploration: ["{party}는 {region} 탐사에서 예상치 못한 위험을 만나 큰 피해를 입었다.", "{party}는 탐사 도중 심각한 위기에 처해 귀환하였다."],
  },
};

function applyVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? k);
}

function generateNarrative(
  questId: EntityId,
  resultGrade: QuestResultGrade,
  category: QuestCategory,
  vars: { party: string; region: string; title: string },
): string {
  const gradeMap = TEMPLATES[resultGrade];
  const templates = gradeMap[category] ?? gradeMap.default;
  const chosen = pickByHash(templates, questId + resultGrade);
  return applyVars(chosen, vars);
}

// ── Public builder ────────────────────────────────────────────────────────────

export function buildQuestChronicleEntry(
  quest: Quest,
  prog: QuestProgress | null,
  party: Party | null,
  result: QuestResult,
  state: GameState,
): QuestChronicleEntry {
  const region = state.regions[quest.regionId];
  const partyName = party?.name ?? null;
  const regionName = region?.name ?? null;

  const narrative = generateNarrative(
    quest.id,
    result.resultGrade,
    quest.type,
    {
      party:  partyName ?? "길드",
      region: regionName ?? "해당 지역",
      title:  quest.title,
    },
  );

  const d = result.completedAt;
  return {
    id:                `qc-${quest.id}-${d.year}-${d.season}-${String(d.day).padStart(2, "0")}`,
    questId:           quest.id,
    questTitle:        quest.title,
    questCategory:     quest.type,
    partyId:           party?.id ?? null,
    partyNameSnapshot: partyName,
    regionId:          quest.regionId,
    regionNameSnapshot: regionName,
    completedDate:     result.completedAt,
    resultGrade:       result.resultGrade,
    narrative,
    rewardGold:        quest.rewardGold,
    memberCountSnapshot: party?.memberIds.length ?? 0,
    incidentCount:     prog?.events.length ?? 0,
    supportUsed:       result.supportUsed,
    extraExplore:      result.extraExplore,
    successRate:       result.successRate,
  };
}
