// Frontend/src/pages/Chef/ChefManageMenu.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PlusCircle, Pencil, Trash2, Loader2, Utensils, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

const ChefManageMenu = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["chefMyItems"],
    queryFn: async () => {
      const res = await api.get("/chef/dashboard");
      return res.data.data.myItems;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      api.patch(`/menu/${id}/availability`, { isAvailable }),
    onSuccess: () => {
      toast.success("Item updated!");
      queryClient.invalidateQueries({ queryKey: ["chefMyItems"] });
    },
    onError: () => toast.error("Failed to update item."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/${id}`),
    onSuccess: () => {
      toast.success("Item deleted!");
      queryClient.invalidateQueries({ queryKey: ["chefMyItems"] });
    },
    onError: () => toast.error("Failed to delete item."),
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black">My Menu Items</h1>
          <p className="text-muted-foreground text-sm">Manage your dishes</p>
        </div>
        <Link to="/chef/add-item">
          <Button className="gradient-primary">
            <PlusCircle className="h-4 w-4 mr-2" /> Add New Dish
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center h-40 items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Utensils className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-semibold text-lg mb-2">No dishes yet!</p>
            <p className="text-muted-foreground text-sm mb-6">Start adding your signature dishes.</p>
            <Link to="/chef/add-item">
              <Button className="gradient-primary">
                <PlusCircle className="h-4 w-4 mr-2" /> Add Your First Dish
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((item: any) => (
            <Card key={item._id} className="overflow-hidden">
              <div className="flex">
                <div className="w-28 h-28 flex-shrink-0">
                  <img
                    src={item.image || "https://via.placeholder.com/112"}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="flex-1 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm">{item.name}</p>
                      <p className="text-primary font-black">NRs {item.price}</p>
                      <p className="text-xs text-muted-foreground">{item.subCategory}</p>
                    </div>
                    <Badge className={`text-xs flex-shrink-0 ${item.isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {item.isAvailable ? "Active" : "Hidden"}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {/* Toggle availability */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => toggleMutation.mutate({ id: item._id, isAvailable: !item.isAvailable })}
                      disabled={toggleMutation.isPending}
                    >
                      {item.isAvailable
                        ? <><ToggleRight className="h-3 w-3 mr-1 text-green-600" />Hide</>
                        : <><ToggleLeft className="h-3 w-3 mr-1" />Show</>
                      }
                    </Button>

                    {/* Edit */}
                    <Link to={`/chef/edit-item/${item._id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full text-xs">
                        <Pencil className="h-3 w-3 mr-1" />Edit
                      </Button>
                    </Link>

                    {/* Delete */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 hover:text-red-600 text-xs"
                      onClick={() => handleDelete(item._id, item.name)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Back to dashboard */}
      <div className="mt-6">
        <Link to="/chef/dashboard">
          <Button variant="outline">← Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
};

export default ChefManageMenu;    