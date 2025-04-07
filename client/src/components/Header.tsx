export default function Header() {
  return (
    <header className="border-b border-gray-300 py-3 px-4">
      <div className="max-w-screen-xl mx-auto">
        <nav className="flex text-[#0066cc] text-sm">
          <a href="#" className="mr-2 font-medium">Charlotte Mecklenburg Library</a>
          <span className="mx-2">/</span>
          <a href="#" className="mr-2">LibCal</a>
          <span className="mx-2">/</span>
          <span className="text-gray-600">Space Availability - South Boulevard</span>
        </nav>
      </div>
    </header>
  );
}
