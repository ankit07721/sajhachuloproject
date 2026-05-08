// for chef distance filtering on menu page

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft, CreditCard, Lock, Loader2, Home,
  Calendar, Clock, MapPin, Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

interface DeliveryInfo { fee: number; message: string; canDeliver: boolean; }

// ── Nominatim Geocoder (OpenStreetMap - FREE, no API key needed) ─────────────
// Converts "Golpark, Butwal" → { lat: 27.69, lng: 83.45 }
const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const encoded = encodeURIComponent(address + ", Nepal");
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch (e) {
    return null;
  }
};

const Checkout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { cart, itemCount, isLoading: isCartLoading, clearCart, appliedCode, appliedDiscount } = useCart();

  const now = new Date();
  const defaultDate = format(now, "yyyy-MM-dd");
  const defaultTime = format(new Date(now.getTime() + 60 * 60 * 1000), "HH:mm");

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    address: "", deliveryInstructions: "",
    scheduledDate: defaultDate, scheduledTime: defaultTime,
  });
  const [paymentMethod, setPaymentMethod] = useState("cod");

  // ── Delivery address coordinates (for chef distance filter) ───────────────
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || "",
        lastName:  user.lastName  || "",
        email:     user.email     || "",
        phone:     user.phone     || "",
        address:   user.address ? `${user.address.street}, ${user.address.city}` : "",
      }));
    }
  }, [user]);

  // ── Use current GPS as fallback ───────────────────────────────────────────
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeliveryCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("📍 Location detected!");
      },
      () => toast.error("Could not detect location")
    );
  };

  const subtotal = cart?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;

  // Use DELIVERY coords (not current GPS) for delivery fee calculation
  const coordsToUse = deliveryCoords || (user?.location?.latitude
    ? { lat: user.location.latitude, lng: user.location.longitude }
    : null);

  const { data: deliveryInfo, isLoading: isDeliveryLoading } = useQuery<DeliveryInfo>({
    queryKey: ["deliveryInfo", coordsToUse?.lat, coordsToUse?.lng, subtotal],
    queryFn: async () => {
      if (!coordsToUse) return { fee: 50, message: "Default fee", canDeliver: true };
      const { data } = await api.post("/location/delivery-info", {
        latitude: coordsToUse.lat,
        longitude: coordsToUse.lng,
        orderTotal: subtotal,
      });
      return data.data;
    },
    enabled: !!user && subtotal > 0,
  });

  const orderMutation = useMutation({
    mutationFn: (newOrder: any) => api.post("/orders", newOrder),
    onSuccess: (response) => {
      toast.success(`Order placed! #${response.data.data.orderNumber}`);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate("/orders");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.errors?.[0]?.msg || error.response?.data?.message;
      toast.error(msg || "Failed to place order");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || itemCount === 0) { toast.error("Your cart is empty."); return; }
    if (deliveryInfo && !deliveryInfo.canDeliver) {
      toast.error("Sorry, delivery may not be available to your location, but we'll try!.");
      return;
    }

    const orderData = {
      customerInfo: {
        firstName: formData.firstName,
        lastName:  formData.lastName,
        email:     formData.email,
        phone:     formData.phone,
        address:   formData.address,
        // ── DELIVERY ADDRESS COORDINATES (not current GPS) ──────────────
        // Used for: Haversine distance, delivery fee, ETA
        ...(coordsToUse && {
          coordinates: {
            latitude:  coordsToUse.lat,
            longitude: coordsToUse.lng,
          },
        }),
      },
      items: cart.items.map(item => ({
        menuItem: item.menuItem._id,
        quantity: item.quantity,
      })),
      specialInstructions: formData.deliveryInstructions,
      couponCode:    appliedCode || undefined,
      paymentMethod,
      scheduledFor: {
        date: formData.scheduledDate,
        time: formData.scheduledTime,
      },
    };

    orderMutation.mutate(orderData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const deliveryFee = deliveryInfo?.fee ?? 50;
  const tax = (subtotal - appliedDiscount) * 0.13;
  const total = subtotal - appliedDiscount + deliveryFee + tax;

  if (isCartLoading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center mb-8">
          <Link to="/cart" className="mr-4">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Checkout</h1>
            <p className="text-muted-foreground">Complete your order</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">

              {/* Delivery Info */}
              <Card>
                <CardHeader><CardTitle>Delivery Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleInputChange} required />
                    <Input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleInputChange} required />
                  </div>
                  <Input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleInputChange} required />
                  <Input name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleInputChange} required />

                  {/* ── Delivery Address with geocoding ── */}
                  <div className="space-y-2">
                    <Textarea
                      name="address"
                      placeholder="Full Delivery Address (Street, City)"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                    />
                    <div className="flex items-center justify-between">
                      {/* Geocoding status */}
                      <div className="flex items-center gap-2 text-xs">
                        {isGeocoding && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Detecting location...
                          </span>
                        )}
                        {deliveryCoords && !isGeocoding && (
                          <span className="flex items-center gap-1 text-green-600">
                            <MapPin className="h-3 w-3" />
                            📍 Location detected ({deliveryCoords.lat.toFixed(4)}, {deliveryCoords.lng.toFixed(4)})
                          </span>
                        )}
                      </div>
                      {/* GPS fallback button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-primary"
                        onClick={handleUseMyLocation}
                      >
                        <Navigation className="h-3 w-3 mr-1" /> Use GPS
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      💡 Your delivery address is used to find nearby chefs and calculate delivery fee accurately.
                    </p>
                  </div>

                  <Textarea
                    name="deliveryInstructions"
                    placeholder="Delivery Instructions (e.g., Leave at door)"
                    value={formData.deliveryInstructions}
                    onChange={handleInputChange}
                  />
                </CardContent>
              </Card>

              {/* Schedule */}
              <Card>
                <CardHeader><CardTitle>Schedule Your Delivery</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduledDate" className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />Date
                    </Label>
                    <Input id="scheduledDate" name="scheduledDate" type="date" value={formData.scheduledDate} onChange={handleInputChange} min={defaultDate} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduledTime" className="flex items-center">
                      <Clock className="mr-2 h-4 w-4" />Time
                    </Label>
                    <Input id="scheduledTime" name="scheduledTime" type="time" value={formData.scheduledTime} onChange={handleInputChange} required />
                  </div>
                </CardContent>
              </Card>

              {/* Payment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Button type="button" variant={paymentMethod === "esewa" ? "default" : "outline"} onClick={() => setPaymentMethod("esewa")} className="h-16">
                    <img src="https://img.favpng.com/7/14/6/esewa-fonepay-pvt-ltd-logo-portable-network-graphics-image-brand-png-favpng-aLLyxWtspEZQckmv19jDj2TWC.jpg" alt="eSewa" className="h-8 object-contain" />
                  </Button>
                  <Button type="button" variant={paymentMethod === "khalti" ? "default" : "outline"} onClick={() => setPaymentMethod("khalti")} className="h-16">
                    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcShwWa20Ba7lNTbbVITqfiPY_662rA1zN2cSA&s" alt="Khalti" className="h-8 object-contain" />
                  </Button>
                  <Button type="button" variant={paymentMethod === "cod" ? "default" : "outline"} onClick={() => setPaymentMethod("cod")} className="h-16 flex-col gap-1">
                    <Home className="h-6 w-6" />Cash on Delivery
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {cart?.items.map(item => (
                      <div key={item.menuItem._id} className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium line-clamp-1">{item.menuItem.name}</p>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium">NRs {(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>NRs {subtotal.toFixed(2)}</span>
                    </div>
                    {appliedDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({appliedCode})</span>
                        <span>-NRs {appliedDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery Fee</span>
                      {isDeliveryLoading
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <span>NRs {deliveryFee.toFixed(2)}</span>
                      }
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax (13%)</span>
                      <span>NRs {tax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">NRs {total.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full gradient-primary border-0 text-lg h-12"
                    disabled={orderMutation.isPending}
                  >
                    {orderMutation.isPending
                      ? <Loader2 className="animate-spin" />
                      : <><Lock className="h-5 w-5 mr-2" />Place Order</>
                    }
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;   