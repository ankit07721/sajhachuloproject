import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Loader2, CheckCircle, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import api from "@/lib/api";

interface CheckResult {
  deliverable: boolean;
  distance?: number;
  message: string;
}

const LocationChecker = () => {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const locationMutation = useMutation({
    mutationFn: (coords: { latitude: number; longitude: number }) =>
      api.post("/location/check-deliverable", coords),
    onSuccess: (response) => {
      setResult(response.data.data);
      if (response.data.data.deliverable) {
        toast.success("Great! We can deliver to your location.");
      } else {
        toast.error("Sorry, your location is outside our delivery range.");
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Could not check location.");
    },
  });

  const handleCheckLocation = () => {
    setResult(null); // Reset previous result
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsGettingLocation(false);
        const { latitude, longitude } = position.coords;
        locationMutation.mutate({ latitude, longitude });
      },
      () => {
        setIsGettingLocation(false);
        toast.error(
          "Unable to retrieve location. Please enable location services."
        );
      }
    );
  };

  const isLoading = isGettingLocation || locationMutation.isPending;

  return (
    <div className="bg-card border rounded-lg p-6 my-8 text-center shadow-sm">
      <h2 className="text-2xl font-semibold mb-2">
        Check if we deliver to you!
      </h2>
      <p className="text-muted-foreground mb-4">
        Click the button below to use your current location.
      </p>
      <Button
        onClick={handleCheckLocation}
        disabled={isLoading}
        size="lg"
        className="gradient-primary"
      >
        {isLoading && (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        )}
        <MapPin className="mr-2 h-5 w-5" />
        Check My Location
      </Button>

      {result && (
        <Alert
          variant={result.deliverable ? "default" : "destructive"}
          className="mt-6 text-left"
        >
          {result.deliverable ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {result.deliverable ? "Good News!" : "Sorry!"}
          </AlertTitle>
          <AlertDescription>
            {result.message}
            {result.distance &&
              ` Your location is approximately ${result.distance.toFixed(
                2
              )} km away.`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default LocationChecker;
