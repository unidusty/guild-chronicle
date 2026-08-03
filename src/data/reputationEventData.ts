import type { ReputationEventDefinition } from "../types/game";

export const REPUTATION_EVENT_DATA: ReputationEventDefinition[] = [
  {
    id: "rep-event-신생",
    title: "새로운 길드의 등장",
    description:
      "시내 곳곳에서 '서풍 길드'라는 이름을 조금씩 들을 수 있게 되었다. 아직 작은 시작이지만, 세상이 이 길드를 알아가기 시작했다.",
    triggerOnTier: "신생 길드",
    inboxTitle: "주민들이 길드를 알아보기 시작했습니다",
    inboxSummary: "서풍 길드의 이름이 시내에 조금씩 알려지고 있습니다.",
    priority: "normal",
  },
  {
    id: "rep-event-소규모",
    title: "상단의 거래 제안",
    description:
      "인근 상인 조합에서 서풍 길드에 정기 거래 협력 의사를 전달했다. 명성이 쌓이면서 상인들이 먼저 손을 내밀고 있다.",
    triggerOnTier: "소규모 길드",
    inboxTitle: "상단에서 거래 협력 제안이 들어왔습니다",
    inboxSummary: "인근 상인 조합이 정기 협력 의사를 타진했습니다.",
    priority: "normal",
  },
  {
    id: "rep-event-지역",
    title: "도시 행사 초청",
    description:
      "시장 집무실에서 서풍 길드를 이번 도시 축제의 공식 후원 길드로 초청하는 서신을 보내왔다. 지역 내에서 신뢰받는 단체로 인정받은 것이다.",
    triggerOnTier: "지역 길드",
    inboxTitle: "도시 행사에 공식 초청받았습니다",
    inboxSummary: "시장 집무실에서 도시 축제 공식 초청장을 전달했습니다.",
    priority: "important",
  },
  {
    id: "rep-event-유명",
    title: "귀족 가문의 관심",
    description:
      "왕도 인근 귀족 가문에서 서풍 길드에 관심을 표명하는 서신이 도착했다. 공식 의뢰는 물론 귀족 행사 협력까지 논의할 의향이 있다고 전한다.",
    triggerOnTier: "유명 길드",
    inboxTitle: "귀족 가문에서 공식 서신을 보내왔습니다",
    inboxSummary: "르네 남작가에서 협력 의향을 전달했습니다.",
    priority: "important",
  },
  {
    id: "rep-event-명문",
    title: "왕실 관계자 방문",
    description:
      "왕실 고문관 산하 기관에서 서풍 길드 방문 의사를 타진했다. 왕국 차원의 임무를 논의하고 싶다고 한다. 길드 명성이 왕실에도 닿은 것이다.",
    triggerOnTier: "명문 길드",
    inboxTitle: "왕실 관계자가 방문 의사를 전달했습니다",
    inboxSummary: "왕실 고문관 측에서 공식 협력을 논의하고자 합니다.",
    priority: "important",
  },
  {
    id: "rep-event-전설",
    title: "왕국 영웅 길드",
    description:
      "서풍 길드의 명성이 왕국 전역에 퍼졌다. 국경 너머 외국 상단과 모험가 조합에서도 서풍 길드의 이름을 알 정도다. 이제 이 길드는 전설이 되었다.",
    triggerOnTier: "전설의 길드",
    inboxTitle: "서풍 길드가 왕국 전역에 알려졌습니다",
    inboxSummary: "왕국 곳곳에서 서풍 길드의 전설을 이야기합니다.",
    priority: "important",
  },
];

export function getReputationEventForTier(
  tierLabel: string,
): ReputationEventDefinition | undefined {
  return REPUTATION_EVENT_DATA.find((e) => e.triggerOnTier === tierLabel);
}

export function getReputationEventById(
  id: string,
): ReputationEventDefinition | undefined {
  return REPUTATION_EVENT_DATA.find((e) => e.id === id);
}
