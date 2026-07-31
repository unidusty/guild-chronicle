import { useState } from "react";
import type { GameState } from "../../types/game";
import { LOOT_TABLE } from "../../data/lootData";
import { playHover, playSelect } from "../../lib/audio";

interface Props {
  state: GameState;
}

type CategoryFilter = "all" | "monster" | "herb" | "mineral" | "misc";
type SortType = "name" | "qty" | "value" | "total";

export const CATEGORY_LABELS: Record<string, string> = {
  monster: "몬스터 소재",
  herb:    "채집 소재",
  mineral: "광물",
  misc:    "잡화",
};

const TABS: { value: CategoryFilter; label: string }[] = [
  { value: "all",     label: "전체" },
  { value: "monster", label: "몬스터 소재" },
  { value: "herb",    label: "채집 소재" },
  { value: "mineral", label: "광물" },
  { value: "misc",    label: "잡화" },
];

const SORT_OPTIONS: { value: SortType; label: string }[] = [
  { value: "name",  label: "이름순" },
  { value: "qty",   label: "수량순" },
  { value: "value", label: "가치순" },
  { value: "total", label: "총가치순" },
];

function fmt(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

export default function WarehousePage({ state }: Props) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sort, setSort] = useState<SortType>("name");

  const allEntries = Object.entries(state.warehouse)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, quantity]) => {
      const item = LOOT_TABLE[itemId];
      const baseValue = item?.baseValue ?? 0;
      return {
        itemId,
        name:       item?.name ?? "알 수 없는 전리품",
        category:   item?.category ?? "misc",
        baseValue,
        quantity,
        totalValue: baseValue * quantity,
      };
    });

  const countFor = (cat: CategoryFilter): number =>
    cat === "all"
      ? allEntries.length
      : allEntries.filter((e) => e.category === cat).length;

  const filtered = category === "all"
    ? allEntries
    : allEntries.filter((e) => e.category === category);

  const sorted = [...filtered].sort((a, b) => {
    const sec = a.name.localeCompare(b.name, "ko");
    if (sort === "qty")   return b.quantity - a.quantity   || sec;
    if (sort === "value") return b.baseValue - a.baseValue || sec;
    if (sort === "total") return b.totalValue - a.totalValue || sec;
    return sec;
  });

  const totalKinds = allEntries.length;
  const totalQty   = allEntries.reduce((s, e) => s + e.quantity, 0);
  const totalVal   = allEntries.reduce((s, e) => s + e.totalValue, 0);

  const tabQty = filtered.reduce((s, e) => s + e.quantity, 0);
  const tabVal = filtered.reduce((s, e) => s + e.totalValue, 0);

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WESTWIND GUILD · WAREHOUSE</p>
          <h1>길드 창고</h1>
        </div>
        <div className="top-actions wh-summary-bar">
          <span><strong>{fmt(totalKinds)}</strong>종</span>
          <span>총 <strong>{fmt(totalQty)}</strong>개</span>
          <span>기본 가치 <strong>{fmt(totalVal)}</strong> G</span>
        </div>
      </header>

      <div className="warehouse-page">
        {/* Category tabs */}
        <div className="wh-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              className={`wh-tab${category === tab.value ? " active" : ""}`}
              onMouseEnter={playHover}
              onClick={() => { playSelect(); setCategory(tab.value); }}
            >
              {tab.label}
              <span className="wh-tab-count">{countFor(tab.value)}</span>
            </button>
          ))}
        </div>

        {/* Sort + tab sub-info */}
        <div className="wh-controls">
          <span className="wh-tab-info">
            {category !== "all" && filtered.length > 0
              ? `${CATEGORY_LABELS[category]} · ${fmt(filtered.length)}종 · ${fmt(tabQty)}개 · ${fmt(tabVal)} G`
              : null}
          </span>
          <div className="wh-sort">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`wh-sort-btn${sort === opt.value ? " active" : ""}`}
                onMouseEnter={playHover}
                onClick={() => { playSelect(); setSort(opt.value); }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {allEntries.length === 0 ? (
          <p className="wh-empty">아직 길드 창고에 보관된 전리품이 없습니다.</p>
        ) : sorted.length === 0 ? (
          <p className="wh-empty">보유 중인 {CATEGORY_LABELS[category] ?? ""} 전리품이 없습니다.</p>
        ) : (
          <div className="wh-list">
            <div className="wh-list-header">
              <span className="wh-col-name">전리품</span>
              <span className="wh-col-qty">보유</span>
              <span className="wh-col-unit">개당</span>
              <span className="wh-col-total">총가치</span>
            </div>
            {sorted.map((entry) => (
              <div key={entry.itemId} className={`wh-entry loot-category-${entry.category}`}>
                <div className="wh-col-name">
                  <span className="wh-item-name">{entry.name}</span>
                  <span className="wh-item-cat">{CATEGORY_LABELS[entry.category] ?? entry.category}</span>
                </div>
                <span className="wh-col-qty">×{fmt(entry.quantity)}</span>
                <span className="wh-col-unit">{fmt(entry.baseValue)} G</span>
                <span className="wh-col-total">{fmt(entry.totalValue)} G</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
