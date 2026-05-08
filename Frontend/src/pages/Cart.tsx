import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowLeft,
  CreditCard,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import api from "@/lib/api";

interface DeliveryInfo {
  fee: number;
  message: string;
  canDeliver: boolean;
}

const Cart = () => {
  const {
    cart,
    isLoading,
    updateCartItem,
    itemCount,
    couponCode,
    setCouponCode,
    applyCoupon,
    removeCoupon,
    appliedCode,
    appliedDiscount,
    isCouponLoading,
  } = useCart();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const navigate = useNavigate();

  const cartItems = cart?.items || [];
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const { data: deliveryInfo, isLoading: isDeliveryLoading } =
    useQuery<DeliveryInfo>({
      queryKey: ["deliveryInfoCart", user?.location, subtotal],
      queryFn: async () => {
        if (!user?.location?.latitude || !user?.location?.longitude) {
          return {
            fee: 50,
            message: "Default fee. Set location for accuracy.",
            canDeliver: true,
            distance: 0,
          };
        }
        const response = await api.post("/location/delivery-info", {
          latitude: user.location.latitude,
          longitude: user.location.longitude,
          orderTotal: subtotal,
        });
        return response.data.data;
      },
      enabled: isAuthenticated && subtotal > 0,
    });

  const handleUpdateQuantity = (menuItemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    updateCartItem({ menuItemId, quantity: newQuantity });
  };

  const deliveryFee = deliveryInfo?.fee ?? 50;
  const tax = (subtotal - appliedDiscount) * 0.13;
  const total = subtotal - appliedDiscount + deliveryFee + tax;

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || itemCount === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="text-center">
          <ShoppingBag className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-4">
            {isAuthenticated ? "Your cart is empty" : "Your Cart is Waiting"}
          </h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            {isAuthenticated
              ? "Add some delicious homemade meals to get started."
              : "Please log in to view your cart and continue shopping."}
          </p>
          <Button
            onClick={() => navigate(isAuthenticated ? "/shop" : "/login")}
            className="gradient-primary border-0 shadow-warm"
          >
            {isAuthenticated ? "Start Shopping" : "Login to View Cart"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center mb-8">
          <Link to="/shop" className="hover-lift mr-4">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Your Cart</h1>
            <p className="text-muted-foreground">
              {itemCount} item{itemCount !== 1 ? "s" : ""} in your cart
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={item.menuItem._id} className="shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.menuItem.image}
                        alt={item.menuItem.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {item.menuItem.name}
                          </h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleUpdateQuantity(item.menuItem._id, 0)
                          }
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              handleUpdateQuantity(
                                item.menuItem._id,
                                item.quantity - 1
                              )
                            }
                            className="h-8 w-8"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-lg font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              handleUpdateQuantity(
                                item.menuItem._id,
                                item.quantity + 1
                              )
                            }
                            className="h-8 w-8"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            NRs. {(item.price * item.quantity).toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            NRs. {item.price.toFixed(2)} each
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-1">
            <Card className="shadow-card sticky top-24">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">
                  Order Summary
                </h2>
                <div className="mb-6">
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Promo Code
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={!!appliedCode}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={applyCoupon}
                      disabled={!couponCode || !!appliedCode || isCouponLoading}
                    >
                      {isCouponLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                  {appliedCode && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Promo code "{appliedCode}" applied!
                    </p>
                  )}
                </div>
                <Separator className="my-4" />
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">
                      NRs. {subtotal.toFixed(2)}
                    </span>
                  </div>
                  {appliedDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-NRs. {appliedDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    {isDeliveryLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="font-medium">
                        {deliveryFee === 0 ? (
                          <span className="text-green-600">Free</span>
                        ) : (
                          `NRs. ${deliveryFee.toFixed(2)}`
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax (13%)</span>
                    <span className="font-medium">NRs. {tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    {isDeliveryLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="text-primary">
                        NRs. {total.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                {subtotal > 0 && subtotal < 500 && deliveryFee > 0 && (
                  <Alert className="mt-4">
                    <AlertDescription>
                      Add NRs. {(500 - subtotal).toFixed(2)} more for free
                      delivery!
                    </AlertDescription>
                  </Alert>
                )}
                <Link to="/checkout" className="block mt-6">
                  <Button
                    disabled={isDeliveryLoading}
                    className="w-full gradient-primary border-0 shadow-warm text-lg py-3"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Proceed to Checkout
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
