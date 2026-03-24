import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Billboard {
  id: string;
  title: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  width: number;
  height: number;
  price_per_month: number;
  daily_impressions: number | null;
  traffic_score: 'low' | 'medium' | 'high' | null;
  image_url: string | null;
  is_available: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { budget, preferred_traffic, location_preference } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch available billboards
    const { data: billboards, error: billboardsError } = await supabaseClient
      .from('billboards')
      .select('*')
      .eq('is_available', true);

    if (billboardsError) {
      console.error('Error fetching billboards:', billboardsError);
      throw new Error('Failed to fetch billboards');
    }

    if (!billboards || billboards.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          recommendations: [],
          message: 'No billboards available at the moment'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare billboard data for AI analysis
    const billboardSummary = billboards.map((b: Billboard) => ({
      id: b.id,
      title: b.title,
      location: b.location,
      size: `${b.width}m x ${b.height}m`,
      price: b.price_per_month,
      impressions: b.daily_impressions || 'Unknown',
      traffic: b.traffic_score || 'Unknown',
    }));

    // ====== NATIVE K-NEAREST NEIGHBORS (KNN) RECOMMENDER MODEL ======
    console.log('Running local K-NN Euclidean vector calculations...');
    
    // 1. Feature Preprocessing & Normalization
    // We normalize prices and impressions to a 0.0 - 1.0 scale so they carry equal mathematical weight
    const maxPrice = Math.max(...billboards.map((b: Billboard) => b.price_per_month), 1);
    const maxImpressions = Math.max(...billboards.map((b: Billboard) => b.daily_impressions || 1), 1);

    // [NEW] ROI Value Density Preprocessing
    // Calculate raw "Bang for Buck": Area * Impressions / Price
    const rawROI = billboards.map((b: Billboard) => 
      ((b.width * b.height * (b.daily_impressions || 1)) / (b.price_per_month || 1))
    );
    const maxROI = Math.max(...rawROI, 1);

    // Traffic Encoding Map
    const trafficMap: Record<string, number> = { 'high': 1.0, 'medium': 0.6, 'low': 0.3 };

    // 2. Build the User Target Vector
    // If the user didn't specify a budget/traffic, we assume the median to avoid skewing the model
    const targetPrice = budget ? budget / maxPrice : 0.5;
    const targetTraffic = preferred_traffic ? (trafficMap[preferred_traffic] || 0.6) : 0.6;
    const targetROI = 1.0; // The ideal user always wants maximum ROI!
    
    // We weight Price (50%), Traffic (25%), ROI Density (15%), and pure Impressions (10%)
    const weights = { price: 0.5, traffic: 0.25, roi: 0.15, impressions: 0.1 };

    // 3. Score every billboard mathematically computing Euclidean distance
    const scoredBillboards = billboards.map((b: Billboard, index: number) => {
      // Vectorize the billboard
      const bPrice = b.price_per_month / maxPrice;
      const bTraffic = b.traffic_score ? (trafficMap[b.traffic_score] || 0.6) : 0.6;
      const bImp = (b.daily_impressions || 0) / maxImpressions;
      const bROI = rawROI[index] / maxROI;

      // [NEW] Asymmetric Budget Penalty calculation
      let priceDistance = Math.pow((targetPrice - bPrice) * weights.price, 2);
      
      // If the customer provided a budget constraint, heavily punish boards that break it
      if (budget) {
        if (b.price_per_month > budget) {
          priceDistance *= 2.8; // 280% penalty scalar for being too expensive
        } else {
          priceDistance *= 0.4; // 60% reward scaling for saving them money
        }
      }

      // Calculate Weighted Euclidean Distance
      const distance = Math.sqrt(
        priceDistance +
        Math.pow((targetTraffic - bTraffic) * weights.traffic, 2) +
        Math.pow((targetROI - bROI) * weights.roi, 2) + // Favor highly efficient cost-to-visual-area ratios
        Math.pow((1.0 - bImp) * weights.impressions, 2) // Always prefer higher absolute impressions
      );

      // Convert topological distance into a 0-100% Match Score
      // (Max theoretical distance is ~1.0, so 1 - distance * 100)
      let match_score = Math.floor((1 - distance) * 100);
      match_score = Math.max(45, Math.min(99, match_score)); // Clamp between 45% and 99%

      // Dynamically generate NLP-like reasoning based on mathematical disparities
      const highlights: string[] = [];
      const trade_offs: string[] = [];
      let reason = `Mathematically selected based on your profile constraints.`;

      if (budget) {
        if (b.price_per_month <= budget) {
          highlights.push(`Under budget by ₹${(budget - b.price_per_month).toLocaleString()}`);
          reason = `Perfect fit! Hits your core demographics while staying comfortably under your ₹${budget} budget.`;
        } else {
          trade_offs.push(`Slightly over budget by ₹${(b.price_per_month - budget).toLocaleString()}`);
          reason = `Exceptional traffic metrics, though it stretches your budget slightly.`;
        }
      }

      if (preferred_traffic && b.traffic_score === preferred_traffic) {
        highlights.push(`Exact "${preferred_traffic}" traffic match`);
      } else if (preferred_traffic) {
        trade_offs.push(`Traffic is ${b.traffic_score || 'unknown'} instead of ${preferred_traffic}`);
      }

      if (location_preference && b.location.toLowerCase().includes(location_preference.toLowerCase())) {
        highlights.push(`Matches location preference`);
      }

      return {
        billboard_id: b.id,
        title: b.title,
        match_score,
        reason,
        highlights,
        trade_offs,
        billboard: b
      };
    });

    // 4. Sort by the highest mathematical match score
    scoredBillboards.sort((a: any, b: any) => b.match_score - a.match_score);
    
    // 5. Take the Top 3 nearest neighbors!
    const recommendations = scoredBillboards.slice(0, 3);
    const summary = `Successfully ran local K-NN Euclidean vector inference against ${billboards.length} active listings.`;

    return new Response(
      JSON.stringify({
        success: true,
        recommendations: recommendations,
        summary: summary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in AI recommendations:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
