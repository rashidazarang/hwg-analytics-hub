import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import PerformanceMetrics from "./pages/PerformanceMetrics";
import Leaderboard from "./pages/Leaderboard";
import Agreements from "./pages/Agreements";
import Claims from "./pages/Claims";
import ClaimDetail from "./pages/ClaimDetail";
import DealerProfile from "./pages/DealerProfile";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Import Sidebar for reference
import Sidebar from "./components/navigation/Sidebar";

const App = () => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 1000 * 60 * 60,
        gcTime: 1000 * 60 * 60 * 2,
      },
    },
  }));

  console.log("App: QueryClient created and persisted using useState");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster position="bottom-right" closeButton expand={false} />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Index />} />
              <Route path="/agreements" element={<Agreements />} />
              <Route path="/claims" element={<Claims />} />
              <Route path="/claims/:claimId" element={<ClaimDetail />} />
              <Route path="/performance" element={<PerformanceMetrics />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/dealer/:dealerId" element={<DealerProfile />} />
            </Route>
            
            {/* Not found route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
