import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { MapPin, IndianRupee, Eye, Maximize } from 'lucide-react';

// Fix Leaflet default icon issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface Billboard {
  id: string;
  title: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  price_per_month: number;
  daily_impressions: number | null;
  traffic_score: 'low' | 'medium' | 'high' | null;
  is_available: boolean;
  width: number;
  height: number;
}

// Component to fit map bounds to markers
function FitBounds({ billboards }: { billboards: Billboard[] }) {
  const map = useMap();
  
  useEffect(() => {
    const validBillboards = billboards.filter(b => b.latitude && b.longitude);
    if (validBillboards.length > 0) {
      const bounds = L.latLngBounds(
        validBillboards.map(b => [b.latitude!, b.longitude!] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [billboards, map]);
  
  return null;
}

export function BillboardMap() {
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadBillboards();
  }, []);

  const loadBillboards = async () => {
    const { data, error } = await supabase
      .from('billboards')
      .select('id, title, location, latitude, longitude, price_per_month, daily_impressions, traffic_score, is_available, width, height')
      .eq('is_available', true);

    if (!error && data) {
      setBillboards(data);
    }
    setLoading(false);
  };

  const getTrafficBadgeVariant = (score: string | null) => {
    switch (score) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card className="h-[500px] flex items-center justify-center">
        <div className="text-muted-foreground">Loading map...</div>
      </Card>
    );
  }

  const validBillboards = billboards.filter(b => b.latitude && b.longitude);
  const defaultCenter: [number, number] = validBillboards.length > 0 
    ? [validBillboards[0].latitude!, validBillboards[0].longitude!]
    : [40.7128, -74.0060]; // Default to NYC

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <MapContainer
          center={defaultCenter}
          zoom={12}
          style={{ height: '500px', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds billboards={validBillboards} />
          
          {validBillboards.map((billboard) => (
            <Marker
              key={billboard.id}
              position={[billboard.latitude!, billboard.longitude!]}
              
            >
              <Popup className="billboard-popup" minWidth={280}>
                <div className="space-y-3 p-1">
                  <div>
                    <h3 className="font-semibold text-lg">{billboard.title}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {billboard.location}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getTrafficBadgeVariant(billboard.traffic_score)}>
                      {billboard.traffic_score || 'N/A'} traffic
                    </Badge>
                    <Badge variant="outline">
                      <Maximize className="h-3 w-3 mr-1" />
                      {billboard.width}m × {billboard.height}m
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <IndianRupee className="h-4 w-4 text-primary" />
                      <strong>₹{billboard.price_per_month.toLocaleString()}</strong>/mo
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      {billboard.daily_impressions?.toLocaleString() || 'N/A'} daily
                    </span>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={() => navigate(`/listings?billboard=${billboard.id}`)}
                  >
                    View Details & Book
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </CardContent>
    </Card>
  );
}
