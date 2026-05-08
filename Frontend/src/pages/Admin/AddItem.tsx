import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TagInput } from "@/components/ui/tag-input";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { MenuItem } from "@/types";

interface MenuCategory {
  _id: string;
  name: string;
  slug: string;
  icon: string;
}

const ALLERGEN_OPTIONS = [
  "nuts",
  "dairy",
  "eggs",
  "gluten",
  "soy",
  "shellfish",
];

const AddItem = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [itemData, setItemData] = useState<Partial<MenuItem>>({
    name: "",
    description: "",
    price: 0,
    category: "veg",
    subCategory: "",
    image: "",
    preparationTime: 15,
    isAvailable: true,
    ingredients: [],
    allergens: [],
    tags: [],
  });

  const mutation = useMutation({
    mutationFn: (newItem: Partial<MenuItem>) => api.post("/menu", newItem),
    onSuccess: () => {
      toast.success("Menu item added successfully!");
      queryClient.invalidateQueries({ queryKey: ["adminAllMenuItems"] });
      navigate("/admin/manage-menu");
    },
    onError: (error: any) => {
      const errorMessages = error.response?.data?.errors;
      if (Array.isArray(errorMessages)) toast.error(errorMessages[0]);
      else toast.error(error.response?.data?.message || "Failed to add item.");
    },
  });

  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery<{
    data: MenuCategory[];
  }>({
    queryKey: ["menuCategoriesAdmin"],
    queryFn: () => api.get("/categories").then((res) => res.data),
  });
  const menuCategories = categoriesData?.data || [];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setItemData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setItemData((prev) => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (
    name: "ingredients" | "tags" | "allergens",
    value: string[]
  ) => {
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
    mutation.mutate(itemData);
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Add New Menu Item</CardTitle>
          <CardDescription>
            Fill in the details for the new dish.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name</Label>
              <Input
                id="name"
                name="name"
                value={itemData.name || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={itemData.description || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (NRs)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  value={itemData.price || ""}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preparationTime">Prep Time (mins)</Label>
                <Input
                  id="preparationTime"
                  name="preparationTime"
                  type="number"
                  min="1"
                  value={itemData.preparationTime || ""}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Image URL</Label>
              <Input
                id="image"
                name="image"
                value={itemData.image || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  onValueChange={(v) => handleSelectChange("category", v)}
                  value={itemData.category}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Select
                  onValueChange={(v) => handleSelectChange("subCategory", v)}
                  value={itemData.subCategory}
                  required
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isLoadingCategories ? "Loading..." : "Select..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {menuCategories.map((cat) => (
                      <SelectItem key={cat._id} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ingredients">Ingredients</Label>
              <TagInput
                value={itemData.ingredients || []}
                onChange={(newIngredients) =>
                  handleArrayChange("ingredients", newIngredients)
                }
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
                      onCheckedChange={(checked) =>
                        handleAllergenChange(allergen, !!checked)
                      }
                    />
                    <label
                      htmlFor={`allergen-${allergen}`}
                      className="text-sm font-medium capitalize"
                    >
                      {allergen}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="w-full text-lg h-12"
            >
              {mutation.isPending ? (
                <Loader2 className="animate-spin h-6 w-6" />
              ) : (
                "Add Item to Menu"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddItem;
