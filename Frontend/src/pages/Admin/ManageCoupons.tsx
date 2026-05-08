import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PlusCircle, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import api from "@/lib/api";

interface Coupon {
  _id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount: number;
  expiresAt: string;
  isActive: boolean;
}

const ManageCoupons = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    code: "",
    discountType: "percentage",
    discountValue: 10,
    minOrderAmount: 0,
    expiresAt: "",
  });
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);

  const { data: coupons, isLoading } = useQuery<Coupon[]>({
    queryKey: ["adminCoupons"],
    queryFn: async () => (await api.get("/coupons")).data.data,
  });

  const createMutation = useMutation({
    mutationFn: (newData: typeof formData) => api.post("/coupons", newData),
    onSuccess: () => {
      toast.success("Coupon created successfully!");
      queryClient.invalidateQueries({ queryKey: ["adminCoupons"] });
      setFormData({
        code: "",
        discountType: "percentage",
        discountValue: 10,
        minOrderAmount: 0,
        expiresAt: "",
      });
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || "Failed to create coupon."),
  });

  // Mutations for delete and toggle status
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/${id}`),
    onSuccess: () => {
      toast.success("Coupon deleted.");
      queryClient.invalidateQueries({ queryKey: ["adminCoupons"] });
      setCouponToDelete(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => api.put(`/coupons/${id}/toggle-status`),
    onSuccess: (res) => {
      toast.success(res.data.message);
      queryClient.invalidateQueries({ queryKey: ["adminCoupons"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]:
        e.target.type === "number"
          ? parseFloat(e.target.value)
          : e.target.value,
    }));
  };

  const handleSelectChange = (value: "percentage" | "fixed") => {
    setFormData((prev) => ({ ...prev, discountType: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="container py-8 max-w-4xl space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New Coupon</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
          >
            <div className="space-y-1">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={formData.discountType}
                onValueChange={handleSelectChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="discountValue">Value</Label>
              <Input
                id="discountValue"
                name="discountValue"
                type="number"
                value={formData.discountValue}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="minOrderAmount">Min. Order</Label>
              <Input
                id="minOrderAmount"
                name="minOrderAmount"
                type="number"
                value={formData.minOrderAmount}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="expiresAt">Expires At</Label>
              <Input
                id="expiresAt"
                name="expiresAt"
                type="date"
                value={formData.expiresAt}
                onChange={handleChange}
                required
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Create Coupon"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Coupons</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {coupons?.map((c) => (
                <TableRow key={c._id}>
                  <TableCell className="font-mono">{c.code}</TableCell>
                  <TableCell>
                    {c.discountType === "percentage"
                      ? `${c.discountValue}%`
                      : `NRs ${c.discountValue}`}
                  </TableCell>
                  <TableCell>{format(new Date(c.expiresAt), "PP")}</TableCell>
                  <TableCell>
                    <Switch
                      checked={c.isActive}
                      onCheckedChange={() => toggleStatusMutation.mutate(c._id)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setCouponToDelete(c)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog
        open={!!couponToDelete}
        onOpenChange={() => setCouponToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the coupon "{couponToDelete?.code}
              "? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(couponToDelete!._id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageCoupons;
