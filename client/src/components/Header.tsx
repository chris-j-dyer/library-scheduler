import { BookOpen, Calendar, ChevronRight, Search, LogIn, Menu, User, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function Header() {
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
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">
                  <User className="h-4 w-4 mr-1" />
                  <span>Account</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">My Reservations</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">My Checkouts</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Account Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-red-600">Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <LogIn className="h-4 w-4 mr-1" />
              <span>Login</span>
            </Button>
          </div>
          
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Breadcrumb navigation */}
        <nav className="flex items-center text-sm mt-3">
          <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">Home</a>
          <ChevronRight className="h-3 w-3 mx-2 text-gray-400" />
          <a href="#" className="text-blue-600 hover:text-blue-800">Room Reservations</a>
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
