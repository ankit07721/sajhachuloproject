// Frontend/src/components/ReviewForm.tsx
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Loader2, CheckCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";

interface ReviewFormProps {
  menuItemId: string;
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const labels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110">
            <Star className={`h-8 w-8 transition-colors ${
              star <= (hovered || value) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
            }`} />
          </button>
        ))}
      </div>
      {(hovered || value) > 0 && (
        <p className="text-sm font-semibold text-primary">{labels[hovered || value]}</p>
      )}
    </div>
  );
}

const ReviewForm = ({ menuItemId }: ReviewFormProps) => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const { data: reviewable, isLoading: isCheckingEligibility } = useQuery({
    queryKey: ["reviewable"],
    queryFn: async () => {
      const { data } = await api.get("/reviews/reviewable");
      return data.data as { menuItemId: string; orderId: string }[];
    },
    enabled: isAuthenticated,
  });

  const eligibleItem = reviewable?.find((r) => r.menuItemId === menuItemId);

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: () => api.post("/reviews", {
      menuItemId,
      orderId: eligibleItem?.orderId,
      rating,
      comment,
    }),
    onSuccess: () => {
      toast.success("Review submitted! Thank you ⭐");
      queryClient.invalidateQueries({ queryKey: ["reviews", menuItemId] });
      queryClient.invalidateQueries({ queryKey: ["reviewable"] });
      queryClient.invalidateQueries({ queryKey: ["menuItem", menuItemId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to submit review");
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="bg-muted/40 border rounded-xl p-5 mb-8 flex items-center gap-3">
        <Lock className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          <Link to="/login" className="text-primary font-semibold hover:underline">Login</Link>{" "}
          to leave a review
        </p>
      </div>
    );
  }

  if (isCheckingEligibility) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground mb-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Checking eligibility...</span>
      </div>
    );
  }

  if (!eligibleItem) {
    return (
      <div className="bg-muted/40 border rounded-xl p-5 mb-8">
        <p className="text-sm text-muted-foreground">
          🛵 Order and receive this item to leave a review.
        </p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-8 flex items-center gap-3">
        <CheckCircle className="h-6 w-6 text-green-600" />
        <div>
          <p className="font-semibold text-green-800">Review submitted!</p>
          <p className="text-sm text-green-600">Thank you for your feedback.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-6 mb-8">
      <h3 className="font-black text-lg mb-4">Write a Review</h3>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-2">Your Rating *</p>
          <StarPicker value={rating} onChange={setRating} />
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-2">Your Review (optional)</p>
          <textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="How was the food? Share your experience..."
            rows={3}
            className="w-full p-3 border-2 border-border rounded-xl text-sm resize-none outline-none focus:border-primary transition-colors bg-background"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">{comment.length}/500</p>
        </div>
        <Button className="gradient-primary" onClick={() => mutate()} disabled={isPending || rating === 0}>
          {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</> : "Submit Review ⭐"}
        </Button>
        {rating === 0 && <p className="text-xs text-muted-foreground">⚠️ Please select a star rating</p>}
      </div>
    </div>
  );
};

export default ReviewForm; 