// Frontend/src/pages/ItemDetailPage.tsx
import ReviewForm from "@/components/ReviewForm";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Clock, ShoppingCart, Loader2, Flame } from "lucide-react";
import api from "@/lib/api";
import { MenuItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/context/CartContext";
import { format } from "date-fns";

interface Review {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: { firstName: string; lastName: string };
}

interface ReviewsResponse {
  data: Review[];
  stats: {
    total: number;
    average: number;
    distribution: Record<number, number>;
  };
}

const fetchMenuItem = async (id: string): Promise<MenuItem> => {
  const { data } = await api.get(`/menu/${id}`);
  return data.data;
};

// ── FIX: correct URL is /reviews/item/:id ─────────────────────────────────────
const fetchItemReviews = async (id: string): Promise<ReviewsResponse> => {
  const { data } = await api.get(`/reviews/item/${id}`);
  return data;
};

// ── Rating Breakdown Bar ──────────────────────────────────────────────────────
function RatingBreakdown({ stats }: { stats: ReviewsResponse["stats"] }) {
  if (stats.total === 0) return null;
  return (
    <div className="bg-muted/30 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-6 flex-wrap">
        {/* Big number */}
        <div className="text-center">
          <p className="text-5xl font-black text-primary">{stats.average.toFixed(1)}</p>
          <div className="flex gap-0.5 justify-center mt-1">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={`h-4 w-4 ${s <= Math.round(stats.average) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{stats.total} reviews</p>
        </div>
        {/* Bars */}
        <div className="flex-1 space-y-1.5 min-w-[200px]">
          {[5,4,3,2,1].map(star => {
            const count = stats.distribution[star] || 0;
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-4 text-right text-muted-foreground">{star}</span>
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const ItemDetailPage = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const { addToCart } = useCart();

  const { data: item, isLoading: isItemLoading } = useQuery({
    queryKey: ["menuItem", itemId],
    queryFn:  () => fetchMenuItem(itemId!),
    enabled:  !!itemId,
  });

  const { data: reviewsData, isLoading: areReviewsLoading } = useQuery({
    queryKey: ["reviews", itemId],
    queryFn:  () => fetchItemReviews(itemId!),
    enabled:  !!itemId,
  });

  if (isItemLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );

  if (!item)
    return (
      <div className="text-center py-20">
        <h2>Item not found</h2>
      </div>
    );

  const reviews  = reviewsData?.data  || [];
  const stats    = reviewsData?.stats;

  return (
    <div className="container mx-auto py-12 animate-fade-in max-w-5xl">
      <div className="grid md:grid-cols-2 gap-12">
        {/* Image */}
        <div>
          {item.image
            ? <img src={item.image} alt={item.name} className="w-full rounded-2xl shadow-lg object-cover h-80" />
            : <div className="w-full h-80 rounded-2xl bg-orange-50 flex items-center justify-center text-6xl">🍽️</div>
          }
          {/* Nutrition */}
          {item.nutritionInfo?.calories && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Calories", val: `${item.nutritionInfo.calories} kcal`, icon: "🔥" },
                { label: "Protein",  val: `${item.nutritionInfo.protein || 0}g`,  icon: "💪" },
                { label: "Carbs",    val: `${item.nutritionInfo.carbs || 0}g`,    icon: "🌾" },
              ].map(n => (
                <div key={n.label} className="bg-muted/40 rounded-xl p-3 text-center">
                  <p className="text-lg">{n.icon}</p>
                  <p className="font-bold text-sm">{n.val}</p>
                  <p className="text-xs text-muted-foreground">{n.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant={item.category === "veg" ? "secondary" : "default"}
              className={item.category === "veg" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
              {item.category === "veg" ? "🌿 Veg" : "🍗 Non-Veg"}
            </Badge>
            {item.spiceLevel && (
              <Badge variant="outline" className="text-xs capitalize">{item.spiceLevel}</Badge>
            )}
          </div>

          <h1 className="text-4xl font-black mb-3">{item.name}</h1>

          <div className="flex items-center gap-4 mb-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 text-yellow-400 fill-current" />
              <span className="font-semibold">{(item.rating?.average ?? 0).toFixed(1)}</span>
              <span className="text-sm">({item.rating?.count ?? 0} reviews)</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-5 w-5" />
              <span>{item.preparationTime} mins</span>
            </div>
          </div>

          <p className="text-muted-foreground mb-6 leading-relaxed">{item.description}</p>

          <p className="text-4xl font-black text-primary mb-6">NRs {item.price}</p>

          <Button size="lg" className="w-full gradient-primary" onClick={() => {
            addToCart({ menuItemId: item._id, quantity: 1 });
            toast.success(`${item.name} added to cart!`);
          }}>
            <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
          </Button>

          <div className="mt-6 space-y-2 text-sm">
            {item.ingredients && item.ingredients.length > 0 && (
              <p><strong>Ingredients:</strong> {item.ingredients.join(", ")}</p>
            )}
            {item.allergens && item.allergens.length > 0 && (
              <p><strong>Allergens:</strong>{" "}
                <span className="text-destructive font-medium">{item.allergens.join(", ")}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-16">
        <h2 className="text-3xl font-black mb-6">Reviews</h2>

        {/* Rating breakdown */}
        {stats && <RatingBreakdown stats={stats} />}

        {/* Review form */}
        <ReviewForm menuItemId={itemId!} />

        {/* Reviews list */}
        {areReviewsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {review.user.firstName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold">
                          {review.user.firstName} {review.user.lastName.charAt(0)}.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(review.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${
                          i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                        }`} />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      "{review.comment}"
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">No reviews yet</p>
            <p className="text-sm mt-1">Be the first to review this dish!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemDetailPage;