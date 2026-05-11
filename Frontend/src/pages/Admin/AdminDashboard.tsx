import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import NotificationBell from "@/components/NotificationBell";
import {
  DollarSign,
  ShoppingBag,
  Users,
  Utensils,
  LayoutGrid,
  PlusCircle,
  Tag,
  ChefHat,
  Calendar,
  LogOut,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { DashboardData } from "@/types";
import { format } from "date-fns";

const fetchDashboardData = async (): Promise<DashboardData> => {
  const response = await api.get("/admin/dashboard");
  return response.data.data;
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const NavCard = ({
  to,
  title,
  description,
  icon: Icon,
}: {
  to: string;
  title: string;
  description: string;
  icon: React.ElementType;
}) => (
  <Link to={to} className="block hover-lift">
    <Card className="hover:bg-accent transition-colors h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  </Link>
);

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { data, isLoading, isError, error } = useQuery<DashboardData>({
    queryKey: ["adminDashboard", user?.id],
    queryFn: fetchDashboardData,
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" /> <Skeleton className="h-28" />{" "}
          <Skeleton className="h-28" /> <Skeleton className="h-28" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-full lg:col-span-4">
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48" />
            </CardContent>
          </Card>
          <Card className="col-span-full lg:col-span-3">
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {(error as Error).message || "Failed to fetch dashboard data."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
          <p className="text-slate-500">Welcome back! Here's what's happening today.</p>
        </div>
        <Link to="/admin/add-item">
          <Button className="shadow-lg shadow-primary/20">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Revenue"
          value={`NRs ${data?.todayStats.revenue.toLocaleString() ?? "0"}`}
          icon={DollarSign}
          description="Revenue from completed orders today"
        />
        <StatCard
          title="Today's Orders"
          value={`+${data?.todayStats.orders ?? "0"}`}
          icon={ShoppingBag}
          description="Total orders placed today"
        />
        <StatCard
          title="Total Customers"
          value={`${data?.totalStats.customers ?? "0"}`}
          icon={Users}
          description="Total registered users"
        />
        <StatCard
          title="Total Menu Items"
          value={`${data?.totalStats.menuItems ?? "0"}`}
          icon={Utensils}
          description="Total active dishes on the menu"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <NavCard
          to="/admin/manage-orders"
          title="Manage Orders"
          description="View and update all customer orders."
          icon={ShoppingBag}
        />
        <NavCard
          to="/admin/manage-menu"
          title="Manage Menu"
          description="Add, edit, or delete menu items."
          icon={Utensils}
        />
        <NavCard
          to="/admin/manage-categories"
          title="Manage Categories"
          description="Organize your menu sections."
          icon={LayoutGrid}
        />
        <NavCard
          to="/admin/manage-customers"
          title="Manage Customers"
          description="View and manage user accounts."
          icon={Users}
        />
        <NavCard
          to="/admin/manage-coupons"
          title="Manage Coupons"
          description="Create and manage discount codes."
          icon={Tag}
        />
        <NavCard
          to="/admin/manage-subscriptions"
          title="Manage Subscriptions"
          description="View all tiffin plan subscriptions."
          icon={Calendar}
        />
        <NavCard
          to="/admin/chef-applications"
          title="Chef Applications"
          description="Review and approve chef applications."
          icon={ChefHat}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4">
          <CardHeader>
            <CardTitle>Popular Items</CardTitle>
            <CardDescription>
              Top 10 most ordered items by quantity.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data?.popularItems}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="_id"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Bar
                  dataKey="totalQuantity"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-full lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>The last 10 orders that came in.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.recentOrders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell>
                      <div className="font-medium">
                        {order.customer.firstName} {order.customer.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(order.createdAt), "PP")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="capitalize">
                        {order.status.replace("-", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      NRs {order.pricing.total.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
