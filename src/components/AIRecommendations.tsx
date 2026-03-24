import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, MapPin, TrendingUp, IndianRupee, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Recommendation {
  billboard_id: string;
  title: string;
  match_score: number;
  reason: string;
  highlights: string[];
  trade_offs: string[];
  billboard: {
    id: string;
    title: string;
    location: string;
    price_per_month: number;
    daily_impressions: number | null;
    traffic_score: 'low' | 'medium' | 'high' | null;
    width: number;
    height: number;
    image_url: string | null;
  } | null;
}

export function AIRecommendations() {
  const navigate = useNavigate();
  const [budget, setBudget] = useState('');
  const [preferredTraffic, setPreferredTraffic] = useState('');
  const [locationPreference, setLocationPreference] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getRecommendations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-billboard-recommendations', {
        body: {
          budget: budget ? parseInt(budget) : null,
          preferred_traffic: preferredTraffic || null,
          location_preference: locationPreference || null,
        }
      });

      if (error) throw error;

      if (data.success) {
        setRecommendations(data.recommendations || []);
        setSummary(data.summary || '');
        if (data.recommendations?.length === 0) {
          toast.info('No billboards match your criteria');
        }
      } else {
        throw new Error(data.error || 'Failed to get recommendations');
      }
    } catch (error: any) {
      console.error('Error getting recommendations:', error);
      toast.error(error.message || 'Failed to get AI recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const getTrafficBadgeVariant = (score: string | null) => {
    switch (score) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Billboard Recommendations
        </CardTitle>
        <CardDescription>
          Let AI analyze traffic data and find the best billboards for your campaign
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Form */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="budget">Monthly Budget (₹)</Label>
            <Input
              id="budget"
              type="number"
              placeholder="e.g., 50000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="traffic">Preferred Traffic Level</Label>
            <Select value={preferredTraffic} onValueChange={setPreferredTraffic}>
              <SelectTrigger>
                <SelectValue placeholder="Any traffic level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High Traffic (Max Visibility)</SelectItem>
                <SelectItem value="medium">Medium Traffic (Balanced)</SelectItem>
                <SelectItem value="low">Low Traffic (Budget-friendly)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location Preference</Label>
            <Input
              id="location"
              placeholder="e.g., Mumbai, Highway"
              value={locationPreference}
              onChange={(e) => setLocationPreference(e.target.value)}
            />
          </div>
        </div>

        <Button 
          onClick={getRecommendations} 
          disabled={isLoading}
          className="w-full md:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing billboards...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Get AI Recommendations
            </>
          )}
        </Button>

        {/* Summary */}
        {summary && (
          <div className="rounded-lg bg-primary/5 p-4 border border-primary/10">
            <p className="text-sm text-muted-foreground">{summary}</p>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Top Recommendations</h3>
            <div className="grid gap-4">
              {recommendations.map((rec, index) => (
                <Card key={rec.billboard_id} className="overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    {rec.billboard?.image_url && (
                      <div className="md:w-48 h-32 md:h-auto">
                        <img
                          src={rec.billboard.image_url}
                          alt={rec.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-muted-foreground">
                              #{index + 1}
                            </span>
                            <h4 className="font-semibold">{rec.title}</h4>
                          </div>
                          {rec.billboard && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3" />
                              {rec.billboard.location}
                            </div>
                          )}
                        </div>
                        <div className={`text-2xl font-bold ${getMatchScoreColor(rec.match_score)}`}>
                          {rec.match_score}%
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">{rec.reason}</p>

                      {rec.billboard && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant={getTrafficBadgeVariant(rec.billboard.traffic_score)}>
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {rec.billboard.traffic_score || 'Unknown'} traffic
                          </Badge>
                          <Badge variant="outline">
                            <IndianRupee className="h-3 w-3 mr-1" />
                            {rec.billboard.price_per_month.toLocaleString()}/month
                          </Badge>
                          <Badge variant="outline">
                            {rec.billboard.width}m × {rec.billboard.height}m
                          </Badge>
                          {rec.billboard.daily_impressions && (
                            <Badge variant="outline">
                              {rec.billboard.daily_impressions.toLocaleString()} daily views
                            </Badge>
                          )}
                        </div>
                      )}

                      {rec.highlights.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {rec.highlights.map((highlight, i) => (
                            <span key={i} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                              ✓ {highlight}
                            </span>
                          ))}
                        </div>
                      )}

                      {rec.trade_offs.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {rec.trade_offs.map((tradeOff, i) => (
                            <span key={i} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                              ⚠ {tradeOff}
                            </span>
                          ))}
                        </div>
                      )}

                      <Button 
                        size="sm" 
                        onClick={() => navigate(`/listings`)}
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
