import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu as MenuIcon, ShoppingCart, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Navigation = () => {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { itemCount } = useCart();

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Menu", path: "/menu" },
    { name: "Shop", path: "/shop" },
    { name: "Chefs", path: "/chefs" },

    ...(!isAuthenticated || user?.role === "customer"
    ? [{ name: "Meal Plans", path: "/meal-plans" }]
    : []),

    ...(!isAuthenticated || user?.role === "customer"
    ? [{ name: "Become a Chef", path: "/chef-apply" }]
    : []),


   
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Reusable NavLink component to avoid repetition
  const NavLink = ({
    path,
    name,
    isMobile = false,
    onLinkClick,
  }: {
    path: string;
    name: string;
    isMobile?: boolean;
    onLinkClick?: () => void;
  }) => {
    const baseClasses = "transition-colors font-medium";
    const activeClass = isMobile
      ? "bg-primary text-primary-foreground"
      : "text-primary";
    const inactiveClass = isMobile
      ? "text-foreground hover:bg-accent"
      : "text-foreground hover:text-primary";
    const mobileClasses = isMobile
      ? "block px-3 py-2 text-base rounded-md"
      : "";

    const LinkComponent = (
      <Link
        to={path}
        className={`${baseClasses} ${
          isActive(path) ? activeClass : inactiveClass
        } ${mobileClasses}`}
        onClick={onLinkClick}
      >
        {name}
      </Link>
    );

    return isMobile ? (
      <SheetClose asChild>{LinkComponent}</SheetClose>
    ) : (
      LinkComponent
    );
  };

  const AuthActions = ({ isMobile = false }) => (
    <div
      className={`flex items-center gap-2 ${isMobile ? "flex-col w-full" : ""}`}
    >
      {isAuthenticated ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={`relative h-10 w-10 rounded-full ${
                isMobile ? "self-end" : ""
              }`}
            >
              <Avatar>
                <AvatarImage
                  src={`https://api.dicebear.com/8.x/initials/svg?seed=${user?.firstName}`}
                  alt={user?.firstName}
                />
                <AvatarFallback>{user?.firstName?.charAt(0)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Hi, {user?.firstName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user?.role === "admin" && (
              <DropdownMenuItem asChild>
                <Link to="/admin/dashboard" className="w-full">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Admin Dashboard</span>
                </Link>
              </DropdownMenuItem>
            )}
            {user?.role === "chef" && (
              <DropdownMenuItem asChild>
                <Link to="/chef/dashboard" className="w-full">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Chef Dashboard</span>
                </Link>
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem asChild>
              <Link to="/profile" className="w-full">
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/orders" className="w-full">
                My Orders
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/my-subscription" className="w-full">
                My Subscription
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : isMobile ? (
        <SheetClose asChild>
          <Link to="/login" className="w-full">
            <Button variant="outline" className="w-full">
              Login / Sign Up
            </Button>
          </Link>
        </SheetClose>
      ) : (
        <Link to="/login">
          <Button variant="ghost">Login</Button>
        </Link>
      )}
      {!isMobile && (
        <Link to="/menu">
          <Button className="gradient-primary border-0 shadow-warm">
            Order Now
          </Button>
        </Link>
      )}
    </div>
  );

  return (
    <nav className="w-full bg-card/95 backdrop-blur-sm border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 hover-lift">
            <img
              src="/lovable-uploads/3eb505a2-d097-4c6c-b32c-4526e0a2aed2.png"
              alt="Plateful"
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <NavLink key={item.name} {...item} />
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center space-x-2">
            <Link to="/cart" className="relative hover-lift">
              <Button variant="ghost" size="icon">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground min-w-[20px] h-5 flex items-center justify-center text-xs">
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </Link>
            <AuthActions />
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center gap-2">
            <Link to="/cart" className="relative">
              <Button variant="ghost" size="icon">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
                  >
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </Link>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MenuIcon className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[340px]">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b">
                    <AuthActions isMobile />
                  </div>
                  <div className="flex flex-col space-y-2 p-4">
                    {navItems.map((item) => (
                      <NavLink key={item.name} {...item} isMobile />
                    ))}
                  </div>
                  <div className="mt-auto p-4">
                    <SheetClose asChild>
                      <Link to="/menu">
                        <Button className="w-full gradient-primary border-0 shadow-warm">
                          Order Now
                        </Button>
                      </Link>
                    </SheetClose>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
