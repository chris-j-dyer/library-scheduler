import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import StripeCheckout from "@/components/StripeCheckout";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDateTimeRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentPage() {
  const [, params] = useRoute("/payment/:reservationId");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  
  const reservationId = params?.reservationId ? parseInt(params.reservationId) : null;
  
  const [paymentIntentClientSecret, setPaymentIntentClientSecret] = useState<string | null>(null);
  
  // Fetch the reservation details
  const { data: reservation, isLoading: isReservationLoading, error } = useQuery({
    queryKey: ['/api/reservations', reservationId],
    queryFn: async () => {
      if (!reservationId) return null;
      const response = await fetch(`/api/reservations/${reservationId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reservation');
      }
      return response.json();
    },
    enabled: !!reservationId && !!user,
    staleTime: 0, // Always refetch this data
  });
  
  // Fetch the room details
  const { data: room, isLoading: isRoomLoading } = useQuery({
    queryKey: ['/api/rooms', reservation?.roomId],
    queryFn: async () => {
      if (!reservation?.roomId) return null;
      const response = await fetch(`/api/rooms/${reservation.roomId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch room');
      }
      return response.json();
    },
    enabled: !!reservation?.roomId,
  });
  
  useEffect(() => {
    // Make sure the reservation belongs to this user
    if (reservation && user && reservation.userId !== user.id) {
      toast({
        title: "Unauthorized",
        description: "You do not have permission to view this reservation",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
    
    // Make sure the reservation status is 'pending_payment'
    if (reservation && reservation.status !== 'pending_payment') {
      if (reservation.status === 'confirmed') {
        toast({
          title: "Already paid",
          description: "This reservation has already been paid for and confirmed",
        });
        navigate("/profile");
        return;
      } else {
        toast({
          title: "Invalid reservation status",
          description: "This reservation cannot be paid for at this time",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
    }
    
    // If the reservation has a stripePaymentIntentId, use that
    if (reservation?.stripePaymentIntentId) {
      // Get the client secret for the existing payment intent
      const getPaymentIntent = async () => {
        try {
          const response = await apiRequest("GET", `/api/payment-intent/${reservation.stripePaymentIntentId}`);
          const data = await response.json();
          setPaymentIntentClientSecret(data.clientSecret);
        } catch (err) {
          console.error("Error fetching payment intent:", err);
          toast({
            title: "Error",
            description: "Failed to load payment information",
            variant: "destructive",
          });
        }
      };
      
      getPaymentIntent();
    } else if (reservation) {
      // Create a new payment intent
      const createPaymentIntent = async () => {
        try {
          const response = await apiRequest("POST", "/api/create-payment-intent", {
            reservationId: reservation.id,
          });
          
          if (!response.ok) {
            throw new Error("Failed to create payment intent");
          }
          
          const data = await response.json();
          setPaymentIntentClientSecret(data.clientSecret);
          
          // Update the reservation with the payment intent
          queryClient.invalidateQueries({ queryKey: ['/api/reservations', reservationId] });
        } catch (err) {
          console.error("Error creating payment intent:", err);
          toast({
            title: "Payment Error",
            description: "There was a problem setting up the payment. Please try again.",
            variant: "destructive",
          });
        }
      };
      
      createPaymentIntent();
    }
  }, [reservation, user, navigate, toast, reservationId]);
  
  if (authLoading || isReservationLoading || isRoomLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error || !reservation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Reservation Not Found</h1>
        <p className="text-muted-foreground mb-6">The reservation you're looking for could not be found or has been cancelled.</p>
        <Button asChild>
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Complete Your Reservation</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Reservation Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium">Room</h3>
              <p>{room?.name}</p>
            </div>
            <div>
              <h3 className="font-medium">Location</h3>
              <p>Floor {room?.floor}, Room {room?.roomNumber}</p>
            </div>
            <div>
              <h3 className="font-medium">Date & Time</h3>
              <p>{formatDateTimeRange(new Date(reservation.startTime), new Date(reservation.endTime))}</p>
            </div>
            <div>
              <h3 className="font-medium">Purpose</h3>
              <p>{reservation.purpose}</p>
            </div>
            <div>
              <h3 className="font-medium">Price</h3>
              <p className="text-lg font-semibold">${(reservation.priceInCents / 100).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">($5.00 per hour)</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild className="w-full">
              <Link href="/profile">Cancel Payment</Link>
            </Button>
          </CardFooter>
        </Card>
        
        <div>
          <StripeCheckout 
            paymentIntentClientSecret={paymentIntentClientSecret || ''}
            reservationId={reservation.id}
            amount={reservation.priceInCents}
            returnToPath="/profile"
          />
        </div>
      </div>
    </div>
  );
}