import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Eye, Loader2, ChefHat } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import api from "@/lib/api";
import { format } from "date-fns";

const fetchApplications = async (status: string) => {
  const { data } = await api.get(`/chef/admin/applications?status=${status}`);
  return data.data;
};

const ChefCard = ({ chef, onApprove, onReject, isApproving, isRejecting }: any) => {
  const [viewOpen, setViewOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  return (
    <>
      <Card className="overflow-hidden">
        <div className="h-1 gradient-primary" />
        <CardContent className="p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-black text-lg">{chef.firstName} {chef.lastName}</h3>
              <p className="text-sm text-muted-foreground">{chef.email} · {chef.phone}</p>
              <p className="text-sm text-muted-foreground">{chef.address?.city}, {chef.address?.state}</p>
            </div>
            <Badge className={
              chef.chefProfile?.applicationStatus === "approved" ? "bg-green-100 text-green-700 border-green-200" :
              chef.chefProfile?.applicationStatus === "rejected" ? "bg-red-100 text-red-700 border-red-200" :
              "bg-yellow-100 text-yellow-700 border-yellow-200"
            }>
              {chef.chefProfile?.applicationStatus}
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Specialty</p>
              <p className="font-semibold">{chef.chefProfile?.specialty || "—"}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Experience</p>
              <p className="font-semibold">{chef.chefProfile?.experience || "—"}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{chef.chefProfile?.bio}</p>

          {/* Kitchen Images */}
          {chef.chefProfile?.kitchenImages?.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {chef.chefProfile.kitchenImages.slice(0, 3).map((img: string, i: number) => (
                <img key={i} src={img} alt="Kitchen" className="w-20 h-16 rounded-lg object-cover flex-shrink-0 border" />
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-3">
            Applied: {format(new Date(chef.createdAt), "PPP")}
          </p>

          {/* Actions */}
          {chef.chefProfile?.applicationStatus === "pending" && (
            <div className="flex gap-2 mt-4">
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" size="sm"
                onClick={() => onApprove(chef._id)} disabled={isApproving}>
                <CheckCircle className="h-4 w-4 mr-1" />
                {isApproving ? "Approving..." : "Approve"}
              </Button>
              <Button className="flex-1" variant="outline" size="sm"
                onClick={() => setRejectOpen(true)}>
                <XCircle className="h-4 w-4 mr-1 text-red-500" />
                Reject
              </Button>
              <Button variant="outline" size="sm" onClick={() => setViewOpen(true)}>
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Full Application */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{chef.firstName} {chef.lastName}'s Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-bold mb-1">About:</p>
              <p className="text-muted-foreground">{chef.chefProfile?.bio}</p>
            </div>
            <div>
              <p className="font-bold mb-1">ID Proof:</p>
              {chef.chefProfile?.idProofImage
                ? <img src={chef.chefProfile.idProofImage} alt="ID" className="w-full rounded-lg border" />
                : <p className="text-muted-foreground">Not provided</p>}
            </div>
            <div>
              <p className="font-bold mb-2">Kitchen Photos:</p>
              <div className="grid grid-cols-2 gap-2">
                {chef.chefProfile?.kitchenImages?.map((img: string, i: number) => (
                  <img key={i} src={img} alt="Kitchen" className="w-full h-32 object-cover rounded-lg border" />
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Provide a reason for rejection (optional):</p>
          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="e.g. Kitchen photos are not clear enough..." rows={3} />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { onReject(chef._id, rejectReason); setRejectOpen(false); }}
              disabled={isRejecting}>
              {isRejecting ? "Rejecting..." : "Confirm Reject"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const ManageChefApplications = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const queryClient = useQueryClient();

  const { data: chefs, isLoading } = useQuery({
    queryKey: ["chefApplications", activeTab],
    queryFn: () => fetchApplications(activeTab),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.put(`/chef/admin/${id}/approve`),
    onSuccess: () => {
      toast.success("Chef approved! They can now login.");
      queryClient.invalidateQueries({ queryKey: ["chefApplications"] });
    },
    onError: () => toast.error("Failed to approve chef."),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.put(`/chef/admin/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success("Application rejected.");
      queryClient.invalidateQueries({ queryKey: ["chefApplications"] });
    },
    onError: () => toast.error("Failed to reject application."),
  });

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ChefHat className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black">Chef Applications</h1>
          <p className="text-muted-foreground text-sm">Review and approve chef applications</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="pending">⏳ Pending</TabsTrigger>
          <TabsTrigger value="approved">✅ Approved</TabsTrigger>
          <TabsTrigger value="rejected">❌ Rejected</TabsTrigger>
        </TabsList>

        {["pending", "approved", "rejected"].map(tab => (
          <TabsContent key={tab} value={tab}>
            {isLoading ? (
              <div className="flex justify-center h-40 items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !chefs || chefs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No {tab} applications.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chefs.map((chef: any) => (
                  <ChefCard key={chef._id} chef={chef}
                    onApprove={(id: string) => approveMutation.mutate(id)}
                    onReject={(id: string, reason: string) => rejectMutation.mutate({ id, reason })}
                    isApproving={approveMutation.isPending}
                    isRejecting={rejectMutation.isPending}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ManageChefApplications; 