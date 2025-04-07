import { BookOpen, Calendar, ChevronRight, Search, LogIn, Menu, User, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useState, useEffect } from "react";

export default function Header() {
  const [error, setError] = useState<Error | null>(null);
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  
  // Debug logging for Header component
  useEffect(() => {
    console.log("Header component mounted");
    console.log("User in Header:", user);
  }, [user]);
  
  // If something goes wrong, show a simpler header
  if (error) {
    return (
      <header className="bg-white shadow-sm py-4 px-6 mb-6">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-7 w-7 text-blue-600" />
              <h1 className="text-xl font-semibold text-blue-600">Charlotte Mecklenburg Library</h1>
            </div>
            <p className="text-red-500">Error loading user data</p>
          </div>
        </div>
      </header>
    );
  }
  
  const handleLogout = () => {
    try {
      logoutMutation.mutate(undefined, {
        onSuccess: () => {
          toast({
            title: "Logged out",
            description: "You have been successfully logged out."
          });
        }
      });
    } catch (e) {
      console.error("Error in logout:", e);
      setError(e instanceof Error ? e : new Error('Failed to logout'));
    }
  };
  return (
    <header className="bg-white shadow-sm py-4 px-6 mb-6">
      <div className="max-w-screen-xl mx-auto">
        {/* Top navigation bar */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <BookOpen className="h-7 w-7 text-blue-600" />
            <h1 className="text-xl font-semibold text-blue-600">Charlotte Mecklenburg Library</h1>
          </div>
          
          <div className="hidden md:flex items-center space-x-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search catalog..." 
                className="pl-9 pr-4 py-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-48 lg:w-64"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">
              <Bell className="h-4 w-4 mr-1" />
              <span>Notifications</span>
            </Button>
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">
                    <User className="h-4 w-4 mr-1" />
                    <span>{user.name || user.username}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/profile">
                    <DropdownMenuItem className="cursor-pointer">My Profile</DropdownMenuItem>
                  </Link>
                  <Link href="/profile">
                    <DropdownMenuItem className="cursor-pointer">My Reservations</DropdownMenuItem>
                  </Link>
                  {user && user.isAdmin && (
                    <DropdownMenuItem className="cursor-pointer">Admin Dashboard</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <LogIn className="h-4 w-4 mr-1" />
                  <span>Login</span>
                </Button>
              </Link>
            )}
          </div>
          
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Breadcrumb navigation */}
        <nav className="flex items-center text-sm mt-3">
          <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">Home</Link>
          <ChevronRight className="h-3 w-3 mx-2 text-gray-400" />
          <Link href="/" className="text-blue-600 hover:text-blue-800">Room Reservations</Link>
          <ChevronRight className="h-3 w-3 mx-2 text-gray-400" />
          <span className="text-gray-600">South Boulevard Branch</span>
        </nav>
        
        {/* Page title */}
        <div className="mt-5 border-b border-gray-100 pb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Calendar className="h-6 w-6 mr-2 text-blue-600" /> 
            Room Reservation
          </h2>
          <p className="text-gray-600 mt-1 max-w-3xl">
            Reserve study and meeting rooms online. View availability and book a space for your next meeting, study session, or event.
          </p>
        </div>
      </div>
    </header>
  );
}
