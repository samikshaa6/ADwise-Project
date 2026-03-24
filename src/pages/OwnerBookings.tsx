import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, IndianRupee, MapPin, User, FileText, Download, Image } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  creative_image_url?: string;
  creative_description?: string;
  payment_status?: string;
  billboard?: {
    id: string;
    title: string;
    location: string;
    owner_id?: string;
    price_per_month?: number;
  };
  customer?: {
    user_id: string;
    full_name: string;
    email: string;
    company_name?: string;
  };
}

export default function OwnerBookings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const loadBookings = async () => {
    if (!profile) return;

    const { data: myBillboards, error: billboardError } = await supabase
      .from('billboards')
      .select('id')
      .eq('owner_id', profile.user_id);

    if (billboardError) {
      console.error('Error loading billboards:', billboardError);
      toast({
        title: 'Error',
        description: 'Failed to load your billboards',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (!myBillboards || myBillboards.length === 0) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const billboardIds = myBillboards.map(b => b.id);

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        billboard:billboards(id, title, location, owner_id),
        customer:profiles!bookings_customer_id_fkey(user_id, full_name, email, company_name)
      `)
      .in('billboard_id', billboardIds)
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

  const handleApproval = async (bookingId: string, booking: Booking) => {
    console.log('handleApproval called', { bookingId, booking });
    
    // Approve the NOC - customer can now pay
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        noc_status: 'approved'
      })
      .eq('id', bookingId)
      .select();

    console.log('Approval result:', { data, error });

    if (error) {
      console.error('Approval error:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve NOC: ' + error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'NOC approved. Customer can now proceed with payment.',
      });
      loadBookings();
    }
  };

  const handleRejection = async (bookingId: string, booking: Booking) => {
    console.log('handleRejection called', { bookingId, booking });
    
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        noc_status: 'rejected'
      })
      .eq('id', bookingId)
      .select();

    console.log('Rejection result:', { data, error });

    if (error) {
      console.error('Rejection error:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject booking: ' + error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Booking and NOC rejected',
      });
      loadBookings();
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'active') => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update booking status',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Booking status updated',
      });
      loadBookings();
    }
  };

  const generateNOC = async (booking: Booking) => {
    if (booking.noc_status === 'rejected') {
      toast({
        title: 'Cannot Generate NOC',
        description: 'NOC has been rejected and cannot be downloaded',
        variant: 'destructive',
      });
      return;
    }

    const nocContent = `
NO OBJECTION CERTIFICATE

Date: ${format(new Date(), 'PPP')}

This is to certify that we have no objection to the use of our billboard:

Billboard: ${booking.billboard?.title || 'N/A'}
Location: ${booking.billboard?.location || 'N/A'}
Campaign: ${booking.campaign_name}
Duration: ${format(new Date(booking.start_date), 'PPP')} to ${format(new Date(booking.end_date), 'PPP')}
Customer: ${booking.customer?.full_name || 'Unknown Customer'}
${booking.customer?.company_name ? `Company: ${booking.customer.company_name}` : ''}

Approved by: ${profile?.full_name || 'Billboard Owner'}

This certificate is valid for the specified duration only.
    `;

    const blob = new Blob([nocContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NOC_${booking.campaign_name}_${booking.id.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'NOC generated and downloaded',
    });
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

  const getPaymentBadge = (paymentStatus: string | undefined) => {
    if (!paymentStatus || paymentStatus === 'pending') {
      return <Badge variant="secondary">Payment Pending</Badge>;
    }
    if (paymentStatus === 'completed') {
      return <Badge variant="default">Payment Complete</Badge>;
    }
    return <Badge variant="destructive">{paymentStatus}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bookings</h2>
          <p className="text-muted-foreground">
            Review and approve customer bookings for your billboards
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
                  <div className="flex justify-between items-center bg-muted/50 p-2 rounded text-sm">
                    <span className="text-muted-foreground">Total Value:</span>
                    <span className="font-semibold flex items-center">
                    <IndianRupee className="mr-1 h-3 w-3" />
                      {booking.total_cost || booking.billboard?.price_per_month || 'N/A'}
                    </span>
                    <span className="flex items-center">
                      <User className="mr-1 h-3 w-3" />
                      {booking.customer?.full_name || 'Unknown Customer'}
                    </span>
                  </div>
                  <CardDescription className="flex items-center gap-4">
                    <span className="flex items-center">
                      <MapPin className="mr-1 h-3 w-3" />
                      {booking.billboard?.title || 'Unknown Billboard'}
                    </span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-col">
                  {getStatusBadge(booking.status)}
                  {getPaymentBadge(booking.payment_status)}
                  {booking.noc_category && (
                    <Badge variant={booking.noc_status === 'approved' ? 'default' : booking.noc_status === 'rejected' ? 'destructive' : 'secondary'}>
                      NOC: {booking.noc_status.toUpperCase()}
                    </Badge>
                  )}
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
                  <div className="flex items-center text-muted-foreground">
                    <IndianRupee className="mr-1 h-3 w-3" />
                    Total Cost
                  </div>
                  <div className="font-medium">₹{booking.total_cost}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Customer Email</div>
                  <div className="font-medium">{booking.customer?.email || 'No email available'}</div>
                </div>
              </div>

              {booking.noc_category && (
                <div className="text-sm">
                  <span className="text-muted-foreground">NOC Category: </span>
                  <span className="font-medium">{booking.noc_category}</span>
                </div>
              )}

              {/* Creative Preview Section */}
              {booking.creative_image_url && (
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Image className="h-4 w-4" />
                    Customer's Creative/Ad
                  </div>
                  <div 
                    className="cursor-pointer w-fit"
                    onClick={() => setSelectedImage(booking.creative_image_url || null)}
                  >
                    <img 
                      src={booking.creative_image_url} 
                      alt="Creative" 
                      className="max-w-xs h-32 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Click to view full size</p>
                  </div>
                  {booking.creative_description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description:</p>
                      <p className="text-sm">{booking.creative_description}</p>
                    </div>
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
                {/* Pending bookings - Owner needs to approve/reject NOC */}
                {booking.status === 'pending' && booking.noc_status === 'pending' && (
                  <>
                    <Button 
                      size="sm" 
                      onClick={() => handleApproval(booking.id, booking)}
                    >
                      Approve NOC
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleRejection(booking.id, booking)}
                    >
                      Reject Booking & NOC
                    </Button>
                  </>
                )}
                
                {/* NOC approved, waiting for payment */}
                {booking.status === 'pending' && booking.noc_status === 'approved' && booking.payment_status === 'pending' && (
                  <Badge variant="secondary" className="py-2">
                    Waiting for customer payment
                  </Badge>
                )}

                {/* Confirmed - can mark active */}
                {booking.status === 'confirmed' && (
                  <>
                    <Button 
                      size="sm" 
                      onClick={() => handleStatusChange(booking.id, 'active')}
                    >
                      Mark Active
                    </Button>
                    {booking.noc_status === 'approved' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => generateNOC(booking)}
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Download NOC
                      </Button>
                    )}
                  </>
                )}

                {/* Active - can mark completed */}
                {booking.status === 'active' && (
                  <>
                    <Button 
                      size="sm" 
                      onClick={() => handleStatusChange(booking.id, 'completed')}
                    >
                      Mark Completed
                    </Button>
                    {booking.noc_status === 'approved' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => generateNOC(booking)}
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Download NOC
                      </Button>
                    )}
                  </>
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
              Customer bookings for your billboards will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
