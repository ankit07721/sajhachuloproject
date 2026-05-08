// Frontend/src/pages/ChefApply.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ChefHat, CheckCircle, Navigation, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import api from "@/lib/api";

const chefSchema = z.object({
  firstName:  z.string().min(2, "First name must be at least 2 characters."),
  lastName:   z.string().min(2, "Last name must be at least 2 characters."),
  email:      z.string().email("Please enter a valid email address."),
  phone:      z.string().regex(/^[0-9]{10}$/, "Please enter a valid 10-digit phone number."),
  password:   z.string().min(6, "Password must be at least 6 characters."),
  address: z.object({
    street:  z.string().min(3, "Street address is required."),
    city:    z.string().min(2, "City is required."),
    state:   z.string().min(2, "Province is required."),
    // ✅ FIX: Nepal uses Ward No, not ZIP code
    zipCode: z.string().min(1, "Ward No. is required."),
  }),
  bio:              z.string().min(20, "Please write at least 20 characters.").max(500),
  specialty:        z.string().min(3, "Please enter your food specialty."),
  experience:       z.string().min(1, "Experience is required."),
  kitchenImages:    z.string().min(1, "Please provide at least one kitchen image URL."),
  idProofImage:     z.string().url("Please provide a valid URL for your ID proof."),
  agreeToTerms:     z.boolean().refine(val => val === true, { message: "You must agree to the terms." }),
  kitchenLatitude:  z.string().min(1, "Kitchen latitude is required."),
  kitchenLongitude: z.string().min(1, "Kitchen longitude is required."),
  kitchenAddress:   z.string().optional(),
});

type ChefFormValues = z.infer<typeof chefSchema>;

const SuccessScreen = () => (
  <div className="min-h-screen bg-gradient-hero flex items-center justify-center py-12 px-4">
    <div className="text-center max-w-md">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>
      <h1 className="text-3xl font-black text-foreground mb-3">Application Submitted! 🎉</h1>
      <p className="text-muted-foreground mb-2">Your chef application has been received.</p>
      <p className="text-muted-foreground mb-8">
        Our admin team will review your kitchen photos and details within <strong>24-48 hours</strong>.
      </p>
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-700 mb-6 text-left">
        <p className="font-bold mb-2">What happens next?</p>
        <p>1. Admin reviews your kitchen photos and ID</p>
        <p>2. You get notified when approved</p>
        <p>3. Login and start adding your dishes!</p>
        <p>4. Customers within 7km will see your dishes 📍</p>
      </div>
      <Link to="/login">
        <Button className="gradient-primary" size="lg">Back to Login</Button>
      </Link>
    </div>
  </div>
);

