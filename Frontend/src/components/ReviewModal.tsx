// Frontend/src/components/ReviewModal.tsx
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { Order } from "@/types";

interface ReviewModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
}

// Fetch reviewable items for this order
const fetchReviewable = async () => {
  const { data } = await api.get("/reviews/reviewable");
  return data.data as {
    orderId: string;
    orderNumber: string;
    menuItemId: string;
    menuItemName: string;
    menuItemImage: string;
  }[];
};

// ── Star Picker ───────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`h-8 w-8 transition-colors ${
              star <= (hovered || value)
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ── Single Item Review Form ───────────────────────────────────────────────────
function ItemReviewForm({
  item,
  onDone,
}: {
  item: { orderId: string; menuItemId: string; menuItemName: string; menuItemImage: string };
  onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.post("/reviews", {
        menuItemId: item.menuItemId,
        orderId:    item.orderId,
        rating,
        comment,
      }),
    onSuccess: () => {
      setDone(true);
      toast.success(`Thanks for reviewing ${item.menuItemName}!`);
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["reviewable"] });
      setTimeout(onDone, 1000);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to submit review");
    },
  });

  if (done) {
    return (
      <div className="flex items-center gap-2 py-4 text-green-600">
        <CheckCircle className="h-5 w-5" />
        <span className="font-semibold">Review submitted!</span>
      </div>
    );
  }

  return (
    <div className="border rounded-xl p-4 space-y-3">
      {/* Item info */}
      <div className="flex items-center gap-3">
        {item.menuItemImage && (
          <img
            src={item.menuItemImage}
            alt={item.menuItemName}
            className="w-12 h-12 rounded-lg object-cover"
          />
        )}
        <p className="font-bold">{item.menuItemName}</p>
      </div>

      {/* Stars */}
      <div>
        <p className="text-sm text-muted-foreground mb-1">Your rating</p>
        <StarPicker value={rating} onChange={setRating} />
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us about your experience (optional)..."
        rows={2}
        className="w-full p-3 border-2 border-border rounded-xl text-sm resize-none outline-none focus:border-primary transition-colors"
        maxLength={500}
      />

      <Button
        className="w-full gradient-primary"
        onClick={() => mutate()}
        disabled={isPending || rating === 0}
      >
        {isPending ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>
        ) : (
          "Submit Review"
        )}
      </Button>
      {rating === 0 && (
        <p className="text-xs text-muted-foreground text-center">Please select a star rating</p>
      )}
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
const ReviewModal = ({ isOpen, order, onClose }: ReviewModalProps) => {
  const { data: reviewable, isLoading } = useQuery({
    queryKey: ["reviewable"],
    queryFn:  fetchReviewable,
    enabled:  isOpen && !!order,
  });

  if (!isOpen || !order) return null;

  // Filter reviewable items that belong to THIS order
  const orderItems = reviewable?.filter(
    (r) => r.orderId === order._id
  ) ?? [];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="gradient-primary p-5 text-white rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black">Leave a Review</h2>
              <p className="text-xs opacity-75 mt-0.5">Order #{order.orderNumber}</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-2xl">
              ✕
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orderItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p className="font-semibold">All items reviewed!</p>
              <p className="text-sm mt-1">You've already reviewed everything from this order.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Rate the items from this order:
              </p>
              {orderItems.map((item) => (
                <ItemReviewForm
                  key={item.menuItemId}
                  item={item}
                  onDone={() => {}}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;