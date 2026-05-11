// Frontend/src/pages/OrderHistory.tsx
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ShoppingBag, ChefHat, MapPin, Clock, Navigation } from "lucide-react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import ReviewModal from "@/components/ReviewModal";
import { Order } from "@/types";

// ── Order Status Config ────────────────────────────────────────────────────────
const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: "📋", color: "bg-gray-400" },
  { key: "confirmed", label: "Confirmed", icon: "✅", color: "bg-blue-500" },
  { key: "preparing", label: "Preparing", icon: "👨‍🍳", color: "bg-yellow-500" },
  { key: "ready", label: "Ready", icon: "🍱", color: "bg-orange-500" },
  {
    key: "out-for-delivery",
    label: "On The Way",
    icon: "🛵",
    color: "bg-purple-500",
  },
  { key: "delivered", label: "Delivered", icon: "🎉", color: "bg-green-500" },
];

const getStepIndex = (status: string) =>
  STATUS_STEPS.findIndex((s) => s.key === status);

// ── Progress Bar Component ─────────────────────────────────────────────────────
const OrderProgressBar = ({ status }: { status: string }) => {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 py-3 px-4 bg-red-50 rounded-xl border border-red-200">
        <span className="text-xl">❌</span>
        <span className="text-red-600 font-semibold text-sm">
          Order Cancelled
        </span>
      </div>
    );
  }

  const currentIdx = getStepIndex(status);

  return (
    <div className="py-3">
      {/* Step dots */}
      <div className="flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute top-4 left-4 right-4 h-1 bg-gray-200 rounded-full z-0" />
        {/* Progress line fill */}
        <div
          className="absolute top-4 left-4 h-1 bg-primary rounded-full z-0 transition-all duration-700"
          style={{
            width:
              currentIdx === 0
                ? "0%"
                : `${(currentIdx / (STATUS_STEPS.length - 1)) * 92}%`,
          }}
        />

        {STATUS_STEPS.map((step, idx) => (
          <div key={step.key} className="flex flex-col items-center gap-1 z-10">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all duration-300
              ${idx < currentIdx ? "bg-primary border-primary text-white" : ""}
              ${idx === currentIdx ? "bg-primary border-primary text-white scale-110 shadow-lg" : ""}
              ${idx > currentIdx ? "bg-white border-gray-300 text-gray-400" : ""}
            `}
            >
              {idx <= currentIdx ? (
                step.icon
              ) : (
                <span className="w-2 h-2 rounded-full bg-gray-300" />
              )}
            </div>
            <span
              className={`text-xs font-medium hidden sm:block ${idx <= currentIdx ? "text-primary" : "text-gray-400"}`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Current status message */}
      <div className="mt-3 text-center">
        <span className="text-sm font-semibold text-foreground">
          {STATUS_STEPS[currentIdx]?.icon}{" "}
          {status === "preparing"
            ? "Chef is cooking your food..."
            : status === "ready"
              ? "Food ready! Pickup in progress..."
              : status === "out-for-delivery"
                ? "Rider is on the way!"
                : status === "delivered"
                  ? "Delivered! Enjoy your meal 😋"
                  : status === "confirmed"
                    ? "Order confirmed by kitchen!"
                    : "Waiting for confirmation..."}
        </span>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const OrderHistory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["orders", user?._id],
    queryFn: async () => {
      const response = await api.get(`/orders/my-orders`);
      return response.data;
    },
    enabled: !!user?._id,
    // Auto-refetch every 30 seconds for live updates
    refetchInterval: 30000,
  });

  const orders = data?.data?.orders || [];

  const getBadgeStyle = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-gray-100 text-gray-600 border-gray-200",
      confirmed: "bg-blue-100 text-blue-700 border-blue-200",
      preparing: "bg-yellow-100 text-yellow-700 border-yellow-200",
      ready: "bg-orange-100 text-orange-700 border-orange-200",
      "out-for-delivery": "bg-purple-100 text-purple-700 border-purple-200",
      delivered: "bg-green-100 text-green-700 border-green-200",
      cancelled: "bg-red-100 text-red-700 border-red-200",
    };
    return map[status] || "bg-gray-100 text-gray-600";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">My Orders</h1>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {(error as Error).message || "Failed to fetch orders."}
        </AlertDescription>
      </Alert>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20">
        <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-2xl font-semibold">No Orders Yet</h2>
        <p className="mt-2 text-muted-foreground">
          You haven't placed any orders yet.
        </p>
        <Button asChild className="mt-6 gradient-primary">
          <Link to="/menu">Order Now</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Orders</h1>
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
            🔄 Auto-refreshes every 30s
          </span>
        </div>

        <div className="space-y-6">
          {orders.map((order: any) => (
            <Card
              key={order._id}
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Status color bar */}
              <div
                className={`h-1 ${order.status === "delivered"
                    ? "bg-green-500"
                    : order.status === "cancelled"
                      ? "bg-red-500"
                      : order.status === "out-for-delivery"
                        ? "bg-purple-500"
                        : order.status === "preparing"
                          ? "bg-yellow-500"
                          : "bg-primary"
                  }`}
              />

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg">
                    Order #{order.orderNumber}
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(order.createdAt), "MMM d, yyyy · h:mm a")}
                  </CardDescription>
                </div>
                <Badge
                  className={`${getBadgeStyle(order.status)} border capitalize text-xs`}
                >
                  {order.status.replace("-", " ")}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <OrderProgressBar status={order.status} />

                {/* Chef Info */}
                {order.assignedChef && (
                  <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl p-3">
                    <ChefHat className="h-4 w-4 text-orange-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-orange-800">
                        {order.assignedChef.firstName}{" "}
                        {order.assignedChef.lastName} is your chef
                      </p>
                      <p className="text-xs text-orange-600">
                        {order.status === "preparing"
                          ? "Currently cooking your order 🍳"
                          : order.status === "ready"
                            ? "Your food is ready! 🍱"
                            : "Will start preparing soon"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Delivery info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {order.deliveryDistance && (
                    <span className="flex items-center gap-1">
                      <Navigation className="h-3 w-3" />
                      {order.deliveryDistance} km away
                    </span>
                  )}
                  {order.estimatedDeliveryTime &&
                    order.status !== "delivered" &&
                    order.status !== "cancelled" && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Est.{" "}
                        {format(
                          new Date(order.estimatedDeliveryTime),
                          "h:mm a",
                        )}
                      </span>
                    )}
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {order.customerInfo?.address?.substring(0, 30)}...
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-1">
                  {order.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.name}{" "}
                        <span className="text-foreground font-medium">
                          ×{item.quantity}
                        </span>
                        {item.chefName && (
                          <span className="ml-2 text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                            👨‍🍳 {item.chefName}
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-medium">
                        NRs {item.subtotal}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="pt-3 border-t flex justify-between items-center">
                  <div className="flex gap-2">
                    {order.status === "delivered" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewOrder(order)}
                      >
                        ⭐ Leave Review
                      </Button>
                    )}
                    <Link to={`/orders/${order.orderNumber || order._id}`}>
                      <Button variant="ghost" size="sm" className="text-xs">View Details →</Button>
                    </Link>
                  </div>
                  <span className="font-bold text-lg text-primary">
                    NRs {order.pricing.total.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <ReviewModal
        isOpen={!!reviewOrder}
        order={reviewOrder}
        onClose={() => setReviewOrder(null)}
      />
    </>
  );
};

export default OrderHistory;
