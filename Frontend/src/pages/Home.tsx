import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, Heart, Clock, Star, Utensils,
  Shield, Truck, Loader2, Search, ShoppingBag, ChefHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { MenuItem } from "@/types";
import { MenuItemCard } from "@/components/MenuItemCard";
import LocationChecker from "@/components/LocationChecker";

const Home = () => {
  const { data: popularDishes, isLoading: isLoadingPopular } = useQuery({
    queryKey: ["popularItemsHome"],
    queryFn: async (): Promise<MenuItem[]> => {
      const res = await api.get("/recommendations/popular?limit=3");
      return res.data.data.recommendations;
    },
  });

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const features = [
    {
      icon: Heart,
      title: "Made with Love",
      description: "Every dish is prepared with care and passion by home cooks in your community",
    },
    {
      icon: Clock,
      title: "Fresh & Fast",
      description: "Daily prepared meals delivered fresh to your doorstep within hours",
    },
    {
      icon: Shield,
      title: "Quality Assured",
      description: "All our home cooks are verified and follow strict hygiene standards",
    },
    {
      icon: Truck,
      title: "Reliable Delivery",
      description: "Safe and timely delivery with real-time tracking",
    },
  ];

  const howItWorksSteps = [
    {
      icon: Search,
      title: "Discover Meals",
      description: "Browse a diverse menu of homemade dishes from cooks in your area.",
    },
    {
      icon: ShoppingBag,
      title: "Place Your Order",
      description: "Select your favorites, choose a delivery time, and check out securely.",
    },
    {
      icon: ChefHat,
      title: "Enjoy at Home",
      description: "Your meal is freshly prepared and delivered for you to enjoy.",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative min-h-[90vh] flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://www.tastingtable.com/img/gallery/42-essential-ingredients-for-indian-cooking-full-upgrade/intro-1690478815.jpg')",
        }}
      >
        <div className="absolute inset-0 bg-black/50 z-0" />
        <div className="relative z-10 container mx-auto px-4 text-center text-white animate-fade-in">
          {/* ✅ FIX: Brand name updated */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            A Taste of <span className="text-primary">Home</span>
            <br />
            in Every Bite
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Discover authentic homemade meals crafted by passionate home cooks
            in your neighborhood. Fresh, delicious, and made with love.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/shop">
              <Button size="lg" className="gradient-primary border-0 shadow-warm text-lg px-8 py-3">
                Order Now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/menu">
              <Button size="lg" variant="outline"
                className="text-lg px-8 py-3 hover-lift bg-white/10 border-white text-white hover:bg-white hover:text-primary">
                View Menu
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Popular Dishes Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Popular This Week
            </h2>
            <p className="text-muted-foreground text-lg mt-2">
              Customer favorites, made fresh daily.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {isLoadingPopular
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-96 w-full" />
                ))
              : popularDishes?.map((dish) => (
                  <MenuItemCard key={dish._id} item={dish} />
                ))}
          </div>
          <div className="text-center mt-12">
            <Button asChild size="lg" variant="outline" className="hover-lift">
              <Link to="/menu">
                View Full Menu <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4">
        <LocationChecker />
      </div>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg mt-2">
              Enjoy homemade food in 3 simple steps.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {howItWorksSteps.map((step, index) => (
              <div key={step.title} className="text-center animate-slide-up"
                style={{ animationDelay: `${index * 150}ms` }}>
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <step.icon className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            {/* ✅ FIX: Brand name updated */}
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose Sajha Chulo?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We connect you with talented home cooks who pour their heart into every dish
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="food-card text-center p-6">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-20 bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: "url('https://media.istockphoto.com/id/922783734/photo/assorted-indian-recipes-food-various.jpg?s=612x612&w=0&k=20&c=p8DepvymWfC5j7c6En2UsQ6sUM794SQMwceeBW3yQ9M=')",
        }}
      >
        <div className="absolute inset-0 bg-black/40 z-0" />
        <div className="relative z-10 container mx-auto px-4 text-center text-primary-foreground">
          <div className="max-w-3xl mx-auto">
            <Utensils className="h-16 w-16 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Taste Home?
            </h2>
            {/* ✅ FIX: Removed "thousands" exaggeration */}
            <p className="text-lg mb-8">
              Join our growing community of food lovers who enjoy authentic
              homemade meals every day. Order now and experience the difference.
            </p>
            <Link to="/shop">
              <Button size="lg" variant="secondary" className="shadow-warm">
                Start Ordering Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;