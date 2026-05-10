import React, { Suspense } from "react";
// import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Navigation from "./components/Navigation";
const Home = React.lazy(() => import("./pages/Home"));
const Shop = React.lazy(() => import("./pages/Shop"));
import Menu from "./pages/Menu";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import OTP from "./pages/OTP";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import AdminRoute from "./components/AdminRoute";
const AdminDashboard = React.lazy(() => import("./pages/Admin/AdminDashboard"));
import AddItem from "./pages/Admin/AddItem";
import ProtectedRoute from "./components/ProtectedRoute";
import OrderHistory from "./pages/OrderHistory";
import ManageOrders from "./pages/Admin/ManageOrders";
import EditItem from "./pages/Admin/EditItem";
import ManageCategories from "./pages/Admin/ManageCategories";
import ManageMenu from "./pages/Admin/ManageMenu";
import Profile from "./pages/Profile";
import ManageCustomers from "./pages/Admin/ManageCustomers";
import ResetPassword from "./pages/ResetPassword";
import ItemDetailPage from "./pages/ItemDetailPage";
import ManageCoupons from "./pages/Admin/ManageCoupons";
import { Loader2 } from "lucide-react";
import OrderDetailPage from "./pages/OrderDetailPage";

import ChefsPage from "./pages/Chefs";
import PlatefulChat from "./components/PlatefulChat";

import ChefApply from "./pages/ChefApply";
import ChefDashboard from "./pages/Chef/ChefDashboard";
import ChefRoute from "./components/ChefRoute";
import ManageChefApplications from "./pages/Admin/ManageChefApplications";
import ManageSubscriptions from "./pages/Admin/ManageSubscriptions";

import MealPlans from "./pages/MealPlans";
import MySubscription from "./pages/MySubscription";

import ChefManageMenu from "./pages/Chef/ChefManageMenu";
import ChefAddItem from "./pages/Chef/ChefAddItem";
import ChefOrders from "./pages/Chef/ChefOrders";

const queryClient = new QueryClient();

const NavigationHandler = () => {
  const location = useLocation();
  const hideNavbar =
    location.pathname.startsWith("/admin/") ||
    location.pathname === "/admin" ||
    location.pathname.startsWith("/chef/") ||
    location.pathname === "/chef";

  if (hideNavbar) return null;
  return <Navigation />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        {/* <Toaster /> */}
        <Sonner />
        <AuthProvider>
          <CartProvider>
            <NavigationHandler />
            <Suspense
              fallback={
                <div className="flex h-screen items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              }
            >
              <main className="page-transition">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/menu" element={<Menu />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />

                  <Route path="/chefs" element={<ChefsPage />} />
                  <Route path="/chef-apply" element={<ChefApply />} />

                  <Route path="/meal-plans" element={<MealPlans />} />

                  <Route path="/item/:itemId" element={<ItemDetailPage />} />
                  <Route
                    path="/reset-password/:token"
                    element={<ResetPassword />}
                  />
                  <Route path="/otp" element={<OTP />} />

                  <Route element={<ProtectedRoute />}>
                    <Route path="/profile" element={<Profile />} />{" "}
                    <Route path="/orders" element={<OrderHistory />} />
                    <Route
                      path="/orders/:orderNumber"
                      element={<OrderDetailPage />}
                    />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<Checkout />} />
                    //added later
                    <Route
                      path="/my-subscription"
                      element={<MySubscription />}
                    />
                  </Route>

                  <Route element={<ChefRoute />}>
                    <Route path="/chef/dashboard" element={<ChefDashboard />} />
                    <Route
                      path="/chef/manage-menu"
                      element={<ChefManageMenu />}
                    />
                    <Route path="/chef/add-item" element={<ChefAddItem />} />
                    <Route
                      path="/chef/edit-item/:itemId"
                      element={<EditItem />}
                    />
                    <Route path="/chef/orders" element={<ChefOrders />} />
                  </Route>

                  <Route element={<AdminRoute />}>
                    <Route
                      path="/admin/dashboard"
                      element={<AdminDashboard />}
                    />
                    <Route
                      path="/admin/chef-applications"
                      element={<ManageChefApplications />}
                    />
                    <Route path="/admin/add-item" element={<AddItem />} />
                    <Route
                      path="/admin/manage-orders"
                      element={<ManageOrders />}
                    />
                    <Route
                      path="/admin/edit-item/:itemId"
                      element={<EditItem />}
                    />
                    <Route path="/admin/manage-menu" element={<ManageMenu />} />
                    <Route
                      path="/admin/manage-customers"
                      element={<ManageCustomers />}
                    />
                    <Route
                      path="/admin/manage-categories"
                      element={<ManageCategories />}
                    />
                    <Route
                      path="/admin/manage-subscriptions"
                      element={<ManageSubscriptions />}
                    />
                    <Route
                      path="/admin/manage-coupons"
                      element={<ManageCoupons />}
                    />{" "}
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </Suspense>
            <PlatefulChat />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
