import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Eye, DollarSign, BarChart3, MapPin, Edit, Trash2 } from 'lucide-react';
import { BillboardForm } from '@/components/BillboardForm';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Billboard {
  id: string;
  title: string;
  location: string;
  description?: string;
  width: number;
  height: number;
  price_per_month: number;
  traffic_score: string;
  daily_impressions: number;
  is_available: boolean;
  created_at: string;
}

export default function OwnerBillboards() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadBillboards = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('billboards')
      .select('*')
      .eq('owner_id', profile.user_id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load billboards',
        variant: 'destructive',
      });
    } else {
      setBillboards(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBillboards();
  }, [profile]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('billboards')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete billboard',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Billboard deleted successfully',
      });
      loadBillboards();
    }
  };

  const getTrafficBadge = (score: string) => {
    const safeScore = score || 'medium';
    const variants = {
      low: 'destructive' as const,
      medium: 'secondary' as const,
      high: 'default' as const,
    };
    return <Badge variant={variants[safeScore as keyof typeof variants]}>{safeScore.toUpperCase()}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Billboards</h2>
          <p className="text-muted-foreground">
            Manage your billboard inventory and availability
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Billboard
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {billboards.map((billboard) => (
          <Card key={billboard.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{billboard.title}</CardTitle>
                  <CardDescription className="flex items-center">
                    <MapPin className="mr-1 h-3 w-3" />
                    {billboard.location}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete(billboard.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={billboard.is_available ? 'default' : 'secondary'}>
                  {billboard.is_available ? 'Available' : 'Unavailable'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{billboard.width} × {billboard.height} m</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>${billboard.price_per_month}/month</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{billboard.daily_impressions?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center">
                    <BarChart3 className="mr-2 h-4 w-4 text-muted-foreground" />
                    {getTrafficBadge(billboard.traffic_score)}
                  </div>
                </div>
              </div>

              {billboard.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {billboard.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {billboards.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No billboards yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start building your billboard inventory by adding your first billboard.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Billboard
            </Button>
          </CardContent>
        </Card>
      )}

      <BillboardForm 
        open={showForm} 
        onOpenChange={setShowForm} 
        onSuccess={loadBillboards}
      />
    </div>
  );
}