import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { format, addHours } from "date-fns";
import { AlertTriangle, Calendar, Clock, MapPin, Users } from "lucide-react";
import { useState } from "react";
import { Reservation, Room, Location } from "@shared/schema";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upcoming");

  // Query for user's reservations
  const { 
    data: reservations = [] as Reservation[], 
    isLoading: isLoadingReservations,
    error: reservationsError,
    refetch: refetchReservations
  } = useQuery<Reservation[]>({
    queryKey: ["/api/user/reservations"],
    enabled: !!user,
  });

  // Handle errors
  if (reservationsError) {
    toast({
      title: "Error loading reservations",
      description: "We couldn't load your reservation data. Please try again later.",
      variant: "destructive",
    });
  }

  // Separate reservations into past and upcoming
  const now = new Date();
  
  // Filter active (non-cancelled) reservations with start time in the future
  const upcomingReservations = reservations
    .filter((res: Reservation) => {
      // Skip cancelled reservations
      if (res.status === 'cancelled') return false;
      // Only include future reservations
      return new Date(res.startTime) > now;
    })
    .sort((a: Reservation, b: Reservation) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  
  // Filter active (non-cancelled) reservations with start time in the past
  const pastReservations = reservations
    .filter((res: Reservation) => {
      // Skip cancelled reservations
      if (res.status === 'cancelled') return false;
      // Only include past reservations
      return new Date(res.startTime) <= now;
    })
    .sort((a: Reservation, b: Reservation) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  // State for the cancel confirmation dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState<number | null>(null);

  // Handle opening the cancel confirmation dialog
  const openCancelDialog = (id: number) => {
    setReservationToCancel(id);
    setCancelDialogOpen(true);
  };

  // Handle actual reservation cancellation
  const handleCancelReservation = async () => {
    if (!reservationToCancel) return;
    
    try {
      const response = await fetch(`/api/reservations/${reservationToCancel}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to cancel reservation");
      }
      
      toast({
        title: "Reservation cancelled",
        description: "Your reservation has been successfully cancelled.",
      });
      
      // Refetch reservations
      refetchReservations();
      
      // Close the dialog
      setCancelDialogOpen(false);
      setReservationToCancel(null);
    } catch (error) {
      toast({
        title: "Failed to cancel",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Cancellation Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Reservation
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this reservation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep It</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleCancelReservation()} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel Reservation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{user?.name || user?.username}'s Profile</h1>
            <p className="text-muted-foreground">Manage your account and reservations</p>
          </div>
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            Back to Home
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">Username</p>
                <p className="text-base">{user?.username}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Name</p>
                <p className="text-base">{user?.name || "Not provided"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Email</p>
                <p className="text-base">{user?.email || "Not provided"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Account Type</p>
                <p className="text-base">
                  {user?.isAdmin ? 
                    <Badge variant="default">Admin</Badge> : 
                    <Badge variant="outline">Standard User</Badge>
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Reservations</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="upcoming">
                  Upcoming
                  {upcomingReservations.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {upcomingReservations.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="past">
                  Past
                  {pastReservations.length > 0 && (
                    <Badge variant="outline" className="ml-2">
                      {pastReservations.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="mt-0">
                {isLoadingReservations ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <ReservationSkeleton key={i} />
                    ))}
                  </div>
                ) : upcomingReservations.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">You don't have any upcoming reservations.</p>
                    <Button className="mt-4" onClick={() => window.location.href = "/"}>
                      Book a Room
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingReservations.map((reservation: Reservation) => (
                      <ReservationCard
                        key={reservation.id}
                        reservation={reservation}
                        onCancel={() => openCancelDialog(reservation.id)}
                        canCancel={true}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past" className="mt-0">
                {isLoadingReservations ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <ReservationSkeleton key={i} />
                    ))}
                  </div>
                ) : pastReservations.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">You don't have any past reservations.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pastReservations.map((reservation: Reservation) => (
                      <ReservationCard
                        key={reservation.id}
                        reservation={reservation}
                        canCancel={false}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Reservation card component
function ReservationCard({ 
  reservation, 
  onCancel, 
  canCancel = false 
}: { 
  reservation: Reservation; 
  onCancel?: () => void; 
  canCancel?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{reservation.purpose || "Room Reservation"}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(reservation.startTime), "MMMM d, yyyy")}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {/* Add 4 hours to compensate for timezone issue */}
                {format(addHours(new Date(reservation.startTime), 4), "h:mm a")} - {format(addHours(new Date(reservation.endTime), 4), "h:mm a")}
              </Badge>
            </div>
          </div>
          
          {canCancel && onCancel && (
            <Button 
              variant="destructive" 
              size="sm" 
              className="mt-4 md:mt-0"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
        </div>
        
        <Separator className="my-4" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Room</p>
            <p className="font-medium">Room #{reservation.roomId}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Capacity</p>
            <p className="font-medium flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {/* We would fetch room details in a real implementation */}
              {"Unknown"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Location</p>
            <p className="font-medium flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              {"Unknown location"}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Skeleton loader for reservations
function ReservationSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
          <Skeleton className="h-9 w-24 mt-4 md:mt-0" />
        </div>
        
        <Separator className="my-4" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </div>
    </Card>
  );
}