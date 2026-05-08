import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, PauseCircle, XCircle, PlayCircle, ChefHat } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

interface Subscription {
  _id: string;
  planName: string;
  planSlug: string;
  status: "active" | "paused" | "cancelled" | "expired";
  startDate: string;
  endDate: string;
  totalAmount: number;
  paymentStatus: string;
  preferences: {
    mealType: string;
    mealTime: string;
    spiceLevel: string;
    specialRequests: string;
  };
  deliveryAddress: {
    street: string;
    city: string;
    landmark: string;
    phone: string;
  };

  


  plan: {
    name: string;
    features: string[];
    durationDays: number;
  };
  assignedChefName?: string;
  assignedChef?: {
    firstName: string;
    lastName: string;
    chefProfile?: { specialty: string; rating: number; };
  };
  createdAt: string;
}

const fetchMySub = async (): Promise<Subscription | null> => {
  const { data } = await api.get("/subscriptions/my");
  return data.data;
};

const statusConfig = {
  active:    { color: "bg-green-100 text-green-700 border-green-200",    icon: <CheckCircle className="h-4 w-4" />,  label: "Active" },
  paused:    { color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <PauseCircle className="h-4 w-4" />, label: "Paused" },
  cancelled: { color: "bg-red-100 text-red-700 border-red-200",          icon: <XCircle className="h-4 w-4" />,     label: "Cancelled" },
  expired:   { color: "bg-gray-100 text-gray-600 border-gray-200",       icon: <XCircle className="h-4 w-4" />,     label: "Expired" },
};

