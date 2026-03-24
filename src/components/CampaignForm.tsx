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
import { CalendarIcon, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  description: z.string().optional(),
  start_date: z.date(),
  end_date: z.date(),
  total_budget: z.number().min(1, 'Budget must be at least ₹1'),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface CampaignFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CampaignForm({ open, onOpenChange, onSuccess }: CampaignFormProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [showPayment, setShowPayment] = useState(false);
  const [campaignData, setCampaignData] = useState<CampaignFormData | null>(null);
  
  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      description: '',
      total_budget: 1000,
    },
  });

  const onSubmit = async (data: CampaignFormData) => {
    if (!profile) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a campaign',
        variant: 'destructive',
      });
      return;
    }

    const days = Math.ceil((data.end_date.getTime() - data.start_date.getTime()) / (1000 * 60 * 60 * 24));
    const dailyCost = data.total_budget / days;
    
    setCampaignData(data);
    setShowPayment(true);
  };

  const handlePayment = async () => {
    if (!campaignData || !profile) return;

    const { error } = await supabase.from('campaigns').insert({
      name: campaignData.name,
      description: campaignData.description,
      budget: campaignData.total_budget,
      customer_id: profile.user_id,
      status: 'active',
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create campaign',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Campaign created successfully!',
      });
      form.reset();
      setShowPayment(false);
      setCampaignData(null);
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const resetForm = () => {
    setShowPayment(false);
    setCampaignData(null);
  };

  if (showPayment && campaignData) {
    const days = Math.ceil((campaignData.end_date.getTime() - campaignData.start_date.getTime()) / (1000 * 60 * 60 * 24));
    
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Gateway</DialogTitle>
          </DialogHeader>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Campaign Payment
              </CardTitle>
              <CardDescription>
                Complete your campaign setup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Campaign:</span>
                  <span className="font-medium">{campaignData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>{days} days</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily Cost:</span>
                  <span>₹{(campaignData.total_budget / days).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>₹{campaignData.total_budget}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Input placeholder="Card Number" />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="MM/YY" />
                  <Input placeholder="CVC" />
                </div>
                <Input placeholder="Cardholder Name" />
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm} className="flex-1">
                  Back
                </Button>
                <Button onClick={handlePayment} className="flex-1">
                  Pay ₹{campaignData.total_budget}
                </Button>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Campaign description (optional)" {...field} />
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
              name="total_budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Budget (₹)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Continue to Payment</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}