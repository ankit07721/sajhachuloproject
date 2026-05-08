// Frontend/src/pages/MealPlans.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Loader2, ChefHat, Leaf, Drumstick, Clock, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface TiffinPlan {
  _id: string;
  name: string;
  slug: string;
  badge: string;
  description: string;
  pricePerWeek: number;
  durationDays: number;
  features: string[];
  discountPercent: number;
}

interface SubscribePayload {
  planId: string;
  preferences: {
    mealType: "veg" | "non-veg" | "both";
    mealTime: "lunch" | "dinner" | "both";
    spiceLevel: "mild" | "medium" | "hot";
    specialRequests: string;
  };
  deliveryAddress: {
    street: string;
    city: string;
    landmark: string;
    phone: string;
  };
  paymentMethod: "cod";
  deliveryCoords?: { latitude: number; longitude: number } | null;
}

const fetchPlans = async (): Promise<TiffinPlan[]> => {
  const { data } = await api.get("/subscriptions/plans");
  return data.data;
};

// ✅ FIX: Sort plans in correct display order: Weekly → Monthly → Special Diet
const PLAN_ORDER = ["weekly", "monthly", "special-diet"];

function PlanCard({ plan, onSelect }: { plan: TiffinPlan; onSelect: (plan: TiffinPlan) => void }) {
  const badgeColor: Record<string, string> = {
    Popular: "bg-orange-500",
    "Best Value": "bg-gray-900",
    Health: "bg-blue-500",
  };

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer border-2 ${
        plan.badge === "Best Value" ? "border-gray-900" : plan.badge === "Health" ? "border-blue-400" : "border-primary"
      }`}
      onClick={() => onSelect(plan)}
    >
      <div className={`h-1.5 w-full ${plan.badge === "Best Value" ? "bg-gray-900" : plan.badge === "Health" ? "bg-blue-500" : "bg-primary"}`} />

      {plan.badge && (
        <div className={`absolute top-4 right-4 ${badgeColor[plan.badge] ?? "bg-primary"} text-white text-xs font-bold px-3 py-1 rounded-full`}>
          {plan.badge}
        </div>
      )}

      <CardContent className="p-6">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${plan.badge === "Health" ? "bg-blue-50" : "bg-orange-50"}`}>
          {plan.badge === "Health"
            ? <span className="text-3xl">🥗</span>
            : plan.durationDays >= 30
            ? <span className="text-3xl">📅</span>
            : <span className="text-3xl">🗓️</span>
          }
        </div>

        <h3 className="text-xl font-black text-foreground mb-2">{plan.name}</h3>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{plan.description}</p>

        <div className="mb-5">
          <span className="text-2xl font-black text-primary">
            From Rs. {plan.pricePerWeek.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-sm">
            /{plan.durationDays >= 30 ? "month" : "week"}
          </span>
          {plan.discountPercent > 0 && (
            <Badge className="ml-2 bg-green-100 text-green-700 border-green-200">
              {plan.discountPercent}% off
            </Badge>
          )}
        </div>

        <Separator className="mb-4" />

        <ul className="space-y-2 mb-6">
          {plan.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <Button
          className={`w-full font-bold ${plan.badge === "Best Value" ? "bg-gray-900 hover:bg-gray-800 text-white" : "gradient-primary"}`}
          size="lg"
        >
          Subscribe Now
        </Button>
      </CardContent>
    </Card>
  );
}

