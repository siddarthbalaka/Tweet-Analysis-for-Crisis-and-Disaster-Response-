import { Button } from "@/components/ui/button";

const Navbar = () => {
  return (
    <nav className="bg-blue-600 text-white px-6 py-3 flex items-center justify-between shadow-md">
      <h1 className="text-lg font-bold">Crisis Dashboard</h1>
      <div className="flex gap-4">
        <Button variant="ghost" className="text-white hover:bg-blue-700">
          Dashboard
        </Button>
        <Button variant="ghost" className="text-white hover:bg-blue-700">
          Map
        </Button>
        <Button variant="ghost" className="text-white hover:bg-blue-700">
          Reports
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;
