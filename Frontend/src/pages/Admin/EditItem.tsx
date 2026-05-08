import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Star, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TagInput } from "@/components/ui/tag-input";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";
import { MenuItem } from "@/types";

interface MenuCategory {
  _id: string;
  name: string;
  slug: string;
}

const ALLERGEN_OPTIONS = ["nuts", "dairy", "eggs", "gluten", "soy", "shellfish"];

const EditItem = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [itemData, setItemData] = useState<Partial<MenuItem>>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError } = useQuery<{ data: MenuItem }>({
    queryKey: ["menuItem", itemId],
    queryFn: () => api.get(`/menu/${itemId}`).then((res) => res.data),
    enabled: !!itemId,
  });

  useEffect(() => {
    if (data?.data) setItemData(data.data);
  }, [data]);

  // ── Image Upload Handler ───────────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB!");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await api.post("/upload/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const imageUrl = response.data.data.url;
      setItemData((prev) => ({ ...prev, image: imageUrl }));
      toast.success("Image uploaded successfully! ✅");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Upload failed.");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updateMutation = useMutation({
    mutationFn: (updatedItem: Partial<MenuItem>) =>
      api.put(`/menu/${itemId}`, updatedItem),
    onSuccess: () => {
      toast.success("Item updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["adminAllMenuItems"] });
      queryClient.invalidateQueries({ queryKey: ["menuItem", itemId] });
      navigate("/admin/manage-menu");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update item.");
    },
  });

  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery<{
    data: MenuCategory[];
  }>({
    queryKey: ["menuCategoriesAdmin"],
    queryFn: () => api.get("/categories").then((res) => res.data),
  });
  const menuCategories = categoriesData?.data || [];

  const handleDailySpecialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setItemData((prev) => ({
      ...prev,
      dailySpecial: {
        ...prev.dailySpecial,
        [name]: type === "number" ? parseFloat(value) || 0 : value,
      },
    }));
  };

  const handleIsSpecialToggle = (checked: boolean) => {
    setItemData((prev) => ({
      ...prev,
      dailySpecial: { ...prev.dailySpecial, isSpecial: checked },
    }));
  };

  const handleDaySelectChange = (day: string) => {
    setItemData((prev) => ({
      ...prev,
      dailySpecial: { ...prev.dailySpecial, day },
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setItemData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setItemData((prev) => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (name: "ingredients" | "tags" | "allergens", value: string[]) => {
    setItemData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAllergenChange = (allergen: string, checked: boolean) => {
    const currentAllergens = itemData.allergens || [];
    const newAllergens = checked
      ? [...currentAllergens, allergen]
      : currentAllergens.filter((a) => a !== allergen);
    handleArrayChange("allergens", newAllergens);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(itemData);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-2xl space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isError)
    return <div className="text-center text-destructive p-12">Failed to load item data.</div>;

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit Menu Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name</Label>
              <Input id="name" name="name" value={itemData.name || ""} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" value={itemData.description || ""} onChange={handleChange} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="price">Price (NRs)</Label>
                <Input id="price" name="price" type="number" min="0" value={itemData.price || ""} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preparationTime">Prep Time (mins)</Label>
                <Input id="preparationTime" name="preparationTime" type="number" min="1" value={itemData.preparationTime || ""} onChange={handleChange} />
              </div>
            </div>

            {/* ── IMAGE SECTION ── */}
            <div className="space-y-2">
              <Label>Item Image</Label>

              {/* Current image preview */}
              {itemData.image && (
                <div className="relative w-full h-48 rounded-xl overflow-hidden border">
                  <img src={itemData.image} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setItemData(prev => ({ ...prev, image: "" }))}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Upload button */}
              <div className="flex gap-2">
                <Input
                  id="image"
                  name="image"
                  placeholder="Or paste image URL here"
                  value={itemData.image || ""}
                  onChange={handleChange}
                  className="flex-1"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex-shrink-0"
                >
                  {isUploading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" />Upload</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload from computer (max 5MB) or paste an image URL
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select onValueChange={(v) => handleSelectChange("category", v)} value={itemData.category}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veg">Veg</SelectItem>
                    <SelectItem value="non-veg">Non-Veg</SelectItem>
                    <SelectItem value="dessert">Dessert</SelectItem>
                    <SelectItem value="beverage">Beverage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Menu Section</Label>
                <Select onValueChange={(v) => handleSelectChange("subCategory", v)} value={itemData.subCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingCategories ? "Loading..." : "Select..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {menuCategories.map((cat) => (
                      <SelectItem key={cat._id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ingredients</Label>
              <TagInput
                value={itemData.ingredients || []}
                onChange={(newIngredients) => handleArrayChange("ingredients", newIngredients)}
                placeholder="Add ingredient and press Enter"
              />
            </div>

            <div className="space-y-2">
              <Label>Allergens</Label>
              <div className="grid grid-cols-3 gap-4 rounded-lg border p-4">
                {ALLERGEN_OPTIONS.map((allergen) => (
                  <div key={allergen} className="flex items-center space-x-2">
                    <Checkbox
                      id={`allergen-${allergen}`}
                      checked={itemData.allergens?.includes(allergen)}
                      onCheckedChange={(checked) => handleAllergenChange(allergen, !!checked)}
                    />
                    <label htmlFor={`allergen-${allergen}`} className="text-sm font-medium capitalize">
                      {allergen}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" /> Daily Special Settings
            </CardTitle>
            <CardDescription>
              Feature this item on a specific day of the week at a special price.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="isSpecial"
                checked={itemData.dailySpecial?.isSpecial || false}
                onCheckedChange={handleIsSpecialToggle}
              />
              <Label htmlFor="isSpecial">Mark as Daily Special</Label>
            </div>

            {itemData.dailySpecial?.isSpecial && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t animate-fade-in">
                <div className="space-y-2">
                  <Label>Day of the Week</Label>
                  <Select value={itemData.dailySpecial?.day || "monday"} onValueChange={handleDaySelectChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["sunday","monday","tuesday","wednesday","thursday","friday","saturday"].map((day) => (
                        <SelectItem key={day} value={day} className="capitalize">{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialPrice">Special Price (NRs)</Label>
                  <Input
                    id="specialPrice"
                    name="specialPrice"
                    type="number"
                    min="0"
                    value={itemData.dailySpecial?.specialPrice || ""}
                    onChange={handleDailySpecialChange}
                    placeholder={`Regular: ${itemData.price}`}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" disabled={updateMutation.isPending} className="w-full text-lg h-12 gradient-primary">
          {updateMutation.isPending ? <Loader2 className="animate-spin" /> : "Save Changes"}
        </Button>
      </form>
    </div>
  );
};

export default EditItem;