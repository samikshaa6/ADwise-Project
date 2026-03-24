import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, IndianRupee, MapPin, User, FileText, Clock, CreditCard, Loader2, Image } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  campaign_name: string;
  total_cost: number;
  status: string;
  notes?: string;
  created_at: string;
  noc_requested?: boolean;
  noc_status: string;
  noc_category?: string;
  payment_status?: string;
  creative_image_url?: string;
  creative_description?: string;
  billboard: {
    id: string;
    title: string;
    location: string;
    owner_id: string;
    owner?: {
      user_id: string;
      full_name: string;
      email: string;
      company_name?: string;
    };
  };
}

export default function CustomerBookings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const loadBookings = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        billboard:billboards(
          id,
          title,
          location,
          owner_id,
          owner:profiles!billboards_owner_id_fkey(user_id, full_name, email, company_name)
        )
      `)
      .eq('customer_id', profile.user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive',
      });
    } else {
      setBookings(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBookings();
  }, [profile]);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (booking: Booking) => {
    if (!profile) return;
    
    setPayingBookingId(booking.id);
    const amountInPaise = booking.total_cost * 100;

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      // Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: amountInPaise,
          currency: 'INR',
          receipt: booking.id,
          notes: {
            billboard_id: booking.billboard.id,
            campaign_name: booking.campaign_name,
          },
        },
      });

      if (orderError) throw orderError;

      // Update booking with order ID
      await supabase
        .from('bookings')
        .update({ razorpay_order_id: orderData.order.id })
        .eq('id', booking.id);

      // Open Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: amountInPaise,
        currency: 'INR',
        name: 'AdWiseManager',
        description: `Booking for ${booking.billboard.title}`,
        order_id: orderData.order.id,
        handler: async (response: any) => {
          try {
            // Verify payment
            const { error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                booking_id: booking.id,
              },
            });

            if (verifyError) throw verifyError;

            toast({
              title: 'Payment Successful',
              description: 'Your billboard has been booked successfully!',
            });
            loadBookings();
          } catch (error) {
            console.error('Payment verification failed:', error);
            toast({
              title: 'Payment Verification Failed',
              description: 'Please contact support if amount was deducted.',
              variant: 'destructive',
            });
          }
        },
        prefill: {
          email: profile.email,
          name: profile.full_name || '',
        },
        theme: {
          color: '#3399cc',
        },
        modal: {
          ondismiss: () => {
            setPayingBookingId(null);
            toast({
              title: 'Payment Cancelled',
              description: 'You can try again when ready.',
            });
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Error',
        description: 'Failed to initiate payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPayingBookingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary' as const,
      confirmed: 'default' as const,
      active: 'default' as const,
      completed: 'default' as const,
      cancelled: 'destructive' as const,
    };
    return <Badge variant={variants[status as keyof typeof variants]}>{status.toUpperCase()}</Badge>;
  };

  const getNocStatusBadge = (nocStatus: string) => {
    const variants = {
      not_requested: 'secondary' as const,
      not_applied: 'secondary' as const,
      pending: 'secondary' as const,
      approved: 'default' as const,
      rejected: 'destructive' as const,
    };
    const labels = {
      not_requested: 'NOC Pending Review',
      not_applied: 'NOC Pending Review',
      pending: 'NOC Pending Review',
      approved: 'NOC Approved',
      rejected: 'NOC Rejected',
    };
    return (
      <Badge variant={variants[nocStatus as keyof typeof variants]}>
        {labels[nocStatus as keyof typeof labels] || nocStatus.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Bookings</h2>
          <p className="text-muted-foreground">
            View your billboard bookings and complete payments after approval
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{booking.campaign_name}</CardTitle>
                  <CardDescription className="flex items-center gap-4">
                    <span className="flex items-center">
                      <MapPin className="mr-1 h-3 w-3" />
                      {booking.billboard.title}
                    </span>
                    <span className="flex items-center">
                      <User className="mr-1 h-3 w-3" />
                      Owner: {booking.billboard.owner?.full_name || 'Unknown'}
                    </span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-col">
                  {getStatusBadge(booking.status)}
                  {getNocStatusBadge(booking.noc_status)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="mr-1 h-3 w-3" />
                    Start Date
                  </div>
                  <div className="font-medium">{format(new Date(booking.start_date), 'MMM dd, yyyy')}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="mr-1 h-3 w-3" />
                    End Date
                  </div>
                  <div className="font-medium">{format(new Date(booking.end_date), 'MMM dd, yyyy')}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
                    <IndianRupee className="mr-1 h-3 w-3" />
                    {booking.total_cost.toLocaleString()}
                  </div>
                  <div className="font-medium">₹{booking.total_cost}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Billboard Location</div>
                  <div className="font-medium">{booking.billboard.location}</div>
                </div>
              </div>

              {booking.noc_category && (
                <div className="text-sm">
                  <span className="text-muted-foreground">NOC Category: </span>
                  <span className="font-medium">{booking.noc_category}</span>
                </div>
              )}

              {/* Show submitted creative */}
              {booking.creative_image_url && (
                <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Image className="h-4 w-4" />
                    Your Submitted Creative
                  </div>
                  <div 
                    className="cursor-pointer w-fit"
                    onClick={() => setSelectedImage(booking.creative_image_url || null)}
                  >
                    <img 
                      src={booking.creative_image_url} 
                      alt="Creative" 
                      className="max-w-xs h-24 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                    />
                  </div>
                  {booking.creative_description && (
                    <p className="text-sm text-muted-foreground">{booking.creative_description}</p>
                  )}
                </div>
              )}

              {booking.notes && (
                <div className="text-sm">
                  <div className="flex items-center text-muted-foreground mb-1">
                    <FileText className="mr-1 h-3 w-3" />
                    Notes
                  </div>
                  <p className="text-muted-foreground">{booking.notes}</p>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {/* Pending NOC - waiting for approval */}
                {booking.status === 'pending' && booking.noc_status === 'pending' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg">
                    <Clock className="h-4 w-4" />
                    Waiting for owner to review and approve your NOC request
                  </div>
                )}

                {/* NOC Approved - can pay now */}
                {booking.status === 'pending' && booking.noc_status === 'approved' && booking.payment_status === 'pending' && (
                  <Button 
                    size="sm" 
                    onClick={() => handlePayment(booking)}
                    disabled={payingBookingId === booking.id}
                  >
                    {payingBookingId === booking.id ? (
                      <>
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-1 h-4 w-4" />
                        Pay ₹{booking.total_cost}
                      </>
                    )}
                  </Button>
                )}

                {/* NOC Rejected */}
                {booking.noc_status === 'rejected' && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                    Your NOC request was rejected by the owner
                  </div>
                )}

                {/* Payment completed */}
                {booking.payment_status === 'completed' && (
                  <Badge variant="default" className="py-2">
                    <CreditCard className="mr-1 h-3 w-3" />
                    Payment Complete
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Creative Preview</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt="Creative full size" 
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {bookings.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
            <p className="text-muted-foreground text-center">
              Your billboard bookings will appear here after you make a booking.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
