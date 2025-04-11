import { useEffect, useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface StripeCheckoutFormProps {
  clientSecret: string;
  reservationId: number;
  amount: number;
  returnToPath?: string;
}

// The form displayed inside the Stripe Elements provider
function CheckoutForm({ clientSecret, reservationId, amount, returnToPath = '/' }: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!stripe) {
      return;
    }

    // Check if payment was already completed when the component loads
    // This handles the case when the user is redirected back by Stripe
    const clientSecretParam = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret'
    );

    if (clientSecretParam) {
      stripe.retrievePaymentIntent(clientSecretParam).then(({ paymentIntent }) => {
        if (!paymentIntent) return;

        switch (paymentIntent.status) {
          case "succeeded":
            handlePaymentSuccess(paymentIntent.id);
            break;
          case "processing":
            toast({
              title: "Your payment is processing",
              description: "We'll update you when the payment is complete.",
            });
            break;
          case "requires_payment_method":
            toast({
              title: "Your payment was not successful",
              description: "Please try again with a different payment method.",
              variant: "destructive"
            });
            break;
          default:
            toast({
              title: "Something went wrong",
              description: "Please try again.",
              variant: "destructive"
            });
            break;
        }
      });
    }
  }, [stripe]);

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      // Tell the server the payment is completed
      await apiRequest("POST", `/api/reservations/${reservationId}/payment-success`, {
        paymentIntentId
      });

      toast({
        title: "Payment successful!",
        description: "Your reservation is now confirmed."
      });

      // Redirect to the returnToPath (profile page or home page)
      setTimeout(() => navigate(returnToPath), 1500);
    } catch (error) {
      console.error("Error confirming payment:", error);
      toast({
        title: "Error confirming payment",
        description: "There was an error confirming your payment. Please contact support.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet. Make sure to disable
      // form submission until Stripe.js has loaded.
      return;
    }

    setIsLoading(true);

    // Create a payment method and confirm the payment
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Make sure to change this to your payment completion page
        return_url: `${window.location.origin}/reservations`,
      },
      redirect: 'if_required',
    });

    if (error) {
      toast({
        title: "Payment failed",
        description: error.message || "An error occurred during payment",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    // Payment succeeded, update the reservation status
    if (paymentIntent && paymentIntent.status === 'succeeded') {
      try {
        // Call our API to update the reservation status
        await fetch(`/api/reservations/${reservationId}/payment-success`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });

        // Show success message
        toast({
          title: "Payment successful!",
          description: "Your reservation has been confirmed.",
        });

        // Redirect to the reservations page
        setTimeout(() => {
          window.location.href = returnToPath || '/reservations';
        }, 1500);
      } catch (apiError) {
        console.error('Error updating reservation status:', apiError);
        toast({
          title: "Payment recorded",
          description: "Your payment was successful, but we couldn't update your reservation status. Please contact support.",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Payment processing",
        description: "Your payment is being processed. We'll email you once it's confirmed.",
      });
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      <div className="flex justify-between items-center">
        <div className="text-sm font-semibold">
          Total: ${(amount / 100).toFixed(2)}
        </div>
        <Button 
          type="submit" 
          disabled={!stripe || isLoading}
          className="w-1/2"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>Pay Now</>
          )}
        </Button>
      </div>
    </form>
  );
}

interface StripeCheckoutProps {
  paymentIntentClientSecret: string;
  reservationId: number;
  amount: number;
  returnToPath?: string;
}

// The main component to use, which sets up the Stripe provider
export default function StripeCheckout({ 
  paymentIntentClientSecret, 
  reservationId, 
  amount,
  returnToPath = '/'
}: StripeCheckoutProps) {
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-6">Complete your payment</h2>
      
      {paymentIntentClientSecret ? (
        <Elements 
          stripe={stripePromise} 
          options={{ clientSecret: paymentIntentClientSecret }}
        >
          <CheckoutForm 
            clientSecret={paymentIntentClientSecret} 
            reservationId={reservationId} 
            amount={amount}
            returnToPath={returnToPath}
          />
        </Elements>
      ) : (
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}