import { createContext, useContext, ReactNode, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "./AuthContext";
import { Cart } from "@/types";
import { toast } from "sonner";

interface CartContextType {
  cart: Cart | undefined | null;
  isLoading: boolean;
  error: Error | null;
  addToCart: (item: { menuItemId: string; quantity: number }) => void;
  updateCartItem: (item: { menuItemId: string; quantity: number }) => void;
  removeFromCart: (menuItemId: string) => void;
  clearCart: () => void;
  itemCount: number;

  couponCode: string;
  setCouponCode: (code: string) => void;
  appliedDiscount: number;
  appliedCode: string;
  isCouponLoading: boolean;
  applyCoupon: () => void;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const queryClient = useQueryClient();

  const cartQueryKey = ["cart", user?._id];

  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState("");

  const {
    data: cart,
    isLoading: isCartLoading,
    error,
  } = useQuery<Cart>({
    queryKey: cartQueryKey,
    queryFn: async () => {
      const { data } = await api.get("/cart");
      return data.data;
    },
    enabled: !isAuthLoading && isAuthenticated,
  });

  const cartUpdateMutation = useMutation({
    mutationFn: (item: { menuItemId: string; quantity: number }) =>
      api.post("/cart", item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
      if (appliedDiscount > 0) {
        removeCoupon();
        toast.info("Cart updated. Please re-apply your promo code.");
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update cart.");
    },
  });

  const subtotal =
    cart?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;

  const couponValidationMutation = useMutation({
    mutationFn: (data: { code: string; subtotal: number }) =>
      api.post("/coupons/validate", {
        couponCode: data.code,
        orderTotal: data.subtotal,
      }),
    onSuccess: (response, variables) => {
      const { discount, message } = response.data.data;
      setAppliedDiscount(discount);
      setAppliedCode(variables.code.toUpperCase());
      toast.success(message);
    },
    onError: (error: any) => {
      removeCoupon();
      toast.error(error.response?.data?.message || "Invalid coupon.");
    },
  });

  const applyCoupon = () => {
    if (!couponCode || subtotal === 0) return;
    couponValidationMutation.mutate({ code: couponCode, subtotal });
  };

  const removeCoupon = () => {
    setCouponCode("");
    setAppliedCode("");
    setAppliedDiscount(0);
  };

  const clearCartMutation = useMutation({
    mutationFn: () => api.delete("/cart"),
    onSuccess: () => {
      queryClient.setQueryData(["cart"], null);
      toast.success("Cart cleared!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to clear cart.");
    },
  });

  const addToCart = (item: { menuItemId: string; quantity: number }) => {
    if (user?.role === 'chef' || user?.role === 'admin') {
    toast.error("Chefs and admins cannot place orders!");
    return;
  }
    const existingItem = cart?.items.find(
      (i) => i.menuItem._id === item.menuItemId
    );

    const newQuantity = (existingItem?.quantity || 0) + item.quantity;

    if (existingItem) {
      toast.success(`Updated ${existingItem.menuItem.name} in cart.`);
    } else {
      toast.success(`Item added to cart!`);
    }
    cartUpdateMutation.mutate({
      menuItemId: item.menuItemId,
      quantity: newQuantity,
    });
  };

  const updateCartItem = (item: { menuItemId: string; quantity: number }) => {
    if (user?.role === 'chef' || user?.role === 'admin') return;
    cartUpdateMutation.mutate(item);
  };

  const removeFromCart = (menuItemId: string) => {
    cartUpdateMutation.mutate({ menuItemId, quantity: 0 });
    toast.info("Item removed from cart.");
  };

  const clearCart = () => {
    clearCartMutation.mutate();
  };

  const itemCount =
    cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading: isCartLoading || isAuthLoading,
        error,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        itemCount,
        couponCode,
        setCouponCode,
        appliedDiscount,
        appliedCode,
        isCouponLoading: couponValidationMutation.isPending,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