const MySubscription = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: sub, isLoading } = useQuery({
    queryKey: ["mySubscription"],
    queryFn: fetchMySub,
  });

  const pauseMutation = useMutation({
    mutationFn: () => api.put(`/subscriptions/${sub?._id}/pause`),
    onSuccess: () => { toast.success("Subscription paused."); queryClient.invalidateQueries({ queryKey: ["mySubscription"] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to pause."),
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.put(`/subscriptions/${sub?._id}/resume`),
    onSuccess: () => { toast.success("Subscription resumed! 🎉"); queryClient.invalidateQueries({ queryKey: ["mySubscription"] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to resume."),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.put(`/subscriptions/${sub?._id}/cancel`, { reason: "User requested cancellation" }),
    onSuccess: () => { toast.success("Subscription cancelled."); queryClient.invalidateQueries({ queryKey: ["mySubscription"] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to cancel."),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // No subscription
  if (!sub) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center py-16 animate-fade-in">
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <ChefHat className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-black text-foreground mb-3">No Active Subscription</h1>
          <p className="text-muted-foreground mb-8">
            You don't have an active meal plan yet. Subscribe to enjoy fresh home-cooked meals every day!
          </p>
          <Button className="gradient-primary" size="lg" onClick={() => navigate("/meal-plans")}>
            Browse Meal Plans →
          </Button>
        </div>
      </div>
    );
  }

  const daysLeft = differenceInDays(new Date(sub.endDate), new Date());
  const totalDays = sub.plan.durationDays;
  const daysUsed = totalDays - daysLeft;
  const progressPct = Math.min(100, Math.max(0, (daysUsed / totalDays) * 100));
  const sc = statusConfig[sub.status];

  return (
    <div className="min-h-screen bg-background py-10 animate-fade-in">
      <div className="container mx-auto px-4 max-w-3xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-foreground">My Subscription</h1>
            <p className="text-muted-foreground mt-1">Manage your active meal plan</p>
          </div>
          <Badge className={`${sc.color} flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold border`}>
            {sc.icon}{sc.label}
          </Badge>
        </div>

        {/* Main Card */}
        <Card className="mb-6 overflow-hidden">
          {/* Color bar */}
          <div className="h-2 gradient-primary" />

          <CardContent className="p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <h2 className="text-2xl font-black text-foreground mt-0.5">{sub.planName}</h2>
                <p className="text-primary font-bold text-lg mt-1">Rs. {sub.totalAmount.toLocaleString()} total</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Payment</p>
                <p className={`text-sm font-bold mt-0.5 ${sub.paymentStatus === "paid" ? "text-green-600" : "text-yellow-600"}`}>
                  {sub.paymentStatus === "paid" ? "✅ Paid" : "⏳ Pending"}
                </p>
              </div>
            </div>

            <Separator className="my-5" />

            {/* Progress */}
            <div className="mb-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Plan Progress</span>
                <span className="font-bold text-primary">{Math.max(0, daysLeft)} days left</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPct}%`,
                    background: daysLeft <= 2 ? "#ef4444" : "linear-gradient(90deg,#f97316,#ea580c)",
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                <span>Started {format(new Date(sub.startDate), "MMM d")}</span>
                <span>Ends {format(new Date(sub.endDate), "MMM d, yyyy")}</span>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Start Date", val: format(new Date(sub.startDate), "PPP") },
                { label: "End Date",   val: format(new Date(sub.endDate), "PPP") },
              ].map(item => (
                <div key={item.label} className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-bold text-sm mt-0.5">{item.val}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Two-column: Preferences + Delivery */}
        {sub.assignedChefName && (
  <Card className="mb-6 border-orange-200 bg-orange-50">
    <CardContent className="flex items-center gap-4 p-5">
      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
        <ChefHat className="h-6 w-6 text-orange-600" />
      </div>
      <div>
        <p className="text-xs text-orange-600 font-semibold uppercase tracking-wide">Your Assigned Chef</p>
        <p className="text-lg font-black text-orange-800">{sub.assignedChefName} 👩‍🍳</p>
        {sub.assignedChef?.chefProfile?.specialty && (
          <p className="text-sm text-orange-600">{sub.assignedChef.chefProfile.specialty}</p>
        )}
      </div>
      {sub.assignedChef?.chefProfile?.rating > 0 && (
              <div className="ml-auto text-center">
                <p className="text-xl font-black text-orange-700">⭐ {sub.assignedChef.chefProfile.rating}</p>
                <p className="text-xs text-orange-500">rating</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">🍽️ Food Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                { label: "Meal Type",   val: sub.preferences.mealType },
                { label: "Meal Time",   val: sub.preferences.mealTime },
                { label: "Spice Level", val: sub.preferences.spiceLevel },
              ].map(row => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold capitalize">{row.val}</span>
                </div>
              ))}
              {sub.preferences.specialRequests && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Special Requests</p>
                  <p className="text-sm italic">"{sub.preferences.specialRequests}"</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">📍 Delivery Address</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-semibold">{sub.deliveryAddress.street}</p>
              <p className="text-muted-foreground">{sub.deliveryAddress.city}</p>
              {sub.deliveryAddress.landmark && (
                <p className="text-muted-foreground text-xs">Near: {sub.deliveryAddress.landmark}</p>
              )}
              <p className="text-muted-foreground">📞 {sub.deliveryAddress.phone}</p>
            </CardContent>
          </Card>
        </div>

        {/* Plan Features */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">✅ What's Included</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sub.plan.features.map(f => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {(sub.status === "active" || sub.status === "paused") && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">⚙️ Manage Subscription</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {sub.status === "active" && (
                <Button variant="outline" className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                  onClick={() => { if (confirm("Pause your subscription?")) pauseMutation.mutate(); }}
                  disabled={pauseMutation.isPending}>
                  <PauseCircle className="h-4 w-4 mr-2" />
                  {pauseMutation.isPending ? "Pausing..." : "Pause Subscription"}
                </Button>
              )}
              {sub.status === "paused" && (
                <Button className="gradient-primary"
                  onClick={() => resumeMutation.mutate()}
                  disabled={resumeMutation.isPending}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  {resumeMutation.isPending ? "Resuming..." : "Resume Subscription"}
                </Button>
              )}
              <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => { if (confirm("Are you sure you want to cancel? This cannot be undone.")) cancelMutation.mutate(); }}
                disabled={cancelMutation.isPending}>
                <XCircle className="h-4 w-4 mr-2" />
                {cancelMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Renewal CTA */}
        {(sub.status === "cancelled" || sub.status === "expired") && (
          <div className="text-center mt-4">
            <Button className="gradient-primary" size="lg" onClick={() => navigate("/meal-plans")}>
              🔄 Subscribe Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MySubscription;