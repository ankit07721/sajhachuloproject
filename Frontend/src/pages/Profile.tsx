import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Save, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { User } from "@/types";
import { useEffect, useState } from "react";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "A valid phone number is required"),
  address: z.object({
    street: z.string().min(1, "Street is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zipCode: z.string().min(1, "ZIP code is required"),
  }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const Profile = () => {
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isLocating, setIsLocating] = useState(false);

  const { data: profile, isLoading: isProfileLoading } = useQuery<User>({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await api.get("/customers/profile");
      return data.data;
    },
    enabled: !!user?.id && !isAuthLoading,
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        phone: profile.phone || "",
        address: {
          street: profile.address?.street || "",
          city: profile.address?.city || "",
          state: profile.address?.state || "",
          zipCode: profile.address?.zipCode || "",
        },
      });
    }
  }, [profile, form.reset]);

  const updateProfileMutation = useMutation({
    mutationFn: (updatedData: ProfileFormValues) =>
      api.put("/customers/profile", updatedData),
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || "Failed to update profile."),
  });

  const updateLocationMutation = useMutation({
    mutationFn: (coords: { latitude: number; longitude: number }) =>
      api.put("/location/update-location", coords),
    onSuccess: () => {
      toast.success("Delivery location updated!");
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || "Could not set location."),
    onSettled: () => setIsLocating(false),
  });

  const handleSetLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateLocationMutation.mutate({ latitude, longitude });
      },
      () => {
        toast.error(
          "Unable to retrieve your location. Please enable location services in your browser/OS."
        );
        setIsLocating(false);
      }
    );
  };

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  if (isProfileLoading || isAuthLoading) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Skeleton className="h-10 w-1/3 mb-8" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl animate-fade-in">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>
      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your personal and address details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="address.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address.state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address.zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Location</CardTitle>
            <CardDescription>
              Set your precise location for accurate delivery fees and service
              availability.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile?.location?.isVerified ? (
              <p className="text-green-600">
                Your delivery location is set to: Lat{" "}
                {profile.location.latitude.toFixed(4)}, Lon{" "}
                {profile.location.longitude.toFixed(4)}.
              </p>
            ) : (
              <p className="text-yellow-600">
                Your delivery location is not set. This may result in estimated
                delivery fees.
              </p>
            )}
            <Button
              onClick={handleSetLocation}
              disabled={isLocating}
              className="mt-4"
            >
              {isLocating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <MapPin className="mr-2 h-4 w-4" />
              {profile?.location?.isVerified
                ? "Update My Location"
                : "Set My Location Automatically"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
