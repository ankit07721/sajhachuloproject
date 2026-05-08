// src/pages/Admin/ManageCustomers.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { keepPreviousData } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { User } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface CustomersApiResponse {
  success: boolean;
  data: {
    customers: User[];
    currentPage: number;
    totalPages: number;
    totalCustomers: number;
  };
}

const ManageCustomers = () => {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading, isError, error } = useQuery<CustomersApiResponse>({
    queryKey: ["adminCustomers", page],
    queryFn: () =>
      api.get(`/admin/customers?page=${page}&limit=10`).then((res) => res.data),
    placeholderData: keepPreviousData,
    enabled: !!user,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (customerId: string) =>
      api.patch(`/admin/customers/${customerId}/toggle-status`),
    onSuccess: (response) => {
      toast.success(response.data.message);
      queryClient.invalidateQueries({ queryKey: ["adminCustomers"] });
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || "Failed to update status."),
  });

  const customers = data?.data?.customers || [];
  const currentPage = data?.data?.currentPage || 1;
  const totalPages = data?.data?.totalPages || 1;

  const handlePrevPage = () => {
    setPage((old) => Math.max(old - 1, 1));
  };
  const handleNextPage = () => {
    setPage((old) => (currentPage < totalPages ? old + 1 : old));
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Manage Customers</CardTitle>
          <CardDescription>
            View, activate, or deactivate user accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Account Active</TableHead>
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
              {!isLoading && customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No customers found.
                  </TableCell>
                </TableRow>
              )}
              {customers.map((customer) => (
                <TableRow key={customer._id}>
                  <TableCell className="font-medium">
                    {customer.firstName} {customer.lastName}
                  </TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>
                    {format(new Date(customer.createdAt), "PP")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={customer.isActive}
                      onCheckedChange={() =>
                        toggleStatusMutation.mutate(customer._id)
                      }
                      disabled={
                        toggleStatusMutation.isPending &&
                        toggleStatusMutation.variables === customer._id
                      }
                      aria-label={`Toggle account status for ${customer.firstName}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePrevPage();
                }}
                className={cn({
                  "pointer-events-none opacity-50": currentPage === 1,
                })}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleNextPage();
                }}
                className={cn({
                  "pointer-events-none opacity-50": currentPage === totalPages,
                })}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default ManageCustomers;
