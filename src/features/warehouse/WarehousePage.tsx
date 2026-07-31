import type { GameState } from "../../types/game";
import { LOOT_TABLE } from "../../data/lootData";

interface Props {
  state: GameState;
}

const CATEGORY_LABELS: Record<string, string> = {
  monster: "마물 소재",
  herb:    "약초",
  mineral: "광물",
  misc:    "잡화",
};

function formatGold(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n) + " G";
}

export default function WarehousePage({ state }: Props) {
  const entries = Object.entries(state.warehouse)
    .map(([itemId, quantity]) => ({ item: LOOT_TABLE[itemId], quantity }))
    .filter((e): e is { item: NonNullable<typeof e.item>; quantity: number } =>
      Boolean(e.item) && e.quantity > 0
    )
    .sort((a, b) => a.item.category.localeCompare(b.item.category) || a.item.name.localeCompare(b.item.name, "ko"));

  const totalValue = entries.reduce((sum, { item, quantity }) => sum + item.baseValue * quantity, 0);

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WESTWIND GUILD · WAREHOUSE</p>
          <h1>길드 창고</h1>
        </div>
        {entries.length > 0 && (
          <div className="top-actions">
            <span className="warehouse-total-value">추정 가치 {formatGold(totalValue)}</span>
          </div>
        )}
      </header>

      <div className="warehouse-page">
        {entries.length === 0 ? (
          <div className="warehouse-empty">
            <p>창고가 비어 있습니다.</p>
            <p className="quiet">의뢰를 완료하면 전리품이 쌓입니다.</p>
          </div>
        ) : (
          <div className="warehouse-grid">
            {entries.map(({ item, quantity }) => (
              <div key={item.id} className={`warehouse-card loot-category-${item.category}`}>
                <div className="warehouse-card-left">
                  <span className="warehouse-item-name">{item.name}</span>
                  <span className="warehouse-item-category">{CATEGORY_LABELS[item.category]}</span>
                </div>
                <div className="warehouse-card-right">
                  <span className="warehouse-item-qty">×{quantity}</span>
                  <span className="warehouse-item-value">{item.baseValue} G</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
