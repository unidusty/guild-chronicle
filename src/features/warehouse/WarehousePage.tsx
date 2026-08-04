import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import type { GameState } from "../../types/game";
import { LOOT_TABLE } from "../../data/lootData";
import { sellWarehouseItem, sellAllWarehouseItems } from "../../game/simulation/warehouse";
import { playHover, playSelect } from "../../lib/audio";

interface Props {
  state: GameState;
  onStateChange: Dispatch<SetStateAction<GameState>>;
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

interface WarehouseEntry {
  itemId: string;
  name: string;
  category: string;
  baseValue: number;
  quantity: number;
  totalValue: number;
  defined: boolean;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

export default function WarehousePage({ state, onStateChange }: Props) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sort, setSort] = useState<SortType>("name");
  const [selling, setSelling] = useState<WarehouseEntry | null>(null);
  const [saleQty, setSaleQty] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [batchConfirm, setBatchConfirm] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const allEntries: WarehouseEntry[] = Object.entries(state.warehouse)
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
        defined:    !!item,
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

  function openSell(entry: WarehouseEntry) {
    playSelect();
    setSelling(entry);
    setSaleQty(1);
  }

  function closeSell() {
    setSelling(null);
    setSaleQty(1);
  }

  function handleQtyChange(raw: string) {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) { setSaleQty(1); return; }
    if (selling && n > selling.quantity) { setSaleQty(selling.quantity); return; }
    setSaleQty(n);
  }

  function confirmSale() {
    if (!selling) return;
    const clampedQty = Math.min(Math.max(1, saleQty), selling.quantity);
    const totalPrice = selling.baseValue * clampedQty;
    if (totalPrice <= 0) return;
    onStateChange((s) => sellWarehouseItem(s, selling.itemId, clampedQty));
    setToast(`${selling.name} ${fmt(clampedQty)}개를 판매하여 ${fmt(totalPrice)}G를 획득했습니다.`);
    setSelling(null);
    setSaleQty(1);
  }

  function confirmBatchSell() {
    const ids = sorted.filter(e => e.defined).map(e => e.itemId);
    if (ids.length === 0) return;
    const total = sorted.filter(e => e.defined).reduce((s, e) => s + e.totalValue, 0);
    onStateChange((s) => sellAllWarehouseItems(s, ids));
    setToast(`${fmt(ids.length)}종 전리품을 판매하여 ${fmt(total)}G를 획득했습니다.`);
    setBatchConfirm(false);
  }

  const clampedQty = selling ? Math.min(Math.max(1, saleQty), selling.quantity) : 1;
  const estimatedPrice = selling ? selling.baseValue * clampedQty : 0;
  const canConfirm = selling !== null && clampedQty >= 1 && estimatedPrice > 0;

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
          <span className="wh-summary-gold">길드 골드 <strong>{fmt(state.guild.gold)}</strong> G</span>
        </div>
      </header>

      {toast && (
        <div className="wh-toast" key={toast}>
          {toast}
        </div>
      )}

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
          <div className="wh-controls-right">
            {sorted.some(e => e.defined) && (
              <button
                className="wh-batch-sell-btn"
                onMouseEnter={playHover}
                onClick={() => { playSelect(); setBatchConfirm(true); }}
              >
                {category === "all" ? "전체 판매" : `${CATEGORY_LABELS[category] ?? ""} 전체 판매`}
              </button>
            )}
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
              <span className="wh-col-sell" />
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
                <span className="wh-col-sell">
                  {entry.defined ? (
                    <button
                      className="wh-sell-btn"
                      onMouseEnter={playHover}
                      onClick={() => openSell(entry)}
                    >
                      판매
                    </button>
                  ) : (
                    <span className="wh-sell-unavail">불가</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batch sell confirm */}
      {batchConfirm && (
        <div className="sell-overlay" onClick={() => setBatchConfirm(false)}>
          <div className="sell-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sell-modal-head">
              <p className="eyebrow">WAREHOUSE · BATCH SELL</p>
              <h3 className="sell-modal-title">일괄 판매 확인</h3>
            </div>
            <div className="sell-info">
              <div className="sell-info-row">
                <label>판매 항목</label>
                <span>{fmt(sorted.filter(e => e.defined).length)}종 · {fmt(sorted.filter(e => e.defined).reduce((s, e) => s + e.quantity, 0))}개</span>
              </div>
              <div className="sell-info-row">
                <label>예상 수입</label>
                <strong>{fmt(sorted.filter(e => e.defined).reduce((s, e) => s + e.totalValue, 0))} G</strong>
              </div>
            </div>
            <p className="wh-batch-warn">현재 탭의 판매 가능한 전리품 전량을 판매합니다.</p>
            <div className="sell-actions">
              <button className="sell-cancel-btn" onMouseEnter={playHover} onClick={() => setBatchConfirm(false)}>취소</button>
              <button className="sell-confirm-btn" onMouseEnter={playHover} onClick={confirmBatchSell}>전량 판매</button>
            </div>
          </div>
        </div>
      )}

      {/* Sell modal */}
      {selling && (
        <div className="sell-overlay" onClick={closeSell}>
          <div className="sell-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sell-modal-head">
              <p className="eyebrow">WAREHOUSE · SELL</p>
              <h3 className="sell-modal-title">{selling.name} 판매</h3>
            </div>

            <div className="sell-info">
              <div className="sell-info-row">
                <label>현재 보유</label>
                <span>{fmt(selling.quantity)}개</span>
              </div>
              <div className="sell-info-row">
                <label>개당 판매가</label>
                <span>{fmt(selling.baseValue)} G</span>
              </div>
            </div>

            <div className="sell-qty-section">
              <span className="sell-qty-label">판매 수량</span>
              <div className="sell-qty-control">
                <button
                  className="sell-qty-btn"
                  onMouseEnter={playHover}
                  onClick={() => setSaleQty((q) => Math.max(1, q - 1))}
                  disabled={saleQty <= 1}
                >
                  −
                </button>
                <input
                  className="sell-qty-input"
                  type="number"
                  min={1}
                  max={selling.quantity}
                  value={saleQty}
                  onChange={(e) => handleQtyChange(e.target.value)}
                />
                <button
                  className="sell-qty-btn"
                  onMouseEnter={playHover}
                  onClick={() => setSaleQty((q) => Math.min(selling.quantity, q + 1))}
                  disabled={saleQty >= selling.quantity}
                >
                  +
                </button>
                <button
                  className="sell-all-btn"
                  onMouseEnter={playHover}
                  onClick={() => { playSelect(); setSaleQty(selling.quantity); }}
                >
                  전량 선택
                </button>
              </div>
            </div>

            <div className="sell-total">
              <label>예상 판매금액</label>
              <strong>{fmt(estimatedPrice)} G</strong>
            </div>

            <div className="sell-actions">
              <button className="sell-cancel-btn" onMouseEnter={playHover} onClick={closeSell}>
                취소
              </button>
              <button
                className="sell-confirm-btn"
                onMouseEnter={playHover}
                onClick={confirmSale}
                disabled={!canConfirm}
              >
                판매 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
