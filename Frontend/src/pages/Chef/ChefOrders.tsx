// Frontend/src/pages/Chef/ChefOrders.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ChefHat, Clock, Phone, MapPin, CheckCircle, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import api from "@/lib/api";
import { Link } from "react-router-dom";

const statusStyle: Record<string, string> = {
  pending:           "bg-gray-100 text-gray-600 border-gray-200",
  confirmed:         "bg-blue-100 text-blue-700 border-blue-200",
  preparing:         "bg-yellow-100 text-yellow-700 border-yellow-200",
  ready:             "bg-orange-100 text-orange-700 border-orange-200",
  "out-for-delivery":"bg-purple-100 text-purple-700 border-purple-200",
  delivered:         "bg-green-100 text-green-700 border-green-200",
};

const ChefOrders = () => {
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["chefOrders"],
    queryFn: async () => {
      const res = await api.get("/orders/chef-orders");
      return res.data.data;
    },
    // Auto-refresh every 30 seconds for new orders
    refetchInterval: 30000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ orderNumber, status }: { orderNumber: string; status: string }) =>
      api.patch(`/orders/${orderNumber}/chef-status`, { status }),
    onSuccess: (_, vars) => {
      toast.success(`Order marked as ${vars.status}! ✅`);
      queryClient.invalidateQueries({ queryKey: ["chefOrders"] });
    },
    onError: () => toast.error("Failed to update status."),
  });

  const activeOrders = orders?.filter((o: any) =>
    ["pending", "confirmed", "preparing", "ready"].includes(o.status)
  ) || [];

  const completedOrders = orders?.filter((o: any) =>
    ["out-for-delivery", "delivered"].includes(o.status)
  ) || [];

  const OrderCard = ({ order }: { order: any }) => (
    <Card className="overflow-hidden">
      <div className={`h-1 ${
        order.status === "preparing" ? "bg-yellow-500" :
        order.status === "ready" ? "bg-orange-500" :
        order.status === "delivered" ? "bg-green-500" : "bg-primary"
      }`} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-black text-sm">#{order.orderNumber}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(order.createdAt), "MMM d · h:mm a")}
            </p>
          </div>
          <Badge className={`${statusStyle[order.status]} border text-xs capitalize`}>
            {order.status}
          </Badge>
        </div>

        {/* Customer info */}
        <div className="bg-muted/40 rounded-lg p-2 mb-3 space-y-1">
          <p className="text-xs font-semibold flex items-center gap-1">
            👤 {order.customer?.firstName} {order.customer?.lastName}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="h-3 w-3" /> {order.customer?.phone}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {order.customerInfo?.address?.substring(0, 40)}
          </p>
        </div>

        {/* MY items in this order */}
        <div className="space-y-1 mb-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Your Items:</p>
          {(order.myItems || order.items)?.map((item: any, i: number) => (
            <div key={i} className="flex justify-between text-sm bg-orange-50 rounded px-2 py-1">
              <span className="font-medium">{item.name}</span>
              <span className="text-primary font-bold">×{item.quantity}</span>
            </div>
          ))}
        </div>

        {order.specialInstructions && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3 text-xs">
            💬 <span className="font-semibold">Note:</span> {order.specialInstructions}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {order.status === "confirmed" && (
            <Button
              size="sm"
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
              onClick={() => statusMutation.mutate({ orderNumber: order.orderNumber, status: "preparing" })}
              disabled={statusMutation.isPending}
            >
              <Flame className="h-3 w-3 mr-1" /> Start Cooking
            </Button>
          )}
          {order.status === "pending" && (
            <Button
              size="sm"
              className="flex-1 gradient-primary"
              onClick={() => statusMutation.mutate({ orderNumber: order.orderNumber, status: "preparing" })}
              disabled={statusMutation.isPending}
            >
              <Flame className="h-3 w-3 mr-1" /> Start Cooking
            </Button>
          )}
          {order.status === "preparing" && (
            <Button
              size="sm"
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => statusMutation.mutate({ orderNumber: order.orderNumber, status: "ready" })}
              disabled={statusMutation.isPending}
            >
              <CheckCircle className="h-3 w-3 mr-1" /> Mark Ready 🍱
            </Button>
          )}
          {order.status === "ready" && (
            <div className="flex-1 text-center text-xs text-green-600 font-semibold bg-green-50 rounded-lg py-2">
              ✅ Ready for pickup!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ChefHat className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black">My Orders</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Auto-refreshes every 30s
            </p>
          </div>
        </div>
        <Link to="/chef/dashboard">
          <Button variant="outline" size="sm">← Dashboard</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Active",    value: activeOrders.length,    color: "text-primary"    },
          { label: "Completed", value: completedOrders.length, color: "text-green-600"  },
          { label: "Total",     value: orders?.length ?? 0,    color: "text-foreground" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center h-40 items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">
              🔥 Active ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              ✅ Completed ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {activeOrders.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No active orders right now</p>
                <p className="text-sm">New orders will appear here automatically!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeOrders.map((order: any) => (
                  <OrderCard key={order._id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedOrders.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p>No completed orders yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedOrders.map((order: any) => (
                  <OrderCard key={order._id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ChefOrders;   