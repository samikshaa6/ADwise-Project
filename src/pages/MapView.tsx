import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Eye, IndianRupee } from "lucide-react";

const MapView = () => {
  const billboards = [
    {
      id: 1,
      title: "Times Square Digital Billboard",
      location: "Times Square, NYC",
      price: "₹500/day",
      impressions: "50K",
      status: "available",
      coordinates: { lat: 40.758, lng: -73.985 }
    },
    {
      id: 2,
      title: "Sunset Strip Premium",
      location: "West Hollywood, CA",
      price: "₹800/day",
      impressions: "75K",
      status: "booked",
      coordinates: { lat: 34.090, lng: -118.385 }
    },
    {
      id: 3,
      title: "Downtown Financial District",
      location: "Financial District, NYC",
      price: "₹350/day",
      impressions: "30K",
      status: "available",
      coordinates: { lat: 40.707, lng: -74.011 }
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Map View</h1>
        <p className="text-muted-foreground">
          Explore billboard locations on an interactive map
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map placeholder */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Interactive Map</CardTitle>
            <CardDescription>
              Click on markers to view billboard details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Interactive map will be displayed here</p>
                <p className="text-sm text-muted-foreground mt-1">Integration with mapping service coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billboard listings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Available Billboards</h3>
          {billboards.map((billboard) => (
            <Card key={billboard.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{billboard.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {billboard.location}
                    </CardDescription>
                  </div>
                  <Badge className={billboard.status === 'available' ? 'bg-success text-success-foreground' : 'bg-secondary text-secondary-foreground'}>
                    {billboard.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span>{billboard.impressions} daily</span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold">
                    <IndianRupee className="h-4 w-4" />
                    <span>{billboard.price}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapView;