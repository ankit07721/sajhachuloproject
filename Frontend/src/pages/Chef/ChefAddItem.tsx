// Frontend/src/pages/Chef/ChefAddItem.tsx
import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import api from "@/lib/api";

const ChefAddItem = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    preparationTime: "",
    category: "veg",
    subCategory: "",
    image: "",
    spiceLevel: "mild",
    ingredients: [] as string[],
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["menuCategoriesChef"],
    queryFn: async () => {
      const res = await api.get("/categories");
      return res.data.data;
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB!"); return; }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await api.post("/upload/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm(prev => ({ ...prev, image: response.data.data.url }));
      toast.success("Image uploaded! ✅");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.post("/menu", data),
    onSuccess: () => {
      toast.success("Dish added successfully! 🎉");
      navigate("/chef/manage-menu");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.errors?.[0] || error.response?.data?.message || "Failed to add dish.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.subCategory || !form.image) {
      toast.error("Please fill all required fields including image and menu section!");
      return;
    }
    mutation.mutate({ ...form, price: Number(form.price) as any, preparationTime: Number(form.preparationTime) as any });
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-6">
        <Link to="/chef/manage-menu">
          <Button variant="outline" size="sm">← Back to My Menu</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Add New Dish</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label>Dish Name *</Label>
              <Input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Butter Chicken" required />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea name="description" value={form.description} onChange={handleChange} placeholder="Describe your dish..." rows={3} />
            </div>

            {/* Price + Prep Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (NRs) *</Label>
                <Input name="price" type="number" min="0" value={form.price} onChange={handleChange} placeholder="150" required />
              </div>
              <div className="space-y-2">
                <Label>Prep Time (mins) *</Label>
                <Input name="preparationTime" type="number" min="1" value={form.preparationTime} onChange={handleChange} placeholder="20" required />
              </div>
            </div>

            {/* Image */}
            <div className="space-y-2">
              <Label>Dish Photo *</Label>
              {form.image && (
                <div className="relative w-full h-48 rounded-xl overflow-hidden border">
                  <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setForm(p => ({ ...p, image: "" }))}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  name="image"
                  placeholder="Or paste image URL"
                  value={form.image}
                  onChange={handleChange}
                  className="flex-1"
                />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-1" />Upload</>}
                </Button>
              </div>
            </div>

            {/* Category + Menu Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veg">🌿 Veg</SelectItem>
                    <SelectItem value="non-veg">🍗 Non-Veg</SelectItem>
                    <SelectItem value="dessert">🍮 Dessert</SelectItem>
                    <SelectItem value="beverage">☕ Beverage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Menu Section *</Label>
                <Select value={form.subCategory} onValueChange={v => setForm(p => ({ ...p, subCategory: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select section..." /></SelectTrigger>
                  <SelectContent>
                    {categoriesData?.map((cat: any) => (
                      <SelectItem key={cat._id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Spice Level */}
            <div className="space-y-2">
              <Label>Spice Level</Label>
              <Select value={form.spiceLevel} onValueChange={v => setForm(p => ({ ...p, spiceLevel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">🟢 Mild</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="hot">🔴 Hot</SelectItem>
                  <SelectItem value="extra-hot">🔥 Extra Hot</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ingredients */}
            <div className="space-y-2">
              <Label>Ingredients</Label>
              <TagInput
                value={form.ingredients}
                onChange={tags => setForm(p => ({ ...p, ingredients: tags }))}
                placeholder="Add ingredient and press Enter"
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full gradient-primary h-12 text-lg" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="animate-spin" /> : "Add Dish 🍽️"}
        </Button>
      </form>
    </div>
  );
};

export default ChefAddItem;    