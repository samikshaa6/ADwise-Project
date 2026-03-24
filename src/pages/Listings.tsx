import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, MapPin, Eye, DollarSign, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BookingForm } from "@/components/BookingForm";

interface Billboard {
  id: string;
  title: string;
  location: string;
  price_per_month: number;
  daily_impressions: number;
  width: number;
  height: number;
  is_available: boolean;
  image_url?: string;
  traffic_score: 'low' | 'medium' | 'high';
  category: string;
  latitude: number;
  longitude: number;
}

const Listings = () => {
  const { toast } = useToast();
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBillboard, setSelectedBillboard] = useState<Billboard | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  useEffect(() => {
    loadBillboards();
  }, []);

  const loadBillboards = async () => {
    try {
      const fetchPromise = supabase
        .from('billboards')
        .select('*')
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      const timeoutPromise = new Promise<{data: any, error: any}>((resolve) => {
        setTimeout(() => resolve({ 
          data: null, 
          error: new Error('The database connection timed out or is currently unavailable.') 
        }), 8000);
      });

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to load billboards',
          variant: 'destructive',
        });
      } else {
        setBillboards(data || []);
      }
    } catch (error) {
      console.error('Error loading billboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = (billboard: Billboard) => {
    setSelectedBillboard(billboard);
    setBookingOpen(true);
  };

  const getStatusBadge = (billboard: Billboard) => {
    if (billboard.is_available) {
      return <Badge className="bg-success text-success-foreground">Available</Badge>;
    }
    return <Badge variant="secondary">Unavailable</Badge>;
  };

  const getTrafficBadge = (score: string) => {
    const safeScore = score || 'medium';
    const variants = {
      low: 'secondary',
      medium: 'default',
      high: 'default',
      premium: 'default'
    } as const;
    return <Badge variant={variants[safeScore as keyof typeof variants]}>{safeScore.toUpperCase()}</Badge>;
  };

  const filteredBillboards = billboards.filter(billboard => {
    const matchesSearch = billboard.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         billboard.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'available' && billboard.is_available) ||
                         (selectedStatus === 'unavailable' && !billboard.is_available);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading billboards...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Billboard Listings</h1>
        <p className="text-muted-foreground">
          Browse and book premium billboard advertising spaces
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by location or title..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBillboards.map((billboard) => (
          <Card key={billboard.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-video bg-muted flex items-center justify-center">
              {billboard.image_url ? (
                <img 
                  src={billboard.image_url} 
                  alt={billboard.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-background rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Billboard Image</p>
                </div>
              )}
            </div>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{billboard.title}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {billboard.location}
                  </CardDescription>
                </div>
                {getStatusBadge(billboard)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Size:</span>
                  <span className="font-medium">{billboard.width}x{billboard.height} m</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Traffic:</span>
                  {getTrafficBadge(billboard.traffic_score)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Daily impressions:</span>
                  </div>
                  <span className="font-medium">{billboard.daily_impressions?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="text-xl font-bold text-primary">${billboard.price_per_month}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <Button 
                    size="sm" 
                    disabled={!billboard.is_available}
                    className="gap-1"
                    onClick={() => handleBookNow(billboard)}
                  >
                    <Calendar className="h-3 w-3" />
                    {billboard.is_available ? 'Book Now' : 'Unavailable'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBillboards.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No billboards found</h3>
            <p className="text-muted-foreground text-center">
              Try adjusting your search criteria or check back later for new listings.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Booking Form Dialog */}
      <BookingForm
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        billboard={selectedBillboard}
        onSuccess={() => {
          loadBillboards();
          setBookingOpen(false);
        }}
      />
    </div>
  );
};

export default Listings;