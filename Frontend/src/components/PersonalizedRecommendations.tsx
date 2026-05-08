import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { MenuItem } from "@/types";
import { MenuItemCard } from "./MenuItemCard";
import { Skeleton } from "./ui/skeleton";
import { Card } from '@/components/ui/card';

const fetchRecommendations = async (): Promise<MenuItem[]> => {
  const { data } = await api.get("/recommendations/personalized?limit=4");
  return data.data.recommendations;
};

const PersonalizedRecommendations = () => {
  const { user } = useAuth();
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ["personalizedRecommendations", user?._id],
    queryFn: fetchRecommendations,
    enabled: !!user, 
  });

  if (!user) {
    return null;
  }

  return (
    <section className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 flex items-center justify-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Just For You, {user.firstName}
          </h2>
          <p className="text-muted-foreground text-lg">
            Based on your order history, we think you'll love these!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-10 w-full mt-4" />
                </div>
              </Card>
            ))}
          {recommendations?.map((item, index) => (
            <MenuItemCard key={item._id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PersonalizedRecommendations;
