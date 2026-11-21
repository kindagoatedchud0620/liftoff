"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui";
import { SHOP, type ShopItem } from "@/lib/gamification";
import { useStore } from "@/store/useStore";
import { useStreak } from "@/store/derived";

export default function Shop() {
  const eggs = useStore((s) => s.eggs);
  const owned = useStore((s) => s.ownedTitles);
  const equipped = useStore((s) => s.profile.equippedTitle);
  const doubleEggs = useStore((s) => s.doubleEggs);
  const buy = useStore((s) => s.buy);
  const equipTitle = useStore((s) => s.equipTitle);
  const { revivable } = useStreak();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const purchase = (item: ShopItem) => setToast(buy(item.id) ? `Purchased ${item.name}` : "Purchase failed");
  const btn = "h-10 w-full rounded-lg text-sm font-bold disabled:opacity-40";

  const action = (item: ShopItem) => {
    const isOwned = item.kind === "title" && owned.includes(item.name);
    if (isOwned) {
      return equipped === item.name ? (
        <button data-testid={`equip-${item.id}`} disabled className={`${btn} border border-accent text-accent`}>Equipped</button>
      ) : (
        <button data-testid={`equip-${item.id}`} onClick={() => equipTitle(item.name)} className={`${btn} border border-line`}>Equip</button>
      );
    }
    if (item.kind === "double" && doubleEggs) return <button data-testid={`buy-${item.id}`} disabled className={`${btn} border border-accent text-accent`}>Active</button>;
    const reason = eggs < item.price ? `Need ${item.price - eggs} more Eggs` : item.kind === "revive" && !revivable ? "No broken streak to revive" : null;
    return (
      <>
        <button data-testid={`buy-${item.id}`} disabled={!!reason} onClick={() => purchase(item)} className={`${btn} bg-accent text-black tabular-nums`}>Buy ({item.price} Eggs)</button>
        {reason && <p className="mt-1 text-xs text-muted tabular-nums">{reason}</p>}
      </>
    );
  };

  return (
    <Card>
      <CardTitle right={<span className="font-bold text-accent tabular-nums" data-testid="egg-balance">{eggs} Eggs</span>}>Shop</CardTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        {SHOP.map((item) => (
          <div key={item.id} data-testid={`shop-item-${item.id}`} className="flex flex-col justify-between gap-3 rounded-lg border border-line bg-card-2 p-3">
            <div>
              <div className="font-semibold">{item.name}</div>
              <div className="text-xs text-muted">{item.description}</div>
            </div>
            <div>{action(item)}</div>
          </div>
        ))}
      </div>
      {toast && <div role="status" className="pop-in fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-accent bg-card px-4 py-2 text-sm font-semibold md:bottom-6">{toast}</div>}
    </Card>
  );
}
