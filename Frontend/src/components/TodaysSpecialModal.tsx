import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Award, Loader2, Utensils, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { MenuItem } from "@/types";
import { useCart } from "@/context/CartContext";

interface TodaysSpecialApiResponse {
  success: boolean;
  data: {
    day: string;
    specials: MenuItem[];
  };
}

const fetchTodaysSpecial = async (): Promise<TodaysSpecialApiResponse> => {
  const { data } = await api.get("/menu/specials/today");
  return data;
};

interface TodaysSpecialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TodaysSpecialModal = ({ isOpen, onClose }: TodaysSpecialModalProps) => {
  const { addToCart } = useCart();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["todaysSpecial"],
    queryFn: fetchTodaysSpecial,
    enabled: isOpen, 
  });

  const specials = data?.data?.specials || [];
  const day = data?.data?.day || "Today";

  const handleAddToCart = (item: MenuItem) => {
    addToCart({ menuItemId: item._id, quantity: 1 });
    toast.success(`${item.name} added to cart!`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold flex items-center gap-2">
            <Award className="h-8 w-8 text-primary" />
            {day.charAt(0).toUpperCase() + day.slice(1)}'s Specials
          </DialogTitle>
          <DialogDescription>
            Our chef's hand-picked favorites for today. Enjoy them at a special
            price!
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[70vh] overflow-y-auto pr-2">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}
          {isError && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{(error as Error).message}</AlertDescription>
            </Alert>
          )}

          {!isLoading && specials.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No specials available today. Please check back tomorrow!
              </p>
            </div>
          )}

          <div className="space-y-4">
            {specials.map((item) => (
              <div
                key={item._id}
                className="flex flex-col sm:flex-row gap-4 items-center border rounded-lg p-4"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full sm:w-32 h-32 rounded-md object-cover"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{item.name}</h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-4">
                    <p className="text-2xl font-bold text-primary">
                      NRs {item.dailySpecial?.specialPrice ?? item.price}
                    </p>
                    <p className="text-lg font-medium text-muted-foreground line-through">
                      NRs {item.price}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleAddToCart(item)}
                  className="w-full sm:w-auto"
                >
                  <Utensils className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TodaysSpecialModal;
