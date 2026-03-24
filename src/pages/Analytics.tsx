import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, Eye, IndianRupee, Target, Calendar, MapPin, FileCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";

interface Booking {
  id: string;
  campaign_name: string;
  total_cost: number;
  status: string;
  created_at: string;
  start_date: string;
  end_date: string;
  noc_status: string;
  payment_status: string | null;
  billboard: {
    title: string;
    location: string;
    daily_impressions: number | null;
  };
}

const Analytics = () => {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");

  useEffect(() => {
    const loadData = async () => {
      if (!profile) return;

      let bookingsData: any[] | null = [];
      if (profile.role === 'owner') {
        const { data: myBillboards } = await supabase
          .from('billboards')
          .select('id')
          .eq('owner_id', profile.user_id);
        const billboardIds = myBillboards?.map(b => b.id) || [];
        
        if (billboardIds.length > 0) {
          const { data } = await supabase
            .from("bookings")
            .select("*, billboard:billboards(title, location, daily_impressions)")
            .in("billboard_id", billboardIds)
            .order("created_at", { ascending: false });
          bookingsData = data;
        }
      } else {
        const { data } = await supabase
          .from("bookings")
          .select("*, billboard:billboards(title, location, daily_impressions)")
          .eq("customer_id", profile.user_id)
          .order("created_at", { ascending: false });
        bookingsData = data;
      }
      setBookings(bookingsData || []);
      setLoading(false);
    };

    loadData();
  }, [profile]);

  // Calculate metrics
  const totalSpend = bookings
    .filter((b) => b.payment_status === "completed")
    .reduce((sum, b) => sum + b.total_cost, 0);

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "completed").length;
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;

  const totalImpressions = bookings.reduce((sum, b) => {
    const days = Math.ceil(
      (new Date(b.end_date).getTime() - new Date(b.start_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return sum + (b.billboard?.daily_impressions || 0) * days;
  }, 0);

  // Monthly spend data
  const getMonthlyData = () => {
    const months: { [key: string]: number } = {};
    bookings
      .filter((b) => b.payment_status === "completed")
      .forEach((b) => {
        const month = format(new Date(b.created_at), "MMM");
        months[month] = (months[month] || 0) + b.total_cost;
      });

    return Object.entries(months).map(([name, spend]) => ({ name, spend }));
  };

  // Location distribution
  const getLocationData = () => {
    const locations: { [key: string]: number } = {};
    bookings.forEach((b) => {
      const location = b.billboard?.location || "Unknown";
      locations[location] = (locations[location] || 0) + 1;
    });

    const colors = ["#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];
    return Object.entries(locations).map(([name, value], index) => ({
      name: name.length > 20 ? name.substring(0, 20) + "..." : name,
      value,
      color: colors[index % colors.length],
    }));
  };

  // Daily bookings trend
  const getDailyTrend = () => {
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    const dateInterval = eachDayOfInterval({
      start: subDays(new Date(), days),
      end: new Date(),
    });

    return dateInterval.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const dayBookings = bookings.filter((b) => format(new Date(b.created_at), "yyyy-MM-dd") === dateStr);
      return {
        date: format(date, "MMM dd"),
        bookings: dayBookings.length,
        spend: dayBookings.reduce((sum, b) => sum + (b.payment_status === "completed" ? b.total_cost : 0), 0),
      };
    });
  };



  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Track your advertising performance and spending</p>
        </div>
        <div className="flex gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{profile?.role === 'owner' ? 'Total Revenue' : 'Total Spend'}</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalSpend.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From {confirmedBookings} confirmed bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalImpressions > 1000000
                ? (totalImpressions / 1000000).toFixed(1) + "M"
                : totalImpressions > 1000
                ? (totalImpressions / 1000).toFixed(1) + "K"
                : totalImpressions}
            </div>
            <p className="text-xs text-muted-foreground">Based on billboard traffic</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground">{pendingBookings} pending approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingBookings}</div>
            <p className="text-xs text-muted-foreground">Action required</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Spend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{profile?.role === 'owner' ? 'Monthly Revenue' : 'Monthly Spending'}</CardTitle>
                <CardDescription>Aggregate financial activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                {getMonthlyData().length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getMonthlyData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${value}`, "Spend"]} />
                      <Bar dataKey="spend" fill="hsl(var(--primary))" name="Spend" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No spending data yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Bookings by Location</CardTitle>
                <CardDescription>Distribution of your billboard bookings</CardDescription>
              </CardHeader>
              <CardContent>
                {getLocationData().length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getLocationData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getLocationData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No location data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daily Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Trend</CardTitle>
              <CardDescription>Daily bookings and spending over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getDailyTrend()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="bookings" stroke="hsl(var(--primary))" strokeWidth={2} name="Bookings" />
                  <Line type="monotone" dataKey="spend" stroke="hsl(var(--secondary))" strokeWidth={2} name="Spend (₹)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle>Location Performance</CardTitle>
              <CardDescription>Billboard performance by geographic location</CardDescription>
            </CardHeader>
            <CardContent>
              {bookings.length > 0 ? (
                <div className="space-y-4">
                  {bookings.map((booking, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{booking.billboard?.title}</p>
                          <p className="text-sm text-muted-foreground">{booking.billboard?.location}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{booking.total_cost.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.billboard?.daily_impressions?.toLocaleString() || 0} daily impressions
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Bookings Yet</h3>
                  <p className="text-muted-foreground">Book billboards to see location performance</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Booking Status Overview</CardTitle>
              <CardDescription>Current status of all your bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-2xl font-bold">{bookings.filter((b) => b.status === "pending").length}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <FileCheck className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{bookings.filter((b) => b.status === "confirmed").length}</p>
                  <p className="text-sm text-muted-foreground">Confirmed</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <TrendingUp className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="text-2xl font-bold">{bookings.filter((b) => b.status === "active").length}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-2xl font-bold">{bookings.filter((b) => b.status === "completed").length}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
