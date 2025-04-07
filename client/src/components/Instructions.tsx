import { Button } from "@/components/ui/button";
import { Calendar, RefreshCcw } from "lucide-react";

export default function Instructions() {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-medium mb-4">To Reserve a Study Room</h2>
      <ul className="list-disc pl-6 space-y-3">
        <li>Use the drop down boxes above if you wish to change the location, "type" of room or by number of attendees.</li>
        <li>
          Use the 
          <Button 
            variant="outline" 
            size="sm" 
            className="border border-[#ddd] px-2 py-0.5 mx-1 bg-gray-100 rounded text-sm inline-flex items-center h-[26px] min-h-[26px]"
          >
            <Calendar className="h-4 w-4 mr-1" />
            Go To Date
          </Button>
          button for a calendar view. STUDY ROOMS MAY ONLY BE BOOKED ONLINE OR IN-PERSON AT THE BRANCH ON THE DAY OF.
        </li>
        <li>
          Click the 
          <span className="info-btn mx-1">info</span>
          box to view a room's details.
        </li>
        <li>Use the colored grid to select the start time of your meeting (this will default to a one-hour period).</li>
        <li>You can adjust the end time in the drop-down box <span className="font-medium">below</span> the grid for up to 2 hours.</li>
        <li>
          If you want to change your time or start over, please click the 
          <Button 
            variant="outline" 
            size="sm" 
            className="border border-[#ddd] px-2 py-0.5 mx-1 bg-gray-100 rounded text-sm inline-flex items-center h-[26px] min-h-[26px]"
          >
            <RefreshCcw className="h-4 w-4 mr-1" />
          </Button>
          button below the grid. (Otherwise the time will be grayed out/blocked until the system refreshes).
        </li>
        <li>
          When you are satisfied with your request, select the 
          <Button 
            size="sm" 
            className="bg-blue-600 text-white px-2 py-1 rounded text-sm mx-1 h-[26px] min-h-[26px]"
          >
            Submit Times
          </Button>
          button. Thank you!
        </li>
      </ul>
      <p className="mt-4 text-sm">If you need help completing the form, please contact the branch at 704-416-6400.</p>
    </div>
  );
}
