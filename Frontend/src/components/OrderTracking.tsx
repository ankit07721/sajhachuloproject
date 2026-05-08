// Frontend/src/components/OrderTracking.tsx
import { useEffect, useState } from "react";

// ── These field names match common MERN Order models.
// ── If yours differ, paste your Order.js and I'll fix them!
type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "packed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  deliveryAddress: string;
  estimatedDelivery?: string;
  createdAt: string;
}

interface Props {
  order: Order;
  onRefresh?: () => void;
}

const STEPS = [
  { key: "pending",          label: "Order Placed",  emoji: "📋", desc: "We received your order",           color: "#6366f1" },
  { key: "confirmed",        label: "Confirmed",     emoji: "✅", desc: "Cook accepted your order",         color: "#f97316" },
  { key: "preparing",        label: "Being Cooked",  emoji: "🍳", desc: "Your meal is being prepared",      color: "#f59e0b" },
  { key: "packed",           label: "Packed",        emoji: "📦", desc: "Ready for pickup",                 color: "#3b82f6" },
  { key: "out_for_delivery", label: "On the Way",    emoji: "🚴", desc: "Rider is heading to you",          color: "#8b5cf6" },
  { key: "delivered",        label: "Delivered",     emoji: "🏠", desc: "Enjoy your meal!",                 color: "#22c55e" },
] as const;

export default function OrderTracking({ order, onRefresh }: Props) {
  const [elapsed, setElapsed] = useState(0);

  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";
  const currentIdx = STEPS.findIndex((s) => s.key === order.status);
  const currentStep = STEPS[currentIdx];

  useEffect(() => {
    const calc = () =>
      setElapsed(
        Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
      );
    calc();
    const t = setInterval(calc, 30000);
    return () => clearInterval(t);
  }, [order.createdAt]);

  const headerBg = isCancelled
    ? "linear-gradient(135deg,#ef4444,#dc2626)"
    : isDelivered
    ? "linear-gradient(135deg,#22c55e,#16a34a)"
    : "linear-gradient(135deg,#f97316,#ea580c)";

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", maxWidth: 640, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ background: headerBg, borderRadius: 18, padding: 24, color: "#fff", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Order #{order.orderNumber}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>
              {isCancelled ? "❌ Cancelled" : `${currentStep?.emoji} ${currentStep?.label}`}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
              {isCancelled ? "Your order was cancelled" : currentStep?.desc}
            </div>
          </div>
          {!isDelivered && !isCancelled && (
            <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 12, padding: "8px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{elapsed}m</div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>elapsed</div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 16, fontSize: 12, opacity: 0.85, flexWrap: "wrap" }}>
          <span>📅 {new Date(order.createdAt).toLocaleDateString("en-NP", { day: "numeric", month: "short" })}</span>
          <span>🕐 {new Date(order.createdAt).toLocaleTimeString("en-NP", { hour: "2-digit", minute: "2-digit" })}</span>
          <span>💰 NRs {order.totalAmount}</span>
        </div>
      </div>

      {/* Timeline */}
      {!isCancelled && (
        <div style={{ background: "#fff", border: "2px solid #f0f0f0", borderRadius: 18, padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>📍 Order Progress</div>
          {STEPS.map((step, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <div key={step.key} style={{ display: "flex", gap: 14, marginBottom: 2 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 40, flexShrink: 0 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: done ? step.color : active ? "#fff" : "#f3f4f6",
                    border: `3px solid ${done || active ? step.color : "#e5e7eb"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, transition: "all 0.4s",
                    boxShadow: active ? `0 0 0 5px ${step.color}30` : "none",
                    animation: active ? "pulse 2s infinite" : "none",
                  }}>
                    {done ? "✓" : step.emoji}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 3, flex: 1, minHeight: 24, background: done ? step.color : "#f0f0f0", borderRadius: 99, margin: "4px 0", transition: "background 0.4s" }} />
                  )}
                </div>
                <div style={{ flex: 1, paddingBottom: i < STEPS.length - 1 ? 18 : 0 }}>
                  <div style={{ fontSize: 14, fontWeight: active ? 800 : done ? 600 : 500, color: i > currentIdx ? "#aaa" : "#1a1a1a", marginTop: 8 }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: 12, color: i > currentIdx ? "#ccc" : "#888", marginTop: 2 }}>
                    {active ? <span style={{ color: step.color, fontWeight: 700 }}>● In progress...</span>
                      : done ? <span style={{ color: step.color }}>✓ Completed</span>
                      : step.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delivery Info */}
      <div style={{ background: "#fff", border: "2px solid #f0f0f0", borderRadius: 18, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📦 Delivery Details</div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: order.estimatedDelivery ? 12 : 0 }}>
          <span style={{ fontSize: 20 }}>📍</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Address</div>
            <div style={{ fontSize: 13, color: "#333", marginTop: 2 }}>{order.deliveryAddress}</div>
          </div>
        </div>
        {order.estimatedDelivery && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 20 }}>⏱️</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Estimated Delivery</div>
              <div style={{ fontSize: 13, color: "#f97316", fontWeight: 700, marginTop: 2 }}>{order.estimatedDelivery}</div>
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div style={{ background: "#fff", border: "2px solid #f0f0f0", borderRadius: 18, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>🛒 Your Items</div>
        {order.items.map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < order.items.length - 1 ? "1px solid #f5f5f5" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {item.image
                ? <img src={item.image} alt={item.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
                : <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🍽️</div>
              }
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: "#888" }}>× {item.quantity}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f97316" }}>NRs {item.price * item.quantity}</div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "2px solid #f0f0f0" }}>
          <span style={{ fontWeight: 700 }}>Total</span>
          <span style={{ fontWeight: 900, fontSize: 16, color: "#f97316" }}>NRs {order.totalAmount}</span>
        </div>
      </div>

      {/* Actions */}
      {!isDelivered && !isCancelled && onRefresh && (
        <button onClick={onRefresh} style={{ width: "100%", padding: "13px 0", background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(249,115,22,0.3)" }}>
          🔄 Refresh Status
        </button>
      )}
      {isDelivered && (
        <div style={{ background: "#f0fdf4", border: "2px solid #bbf7d0", borderRadius: 14, padding: 18, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 700, color: "#16a34a", fontSize: 15 }}>Delivered! Enjoy your meal!</div>
          <div style={{ fontSize: 12, color: "#166534", marginTop: 4 }}>Don't forget to leave a review ⭐</div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(249,115,22,0.4)}50%{box-shadow:0 0 0 8px rgba(249,115,22,0)}}`}</style>
    </div>
  );
}