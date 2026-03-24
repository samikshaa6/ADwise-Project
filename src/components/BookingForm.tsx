import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ImagePlus, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryCompetitorAlert } from './CategoryCompetitorAlert';

const bookingSchema = z.object({
  start_date: z.date(),
  end_date: z.date(),
  campaign_name: z.string().min(1, 'Campaign name is required'),
  notes: z.string().optional(),
  noc_category: z.string().min(1, 'NOC category is required'),
  creative_description: z.string().min(1, 'Creative description is required'),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface Billboard {
  id: string;
  title: string;
  price_per_month: number;
  location: string;
  category?: string;
  latitude?: number;
  longitude?: number;
}

interface BookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billboard: Billboard | null;
  onSuccess?: () => void;
}

export function BookingForm({ open, onOpenChange, billboard, onSuccess }: BookingFormProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creativeImage, setCreativeImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      campaign_name: '',
      notes: '',
      noc_category: '',
      creative_description: '',
    },
  });

  const selectedCategory = form.watch('noc_category');
  const selectedStartDate = form.watch('start_date');
  const selectedEndDate = form.watch('end_date');

  // Reset form and state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      form.reset();
      setCreativeImage(null);
      setImagePreview(null);
      setIsSubmitting(false);
    }
  }, [open, form]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Image size must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      setCreativeImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setCreativeImage(null);
    setImagePreview(null);
  };

  const onSubmit = async (data: BookingFormData) => {
    if (!profile || !billboard) {
      toast({
        title: 'Error',
        description: 'You must be logged in to make a booking',
        variant: 'destructive',
      });
      return;
    }

    if (!creativeImage) {
      toast({
        title: 'Error',
        description: 'Please upload your creative/ad image',
        variant: 'destructive',
      });
      return;
    }

    if (data.end_date <= data.start_date) {
      toast({
        title: 'Error',
        description: 'End date must be after start date',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload creative image
      let creativeImageUrl = null;
      
      try {
        const fileExt = creativeImage.name.split('.').pop();
        const fileName = `${profile.user_id}/${Date.now()}.${fileExt}`;
        
        // Wrap the upload in a Promise.race to forcefully stop hanging uploads
        const uploadPromise = supabase.storage
          .from('booking-creatives')
          .upload(fileName, creativeImage);
          
        const uploadTimeout = new Promise<{data: any, error: any}>((resolve) => {
          setTimeout(() => resolve({ data: null, error: new Error("Upload timed out after 8s.") }), 8000);
        });

        const { error: uploadError } = await Promise.race([uploadPromise, uploadTimeout]);

        if (uploadError) {
          console.error("Storage upload error - proceeding without image:", uploadError);
          toast({
             title: "Ad Creative Skipped",
             description: "We couldn't upload your image to the server, but your booking was still submitted.",
          });
        } else {
          const { data: urlData } = supabase.storage
            .from('booking-creatives')
            .getPublicUrl(fileName);
          creativeImageUrl = urlData.publicUrl;
        }
      } catch (err) {
        console.error("Failed to upload image. Storage bucket might be missing:", err);
      }

      // Calculate cost
      const days = Math.ceil((data.end_date.getTime() - data.start_date.getTime()) / (1000 * 60 * 60 * 24));
      const totalCost = Math.round((days / 30) * billboard.price_per_month);

      // Create booking with pending status (payment will happen after owner approval)
      const insertPromise = supabase.from('bookings').insert({
        billboard_id: billboard.id,
        customer_id: profile.user_id,
        start_date: data.start_date.toISOString().split('T')[0],
        end_date: data.end_date.toISOString().split('T')[0],
        campaign_name: data.campaign_name,
        notes: data.notes,
        total_cost: totalCost,
        status: 'pending',
        payment_status: 'pending',
        noc_status: 'pending',
        noc_category: data.noc_category,
        creative_image_url: creativeImageUrl,
        creative_description: data.creative_description,
      });

      const insertTimeout = new Promise<{error: any}>((resolve) => {
        setTimeout(() => resolve({ error: new Error("Database insert timed out after 10s.") }), 10000);
      });

      const { error: bookingError } = await Promise.race([insertPromise, insertTimeout]);

      if (bookingError) throw bookingError;

      toast({
        title: 'Booking Request Submitted',
        description: 'Your booking request has been sent to the billboard owner for approval. You can pay once approved.',
      });

      form.reset();
      setCreativeImage(null);
      setImagePreview(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit booking request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!billboard) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Billboard: {billboard.title}</DialogTitle>
        </DialogHeader>
        
        {billboard.latitude && billboard.longitude ? (
          <div className="mb-4">
            <CategoryCompetitorAlert 
              currentBillboardId={billboard.id}
              targetCategory={selectedCategory}
              targetStartDate={selectedStartDate}
              targetEndDate={selectedEndDate}
              latitude={billboard.latitude}
              longitude={billboard.longitude}
            />
          </div>
        ) : null}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.error('Form validation errors:', errors);
            setIsSubmitting(false);
          })} className="space-y-4">
            <FormField
              control={form.control}
              name="campaign_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter campaign name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="noc_category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NOC Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category for NOC application" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="F&B">F&B</SelectItem>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Fintech">Fintech</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Creative Image Upload */}
            <div className="space-y-2">
              <FormLabel>Creative/Ad Image *</FormLabel>
              {imagePreview ? (
                <div className="relative w-full max-w-xs">
                  <img 
                    src={imagePreview} 
                    alt="Creative preview" 
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImagePlus className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload your ad creative
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>

            <FormField
              control={form.control}
              name="creative_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Creative Description *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your advertisement content, target audience, and any specific requirements..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any other requirements or notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Price per month:</span>
                <span className="font-bold">₹{billboard.price_per_month}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Total cost will be calculated based on selected dates. Payment will be collected after owner approval.
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Booking Request'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
