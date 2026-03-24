import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, IndianRupee, Eye, Target, TrendingUp, Pause, Play, Settings, Trash2 } from "lucide-react";
import { CampaignForm } from "@/components/CampaignForm";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  budget: number | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

const Campaigns = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);

  const loadCampaigns = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("customer_id", profile.user_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading campaigns:", error);
      toast({
        title: "Error",
        description: "Failed to load campaigns",
        variant: "destructive",
      });
    } else {
      setCampaigns(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCampaigns();

    // Subscribe to real-time updates for campaigns
    const channel = supabase
      .channel('campaigns-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns'
        },
        () => {
          loadCampaigns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const handleStatusChange = async (campaign: Campaign, newStatus: string) => {
    const { error } = await supabase
      .from("campaigns")
      .update({ status: newStatus })
      .eq("id", campaign.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update campaign status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Campaign ${newStatus === "paused" ? "paused" : "resumed"} successfully`,
      });
      loadCampaigns();
    }
  };

  const handleDeleteCampaign = async () => {
    if (!deletingCampaign) return;

    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", deletingCampaign.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
      loadCampaigns();
    }
    setDeletingCampaign(null);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success text-success-foreground">Active</Badge>;
      case "paused":
        return <Badge className="bg-warning text-warning-foreground">Paused</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "scheduled":
        return <Badge className="bg-info text-info-foreground">Scheduled</Badge>;
      default:
        return <Badge variant="secondary">{status || "Draft"}</Badge>;
    }
  };

  const getStatusActions = (campaign: Campaign) => {
    const status = campaign.status;
    switch (status) {
      case "active":
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleStatusChange(campaign, "paused")}>
              <Pause className="h-3 w-3 mr-1" />
              Pause
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditingCampaign(campaign)}>
              <Settings className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDeletingCampaign(campaign)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      case "paused":
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleStatusChange(campaign, "active")}>
              <Play className="h-3 w-3 mr-1" />
              Resume
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditingCampaign(campaign)}>
              <Settings className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDeletingCampaign(campaign)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      default:
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleStatusChange(campaign, "active")}>
              <Play className="h-3 w-3 mr-1" />
              Activate
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDeletingCampaign(campaign)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
    }
  };

  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const pausedCampaigns = campaigns.filter((c) => c.status === "paused");
  const completedCampaigns = campaigns.filter((c) => c.status === "completed");
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Campaigns</h1>
          <p className="text-muted-foreground">Manage your advertising campaigns and track performance</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active">Active ({activeCampaigns.length})</TabsTrigger>
          <TabsTrigger value="paused">Paused ({pausedCampaigns.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedCampaigns.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns.length}</div>
                <p className="text-xs text-muted-foreground">{activeCampaigns.length} active</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalBudget.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Across all campaigns</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCampaigns.length}</div>
                <p className="text-xs text-muted-foreground">Currently running</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paused</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pausedCampaigns.length}</div>
                <p className="text-xs text-muted-foreground">On hold</p>
              </CardContent>
            </Card>
          </div>

          {/* Campaign List */}
          <div className="space-y-4">
            {campaigns.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first campaign to start advertising
                  </p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </CardContent>
              </Card>
            ) : (
              campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{campaign.name}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created {format(new Date(campaign.created_at), "MMM dd, yyyy")}
                          </span>
                          {campaign.budget && <span>Budget: ₹{campaign.budget.toLocaleString()}</span>}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(campaign.status)}
                        {getStatusActions(campaign)}
                      </div>
                    </div>
                  </CardHeader>
                  {campaign.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{campaign.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="active">
          <div className="space-y-4">
            {activeCampaigns.length === 0 ? (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Campaigns</h3>
                <p className="text-muted-foreground">Activate a campaign to see it here</p>
              </div>
            ) : (
              activeCampaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{campaign.name}</CardTitle>
                        <CardDescription>{campaign.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(campaign.status)}
                        {getStatusActions(campaign)}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="paused">
          <div className="space-y-4">
            {pausedCampaigns.length === 0 ? (
              <div className="text-center py-8">
                <Pause className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Paused Campaigns</h3>
                <p className="text-muted-foreground">Paused campaigns will appear here</p>
              </div>
            ) : (
              pausedCampaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{campaign.name}</CardTitle>
                        <CardDescription>{campaign.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(campaign.status)}
                        {getStatusActions(campaign)}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed">
          <div className="space-y-4">
            {completedCampaigns.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Completed Campaigns</h3>
                <p className="text-muted-foreground">Completed campaigns will appear here</p>
              </div>
            ) : (
              completedCampaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{campaign.name}</CardTitle>
                        <CardDescription>{campaign.description}</CardDescription>
                      </div>
                      {getStatusBadge(campaign.status)}
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <CampaignForm open={showCreateForm} onOpenChange={setShowCreateForm} onSuccess={loadCampaigns} />

      <AlertDialog open={!!deletingCampaign} onOpenChange={() => setDeletingCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCampaign?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCampaign}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Campaigns;
