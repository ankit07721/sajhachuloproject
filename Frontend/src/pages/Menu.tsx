import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Star, Utensils, ChefHat, Loader2, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import TodaysSpecialModal from "@/components/TodaysSpecialModal";
import api from "@/lib/api";
import { MenuItem } from "@/types";
import { useCart } from "@/context/CartContext";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface MenuItemWithChef extends MenuItem {
  chefName?: string;
  chefId?: string;
  chefDistance?: number; // km
}

interface MenuCategoryWithItems {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  items: MenuItemWithChef[];
}

interface ApiResponse {
  success: boolean;
  data: MenuCategoryWithItems[];
  meta?: {
    distanceFilterActive: boolean;
    maxChefDistance: number;
  };
}

// ── GPS Hook ──────────────────────────────────────────────────────────────────
const useCustomerLocation = () => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");

  useEffect(() => {
    if (!navigator.geolocation) return;

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus("granted");
      },
      () => {
        setLocationStatus("denied");
      },
      { timeout: 8000 }
    );
  }, []);

  return { coords, locationStatus };
};

const Menu = () => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("");
  const [isSpecialModalOpen, setIsSpecialModalOpen] = useState(false);
  const { coords, locationStatus } = useCustomerLocation();

  // Use browser GPS or fallback to user's saved location
  const customerCoords = coords ||
    (user?.location?.latitude
      ? { lat: user.location.latitude, lng: user.location.longitude }
      : null);

  const { data: categoriesResponse, isLoading, isError } = useQuery<ApiResponse>({
    queryKey: ["menuWithCategories", customerCoords?.lat, customerCoords?.lng],
    queryFn: async () => {
      // Send customer coordinates as query params for Haversine filtering
      const params = customerCoords
        ? `?lat=${customerCoords.lat}&lng=${customerCoords.lng}`
        : "";
      return (await api.get(`/categories${params}`)).data;
    },
    // Re-fetch when location changes
    enabled: true,
  });

  const menuCategories = categoriesResponse?.data || [];
  const distanceFilterActive = categoriesResponse?.meta?.distanceFilterActive;
  const maxChefDistance = categoriesResponse?.meta?.maxChefDistance ?? 7;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (menuCategories.length > 0 && !activeCategory) {
      setActiveCategory(menuCategories[0].slug);
    }
  }, [menuCategories, activeCategory]);

  const handleAddToCart = (e: React.MouseEvent, item: MenuItem) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({ menuItemId: item._id, quantity: 1 });
    toast.success(`${item.name} added to cart!`);
  };

  const renderContent = () =>
    menuCategories.map((category) => (
      <TabsContent key={category.slug} value={category.slug} className="mt-8">
        <div className="text-center mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center space-x-3">
            <span className="text-4xl">{category.icon}</span>
            <span>{category.name}</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{category.description}</p>
        </div>

        {category.items && category.items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {category.items.map((item) => (
              <Link to={`/item/${item._id}`} key={item._id} className="block group">
                <Card className="food-card overflow-hidden flex flex-col sm:flex-row hover:shadow-md transition-shadow">
                  <div className="sm:w-1/3 aspect-video sm:aspect-auto flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="sm:w-2/3 p-4 sm:p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                          {item.name}
                        </h3>
                        <span className="text-xl sm:text-2xl font-bold text-primary whitespace-nowrap">
                          NRs {item.price}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                        {item.description}
                      </p>

                      {/* ── Chef Badge + Distance ── */}
                      {item.chefName && (
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <Link
                            to={`/chefs`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-full px-2.5 py-0.5 text-xs font-medium hover:bg-orange-100 transition-colors"
                          >
                            <ChefHat className="h-3 w-3" />
                            {item.chefName}
                          </Link>
                          {item.chefDistance && (
                            <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 rounded-full px-2 py-0.5 text-xs">
                              <Navigation className="h-3 w-3" />
                              {item.chefDistance} km away
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {item.preparationTime} mins
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          {item.rating?.average?.toFixed(1) ?? "0.0"} ({item.rating?.count ?? 0})
                        </div>
                        <Badge className={`text-xs ${
                          item.category === "veg"
                            ? "bg-green-100 text-green-700"
                            : item.category === "non-veg"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {item.category === "veg" ? "🌿 Veg" : item.category === "non-veg" ? "🍗 Non-Veg" : item.category}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      onClick={(e) => handleAddToCart(e, item)}
                      className="w-full mt-3 sm:mt-0 sm:w-auto sm:self-end bg-secondary hover:bg-secondary/90"
                    >
                      <Utensils className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No items available in this category.</p>
            {distanceFilterActive && (
              <p className="text-sm mt-2 text-orange-600">
                Some chef dishes may be hidden because they are more than {maxChefDistance}km away.
              </p>
            )}
          </div>
        )}
      </TabsContent>
    ));

  return (
    <>
      <div className="min-h-screen bg-background py-8 animate-fade-in">
        <div className="container mx-auto px-4">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">Our Homemade Menu</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Discover dishes made with love by passionate home cooks near you.
            </p>

            {/* ── Location Status Banner ── */}
            {locationStatus === "granted" && distanceFilterActive && (
              <div className="inline-flex items-center gap-2 mt-4 bg-green-50 border border-green-200 text-green-700 rounded-full px-4 py-1.5 text-sm">
                <Navigation className="h-4 w-4" />
                Showing chefs within {maxChefDistance}km of your location
              </div>
            )}
            {locationStatus === "denied" && (
              <div className="inline-flex items-center gap-2 mt-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-full px-4 py-1.5 text-sm">
                <MapPin className="h-4 w-4" />
                Enable location to see nearby chefs only
              </div>
            )}
          </header>

          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Failed to load menu. Please try again.</AlertDescription>
            </Alert>
          ) : menuCategories.length > 0 ? (
            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
              <ScrollArea className="w-full whitespace-nowrap rounded-md">
                <TabsList className="inline-grid w-max grid-flow-col">
                  {menuCategories.map((category) => (
                    <TabsTrigger key={category.slug} value={category.slug} className="flex items-center gap-2 px-4 py-2">
                      <span className="text-lg">{category.icon}</span>
                      <span className="hidden sm:inline">{category.name}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
              {renderContent()}
            </Tabs>
          ) : (
            <div className="text-center p-12 text-muted-foreground">
              <p>No menu categories found.</p>
            </div>
          )}

          <section className="mt-20 gradient-hero rounded-lg p-8 md:p-12 text-center">
            <ChefHat className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h2 className="text-3xl font-bold text-foreground mb-4">Chef's Daily Special</h2>
            <p className="text-muted-foreground text-lg mb-6 max-w-2xl mx-auto">
              Discover today's hand-picked favorite at a special price.
            </p>
            <Button size="lg" className="gradient-primary border-0 shadow-warm" onClick={() => setIsSpecialModalOpen(true)}>
              View Today's Special
            </Button>
          </section>
        </div>
      </div>
      <TodaysSpecialModal isOpen={isSpecialModalOpen} onClose={() => setIsSpecialModalOpen(false)} />
    </>
  );
};

export default Menu;   