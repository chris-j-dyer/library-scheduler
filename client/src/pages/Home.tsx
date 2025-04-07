import Header from '@/components/Header';
import FilterControls from '@/components/FilterControls';
import Instructions from '@/components/Instructions';
import CalendarView from '@/components/CalendarView';
import RoomList from '@/components/RoomList';

export default function Home() {
  return (
    <div className="bg-white text-gray-800 min-h-screen">
      <Header />
      <main className="max-w-screen-xl mx-auto p-4">
        <FilterControls />
        <Instructions />
        <CalendarView />
      </main>
    </div>
  );
}
