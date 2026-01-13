import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import Install from "./pages/Install";
import Dashboard from "./pages/Dashboard";
import Sites from "./pages/Sites";
import Checkpoints from "./pages/Checkpoints";
import Guards from "./pages/Guards";
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
import DataImport from "./pages/DataImport";
import AttendanceReport from "./pages/AttendanceReport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
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
            <Route
              path="/checkpoints"
              element={
                <ProtectedRoute>
                  <Checkpoints />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guards"
              element={
                <ProtectedRoute>
                  <Guards />
                </ProtectedRoute>
              }
            />
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
                <ProtectedRoute>
                  <SystemManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/data/user"
              element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/data/user/:id"
              element={
                <ProtectedRoute>
                  <UserDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/data/import"
              element={
                <ProtectedRoute>
                  <DataImport />
                </ProtectedRoute>
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
