import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import api from "@/lib/api";

interface AdminOrder {
  _id: string;
  orderNumber: string;
  customerInfo: { firstName: string; lastName: string };
  pricing: { total: number };
  status: string;
  createdAt: string;
}

interface OrdersApiResponse {
  success: boolean;
  data: {
    orders: AdminOrder[];
    currentPage: number;
    totalPages: number;
    totalOrders: number;
  };
}

const ManageOrders = () => {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery<OrdersApiResponse>({
    queryKey: ["adminOrders", page],
    queryFn: async () => {
      const response = await api.get(`/admin/orders?page=${page}&limit=10`);
      return response.data;
    },
    placeholderData: keepPreviousData, // For smoother pagination experience
  });

  const statusMutation = useMutation({
    mutationFn: ({
      orderNumber,
      status,
    }: {
      orderNumber: string;
      status: string;
    }) => api.patch(`/orders/${orderNumber}/status`, { status }),
    onSuccess: () => {
      toast.success("Order status updated!");
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Failed to update status."),
  });

  const handleStatusChange = (orderNumber: string, newStatus: string) => {
    statusMutation.mutate({ orderNumber, status: newStatus });
  };

  const orders = data?.data?.orders || [];
  const orderStatuses = [
    "pending",
    "confirmed",
    "preparing",
    "out-for-delivery",
    "delivered",
    "cancelled",
  ];
  const getStatusVariant = (status: string) =>
    ({
      delivered: "default", // Using default for green/success-like color
      cancelled: "destructive",
      pending: "secondary",
    }[status] || "outline");

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Manage Orders</CardTitle>
          <CardDescription>
            View and update the status of all customer orders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {isError && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Alert variant="destructive">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        {(error as Error).message}
                      </AlertDescription>
                    </Alert>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No orders found.
                  </TableCell>
                </TableRow>
              )}
              {orders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell className="font-medium">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>{`${order.customerInfo.firstName} ${order.customerInfo.lastName}`}</TableCell>
                  <TableCell>
                    {format(new Date(order.createdAt), "PPp")}
                  </TableCell>
                  <TableCell className="text-right">
                    NRs {order.pricing.total.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Select
                      defaultValue={order.status}
                      onValueChange={(newStatus) =>
                        handleStatusChange(order.orderNumber, newStatus)
                      }
                      disabled={
                        statusMutation.isPending &&
                        statusMutation.variables?.orderNumber ===
                          order.orderNumber
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue>
                          <Badge
                            variant={getStatusVariant(order.status) as any}
                            className="capitalize"
                          >
                            {order.status.replace("-", " ")}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {orderStatuses.map((status) => (
                          <SelectItem
                            key={status}
                            value={status}
                            className="capitalize"
                          >
                            {status.replace("-", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {data && data.data.totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.max(1, p - 1));
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="text-sm font-medium">
                Page {data.data.currentPage} of {data.data.totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.min(data.data.totalPages, p + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default ManageOrders;
