import type { Adventurer, AdventurerStatus, FinanceTransactionDirection, FinanceTransactionType, Gender, PartyStatus, QuestCategory, QuestResultGrade, QuestStage, QuestStatus, QuestType, Race, RecruitmentEventType, Stats, WorldEventType } from "../../types/game";

export const raceLabels: Record<Race, string> = {
  human: "인간",
  elf: "엘프",
  dwarf: "드워프",
};

export const genderLabels: Record<Gender, string> = {
  male: "남",
  female: "여",
};

export const partyStatusLabels: Record<PartyStatus, string> = {
  idle:                "대기",
  dispatched:          "의뢰 수행 중",
  returning:           "귀환 중",
  waiting_settlement:  "정산 대기",
};

export const adventurerStatusLabels: Record<AdventurerStatus, string> = {
  idle: "대기",
  dispatched: "의뢰 수행",
  injured: "부상",
  training: "훈련 중",
  recovering: "휴식",
};

export const seasonLabels = {
  spring: "봄",
  summer: "늦여름",
  autumn: "가을",
  winter: "겨울",
} as const;

export const statLabels: Record<keyof Stats, string> = {
  strength:     "근력",
  agility:      "민첩",
  endurance:    "체력",
  intelligence: "지력",
  perception:   "인지",
  willpower:    "의지",
};

export const jobLabels: Record<string, string> = {
  warrior:  "전사",
  swordsman:"검사",
  spearman: "창병",
  archer:   "궁수",
  mage:     "마법사",
  paladin:  "성기사",
  rogue:    "도적",
  priest:   "사제",
  guardian: "수호자",
};

export const roleLabels: Record<"vanguard" | "damage" | "support" | "scout", string> = {
  vanguard: "전위",
  damage:   "딜러",
  support:  "서포터",
  scout:    "정찰",
};

export function getPotentialGrade(potential: number): "S" | "A" | "B" | "C" | "D" {
  if (potential >= 88) return "S";
  if (potential >= 72) return "A";
  if (potential >= 56) return "B";
  if (potential >= 40) return "C";
  return "D";
}

export const questStatusLabels: Record<QuestStatus, string> = {
  available:   "접수 가능",
  assigned:    "수행 중",
  in_progress: "수행 중",
  completed:   "완료",
  failed:      "실패",
  expired:     "기한 만료",
};

export const questTypeLabels: Record<QuestType, string> = {
  normal: "일반",
  urgent: "긴급",
  raid:   "대형",
};

export const questCategoryLabels: Record<QuestCategory, string> = {
  escort:      "호위",
  search:      "수색",
  hunt:        "토벌",
  delivery:    "배달",
  rescue:      "구조",
  exploration: "탐사",
};

export const questStageLabels: Record<QuestStage, string> = {
  traveling: "이동 중",
  searching:  "탐색 중",
  executing:  "목표 수행 중",
  returning:  "귀환 중",
};

export function dangerLevelLabel(level: number): string {
  if (level >= 5) return "치명적";
  if (level >= 4) return "매우 높음";
  if (level >= 3) return "높음";
  if (level >= 2) return "보통";
  return "낮음";
}

export const questResultGradeLabels: Record<QuestResultGrade, string> = {
  great_success:  "대성공",
  success:        "성공",
  narrow_success: "간신히 성공",
  retreat:        "철수",
  failure:        "실패",
  great_failure:  "대실패",
};

export const financeTransactionTypeLabels: Record<FinanceTransactionType, string> = {
  quest_commission:     "의뢰 수수료",
  warehouse_sale:       "창고 판매",
  loot_purchase:        "전리품 구매",
  facility_construction:"시설 건설",
  facility_upgrade:     "시설 업그레이드",
};

export const financeDirectionLabels: Record<FinanceTransactionDirection, string> = {
  income:  "수입",
  expense: "지출",
};

export const recruitmentEventTypeLabels: Record<RecruitmentEventType, string> = {
  siblings:                    "형제 함께 지원",
  fallen_noble:                "몰락한 귀족",
  rival_guild_origin:          "라이벌 길드 출신",
  royal_recommendation:        "왕실 추천장",
  retired_knight:              "은퇴 기사",
  suspicious_applicant:        "수상한 지원자",
  famous_adventurer_apprentice:"유명 모험가의 제자",
  orphan_background:           "고아 출신",
  injury_comeback:             "부상 후 재기",
  debt_motivated:              "빚을 갚기 위한 지원",
};

export const worldEventTypeLabels: Record<WorldEventType, string> = {
  festival:          "왕국 축제",
  monster_surge:     "몬스터 증가",
  famine:            "흉년",
  abundant_harvest:  "풍년",
  merchant_visit:    "상인 방문",
  noble_quest_boom:  "귀족 의뢰 증가",
  border_conflict:   "국경 분쟁",
  epidemic:          "전염병",
};

export function getBondStageLabel(questCount: number): string {
  if (questCount >= 60) return "오랜 전우";
  if (questCount >= 30) return "숙련된 팀워크";
  if (questCount >= 15) return "익숙한 동료들";
  if (questCount >= 5)  return "호흡을 맞추는 중";
  return "신생 파티";
}

export function getStatusTone(adv: Adventurer): "active" | "warning" | "idle" {
  if (adv.status === "dispatched") return "active";
  if (adv.injuryIds.length > 0 || adv.status === "injured") return "warning";
  return "idle";
}
