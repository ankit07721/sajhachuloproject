type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out-for-delivery"
  | "delivered"
  | "cancelled";

interface Props {
  status: OrderStatus;
}

// ✅ Matches your Order.js status enum exactly
const STEPS = [
  { key: "pending",          label: "Placed",    emoji: "📋", color: "#6366f1" },
  { key: "confirmed",        label: "Confirmed", emoji: "✅", color: "#f97316" },
  { key: "preparing",        label: "Cooking",   emoji: "🍳", color: "#f59e0b" },
  { key: "ready",            label: "Ready",     emoji: "📦", color: "#3b82f6" },
  { key: "out-for-delivery", label: "On Way",    emoji: "🚴", color: "#8b5cf6" },
  { key: "delivered",        label: "Delivered", emoji: "🏠", color: "#22c55e" },
] as const;

export default function OrderStatusProgress({ status }: Props) {
  const isCancelled = status === "cancelled";
  const currentIdx = STEPS.findIndex((s) => s.key === status);

  if (isCancelled) {
    return (
      <div
        style={{
          background: "#fef2f2",
          border: "2px solid #fecaca",
          borderRadius: 14,
          padding: "14px 18px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 14,
          fontWeight: 700,
          color: "#dc2626",
        }}
      >
        ❌ This order was cancelled.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "2px solid #f0f0f0",
        borderRadius: 16,
        padding: "18px 20px",
        marginBottom: 20,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Current status label */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a" }}>
          {STEPS[Math.max(0, currentIdx)]?.emoji}{" "}
          {status === "out-for-delivery"
            ? "Out for Delivery"
            : status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: STEPS[Math.max(0, currentIdx)]?.color,
          }}
        >
          Step {currentIdx + 1} of {STEPS.length}
        </div>
      </div>

      {/* Step circles + connecting line */}
      <div style={{ display: "flex", alignItems: "center" }}>
        {STEPS.map((step, i) => {
          const done   = i < currentIdx;
          const active = i === currentIdx;
          const color  = step.color;

          return (
            <div
              key={step.key}
              style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}
            >
              {/* Circle */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: done ? color : active ? "#fff" : "#f3f4f6",
                    border: `3px solid ${done || active ? color : "#e5e7eb"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 800,
                    color: done ? "#fff" : active ? color : "#aaa",
                    transition: "all 0.4s",
                    boxShadow: active ? `0 0 0 5px ${color}25` : "none",
                    animation: active ? "statusPulse 2s infinite" : "none",
                    flexShrink: 0,
                  }}
                >
                  {done ? "✓" : step.emoji}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: active ? 800 : 600,
                    color: done || active ? color : "#ccc",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  {step.label}
                </div>
              </div>

              {/* Connecting line */}
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    background: i < currentIdx ? color : "#f0f0f0",
                    borderRadius: 99,
                    marginBottom: 22,
                    marginLeft: 3,
                    marginRight: 3,
                    transition: "background 0.4s",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes statusPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.4); }
          50%      { box-shadow: 0 0 0 8px rgba(249,115,22,0); }
        }
      `}</style>
    </div>
  );
} 