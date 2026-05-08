import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import api from "@/lib/api";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";

interface MenuCategory {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  order: number;
}

const ManageCategories = () => {
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    icon: "",
    description: "",
    order: 0,
  });
  const [categoryToDelete, setCategoryToDelete] = useState<MenuCategory | null>(
    null
  );
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{
    success: boolean;
    data: MenuCategory[];
  }>({
    queryKey: ["menuCategoriesAdmin"],
    queryFn: () => api.get("/categories").then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (newData: typeof formData) => api.post("/categories", newData),
    onSuccess: () => {
      toast.success("Category created!");
      queryClient.invalidateQueries({ queryKey: ["menuCategoriesAdmin"] });
      setFormData({ name: "", slug: "", icon: "", description: "", order: 0 }); 
    },
    onError: (error: any) =>
      toast.error(
        error.response?.data?.message || "Failed to create category."
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) => api.delete(`/categories/${categoryId}`),
    onSuccess: () => {
      toast.success("Category deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["menuCategoriesAdmin"] });
      setCategoryToDelete(null); 
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete category."
      );
      setCategoryToDelete(null);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    let processedValue: string | number = value;

    if (type === "number") {
      processedValue = value === "" ? 0 : Math.max(0, parseInt(value));
    }

    // Auto-generate slug from name, if name is being changed and slug is empty
    if (name === "name" && formData.slug === "") {
      const newSlug = value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      setFormData((prev) => ({
        ...prev,
        name: value,
        slug: newSlug,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: processedValue,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const categories = data?.data || [];

  return (
    <>
      <div className="container py-8 max-w-4xl space-y-8">
        {/* Section to add a new category */}
        <Card>
          <CardHeader>
            <CardTitle>Add Menu Category</CardTitle>
            <CardDescription>
              Create a new section for your menu page (e.g., Snacks, Lunch,
              Desserts).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name (e.g., Breakfast)</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug (e.g., breakfast)</Label>
                  <Input
                    id="slug"
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    required
                    placeholder="auto-generates-from-name"
                  />
                </div>
                <div>
                  <Label htmlFor="icon">Icon (Emoji, e.g., 🌅)</Label>
                  <Input
                    id="icon"
                    name="icon"
                    value={formData.icon}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="order">Display Order</Label>
                  <Input
                    id="order"
                    name="order"
                    type="number"
                    min="0"
                    value={formData.order}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="A short description for the menu page..."
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  <PlusCircle className="mr-2 h-4 w-4" />
                )}
                Add Category
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Section to display and manage existing categories */}
        <Card>
          <CardHeader>
            <CardTitle>Existing Categories</CardTitle>
            <CardDescription>
              View and manage the sections that appear on your menu page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      Loading categories...
                    </TableCell>
                  </TableRow>
                ) : (
                  categories
                    .sort((a, b) => a.order - b.order)
                    .map(
                      (
                        cat // Sort by order number
                      ) => (
                        <TableRow key={cat._id}>
                          <TableCell>{cat.order}</TableCell>
                          <TableCell className="text-xl">{cat.icon}</TableCell>
                          <TableCell className="font-medium">
                            {cat.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {cat.description}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setCategoryToDelete(cat)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={() => setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category "
              {categoryToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(categoryToDelete!._id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Yes, delete it"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
export default ManageCategories;