const ChefApply = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [submitted, setSubmitted] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const form = useForm<ChefFormValues>({
    resolver: zodResolver(chefSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "", phone: "", password: "",
      address: { street: "", city: "", state: "", zipCode: "" },
      bio: "", specialty: "", experience: "",
      kitchenImages: "", idProofImage: "",
      agreeToTerms: false,
      kitchenLatitude: "", kitchenLongitude: "", kitchenAddress: "",
    },
  });

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by your browser.");
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        form.setValue("kitchenLatitude", lat);
        form.setValue("kitchenLongitude", lng);
        form.setValue("kitchenAddress", "Detected via GPS");
        toast.success(`📍 Location detected! (${lat}, ${lng})`);
        setIsGettingLocation(false);
      },
      () => {
        toast.error("Could not get location. Please enter coordinates manually.");
        setIsGettingLocation(false);
      },
      { timeout: 10000 }
    );
  };

  const mutation = useMutation({
    mutationFn: (data: Omit<ChefFormValues, "agreeToTerms">) =>
      api.post("/chef/apply", {
        ...data,
        kitchenImages: data.kitchenImages.split(",").map(s => s.trim()).filter(Boolean),
        location: {
          latitude:  parseFloat(data.kitchenLatitude),
          longitude: parseFloat(data.kitchenLongitude),
          address:   data.kitchenAddress || data.address.city,
        },
      }),
    onSuccess: () => setSubmitted(true),
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Application failed. Please try again.");
    },
  });

  const onSubmit = (data: ChefFormValues) => {
    const { agreeToTerms, ...submissionData } = data;
    mutation.mutate(submissionData);
  };

  const handleNextStep = async () => {
    const valid = await form.trigger([
      "firstName", "lastName", "email", "phone", "password",
      "address.street", "address.city", "address.state", "address.zipCode",
    ]);
    if (valid) setStep(2);
  };

  if (submitted) return <SuccessScreen />;

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <img src="/lovable-uploads/3eb505a2-d097-4c6c-b32c-4526e0a2aed2.png" alt="Sajha Chulo" className="h-16 w-auto mx-auto" />
          </Link>
        </div>

        <Card className="shadow-warm animate-fade-in">
          <div className="h-1.5 w-full bg-muted rounded-t-lg overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: step === 1 ? "50%" : "100%" }} />
          </div>

          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <ChefHat className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {step === 1 ? "Become a Chef" : "Your Chef Profile"}
            </CardTitle>
            <CardDescription>
              {step === 1 ? "Step 1 of 2 — Personal Information" : "Step 2 of 2 — Kitchen & Experience"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                {/* STEP 1 */}
                {step === 1 && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      {(["firstName", "lastName"] as const).map(name => (
                        <FormField key={name} control={form.control} name={name} render={({ field }) => (
                          <FormItem>
                            <FormLabel>{name === "firstName" ? "First Name" : "Last Name"}</FormLabel>
                            <FormControl><Input placeholder={name === "firstName" ? "Ram" : "Shrestha"} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      ))}
                    </div>

                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" placeholder="chef@example.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl><Input placeholder="98XXXXXXXX" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="address.street" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl><Input placeholder="Golpark, Butwal-11" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* ✅ FIX: Changed ZipCode label to Ward No. */}
                    <div className="grid grid-cols-3 gap-3">
                      <FormField control={form.control} name="address.city" render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl><Input placeholder="Butwal" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="address.state" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Province</FormLabel>
                          <FormControl><Input placeholder="Lumbini" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="address.zipCode" render={({ field }) => (
                        <FormItem>
                          {/* ✅ FIX: Nepal-appropriate label */}
                          <FormLabel>Ward No.</FormLabel>
                          <FormControl><Input placeholder="e.g. 11" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showPassword ? "text" : "password"} placeholder="Min 6 characters" {...field} />
                            <button type="button" onClick={() => setShowPassword(p => !p)}
                              className="absolute right-3 top-1/2 -translate-y-1/2">
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <Button type="button" className="w-full gradient-primary" size="lg" onClick={handleNextStep}>
                      Continue to Chef Profile →
                    </Button>
                  </>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <>
                    <FormField control={form.control} name="bio" render={({ field }) => (
                      <FormItem>
                        <FormLabel>About You</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Tell customers about yourself, your cooking style..." rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="specialty" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Food Specialty</FormLabel>
                          <FormControl><Input placeholder="e.g. Nepali Traditional" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="experience" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Experience</FormLabel>
                          <FormControl><Input placeholder="e.g. 5 years" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="kitchenImages" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kitchen Photo URLs</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Paste image URLs separated by commas" rows={2} {...field} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">Upload to Imgur and paste URLs here.</p>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="idProofImage" render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Proof Image URL</FormLabel>
                        <FormControl><Input placeholder="https://imgur.com/your-id-photo" {...field} /></FormControl>
                        <p className="text-xs text-muted-foreground mt-1">Citizenship, driving license, or passport URL.</p>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Kitchen Location */}
                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-orange-600" />
                        <p className="text-sm font-bold text-orange-800">Kitchen Location *</p>
                      </div>
                      <p className="text-xs text-orange-600">
                        Customers within 7km of your kitchen will see your dishes.
                      </p>
                      <Button type="button" variant="outline" size="sm"
                        className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
                        onClick={handleUseMyLocation} disabled={isGettingLocation}>
                        {isGettingLocation
                          ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Detecting location...</>
                          : <><Navigation className="h-4 w-4 mr-2" />Use My Current Location</>
                        }
                      </Button>

                      <div className="text-center text-xs text-muted-foreground">— or enter manually —</div>

                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="kitchenLatitude" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Latitude</FormLabel>
                            <FormControl><Input placeholder="e.g. 27.6937" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="kitchenLongitude" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Longitude</FormLabel>
                            <FormControl><Input placeholder="e.g. 83.4532" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <p className="text-xs text-muted-foreground">
                        💡 <strong>How to find coordinates:</strong> Open Google Maps → long press your kitchen location → copy the numbers shown at top.
                      </p>

                      {form.watch("kitchenLatitude") && form.watch("kitchenLongitude") && (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-2">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <p className="text-xs text-green-700 font-medium">
                            Kitchen set: ({form.watch("kitchenLatitude")}, {form.watch("kitchenLongitude")})
                          </p>
                        </div>
                      )}
                    </div>

                    <FormField control={form.control} name="agreeToTerms" render={({ field }) => (
                      <FormItem className="flex items-start gap-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="font-normal text-sm leading-relaxed">
                          I agree to Sajha Chulo's Terms & Conditions and confirm all information is accurate.
                        </FormLabel>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="flex gap-3">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>← Back</Button>
                      <Button type="submit" className="flex-1 gradient-primary" disabled={mutation.isPending}>
                        {mutation.isPending
                          ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</>
                          : "Submit Application 🚀"
                        }
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </Form>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">Already applied? </span>
              <Link to="/login" className="text-primary hover:underline font-medium">Login here</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChefApply;