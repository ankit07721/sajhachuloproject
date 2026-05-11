// Frontend/src/pages/Chef/ChefDashboard.tsx
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import NotificationBell from "@/components/NotificationBell";
import {
  ChefHat,
  Utensils,
  Star,
  ShoppingBag,
  PlusCircle,
  Loader2,
  Clock,
  Camera,
  Pencil,
  CheckCircle,
  X,
  LogOut,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

const fetchChefDashboard = async () => {
  const { data } = await api.get("/chef/dashboard");
  return data.data;
};

// ── Photo Upload Component ────────────────────────────────────────────────────
function PhotoUpload({
  currentPhoto,
  chefName,
}: {
  currentPhoto?: string;
  chefName: string;
}) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const { mutate: uploadPhoto, isPending } = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("photo", file);
      return api.post("/chef/upload-photo", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: (res) => {
      toast.success("Photo updated!");
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["chefDashboard"] });
    },
    onError: () => toast.error("Failed to upload photo"),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    uploadPhoto(file);
  };

  const photoSrc = preview || currentPhoto || null;

  return (
    <div className="relative group w-24 h-24">
      <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden bg-orange-100 flex items-center justify-center">
        {photoSrc ? (
          <img
            src={`http://localhost:5000${photoSrc}`}
            alt={chefName}
            className="w-full h-full object-cover"
          />
        ) : (
          <ChefHat className="h-10 w-10 text-orange-300" />
        )}
      </div>
      {/* Upload overlay */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={isPending}
        className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {isPending ? (
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        ) : (
          <Camera className="h-6 w-6 text-white" />
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

// ── Edit Profile Modal ────────────────────────────────────────────────────────
function EditProfileModal({
  chef,
  onClose,
}: {
  chef: any;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    bio: chef?.chefProfile?.bio || "",
    specialty: chef?.chefProfile?.specialty || "",
    experience: chef?.chefProfile?.experience || "",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.put("/chef/profile", form),
    onSuccess: () => {
      toast.success("Profile updated!");
      queryClient.invalidateQueries({ queryKey: ["chefDashboard"] });
      onClose();
    },
    onError: () => toast.error("Failed to update profile"),
  });

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gradient-primary p-5 text-white rounded-t-2xl flex justify-between items-center">
          <h2 className="text-xl font-black">Edit Profile</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-muted-foreground">
              Specialty
            </label>
            <Input
              value={form.specialty}
              onChange={(e) =>
                setForm((p) => ({ ...p, specialty: e.target.value }))
              }
              placeholder="e.g. Nepali Traditional, Continental..."
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-muted-foreground">
              Experience
            </label>
            <Input
              value={form.experience}
              onChange={(e) =>
                setForm((p) => ({ ...p, experience: e.target.value }))
              }
              placeholder="e.g. 5 years of home cooking"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-muted-foreground">
              Bio
            </label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Tell customers about yourself..."
              rows={3}
              className="mt-1"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 gradient-primary"
              onClick={() => mutate()}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
const ChefDashboard = () => {
  const { user, logout } = useAuth();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const queryClient = useQueryClient();

  // Fetch Pending Subscription Requests
  const { data: subRequests } = useQuery({
    queryKey: ["chefSubRequests"],
    queryFn: async () => {
      const { data } = await api.get("/subscriptions/chef/requests");
      return data.data;
    },
  });

  const { mutate: approveSub, isPending: isApproving } = useMutation({
    mutationFn: (id: string) => api.put(`/subscriptions/${id}/approve`),
    onSuccess: () => {
      toast.success("Subscription approved! Customer will be notified to pay.");
      queryClient.invalidateQueries({ queryKey: ["chefSubRequests"] });
      queryClient.invalidateQueries({ queryKey: ["chefDashboard"] });
    },
    onError: () => toast.error("Failed to approve subscription"),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["chefDashboard"],
    queryFn: fetchChefDashboard,
  });

  const { mutate: toggleAvailability, isPending: isToggling } = useMutation({
    mutationFn: (isAvailable: boolean) => api.put("/chef/availability", { isAvailable }),
    onSuccess: () => {
      toast.success("Availability updated!");
      queryClient.invalidateQueries({ queryKey: ["chefDashboard"] });
    },
    onError: () => toast.error("Failed to update availability"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const chef = data?.chef;
  const isAvailable = chef?.chefProfile?.isAvailable ?? true;
  const status = chef?.chefProfile?.applicationStatus;

  if (status === "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6">
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-black mb-3">Application Under Review</h1>
          <p className="text-muted-foreground mb-6">
            Hi <strong>{user?.firstName}</strong>! Your application is being
            reviewed. This usually takes 24-48 hours.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
            You'll access your full dashboard once approved!
          </div>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-black mb-3 text-red-600">
            Application Rejected
          </h1>
          {chef?.chefProfile?.applicationNote && (
            <Alert className="mb-4">
              <AlertDescription>
                <strong>Reason:</strong> {chef.chefProfile.applicationNote}
              </AlertDescription>
            </Alert>
          )}
          <p className="text-sm text-muted-foreground">
            Please contact support for more information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background py-8 animate-fade-in">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* ── Header with Photo ── */}
          <div className="flex items-center gap-5 mb-8">
            <PhotoUpload
              currentPhoto={chef?.chefProfile?.photo}
              chefName={`${chef?.firstName} ${chef?.lastName}`}
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-black">
                  {chef?.firstName} {chef?.lastName}
                </h1>
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  ✅ Approved Chef
                </Badge>
                
                <Button 
                  onClick={() => toggleAvailability(!isAvailable)}
                  disabled={isToggling}
                  variant={isAvailable ? "default" : "outline"}
                  className={`h-8 text-xs gap-1.5 ${isAvailable ? "bg-green-600 hover:bg-green-700" : "text-red-600 border-red-200 hover:bg-red-50"}`}
                >
                  {isToggling ? <Loader2 className="h-3 w-3 animate-spin" /> : <div className={`w-2 h-2 rounded-full ${isAvailable ? "bg-white" : "bg-red-600"} animate-pulse`} />}
                  {isAvailable ? "Online" : "Offline"}
                </Button>
              </div>
              <p className="text-primary font-semibold mt-0.5">
                {chef?.chefProfile?.specialty || "Home Cook"}
              </p>
              {chef?.chefProfile?.bio && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {chef.chefProfile.bio}
                </p>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <NotificationBell />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditProfile(true)}
                className="flex items-center gap-2 flex-shrink-0"
              >
                <Pencil className="h-4 w-4" /> Edit Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center gap-2 flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              {
                title: "My Dishes",
                value: data?.totalItems ?? 0,
                icon: Utensils,
                color: "text-orange-500",
              },
              {
                title: "Total Orders",
                value: chef?.chefProfile?.totalOrders ?? 0,
                icon: ShoppingBag,
                color: "text-blue-500",
              },
              {
                title: "My Rating",
                value: `${chef?.chefProfile?.rating?.toFixed(1) ?? "0.0"} ⭐`,
                icon: Star,
                color: "text-yellow-500",
              },
              {
                title: "Active Subs",
                value: data?.activeSubscriptions?.length ?? 0,
                icon: CheckCircle,
                color: "text-green-500",
              },
            ].map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-black">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Quick Actions ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              {
                to: "/chef/add-item",
                icon: PlusCircle,
                color: "bg-primary/10",
                iconColor: "text-primary",
                label: "Add Dish",
                sub: "New menu item",
              },
              {
                to: "/chef/manage-menu",
                icon: Utensils,
                color: "bg-blue-50",
                iconColor: "text-blue-500",
                label: "Manage Menu",
                sub: "Edit or remove",
              },
              {
                to: "/chef/orders",
                icon: ShoppingBag,
                color: "bg-purple-50",
                iconColor: "text-purple-500",
                label: "My Orders",
                sub: "View orders",
              },
              {
                to: "#sub-requests",
                icon: Star,
                color: "bg-green-50",
                iconColor: "text-green-500",
                label: "Sub Requests",
                sub: subRequests?.length > 0 ? `${subRequests.length} pending` : "No requests",
              },
            ].map((action) => (
              <Link to={action.to} key={action.label}>
                <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div
                      className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center flex-shrink-0`}
                    >
                      <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{action.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {action.sub}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* ── Subscription Requests (NEW) ── */}
          {subRequests && subRequests.length > 0 && (
            <div id="sub-requests" className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                <Badge className="bg-primary text-white">{subRequests.length}</Badge>
                New Subscription Requests
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subRequests.map((req: any) => (
                  <Card key={req._id} className="border-2 border-primary/20 shadow-lg">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                            {req.user?.firstName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold">{req.user?.firstName} {req.user?.lastName}</p>
                            <p className="text-xs text-muted-foreground">{req.planName}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-primary border-primary">Pending Review</Badge>
                      </div>
                      
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2 mb-4 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Address:</span>
                          <span className="font-semibold">{req.deliveryAddress?.street}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Meal Time:</span>
                          <span className="font-semibold capitalize">{req.preferences?.mealTime}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button className="flex-1 gradient-primary text-xs" 
                          onClick={() => approveSub(req._id)}
                          disabled={isApproving}>
                          {isApproving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                          Approve Request
                        </Button>
                        <Button variant="outline" className="flex-1 text-xs text-red-600 hover:bg-red-50 border-red-100">
                          <X className="h-3 w-3 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ── My Menu Items ── */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Dishes</CardTitle>
                <Link to="/chef/add-item">
                  <Button size="sm" className="gradient-primary">
                    <PlusCircle className="h-4 w-4 mr-1" /> Add
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {data?.myItems?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Utensils className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      No dishes yet. Add your first dish!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data?.myItems?.slice(0, 5).map((item: any) => (
                      <div
                        key={item._id}
                        className="flex items-center gap-3 p-2 border rounded-xl"
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center text-xl">
                            🍽️
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            NRs {item.price}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs">
                              {item.rating?.average?.toFixed(1) || "0.0"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({item.rating?.count || 0})
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            className={`text-xs ${item.isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                          >
                            {item.isAvailable ? "Active" : "Hidden"}
                          </Badge>
                          <Link to={`/chef/edit-item/${item._id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-6 px-2"
                            >
                              Edit
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                    {data?.myItems?.length > 5 && (
                      <Link to="/chef/manage-menu">
                        <p className="text-xs text-primary text-center pt-2 hover:underline">
                          View all {data.myItems.length} dishes →
                        </p>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Recent Reviews ── */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.recentReviews || data.recentReviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No reviews yet.</p>
                    <p className="text-xs mt-1">
                      Reviews appear after customers rate your dishes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.recentReviews.map((review: any) => (
                      <div
                        key={review._id}
                        className="p-3 border rounded-xl space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {review.user?.firstName?.charAt(0)}
                            </div>
                            <span className="text-sm font-semibold">
                              {review.user?.firstName}{" "}
                              {review.user?.lastName?.charAt(0)}.
                            </span>
                          </div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`h-3 w-3 ${s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-primary font-semibold">
                          🍽️ {review.menuItem?.name}
                        </p>
                        {review.comment && (
                          <p className="text-xs text-muted-foreground italic">
                            "{review.comment}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(review.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <EditProfileModal
          chef={chef}
          onClose={() => setShowEditProfile(false)}
        />
      )}
    </>
  );
};

export default ChefDashboard;
