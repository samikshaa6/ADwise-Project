import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { Layout } from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import MapView from "./pages/MapView";
import Listings from "./pages/Listings";
import Analytics from "./pages/Analytics";
import Advertiser from "./pages/Advertiser";
import OwnerBillboards from "./pages/OwnerBillboards";
import OwnerBookings from "./pages/OwnerBookings";
import CustomerBookings from "./pages/CustomerBookings";
import SystemDocumentation from "./pages/SystemDocumentation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Layout><Dashboard /></Layout>} />
            <Route path="/map" element={<Layout><MapView /></Layout>} />
            <Route path="/listings" element={<Layout><Listings /></Layout>} />
            <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
            <Route path="/advertiser" element={<Layout><Advertiser /></Layout>} />
            <Route path="/owner/billboards" element={<Layout><OwnerBillboards /></Layout>} />
            <Route path="/owner/bookings" element={<Layout><OwnerBookings /></Layout>} />
            <Route path="/my-bookings" element={<Layout><CustomerBookings /></Layout>} />
            <Route path="/docs" element={<SystemDocumentation />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
