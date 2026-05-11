import { useState, useRef, useEffect, useCallback } from "react";
import { useCart } from "@/context/CartContext";
import api from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// DISH TYPE — matches your MenuItem model
// ─────────────────────────────────────────────────────────────────────────────
interface DishKB {
  id: string; // MenuItem._id
  name: string;
  price: number;
  category: string;
  subCategory: string;
  spiceLevel: string;
  prepTime: number;
  keywords: string[];
  chefName?: string;
  nutrients: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  tags: string[];
  mealTime: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP subCategory → meal time
// ─────────────────────────────────────────────────────────────────────────────
const SUB_TO_MEAL: Record<string, string[]> = {
  Breakfast: ["breakfast"],
  Snacks: ["snack"],
  "Nepali Mains": ["lunch", "dinner"],
  "Momo & Dumplings": ["snack", "lunch", "dinner"],
  Noodles: ["lunch", "snack", "dinner"],
  "Burgers & Sandwiches": ["breakfast", "snack", "lunch"],
  "Desserts & Sweets": ["snack", "dessert"],
  Beverages: ["breakfast", "snack", "anytime"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Convert MenuItem from DB → DishKB for chatbot
// ─────────────────────────────────────────────────────────────────────────────
const mapMenuItem = (item: any): DishKB => {
  const nameLower = item.name?.toLowerCase() || "";
  const keywords = [
    nameLower,
    ...nameLower.split(" "),
    item.subCategory?.toLowerCase() || "",
    item.category?.toLowerCase() || "",
    ...(item.ingredients || []).map((i: string) => i.toLowerCase()),
    ...(item.tags || []).map((t: string) => t.toLowerCase()),
    item.chefName ? item.chefName.toLowerCase() : "",
  ].filter(Boolean);

  return {
    id: item._id,
    name: item.name,
    price: item.price,
    category: item.category,
    subCategory: item.subCategory,
    spiceLevel: item.spiceLevel || "mild",
    prepTime: item.preparationTime || 15,
    chefName: item.chefName || null,
    keywords,
    nutrients: {
      calories: item.nutritionInfo?.calories || 0,
      protein: item.nutritionInfo?.protein || 0,
      carbs: item.nutritionInfo?.carbs || 0,
      fat: item.nutritionInfo?.fat || 0,
      fiber: item.nutritionInfo?.fiber || 0,
    },
    tags: item.tags || [],
    mealTime: SUB_TO_MEAL[item.subCategory] || ["anytime"],
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// INTENT DETECTION
// ─────────────────────────────────────────────────────────────────────────────
type Intent =
  | "GREETING"
  | "MENU"
  | "NUTRITION"
  | "DISH"
  | "BUDGET"
  | "RECOMMEND"
  | "ADD_CART"
  | "SPICE"
  | "VEG"
  | "NONVEG"
  | "PROTEIN"
  | "LOW_CAL"
  | "QUICK"
  | "HELP"
  | "CHEF"
  | "UNKNOWN";

const INTENT_WORDS: Record<Intent, string[]> = {
  GREETING: ["hello", "hi", "hey", "namaste", "namaskar", "yo", "sup"],
  MENU: [
    "menu",
    "list",
    "food",
    "items",
    "what",
    "available",
    "show",
    "have",
    "all",
  ],
  NUTRITION: [
    "calorie",
    "calories",
    "protein",
    "carbs",
    "fat",
    "fiber",
    "nutrition",
    "healthy",
    "kcal",
  ],
  DISH: [
    "momo",
    "thali",
    "dhido",
    "chowmein",
    "chiya",
    "samosa",
    "pakora",
    "sandwich",
    "rice",
    "dal",
  ],
  BUDGET: [
    "cheap",
    "budget",
    "affordable",
    "price",
    "under",
    "below",
    "rs",
    "nrs",
    "paisa",
  ],
  RECOMMEND: [
    "suggest",
    "recommend",
    "best",
    "popular",
    "what should",
    "which",
    "favourite",
    "today",
  ],
  ADD_CART: ["add", "cart", "order", "buy", "want", "take"],
  SPICE: ["spicy", "spice", "mild", "hot", "chilli", "piro", "not spicy"],
  VEG: ["veg", "vegetarian", "vegan", "plant", "no meat"],
  NONVEG: ["non veg", "nonveg", "chicken", "buff", "meat"],
  PROTEIN: ["protein", "muscle", "gym", "workout", "high protein"],
  LOW_CAL: ["low calorie", "diet", "weight loss", "light", "slim"],
  QUICK: ["quick", "fast", "hurry", "instant", "now", "asap"],
  CHEF: ["chef", "cook", "who made", "who cooked", "made by", "by which chef"],
  HELP: ["help", "assist", "confused", "what can", "commands"],
  UNKNOWN: [],
};

function detectIntent(msg: string): Intent {
  const lower = msg.toLowerCase();
  const scores: Partial<Record<Intent, number>> = {};
  (Object.keys(INTENT_WORDS) as Intent[]).forEach((intent) => {
    if (intent === "UNKNOWN") return;
    let s = 0;
    INTENT_WORDS[intent].forEach((word) => {
      if (lower.includes(word)) s += 9;
    });
    if (s > 0) scores[intent] = s;
  });
  const sorted = Object.entries(scores).sort(
    (a, b) => (b[1] as number) - (a[1] as number),
  );
  return sorted.length > 0 ? (sorted[0][0] as Intent) : "UNKNOWN";
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMPLE RETRIEVAL
// ─────────────────────────────────────────────────────────────────────────────
function simpleRetrieve(query: string, kb: DishKB[], topK = 3): DishKB[] {
  const lowerQuery = query.toLowerCase();
  return kb
    .filter(
      (d) =>
        d.name.toLowerCase().includes(lowerQuery) ||
        d.keywords.some(
          (kw) => lowerQuery.includes(kw) || kw.includes(lowerQuery),
        ),
    )
    .slice(0, topK);
}

// ─────────────────────────────────────────────────────────────────────────────
// TIME CONTEXT
// ─────────────────────────────────────────────────────────────────────────────
function timeCtx() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11)
    return { label: "Morning", slots: ["breakfast"], greet: "Good morning ☀️" };
  if (h >= 11 && h < 15)
    return {
      label: "Lunch time",
      slots: ["lunch"],
      greet: "Good afternoon 🌤️",
    };
  if (h >= 15 && h < 18)
    return { label: "Evening", slots: ["snack"], greet: "Good evening 🌅" };
  if (h >= 18 && h < 22)
    return { label: "Dinner", slots: ["dinner"], greet: "Good evening 🌙" };
  return {
    label: "Late night",
    slots: ["snack", "anytime"],
    greet: "Hey night owl 🌃",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE ENGINE
// ─────────────────────────────────────────────────────────────────────────────
interface BotResponse {
  text: string;
  dishes?: DishKB[];
}

function respond(message: string, kb: DishKB[]): BotResponse {
  const intent = detectIntent(message);
  const tc = timeCtx();
  const found = simpleRetrieve(message, kb);

  switch (intent) {
    case "GREETING": {
      const recs = kb
        .filter((d) => d.mealTime.some((t) => tc.slots.includes(t)))
        .slice(0, 2);
      return {
        text: `${tc.greet} Welcome to Sajha Chulo! 🍽️\n\nPerfect time for: ${recs.map((d) => d.name).join(" or ")}.\n\nType **help** for all commands!`,
      };
    }

    case "MENU": {
      const grouped: Record<string, DishKB[]> = {};
      kb.forEach((d) => {
        (grouped[d.subCategory] ??= []).push(d);
      });
      const text = Object.entries(grouped)
        .map(
          ([cat, items]) =>
            `**${cat}**\n${items.map((i) => `  • ${i.name} — NRs ${i.price}`).join("\n")}`,
        )
        .join("\n\n");
      return {
        text: `Here's our full menu 🍽️\n\n${text}\n\nAsk about any dish for nutrition or to add to cart!`,
      };
    }

    case "NUTRITION": {
      if (found.length > 0) {
        const d = found[0];
        const hasNutrition = d.nutrients.calories > 0;
        if (hasNutrition) {
          return {
            text: `📊 **${d.name}** (NRs ${d.price})\n\n🔥 Calories: ${d.nutrients.calories} kcal\n💪 Protein: ${d.nutrients.protein}g\n🍞 Carbs: ${d.nutrients.carbs}g\n🥑 Fat: ${d.nutrients.fat}g\n🌾 Fiber: ${d.nutrients.fiber}g${d.chefName ? `\n\n👩‍🍳 Chef: ${d.chefName}` : ""}`,
            dishes: [d],
          };
        }
        return {
          text: `**${d.name}** (NRs ${d.price}) — nutrition info not available yet.\n\nTry another dish!`,
          dishes: [d],
        };
      }
      return {
        text: `Which dish? Try: "calories in momo" or "protein in chicken thali"`,
      };
    }

    case "CHEF": {
      if (found.length > 0) {
        const d = found[0];
        return {
          text: d.chefName
            ? `👩‍🍳 **${d.name}** is made by **${d.chefName}**!\n\nNRs ${d.price} · ${d.prepTime} mins · ${d.spiceLevel}`
            : `**${d.name}** is made by our kitchen team!`,
          dishes: [d],
        };
      }
      const chefDishes = kb.filter((d) => d.chefName);
      if (chefDishes.length > 0) {
        const chefs = [...new Set(chefDishes.map((d) => d.chefName))];
        return {
          text: `👩‍🍳 Our home cooks: **${chefs.join(", ")}**\n\nAsk about a specific dish to see who made it!`,
        };
      }
      return {
        text: `Ask about a specific dish and I'll tell you who made it! 👩‍🍳`,
      };
    }

    case "DISH":
    case "ADD_CART": {
      if (found.length > 0)
        return {
          text:
            intent === "ADD_CART"
              ? `🛒 Which would you like to add?`
              : `Found these 🎯`,
          dishes: found,
        };
      return {
        text: `I couldn't find that dish. Type **menu** to see everything!`,
      };
    }

    case "BUDGET": {
      const match = message.match(/\d+/);
      const budget = match ? parseInt(match[0]) : 100;
      const cheap = kb
        .filter((d) => d.price <= budget)
        .sort((a, b) => b.nutrients.calories - a.nutrients.calories);
      if (cheap.length === 0) {
        const cheapest = [...kb].sort((a, b) => a.price - b.price)[0];
        return {
          text: `Nothing under NRs ${budget}. Cheapest is **${cheapest?.name}** at NRs ${cheapest?.price}!`,
        };
      }
      return { text: `Under NRs ${budget} 💰`, dishes: cheap.slice(0, 4) };
    }

    case "RECOMMEND": {
      const recs = kb
        .filter((d) => d.mealTime.some((t) => tc.slots.includes(t)))
        .slice(0, 3);
      return {
        text: `For ${tc.label.toLowerCase()}, I recommend:`,
        dishes: recs.length > 0 ? recs : kb.slice(0, 3),
      };
    }

    case "PROTEIN": {
      const sorted = [...kb]
        .filter((d) => d.nutrients.protein > 0)
        .sort((a, b) => b.nutrients.protein - a.nutrients.protein)
        .slice(0, 3);
      return sorted.length > 0
        ? { text: `💪 Highest protein dishes:`, dishes: sorted }
        : {
            text: `No nutrition data available yet. Ask the chef to add nutrition info!`,
          };
    }

    case "LOW_CAL": {
      const sorted = [...kb]
        .filter((d) => d.nutrients.calories > 0)
        .sort((a, b) => a.nutrients.calories - b.nutrients.calories)
        .slice(0, 3);
      return sorted.length > 0
        ? { text: `🥦 Lowest calorie options:`, dishes: sorted }
        : { text: `No calorie data yet. Ask the chef to add nutrition info!` };
    }

    case "QUICK": {
      const quick = kb
        .filter((d) => d.prepTime <= 10)
        .sort((a, b) => a.prepTime - b.prepTime);
      return quick.length > 0
        ? { text: `⚡ Ready in 10 mins or less:`, dishes: quick }
        : {
            text: `All our dishes take a bit longer right now. Fastest is **${[...kb].sort((a, b) => a.prepTime - b.prepTime)[0]?.name}**!`,
          };
    }

    case "VEG":
      return {
        text: `🌿 Vegetarian options:`,
        dishes: kb.filter((d) => d.category === "veg"),
      };
    case "NONVEG":
      return {
        text: `🍗 Non-veg options:`,
        dishes: kb.filter((d) => d.category === "non-veg"),
      };

    case "SPICE": {
      const lower = message.toLowerCase();
      const lvl =
        lower.includes("mild") || lower.includes("not spicy")
          ? "mild"
          : lower.includes("hot") || lower.includes("piro")
            ? "hot"
            : "medium";
      const spicy = kb.filter((d) =>
        lvl === "hot"
          ? ["hot", "extra-hot"].includes(d.spiceLevel)
          : d.spiceLevel === lvl,
      );
      return { text: `🌶️ ${lvl} options:`, dishes: spicy };
    }

    case "HELP":
      return {
        text: `Here's what I can do 🤖\n\n🍽️ **menu** — see all dishes\n💰 **under NRs 100** — budget food\n💪 **best protein** — gym food\n🥦 **low calorie** — diet food\n🌿 **veg only** — vegetarian\n🍗 **non-veg** — meat dishes\n🌶️ **mild/hot food** — by spice\n⚡ **quick food** — ready fast\n📊 **calories in momo** — nutrition\n👩‍🍳 **who made momo** — chef info\n🛒 **add momo to cart** — order\n\nI update automatically when new dishes are added! 🔄`,
      };

    default:
      if (found.length > 0)
        return { text: `Here's what I found 🔍`, dishes: found };
      return {
        text: `Hmm, not sure about that 🤔\n\nType **help** for commands or **menu** to browse all dishes!`,
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DISH CARD
// ─────────────────────────────────────────────────────────────────────────────
function DishCard({ d, onAdd }: { d: DishKB; onAdd: (id: string) => void }) {
  const catColor =
    d.category === "veg"
      ? "#dcfce7|#16a34a"
      : d.category === "beverage"
        ? "#dbeafe|#1d4ed8"
        : d.category === "dessert"
          ? "#fce7f3|#be185d"
          : "#fee2e2|#dc2626";
  const [bg, fg] = catColor.split("|");
  const spiceColor: Record<string, string> = {
    mild: "#22c55e",
    medium: "#f59e0b",
    hot: "#ef4444",
    "extra-hot": "#7c3aed",
  };
  return (
    <div
      style={{
        background: "#fff",
        border: "1.5px solid #f0f0f0",
        borderRadius: 12,
        padding: "10px 12px",
        marginBottom: 8,
        transition: "border 0.15s",
      }}
      onMouseOver={(e) => (e.currentTarget.style.borderColor = "#f97316")}
      onMouseOut={(e) => (e.currentTarget.style.borderColor = "#f0f0f0")}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a" }}>
            {d.name}
          </div>
          <div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>
            {d.nutrients.calories > 0
              ? `🔥 ${d.nutrients.calories}kcal · `
              : ""}
            {d.nutrients.protein > 0 ? `💪 ${d.nutrients.protein}g · ` : ""}
            ⏱️ {d.prepTime}min
            {d.chefName ? ` · 👩‍🍳 ${d.chefName}` : ""}
          </div>
          <div
            style={{
              display: "flex",
              gap: 4,
              marginTop: 6,
              flexWrap: "wrap" as const,
            }}
          >
            <span
              style={{
                background: bg,
                color: fg,
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 99,
              }}
            >
              {d.category}
            </span>
            {d.spiceLevel && (
              <span
                style={{
                  background: `${spiceColor[d.spiceLevel] || "#888"}18`,
                  color: spiceColor[d.spiceLevel] || "#888",
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 99,
                }}
              >
                {d.spiceLevel}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right", marginLeft: 10, flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#f97316" }}>
            NRs {d.price}
          </div>
          <button
            onClick={() => onAdd(d.id)}
            style={{
              marginTop: 5,
              background: "linear-gradient(135deg,#f97316,#ea580c)",
              color: "#fff",
              border: "none",
              borderRadius: 7,
              padding: "5px 10px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + Cart
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUBBLE
// ─────────────────────────────────────────────────────────────────────────────
interface Msg {
  id: string;
  role: "user" | "bot";
  text: string;
  dishes?: DishKB[];
  time: Date;
}

function Bubble({ msg, onAdd }: { msg: Msg; onAdd: (id: string) => void }) {
  const isUser = msg.role === "user";
  const bold = (text: string) =>
    text
      .split(/(\*\*.*?\*\*)/)
      .map((part, i) =>
        part.startsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          part
        ),
      );
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
      }}
    >
      <div style={{ maxWidth: "86%" }}>
        {!isUser && (
          <div
            style={{
              fontSize: 9,
              color: "#aaa",
              marginBottom: 3,
              marginLeft: 2,
            }}
          >
            Sajha Chulo Assistant
          </div>
        )}
        <div
          style={{
            padding: "10px 14px",
            borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            background: isUser
              ? "linear-gradient(135deg,#f97316,#ea580c)"
              : "#fff",
            color: isUser ? "#fff" : "#1a1a1a",
            fontSize: 13,
            lineHeight: 1.55,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: isUser ? "none" : "1.5px solid #f0f0f0",
          }}
        >
          {msg.text.split("\n").map((line, i) => (
            <span key={i}>
              {bold(line)}
              <br />
            </span>
          ))}
        </div>
        {msg.dishes && msg.dishes.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {msg.dishes.map((d) => (
              <DishCard key={d.id} d={d} onAdd={onAdd} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function PlatefulChat() {
  const { addToCart } = useCart();
  const [open, setOpen] = useState(false);
  const [kb, setKb] = useState<DishKB[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: "w",
      role: "bot",
      text: `Hi! 👋 I'm **Sajha Chulo Assistant**\n\nType **help** to see what I can do, or just ask me anything!`,
      time: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Fetch live menu from DB ──────────────────────────────────────────────
  const fetchMenu = useCallback(async () => {
    try {
      // Fetch from categories (includes chef info)
      const res = await api.get("/categories");
      const categories = res.data.data || [];

      const allItems: DishKB[] = [];
      categories.forEach((cat: any) => {
        (cat.items || []).forEach((item: any) => {
          // Only include if item is available (which now respects chef status)
          if (item.isAvailable) {
            allItems.push(mapMenuItem(item));
          }
        });
      });

      if (allItems.length > 0) {
        setKb(allItems);
        setLastUpdated(new Date());
        console.log(`[CHATBOT] Loaded ${allItems.length} items from DB`);
      }
    } catch (err) {
      console.error("[CHATBOT] Failed to fetch menu:", err);
    }
  }, []);

  // Load on mount + auto-refresh every 5 minutes
  useEffect(() => {
    fetchMenu();
    const interval = setInterval(fetchMenu, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMenu]);

  // Also refresh when chat is opened
  useEffect(() => {
    if (open) fetchMenu();
  }, [open, fetchMenu]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const handleAdd = (menuItemId: string) => {
    addToCart({ menuItemId, quantity: 1 });
  };

  const send = () => {
    if (!input.trim()) return;
    const userMsg: Msg = {
      id: Date.now().toString(),
      role: "user",
      text: input,
      time: new Date(),
    };
    setMsgs((p) => [...p, userMsg]);
    const q = input;
    setInput("");
    setTyping(true);

    setTimeout(
      () => {
        const res =
          kb.length > 0
            ? respond(q, kb)
            : { text: `Loading menu... Please try again in a moment! 🔄` };
        setMsgs((p) => [
          ...p,
          {
            id: (Date.now() + 1).toString(),
            role: "bot",
            text: res.text,
            dishes: res.dishes,
            time: new Date(),
          },
        ]);
        setTyping(false);
      },
      400 + Math.random() * 300,
    );
  };

  const QUICK = [
    "Show menu 🍽️",
    "Best protein 💪",
    "Under NRs 100 💰",
    "Veg only 🌿",
    "Quick food ⚡",
    "Help 🤖",
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Sajha Chulo Assistant"
        style={{
          position: "fixed",
          bottom: 100,
          right: 28,
          zIndex: 9999,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg,#1a0a00,#f97316)",
          border: "2px solid rgba(255,255,255,0.15)",
          boxShadow: "0 6px 24px rgba(249,115,22,0.45)",
          cursor: "pointer",
          fontSize: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.2s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 170,
            right: 28,
            zIndex: 9998,
            width: 378,
            height: 555,
            background: "#fafafa",
            borderRadius: 22,
            boxShadow: "0 16px 64px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            fontFamily: "'Segoe UI',system-ui,sans-serif",
            overflow: "hidden",
            animation: "chatIn 0.28s cubic-bezier(.4,0,.2,1)",
          }}
        >
          {/* ✅ FIX: Header no longer shows "NLP · RAG · TRIE" */}
          <div
            style={{
              background: "linear-gradient(135deg,#1a0a00,#f97316)",
              padding: "12px 16px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 8,
                    letterSpacing: 2,
                    color: "rgba(255,255,255,0.6)",
                    textTransform: "uppercase",
                  }}
                >
                  {lastUpdated
                    ? `Updated ${lastUpdated.toLocaleTimeString()}`
                    : "Your Food Assistant"}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#fff",
                    marginTop: 1,
                  }}
                >
                  💬 Sajha Chulo Assistant
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {/* Refresh button */}
                <button
                  onClick={fetchMenu}
                  title="Refresh menu"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "none",
                    borderRadius: 99,
                    padding: "3px 8px",
                    fontSize: 12,
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  🔄
                </button>
                <div
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: 99,
                    padding: "3px 10px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  🟢 {kb.length} dishes
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 4px" }}>
            {msgs.map((msg) => (
              <Bubble key={msg.id} msg={msg} onAdd={handleAdd} />
            ))}
            {typing && (
              <div style={{ display: "flex", marginBottom: 10 }}>
                <div
                  style={{
                    background: "#fff",
                    border: "1.5px solid #f0f0f0",
                    borderRadius: "18px 18px 18px 4px",
                    padding: "10px 16px",
                    display: "flex",
                    gap: 5,
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#f97316",
                        animation: `dot 1.2s ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          <div
            style={{
              padding: "6px 10px",
              display: "flex",
              gap: 5,
              overflowX: "auto",
              flexShrink: 0,
              borderTop: "1px solid #f0f0f0",
              background: "#fff",
            }}
          >
            {QUICK.map((p) => (
              <button
                key={p}
                onClick={() =>
                  setInput(p.replace(/[🍽️💪💰🌿⚡🤖]/g, "").trim())
                }
                style={{
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  borderRadius: 99,
                  padding: "4px 10px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#c2410c",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div
            style={{
              padding: "10px",
              background: "#fff",
              borderTop: "1px solid #f0f0f0",
              display: "flex",
              gap: 7,
              flexShrink: 0,
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask anything about our food..."
              style={{
                flex: 1,
                padding: "9px 13px",
                border: "2px solid #f0f0f0",
                borderRadius: 11,
                fontSize: 13,
                outline: "none",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#f97316")}
              onBlur={(e) => (e.target.style.borderColor = "#f0f0f0")}
            />
            <button
              onClick={send}
              style={{
                width: 40,
                height: 40,
                borderRadius: 11,
                background: "linear-gradient(135deg,#f97316,#ea580c)",
                border: "none",
                color: "#fff",
                fontSize: 17,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
      <style>{`
        @keyframes chatIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dot { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
      `}</style>
    </>
  );
}
