// Frontend/src/pages/Admin/ManageSubscriptions.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users, Calendar, PauseCircle, XCircle, CheckCircle, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";
import { format } from "date-fns";

const statusColor: Record<string, string> = {
  active:    "bg-green-100 text-green-700 border-green-200",
  paused:    "bg-yellow-100 text-yellow-700 border-yellow-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  expired:   "bg-gray-100 text-gray-600 border-gray-200",
};

const SubscriptionCard = ({ sub, onView }: any) => (
  <Card className="overflow-hidden">
    <div className="h-1 gradient-primary" />
    <CardContent className="p-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <p className="font-bold">{sub.user?.firstName} {sub.user?.lastName}</p>
          <p className="text-xs text-muted-foreground">{sub.user?.email}</p>
          <p className="text-sm font-semibold text-primary mt-1">{sub.plan?.name}</p>
        </div>
        <Badge className={`${statusColor[sub.status]} border text-xs`}>
          {sub.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
        <div className="bg-muted/40 rounded-lg p-2">
          <p className="text-muted-foreground">Start Date</p>
          <p className="font-semibold">{sub.startDate ? format(new Date(sub.startDate), "PP") : "—"}</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-2">
          <p className="text-muted-foreground">End Date</p>
          <p className="font-semibold">{sub.endDate ? format(new Date(sub.endDate), "PP") : "—"}</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-2">
          <p className="text-muted-foreground">Meal Type</p>
          <p className="font-semibold capitalize">{sub.preferences?.mealType || "—"}</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-2">
          <p className="text-muted-foreground">Payment</p>
          <p className="font-semibold capitalize">{sub.paymentMethod || "COD"}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <p className="text-sm font-black text-primary">NRs {sub.totalPrice}</p>
        <Button size="sm" variant="outline" onClick={() => onView(sub)}>
          <Eye className="h-3 w-3 mr-1" /> Details
        </Button>
      </div>
    </CardContent>
  </Card>
);

const ManageSubscriptions = () => {
  const [activeTab, setActiveTab] = useState("active");
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["adminSubscriptions", activeTab],
    queryFn: async () => {
      const res = await api.get(`/subscriptions/admin/all?status=${activeTab}`);
      return res.data.data;
    },
  });

  // Stats query
  const { data: allSubs } = useQuery({
    queryKey: ["adminSubscriptionsAll"],
    queryFn: async () => {
      const res = await api.get("/subscriptions/admin/all");
      return res.data.data;
    },
  });

  const stats = {
    total:     allSubs?.length ?? 0,
    active:    allSubs?.filter((s: any) => s.status === "active").length ?? 0,
    paused:    allSubs?.filter((s: any) => s.status === "paused").length ?? 0,
    cancelled: allSubs?.filter((s: any) => s.status === "cancelled").length ?? 0,
    revenue:   allSubs?.filter((s: any) => s.status === "active").reduce((sum: number, s: any) => sum + (s.totalPrice || 0), 0) ?? 0,
  };

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black">Manage Subscriptions</h1>
          <p className="text-muted-foreground text-sm">View and manage all tiffin subscriptions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total",     value: stats.total,              color: "text-foreground" },
          { label: "Active",    value: stats.active,             color: "text-green-600"  },
          { label: "Paused",    value: stats.paused,             color: "text-yellow-600" },
          { label: "Revenue",   value: `NRs ${stats.revenue}`,   color: "text-primary"    },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="active">✅ Active</TabsTrigger>
          <TabsTrigger value="paused">⏸️ Paused</TabsTrigger>
          <TabsTrigger value="cancelled">❌ Cancelled</TabsTrigger>
          <TabsTrigger value="expired">🕐 Expired</TabsTrigger>
        </TabsList>

        {["active", "paused", "cancelled", "expired"].map(tab => (
          <TabsContent key={tab} value={tab}>
            {isLoading ? (
              <div className="flex justify-center h-40 items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !data || data.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No {tab} subscriptions.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.map((sub: any) => (
                  <SubscriptionCard key={sub._id} sub={sub} onView={setSelectedSub} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSub} onOpenChange={() => setSelectedSub(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
          </DialogHeader>
          {selectedSub && (
            <div className="space-y-3 text-sm">
              <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                <p><span className="font-bold">Customer:</span> {selectedSub.user?.firstName} {selectedSub.user?.lastName}</p>
                <p><span className="font-bold">Email:</span> {selectedSub.user?.email}</p>
                <p><span className="font-bold">Phone:</span> {selectedSub.user?.phone}</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                <p><span className="font-bold">Plan:</span> {selectedSub.plan?.name}</p>
                <p><span className="font-bold">Status:</span> <Badge className={`${statusColor[selectedSub.status]} border text-xs ml-1`}>{selectedSub.status}</Badge></p>
                <p><span className="font-bold">Total Price:</span> NRs {selectedSub.totalPrice}</p>
                <p><span className="font-bold">Payment:</span> {selectedSub.paymentMethod || "COD"}</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                <p className="font-bold mb-1">Preferences:</p>
                <p><span className="text-muted-foreground">Meal Type:</span> {selectedSub.preferences?.mealType}</p>
                <p><span className="text-muted-foreground">Meal Time:</span> {selectedSub.preferences?.mealTime}</p>
                <p><span className="text-muted-foreground">Spice Level:</span> {selectedSub.preferences?.spiceLevel}</p>
                {selectedSub.preferences?.specialRequests && (
                  <p><span className="text-muted-foreground">Special Requests:</span> {selectedSub.preferences.specialRequests}</p>
                )}
              </div>
              <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                <p className="font-bold mb-1">Delivery Address:</p>
                <p>{selectedSub.deliveryAddress?.street}</p>
                <p>{selectedSub.deliveryAddress?.city}</p>
                <p>{selectedSub.deliveryAddress?.phone}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageSubscriptions;