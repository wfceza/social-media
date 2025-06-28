import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { FriendRequests } from "./components/FriendRequests"; // Adjust path as needed, assuming 'pages' folder
import { UserProfile } from "./components/UserProfile";     // Adjust path as needed
import { DirectMessages } from "./components/DirectMessages"; // Adjust path as needed

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename="social-media">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/friends" element={<FriendRequests />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/messages" element={<DirectMessages />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
