import { BookOpen, Calendar, ChevronRight } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-white shadow-sm py-4 px-6 mb-6">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-blue-600">Charlotte Mecklenburg Library</h1>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">Help</a>
            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">Account</a>
          </div>
        </div>
        
        <nav className="flex items-center text-sm mt-2">
          <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">Home</a>
          <ChevronRight className="h-3 w-3 mx-2 text-gray-400" />
          <a href="#" className="text-blue-600 hover:text-blue-800">Room Reservations</a>
          <ChevronRight className="h-3 w-3 mx-2 text-gray-400" />
          <span className="text-gray-600">South Boulevard Branch</span>
        </nav>
        
        <div className="mt-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Calendar className="h-6 w-6 mr-2 text-blue-600" /> 
            Room Reservation
          </h2>
        </div>
      </div>
    </header>
  );
}
