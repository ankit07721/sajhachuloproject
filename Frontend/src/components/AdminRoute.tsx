import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

const AdminRoute = () => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated && user?.role === "admin") {
    return <Outlet />;
  } else {
    console.warn("AdminRoute: Access denied. Redirecting to homepage.");
    return <Navigate to="/" replace/>;
  }
};

export default AdminRoute;
