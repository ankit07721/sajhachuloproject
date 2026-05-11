import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Utensils, 
  LayoutGrid, 
  Users, 
  Tag, 
  Calendar, 
  ChefHat, 
  LogOut,
  Menu as MenuIcon,
  X,
  Bell,
  User as UserIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NotificationBell from "@/components/NotificationBell";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetClose 
} from "@/components/ui/sheet";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const menuItems = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Orders", path: "/admin/manage-orders", icon: ShoppingBag },
    { name: "Menu", path: "/admin/manage-menu", icon: Utensils },
    { name: "Categories", path: "/admin/manage-categories", icon: LayoutGrid },
    { name: "Customers", path: "/admin/manage-customers", icon: Users },
    { name: "Subscriptions", path: "/admin/manage-subscriptions", icon: Calendar },
    { name: "Chef Applications", path: "/admin/chef-applications", icon: ChefHat },
    { name: "Coupons", path: "/admin/manage-coupons", icon: Tag },
  ];

  const isActive = (path: string) => location.pathname === path;

  const SidebarContent = ({ isMobile = false }) => (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      <div className="p-6 flex items-center gap-3">
        <img
          src="/lovable-uploads/3eb505a2-d097-4c6c-b32c-4526e0a2aed2.png"
          alt="Plateful"
          className="h-8 w-auto brightness-0 invert"
        />
        <span className="font-bold text-xl tracking-tight">Admin</span>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          const LinkEl = (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                active 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "" : "group-hover:scale-110 transition-transform"}`} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );

          return isMobile ? (
            <SheetClose key={item.path} asChild>
              {LinkEl}
            </SheetClose>
          ) : LinkEl;
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors group"
        >
          <LogOut className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 h-full flex-shrink-0 shadow-2xl z-20">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 flex-shrink-0 z-10">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <MenuIcon className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 border-none">
                <SidebarContent isMobile />
              </SheetContent>
            </Sheet>
            
            <h2 className="text-lg font-semibold text-slate-800 capitalize hidden sm:block">
              {location.pathname.split("/").pop()?.replace("-", " ")}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-slate-900 leading-none">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">
                  Administrator
                </p>
              </div>
              <Avatar className="h-10 w-10 border-2 border-primary/20 p-0.5">
                <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${user?.firstName}`} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user?.firstName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
