import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MenuItemCard } from "@/components/MenuItemCard";
import api from "@/lib/api";
import { MenuItem, ApiResponse } from "@/types";

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    window.scrollTo(0, 0);
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const Shop = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all-types");
  const [subCategory, setSubCategory] = useState("all-meals");
  const [sortBy, setSortBy] = useState("createdAt:desc");
  const [priceRange, setPriceRange] = useState([0, 2000]);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "menuItems",
      { search: debouncedSearchQuery, category, subCategory, sortBy },
    ],
    queryFn: async () => {
      const { data } = await api.get("/menu", {
        params: {
          search: debouncedSearchQuery,
          category: category === "all-types" ? "" : category,
          subCategory: subCategory === "all-meals" ? "" : subCategory,
          limit: 20,
        },
      });
      return data;
    },
  });

  const allFetchedProducts = data?.data?.items || [];
  const totalItemsAvailable = data?.data?.totalItems || 0;

  const filteredProducts = useMemo(() => {
    let products = [...allFetchedProducts];
    products = products.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );
    products.sort((a, b) => {
      switch (sortBy) {
        case "price:asc":
          return a.price - b.price;
        case "price:desc":
          return b.price - a.price;
        case "rating:desc":
          return b.rating.average - a.rating.average;
        default:
          return 0;
      }
    });

    return products;
  }, [allFetchedProducts, priceRange, sortBy]);

  const mealTypes = [
    { value: "all-meals", label: "All Meal Types" },
    { value: "veg-snacks", label: "Khaja (Snacks)" },
    { value: "regular-lunch", label: "Khana (Lunch/Dinner)" },
    { value: "dessert", label: "Mithai (Desserts)" },
    { value: "special", label: "Bishesh (Specials)" },
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className="container mx-auto px-8 animate-fade-in">
      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Shop Homemade Delights
        </h1>
        <p className="text-muted-foreground text-lg">
          Fresh, authentic meals from passionate home cooks
        </p>
      </header>

      {/* Filters */}
      <div className="bg-card rounded-lg p-6 mb-8 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="text-sm font-medium">Search</label>
            <Input
              placeholder="Search dishes by name or ingredient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* <div>
            <label className="text-sm font-medium">Meal Type</label>
            <Select value={subCategory} onValueChange={setSubCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Meal Types" />
              </SelectTrigger>
              <SelectContent>
                {mealTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div> */}

          <div>
            <label className="text-sm font-medium">Food Type</label>
            <ToggleGroup
              type="single"
              value={category}
              onValueChange={(value) => {
                setCategory(value || "all-types");
              }}
              className="w-full justify-start"
            >
              <ToggleGroupItem value="all-types" aria-label="Toggle all">
                All
              </ToggleGroupItem>
              <ToggleGroupItem value="veg" aria-label="Toggle veg">
                Veg
              </ToggleGroupItem>
              <ToggleGroupItem value="non-veg" aria-label="Toggle non-veg">
                Non-Veg
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div>
            <label className="text-sm font-medium">Sort By</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt:desc">Newest</SelectItem>
                <SelectItem value="rating:desc">Highest Rated</SelectItem>
                <SelectItem value="price:asc">Price: Low to High</SelectItem>
                <SelectItem value="price:desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-full">
            <label className="text-sm font-medium">
              Price Range: NRs {priceRange[0]} - NRs {priceRange[1]}
            </label>
            <Slider
              value={priceRange}
              onValueChange={setPriceRange}
              max={2000}
              min={0}
              step={50}
            />
          </div>
        </div>

        <p className="text-muted-foreground mb-6">
          Showing {filteredProducts.length}{" "}
          {filteredProducts.length === 1 ? "dish" : "dishes"}
          {totalItemsAvailable > filteredProducts.length
            ? ` out of ${totalItemsAvailable}`
            : ""}
        </p>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-96 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <Alert variant="destructive" className="col-span-full">
            <AlertTitle>Error Loading Dishes</AlertTitle>
            <AlertDescription>{(error as Error).message}</AlertDescription>
          </Alert>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center col-span-full py-20">
            <h2 className="text-2xl font-semibold">No Dishes Found</h2>
            <p className="text-muted-foreground mt-2">
              Try adjusting your filters or search term.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((item, index) => (
              <MenuItemCard key={item._id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Shop;
