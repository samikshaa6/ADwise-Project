import React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CategoryCompetitorAlertProps {
  currentBillboardId: string;
  targetCategory?: string;
  targetStartDate?: Date;
  targetEndDate?: Date;
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const CategoryCompetitorAlert: React.FC<CategoryCompetitorAlertProps> = ({
  currentBillboardId,
  targetCategory,
  targetStartDate,
  targetEndDate,
  latitude,
  longitude,
  radiusKm = 5,
}) => {
  const { data: overlappingCompetitors, isLoading } = useQuery({
    queryKey: [
      "category-competitors",
      targetCategory,
      targetStartDate?.toISOString(),
      targetEndDate?.toISOString(),
      currentBillboardId,
    ],
    queryFn: async () => {
      if (!targetStartDate || !targetEndDate || !targetCategory) return false;

      // 1. Fetch active billboards (excluding this one)
      const { data: billboards, error: billboardError } = await supabase
        .from("billboards")
        .select("id, latitude, longitude")
        .neq("id", currentBillboardId)
        .eq("is_available", true);
        
      if (billboardError) throw billboardError;
      if (!billboards || billboards.length === 0) return false;

      // Filter by 5km radius first to minimize booking query
      const nearbyBillboardIds = billboards.filter(b => {
        if (!b.latitude || !b.longitude) return false;
        const distance = calculateDistance(latitude, longitude, Number(b.latitude), Number(b.longitude));
        return distance <= radiusKm;
      }).map(b => b.id);

      if (nearbyBillboardIds.length === 0) return false;

      // 2. Fetch overlapping bookings for these nearby billboards
      const startStr = targetStartDate.toISOString().split('T')[0];
      const endStr = targetEndDate.toISOString().split('T')[0];

      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('id, billboard_id')
        .in('billboard_id', nearbyBillboardIds)
        .eq('noc_category', targetCategory)
        .in('status', ['pending', 'confirmed', 'active'])
        .lte('start_date', endStr)
        .gte('end_date', startStr);

      if (bookingError) throw bookingError;

      return (bookings && bookings.length > 0);
    },
    // Only search when the user has filled out ALL necessary competitor parameters!
    enabled: !!targetCategory && !!targetStartDate && !!targetEndDate && !!latitude && !!longitude,
  });

  // If the user hasn't filled out the form fields yet:
  if (!targetCategory || !targetStartDate || !targetEndDate) {
    return (
      <Alert className="bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
        <Info className="h-4 w-4 stroke-current" />
        <AlertTitle className="font-semibold text-sm">Competitor Analysis Tool</AlertTitle>
        <AlertDescription className="text-xs mt-1">
          Provide your Campaign Dates and NOC Category below to check if competitors are running similar ads within {radiusKm}km during your timeframe!
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="animate-pulse h-24 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"></div>
    );
  }

  if (overlappingCompetitors) {
    return (
      <Alert className="bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800">
        <AlertCircle className="h-4 w-4 stroke-current" />
        <AlertTitle className="font-semibold text-lg flex items-center gap-2">
          Competitor Overlap Warning
        </AlertTitle>
        <AlertDescription className="mt-2 text-sm">
          Warning: There is at least one active billboard booked in the <strong>{targetCategory}</strong> sector within {radiusKm}km whose dates directly overlap with your campaign!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800">
      <CheckCircle2 className="h-4 w-4 stroke-current" />
      <AlertTitle className="font-semibold">Category Exclusive</AlertTitle>
      <AlertDescription className="text-sm mt-1">
        Great choice! There are no other <strong>{targetCategory}</strong> billboards booked within {radiusKm}km during your selected dates.
      </AlertDescription>
    </Alert>
  );
};

export default CategoryCompetitorAlert;
