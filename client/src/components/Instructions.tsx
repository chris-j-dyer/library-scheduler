import { Button } from "@/components/ui/button";
import { Calendar, RefreshCcw, Clock, Info, HelpCircle, CheckCircle2 } from "lucide-react";

export default function Instructions() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <Info className="h-5 w-5 mr-2 text-blue-600" />
        How to Reserve a Study Room
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
        <div className="p-4 border border-gray-100 rounded-lg bg-blue-50">
          <div className="flex items-center mb-3">
            <div className="bg-blue-600 text-white rounded-full h-8 w-8 flex items-center justify-center mr-3">1</div>
            <h3 className="font-medium text-gray-800">Select Date & Room</h3>
          </div>
          <p className="text-gray-600 text-sm">Choose the date and filter rooms based on your needs. Click on a room to view details.</p>
        </div>
        
        <div className="p-4 border border-gray-100 rounded-lg bg-blue-50">
          <div className="flex items-center mb-3">
            <div className="bg-blue-600 text-white rounded-full h-8 w-8 flex items-center justify-center mr-3">2</div>
            <h3 className="font-medium text-gray-800">Pick Time Slot</h3>
          </div>
          <p className="text-gray-600 text-sm">Click on an available time slot (blue) in the calendar grid. You can reserve for up to 2 hours.</p>
        </div>
        
        <div className="p-4 border border-gray-100 rounded-lg bg-blue-50">
          <div className="flex items-center mb-3">
            <div className="bg-blue-600 text-white rounded-full h-8 w-8 flex items-center justify-center mr-3">3</div>
            <h3 className="font-medium text-gray-800">Confirm Booking</h3>
          </div>
          <p className="text-gray-600 text-sm">Review your selection and click <span className="font-medium text-blue-600">Submit</span> to complete your reservation.</p>
        </div>
      </div>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 flex items-start">
        <HelpCircle className="h-5 w-5 text-yellow-500 mr-3 mt-0.5" />
        <div>
          <h4 className="font-medium text-gray-800">Important Note</h4>
          <p className="text-sm text-gray-600">Study rooms may only be booked online or in-person at the branch on the day of your visit. For assistance, contact the branch at 704-416-6400.</p>
        </div>
      </div>
      
      <div className="mt-4 flex flex-wrap gap-3 justify-end items-center text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-[#00a2ff] rounded-sm mr-2"></div>
          <span className="text-gray-600">Available</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-[#e0e0e0] rounded-sm mr-2"></div>
          <span className="text-gray-600">Occupied</span>
        </div>
      </div>
    </div>
  );
}
