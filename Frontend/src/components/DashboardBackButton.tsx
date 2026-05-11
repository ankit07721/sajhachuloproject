import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

interface DashboardBackButtonProps {
  to?: string;
  label?: string;
}

const DashboardBackButton = ({ to, label = "Back to Dashboard" }: DashboardBackButtonProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      // Auto-detect dashboard based on user role
      if (user?.role === "admin") {
        navigate("/admin/dashboard");
      } else if (user?.role === "chef") {
        navigate("/chef/dashboard");
      } else {
        navigate(-1);
      }
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={handleBack}
      className="flex items-center gap-2 mb-6 hover:bg-accent -ml-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
};

export default DashboardBackButton;