function SubscribeModal({ plan, onClose, onSuccess }: {
  plan: TiffinPlan;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [deliveryCoords, setDeliveryCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [prefs, setPrefs] = useState({
    mealType: "both" as "veg" | "non-veg" | "both",
    mealTime: "both" as "lunch" | "dinner" | "both",
    spiceLevel: "medium" as "mild" | "medium" | "hot",
    specialRequests: "",
  });
  const [addr, setAddr] = useState({ street: "", city: "", landmark: "", phone: "" });

  const { mutate: subscribe, isPending } = useMutation({
    mutationFn: (payload: SubscribePayload) => api.post("/subscriptions", payload),
    onSuccess: () => {
      toast.success("Subscription activated! Enjoy your meals!");
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to subscribe.");
    },
  });

  const handleSubmit = () => {
    if (!addr.street || !addr.city || !addr.phone) {
      return toast.error("Please fill in all delivery details.");
    }
    subscribe({ planId: plan._id, preferences: prefs, deliveryAddress: addr, paymentMethod: "cod", deliveryCoords });
  };

  const totalPrice = plan.durationDays >= 30
    ? plan.pricePerWeek * (1 - plan.discountPercent / 100)
    : plan.pricePerWeek;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="gradient-primary p-5 text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs opacity-75 uppercase tracking-widest">Subscribe to</p>
              <h2 className="text-xl font-black">{plan.name}</h2>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">✕</button>
          </div>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${step >= s ? "bg-white" : "bg-white/30"}`} />
            ))}
          </div>
          <div className="flex justify-between text-xs opacity-75 mt-1">
            <span>Preferences</span><span>Delivery</span><span>Confirm</span>
          </div>
        </div>

        <div className="p-6">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <h3 className="font-bold text-lg">Your Food Preferences</h3>
              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">Meal Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["veg", "non-veg", "both"] as const).map(opt => (
                    <button key={opt} onClick={() => setPrefs(p => ({ ...p, mealType: opt }))}
                      className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${prefs.mealType === opt ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                      {opt === "veg" ? <><Leaf className="h-3.5 w-3.5" />Veg</> : opt === "non-veg" ? <><Drumstick className="h-3.5 w-3.5" />Non-veg</> : <><ChefHat className="h-3.5 w-3.5" />Both</>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">Meal Time</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["lunch", "dinner", "both"] as const).map(opt => (
                    <button key={opt} onClick={() => setPrefs(p => ({ ...p, mealTime: opt }))}
                      className={`p-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${prefs.mealTime === opt ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                      {opt === "lunch" ? "☀️ Lunch" : opt === "dinner" ? "🌙 Dinner" : "Both"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">Spice Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["mild", "medium", "hot"] as const).map(opt => (
                    <button key={opt} onClick={() => setPrefs(p => ({ ...p, spiceLevel: opt }))}
                      className={`p-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${prefs.spiceLevel === opt ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                      {opt === "mild" ? "🟢 Mild" : opt === "medium" ? "🟡 Medium" : "🔴 Hot"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">Special Requests (optional)</label>
                <textarea value={prefs.specialRequests}
                  onChange={e => setPrefs(p => ({ ...p, specialRequests: e.target.value.slice(0, 300) }))}
                  placeholder="e.g. No onion, diabetic diet, extra rice..."
                  rows={2} className="w-full p-3 border-2 border-border rounded-xl text-sm resize-none outline-none focus:border-primary transition-colors" />
              </div>
              <Button className="w-full gradient-primary" size="lg" onClick={() => setStep(2)}>Continue →</Button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-lg">Delivery Address</h3>
              <Button type="button" variant="outline"
                className="w-full border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setDeliveryCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                      toast.success(`📍 Location detected!`);
                    },
                    () => toast.error("Could not detect location. Please allow location access.")
                  );
                }}>
                📍 Detect My Location (for chef assignment)
              </Button>
              {deliveryCoords && (
                <p className="text-xs text-green-600 font-medium">
                  ✅ Location set ({deliveryCoords.latitude.toFixed(4)}, {deliveryCoords.longitude.toFixed(4)})
                </p>
              )}
              {[
                { key: "street",   label: "Street Address", placeholder: "e.g. Traffic Chowk, Butwal" },
                { key: "city",     label: "City",           placeholder: "e.g. Butwal" },
                { key: "landmark", label: "Landmark (optional)", placeholder: "e.g. Near hospital" },
                { key: "phone",    label: "Contact Phone",  placeholder: "e.g. 98XXXXXXXX" },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-sm font-semibold text-muted-foreground mb-1.5 block">{field.label}</label>
                  <input value={(addr as any)[field.key]}
                    onChange={e => setAddr(a => ({ ...a, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full p-3 border-2 border-border rounded-xl text-sm outline-none focus:border-primary transition-colors" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>← Back</Button>
                <Button className="flex-1 gradient-primary" onClick={() => setStep(3)}>Continue →</Button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-lg">Confirm Subscription</h3>
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                {[
                  { label: "Plan",      val: plan.name },
                  { label: "Duration",  val: `${plan.durationDays} days` },
                  { label: "Meal Type", val: prefs.mealType },
                  { label: "Meal Time", val: prefs.mealTime },
                  { label: "Spice",     val: prefs.spiceLevel },
                  { label: "Delivery",  val: `${addr.street}, ${addr.city}` },
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-bold capitalize text-right max-w-[60%]">{row.val}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between">
                  <span className="font-bold">Total</span>
                  <span className="font-black text-primary text-lg">Rs. {totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="font-bold text-green-600">Cash on Delivery</span>
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
                📦 Your first delivery starts <strong>tomorrow</strong>. Our team will contact you to confirm!
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>← Back</Button>
                <Button className="flex-1 gradient-primary" size="lg" onClick={handleSubmit} disabled={isPending}>
                  {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Activating...</> : "Confirm & Subscribe"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const MealPlans = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<TiffinPlan | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["tiffinPlans"],
    queryFn: fetchPlans,
  });

  // ✅ FIX: Sort plans in correct order: Weekly → Monthly → Special Diet
  const sortedPlans = plans
    ? [...plans].sort((a, b) => {
        const aIdx = PLAN_ORDER.indexOf(a.slug);
        const bIdx = PLAN_ORDER.indexOf(b.slug);
        return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
      })
    : [];

  const handleSelect = (plan: TiffinPlan) => {
    if (!isAuthenticated) {
      toast.error("Please login to subscribe!");
      navigate("/login");
      return;
    }
    setSelectedPlan(plan);
  };

  return (
    <div className="min-h-screen bg-background py-16 animate-fade-in">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-14">
          <Badge className="bg-primary/10 text-primary border-primary/20 mb-4 text-sm px-4 py-1">
            Tiffin Subscription
          </Badge>
          <h1 className="text-5xl font-black text-foreground mb-4">Meal Plans</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Choose from our flexible meal plans and enjoy delicious home-cooked food every day.
          </p>
          <div className="flex justify-center gap-10 mt-8">
            {[
              { icon: <ChefHat className="h-5 w-5" />, label: "Home Cooks", val: "10+" },
              { icon: <Zap className="h-5 w-5" />,    label: "Daily Orders", val: "50+" },
              { icon: <Clock className="h-5 w-5" />,  label: "On-time Delivery", val: "98%" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="flex items-center justify-center gap-1 text-primary font-black text-2xl">{s.icon}{s.val}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center h-48 items-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : !sortedPlans.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">No plans available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {sortedPlans.map(plan => <PlanCard key={plan._id} plan={plan} onSelect={handleSelect} />)}
          </div>
        )}

        {isAuthenticated && (
          <div className="text-center mt-12">
            <p className="text-muted-foreground text-sm">Already subscribed?</p>
            <Button variant="outline" className="mt-2" onClick={() => navigate("/my-subscription")}>
              View My Subscription →
            </Button>
          </div>
        )}
      </div>

      {selectedPlan && (
        <SubscribeModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onSuccess={() => {
            setSelectedPlan(null);
            queryClient.invalidateQueries({ queryKey: ["mySubscription"] });
            navigate("/my-subscription");
          }}
        />
      )}
    </div>
  );
};

export default MealPlans;
