// Frontend/src/pages/Chefs.tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, MapPin, ChefHat, ShoppingCart, Clock, Flame, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { MenuItem } from "@/types";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

interface Chef {
  _id: string;
  name: string;
  bio: string;
  photo: string;
  specialty: string;
  location: string;
  rating: number;
  totalOrders: number;
  badges: string[];
  isActive: boolean;
  kitchenLat?: number;
  kitchenLng?: number;
  distanceKm?: number;
}

const fetchChefs = async (): Promise<Chef[]> => {
  const { data } = await api.get("/chefs");
  return data.chefs;
};

const fetchChefWithMenu = async (chefId: string): Promise<{ chef: Chef; menuItems: MenuItem[] }> => {
  const { data } = await api.get(`/chefs/${chefId}`);
  return { chef: data.chef, menuItems: data.menuItems };
};

function ChefCard({ chef, onClick }: { chef: Chef; onClick: () => void }) {
  return (
    <Card className="overflow-hidden cursor-pointer hover-lift transition-all duration-300 hover:border-primary hover:shadow-lg" onClick={onClick}>
      <div className="relative h-48 bg-gradient-to-br from-orange-50 to-amber-100 overflow-hidden">
        {chef.photo
          ? <img src={chef.photo} alt={chef.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><ChefHat className="h-20 w-20 text-orange-200" /></div>
        }
        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1">
          <Star className="h-3 w-3 text-yellow-400 fill-current" />{chef.rating.toFixed(1)}
        </div>
        <div className="absolute top-3 left-3 bg-green-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">Active</div>
      </div>
      <CardContent className="p-4">
        <h3 className="text-lg font-bold text-foreground">{chef.name}</h3>
        <p className="text-sm text-primary font-semibold mt-0.5">{chef.specialty}</p>
        <div className="flex items-center gap-1 mt-2 text-muted-foreground flex-wrap">
          <MapPin className="h-3 w-3" />
          <span className="text-xs">{chef.location}</span>
          {chef.distanceKm !== undefined && (
            <span className="ml-2 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
              📍 {chef.distanceKm}km away
            </span>
          )}
        </div>
        {chef.bio && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{chef.bio}</p>}
        {chef.badges?.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-3">
            {chef.badges.map(b => (
              <Badge key={b} variant="secondary" className="text-xs bg-orange-50 text-orange-700 border border-orange-200">{b}</Badge>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          {/* ✅ FIX: Removed emoji that was showing as broken box */}
          <span className="text-xs text-muted-foreground">{chef.totalOrders} orders</span>
          <Button size="sm" className="gradient-primary text-xs">View Menu →</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MenuItemCard({ item }: { item: MenuItem }) {
  const { addToCart } = useCart();
  const spiceBadge: Record<string, string> = {
    mild: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    hot: "bg-red-100 text-red-700",
    "extra-hot": "bg-purple-100 text-purple-700",
  };
  return (
    <Card className="overflow-hidden hover-lift transition-all duration-200 hover:border-primary">
      <div className="h-36 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
        {item.image
          ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        }
      </div>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-bold text-foreground leading-tight">{item.name}</h4>
          <Badge variant={item.category === "veg" ? "secondary" : "default"}
            className={`text-xs flex-shrink-0 ${item.category === "veg" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {item.category === "veg" ? "🌿" : "🍗"} {item.category}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-yellow-400 fill-current" />{item.rating.average.toFixed(1)}</span>
          <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{item.preparationTime}min</span>
          {item.spiceLevel && (
            <span className={`px-1.5 py-0.5 rounded-full font-semibold ${spiceBadge[item.spiceLevel] ?? ""}`}>{item.spiceLevel}</span>
          )}
        </div>
        {item.nutritionInfo?.calories && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
            <Flame className="h-3 w-3 text-orange-400" /><span>{item.nutritionInfo.calories} kcal</span>
            {item.nutritionInfo.protein && <span>· 💪 {item.nutritionInfo.protein}g protein</span>}
          </div>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="text-base font-black text-primary">NRs {item.price}</span>
          <Button size="sm" className="gradient-primary h-8 text-xs"
            onClick={() => { addToCart({ menuItemId: item._id, quantity: 1 }); toast.success(`${item.name} added to cart!`); }}>
            <ShoppingCart className="h-3 w-3 mr-1" />Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ChefProfile({ chefId, onBack }: { chefId: string; onBack: () => void }) {
  const [filter, setFilter] = useState<"all" | "veg" | "non-veg" | "dessert" | "beverage">("all");
  const { data, isLoading } = useQuery({
    queryKey: ["chef", chefId],
    queryFn: () => fetchChefWithMenu(chefId),
    enabled: !!chefId,
  });

  if (isLoading) return <div className="flex justify-center h-64 items-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!data) return null;

  const { chef, menuItems } = data;
  const filtered = filter === "all" ? menuItems : menuItems.filter(i => i.category === filter);
  const cats = ["all", ...Array.from(new Set(menuItems.map(i => i.category)))] as typeof filter[];

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-primary font-semibold text-sm mb-6 hover:underline">
        ← Back to Chefs
      </button>

      <div className="relative rounded-2xl overflow-hidden mb-8 bg-gradient-to-r from-stone-900 via-orange-950 to-stone-900">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #f97316 0%, transparent 60%), radial-gradient(circle at 80% 50%, #ea580c 0%, transparent 60%)" }} />
        <div className="relative flex items-center gap-6 p-8 flex-wrap">
          <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden bg-orange-100 flex-shrink-0 flex items-center justify-center">
            {chef.photo ? <img src={chef.photo} alt={chef.name} className="w-full h-full object-cover" /> : <ChefHat className="h-12 w-12 text-orange-300" />}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-white">{chef.name}</h1>
            <p className="text-primary font-bold mt-1">{chef.specialty}</p>
            <p className="text-white/70 text-sm mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" />{chef.location}</p>
            <div className="flex gap-6 mt-4">
              {[
                { label: "Rating", val: chef.rating.toFixed(1), icon: "⭐" },
                { label: "Orders", val: chef.totalOrders, icon: "🍽️" },
                { label: "Dishes", val: menuItems.length, icon: "📋" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-xl font-black text-primary">{s.icon} {s.val}</div>
                  <div className="text-xs text-white/60 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          {chef.badges?.length > 0 && (
            <div className="flex flex-col gap-2">
              {chef.badges.map(b => <Badge key={b} className="bg-primary/20 text-primary border border-primary/30 text-xs">🏅 {b}</Badge>)}
            </div>
          )}
        </div>
        {chef.bio && <div className="px-8 pb-6 text-white/80 text-sm italic border-t border-white/10 pt-4">"{chef.bio}"</div>}
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-sm font-bold mr-2">Filter:</span>
        {cats.map(cat => (
          <Button key={cat} variant={filter === cat ? "default" : "outline"} size="sm"
            onClick={() => setFilter(cat)} className={filter === cat ? "gradient-primary" : ""}>
            {cat === "all" ? "All" : cat === "veg" ? "🌿 Veg" : cat === "non-veg" ? "🍗 Non-Veg" : cat === "dessert" ? "🍮 Dessert" : "☕ Beverage"}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ChefHat className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No {filter} items from this chef yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(item => <MenuItemCard key={item._id} item={item} />)}
        </div>
      )}
    </div>
  );
}

const ChefsPage = () => {
  const [selectedChefId, setSelectedChefId] = useState<string | null>(null);
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => setCustomerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => console.log("Location denied")
    );
  }, []);

  const { data: chefs, isLoading } = useQuery({ queryKey: ["chefs"], queryFn: fetchChefs });

  const chefsWithDistance = chefs?.map(chef => {
    if (!customerCoords || !chef.kitchenLat || !chef.kitchenLng) return chef;
    const R = 6371;
    const dLat = (chef.kitchenLat - customerCoords.lat) * Math.PI / 180;
    const dLon = (chef.kitchenLng - customerCoords.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(customerCoords.lat * Math.PI / 180) *
              Math.cos(chef.kitchenLat * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return { ...chef, distanceKm: Math.round(dist * 10) / 10 };
  }) ?? [];

  const sortedChefs = [...chefsWithDistance].sort((a, b) =>
    (a.distanceKm ?? 999) - (b.distanceKm ?? 999)
  );

  if (selectedChefId) {
    return (
      <div className="container mx-auto py-10 px-4 animate-fade-in">
        <ChefProfile chefId={selectedChefId} onBack={() => setSelectedChefId(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 animate-fade-in">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <ChefHat className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-black text-foreground">Meet Our Home Cooks</h1>
          {/* ✅ FIX: Removed broken emoji from subtitle */}
          <p className="text-muted-foreground mt-3 text-lg max-w-lg mx-auto">
            Real people, real kitchens, real passion — every dish made with love
          </p>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && (!chefs || chefs.length === 0) && (
          <div className="text-center py-20 text-muted-foreground">
            <ChefHat className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <h3 className="text-xl font-semibold mb-2">No chefs yet</h3>
            <p className="text-sm">Add chefs from the admin panel to get started.</p>
          </div>
        )}

        {chefs && chefs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sortedChefs.map(chef => (
              <ChefCard key={chef._id} chef={chef} onClick={() => setSelectedChefId(chef._id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChefsPage;