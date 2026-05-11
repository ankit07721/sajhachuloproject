import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Loader2,
  ArrowLeft,
  FileText,
  User,
  MapPin,
  Clock,
  CircleCheck,
  Truck,
  Package,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import api from "@/lib/api";
import { Order } from "@/types";
import OrderStatusProgress from "@/components/OrderStatusProgress";

const fetchOrderDetails = async (
  orderNumber: string,
): Promise<Order | null> => {
  try {
    const { data } = await api.get(`/orders/${orderNumber}`);
    return data.data;
  } catch (error) {
    console.error("Failed to fetch order details", error);
    return null;
  }
};

const OrderDetailPage = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["order", orderNumber],
    queryFn: () => fetchOrderDetails(orderNumber!),
    enabled: !!orderNumber,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Could not find order details. It may not exist or you may not have
            permission to view it.
          </AlertDescription>
          <Link to="/orders">
            <Button variant="outline" className="mt-4">
              Back to Order History
            </Button>
          </Link>
        </Alert>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
      case "preparing":
        return <Package className="h-5 w-5 text-blue-500" />;
      case "ready":
      case "ready for pickup":
        return <Package className="h-5 w-5 text-orange-500" />;
      case "out-for-delivery":
      case "out for delivery":
        return <Truck className="h-5 w-5 text-orange-500" />;
      case "delivered":
        return <CircleCheck className="h-5 w-5 text-green-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const trackingSteps = [
    {
      status: "Order Placed",
      timestamp: order.trackingInfo.orderPlaced.timestamp,
    },
    { status: "Confirmed", timestamp: order.trackingInfo.confirmed?.timestamp },
    { status: "Preparing", timestamp: order.trackingInfo.preparing?.timestamp },
    {
      status: "Ready for Pickup",
      timestamp:
        order.trackingInfo.ready?.timestamp ||
        order.trackingInfo.packed?.timestamp,
    },
    {
      status: "Out for Delivery",
      timestamp: order.trackingInfo.outForDelivery?.timestamp,
    },
    { status: "Delivered", timestamp: order.trackingInfo.delivered?.timestamp },
  ];

  return (
    <div className="min-h-screen bg-background py-8 animate-fade-in">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center mb-8">
          <Link to="/orders" className="hover-lift mr-4">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Order Details
            </h1>
            <p className="text-muted-foreground">Order #{order.orderNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Details */}
          <div className="md:col-span-2 space-y-8">
            {/* Tracking */}
            <Card>
              <CardHeader>
                <CardTitle>Order Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderStatusProgress status={order.status as any} />
                <ol className="relative border-s border-gray-200 dark:border-gray-700">
                  {trackingSteps.map(
                    (step, index) =>
                      step.timestamp && (
                        <li key={index} className="mb-6 ms-6">
                          <span className="absolute flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full -start-4 ring-4 ring-background">
                            {getStatusIcon(step.status.toLowerCase())}
                          </span>
                          <div className="ml-4">
                            <h3 className="font-semibold text-foreground">
                              {step.status}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(step.timestamp), "PPP p")}
                            </p>
                          </div>
                        </li>
                      ),
                  )}
                </ol>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div
                      key={item.menuItem._id}
                      className="flex items-center gap-4"
                    >
                      <img
                        src={item.menuItem.image}
                        alt={item.name}
                        className="w-16 h-16 rounded-md object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} x NRs. {item.price.toFixed(2)}
                        </p>
                      </div>
                      <p className="font-semibold">
                        NRs. {item.subtotal.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Info */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>
                  {order.customerInfo.firstName} {order.customerInfo.lastName}
                </p>
                <p className="text-muted-foreground">
                  {order.customerInfo.email}
                </p>
                <p className="text-muted-foreground">
                  {order.customerInfo.phone}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery To
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  {order.customerInfo.address}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>NRs. {order.pricing.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>NRs. {order.pricing.deliveryFee.toFixed(2)}</span>
                </div>
                {order.pricing.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-NRs. {order.pricing.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax (13%)</span>
                  <span>NRs. {order.pricing.tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">
                    NRs. {order.pricing.total.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OrderDetailPage;
