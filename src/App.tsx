import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { FirstLoginCheck } from "@/components/auth/FirstLoginCheck";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import Install from "./pages/Install";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import Sites from "./pages/Sites";
import ScanCheckIn from "./pages/ScanCheckIn";
// Checkpoints is now integrated into Sites page
// Guards page removed - merged into profiles
import Projects from "./pages/Projects";
import Notices from "./pages/Notices";
import PatrolPlans from "./pages/PatrolPlans";
import PatrolReports from "./pages/PatrolReports";
import Companies from "./pages/Companies";
import SystemManagement from "./pages/SystemManagement";
import UserManagement from "./pages/UserManagement";
import UserDetail from "./pages/UserDetail";
import PatrolDetail from "./pages/PatrolDetail";
import PatrolHistory from "./pages/PatrolHistory";
import PatrolCharts from "./pages/PatrolCharts";
import PatrolCalendar from "./pages/PatrolCalendar";
import AttendanceReport from "./pages/AttendanceReport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Simple auth-only route without first login check (for change-password page)
function AuthOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <FirstLoginCheck>
      <AppLayout>{children}</AppLayout>
    </FirstLoginCheck>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/install" element={<Install />} />
            <Route 
              path="/change-password" 
              element={
                <AuthOnlyRoute>
                  <ChangePassword />
                </AuthOnlyRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sites"
              element={
                <ProtectedRoute>
                  <Sites />
                </ProtectedRoute>
              }
            />
            {/* /checkpoints now redirects to /sites */}
            <Route path="/checkpoints" element={<Navigate to="/sites" replace />} />
            <Route
              path="/scan-checkin"
              element={
                <ProtectedRoute>
                  <ScanCheckIn />
                </ProtectedRoute>
              }
            />
            {/* Guards page removed - merged into profiles */}
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notices"
              element={
                <ProtectedRoute>
                  <Notices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/setup/plan"
              element={
                <ProtectedRoute>
                  <PatrolPlans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/basic/report"
              element={
                <ProtectedRoute>
                  <PatrolReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patrol/detail/:id"
              element={
                <ProtectedRoute>
                  <PatrolDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/basic/history"
              element={
                <ProtectedRoute>
                  <PatrolHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/basic/charts"
              element={
                <ProtectedRoute>
                  <PatrolCharts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/basic/calendar"
              element={
                <ProtectedRoute>
                  <PatrolCalendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies"
              element={
                <ProtectedRoute>
                  <Companies />
                </ProtectedRoute>
              }
            />
            <Route
              path="/data/system"
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                  <SystemManagement />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/data/user"
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                  <UserManagement />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/data/user/:id"
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                  <UserDetail />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/data/attendance-report"
              element={
                <ProtectedRoute>
                  <AttendanceReport />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
