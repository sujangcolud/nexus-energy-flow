import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const ReportsTab = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the combined reports tab
    navigate("/dashboard/reports", { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <p className="text-xl font-semibold text-black">
          Redirecting to Reports...
        </p>
      </div>
    </div>
  );
};

export default ReportsTab;
