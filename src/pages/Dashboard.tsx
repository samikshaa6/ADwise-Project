import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, IndianRupee, Calendar, TrendingUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BillboardMap } from '@/components/BillboardMap';
import { AIRecommendations } from '@/components/AIRecommendations';
interface DashboardStats {
  totalBillboards?: number;
  totalBookings?: number;
  totalRevenue?: number;
  totalSpent?: number;
}

const Dashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [profile]);

  const loadDashboardData = async () => {
    if (!profile) return;

    if (profile.role === 'owner') {
      // Load owner dashboard data
      const { data: billboards } = await supabase
        .from('billboards')
        .select('*')
        .eq('owner_id', profile.user_id);

      // First get billboards owned by this user
      const { data: myBillboards } = await supabase
        .from('billboards')
        .select('id')
        .eq('owner_id', profile.user_id);

      const billboardIds = myBillboards?.map(b => b.id) || [];

      const { data: bookings } = billboardIds.length > 0 
        ? await supabase
            .from('bookings')
            .select('*, billboard:billboards(*)')
            .in('billboard_id', billboardIds)
        : { data: [] };

      const totalRevenue = (bookings || []).reduce((sum, booking) => 
        sum + Number(booking.total_cost), 0
      );

      setStats({
        totalBillboards: billboards?.length || 0,
        totalBookings: (bookings || []).length,
        totalRevenue
      });

      setRecentActivity((bookings || []).slice(0, 5));
    } else {
      // Load customer dashboard data
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*, billboard:billboards(*)')
        .eq('customer_id', profile.user_id);

      const totalSpent = (bookings || []).reduce((sum, booking) => 
        sum + Number(booking.total_cost), 0
      );

      setStats({
        totalBookings: (bookings || []).length,
        totalSpent
      });

      setRecentActivity((bookings || []).slice(0, 5));
    }
  };

  const StatCard = ({ title, value, description, icon: Icon, onClick }: any) => (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  if (profile?.role === 'owner') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Billboard Manager Dashboard</h1>
            <p className="text-muted-foreground">Manage your billboard inventory and bookings</p>
          </div>
          <Button onClick={() => navigate('/owner/billboards')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Billboard
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Billboards"
            value={stats.totalBillboards}
            description="Active billboard listings"
            icon={MapPin}
            onClick={() => navigate('/owner/billboards')}
          />
          <StatCard
            title="Total Bookings"
            value={stats.totalBookings}
            description="All-time bookings"
            icon={Calendar}
            onClick={() => navigate('/owner/bookings')}
          />
          <StatCard
            title="Total Revenue"
            value={`₹${stats.totalRevenue?.toLocaleString() || 0}`}
            description="Lifetime earnings"
            icon={IndianRupee}
            onClick={() => navigate('/analytics')}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>Latest booking requests for your billboards</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-muted-foreground">No recent bookings</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{booking.billboard?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{booking.total_cost}</p>
                      <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advertiser Dashboard</h1>
          <p className="text-muted-foreground">Manage your billboard bookings</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          description="Billboard reservations"
          icon={MapPin}
          onClick={() => navigate('/my-bookings')}
        />
        <StatCard
          title="Total Spent"
          value={`₹${stats.totalSpent?.toLocaleString() || 0}`}
          description="Advertising investment"
          icon={IndianRupee}
          onClick={() => navigate('/analytics')}
        />
      </div>

      <AIRecommendations />

      <Card>
        <CardHeader>
          <CardTitle>Explore Billboards</CardTitle>
          <CardDescription>Browse available billboard locations on the map</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <BillboardMap />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>Your latest billboard bookings</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">No bookings yet</p>
              <Button onClick={() => navigate('/listings')}>
                Browse Billboards
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{booking.billboard?.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{booking.total_cost}</p>
                    <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                      {booking.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;