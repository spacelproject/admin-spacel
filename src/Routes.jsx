import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import ProtectedRoute from "components/ProtectedRoute";
// Add your imports here
import AdminLogin from "pages/admin-login";
import AdminRegister from "pages/admin-register";
import DashboardOverview from "pages/dashboard-overview";
import CommissionManagement from "pages/commission-management";
import BookingManagement from "pages/booking-management";
import SpaceManagement from "pages/space-management";
import UserManagement from "pages/user-management";
import AnalyticsReports from "pages/analytics-reports";
import ContentManagement from "pages/content-management";
import SupportTicketSystem from "pages/support-ticket-system";
import SupportAgentTickets from "pages/support-agent-tickets";
import PlatformSettings from "pages/platform-settings";
import AccountDeletionRequests from "pages/account-deletion-requests";
import CityRequests from "pages/city-requests";
import AppUpdates from "pages/app-updates";
import TestPage from "pages/TestPage";
import NotFound from "pages/NotFound";

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <ScrollToTop />
      <RouterRoutes>
        {/* Public routes */}
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin-register" element={<AdminRegister />} />
        
        {/* Protected admin routes - require admin role */}
        <Route path="/" element={
          <ProtectedRoute requiredRole="admin">
            <DashboardOverview />
          </ProtectedRoute>
        } />
        <Route path="/dashboard-overview" element={
          <ProtectedRoute requiredRole="admin">
            <DashboardOverview />
          </ProtectedRoute>
        } />
        <Route path="/commission-management" element={
          <ProtectedRoute requiredRole="admin">
            <CommissionManagement />
          </ProtectedRoute>
        } />
        <Route path="/booking-management" element={
          <ProtectedRoute requiredRole="admin">
            <BookingManagement />
          </ProtectedRoute>
        } />
        <Route path="/space-management" element={
          <ProtectedRoute requiredRole="admin">
            <SpaceManagement />
          </ProtectedRoute>
        } />
        <Route path="/user-management" element={
          <ProtectedRoute requiredRole="admin">
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="/analytics-reports" element={
          <ProtectedRoute requiredRole="admin">
            <AnalyticsReports />
          </ProtectedRoute>
        } />
        <Route path="/content-management" element={
          <ProtectedRoute requiredRole="admin">
            <ContentManagement />
          </ProtectedRoute>
        } />
        <Route path="/support-ticket-system" element={
          <ProtectedRoute requiredRole="admin">
            <SupportTicketSystem />
          </ProtectedRoute>
        } />
        <Route path="/support-agent-tickets" element={
          <ProtectedRoute requiredRole="support">
            <SupportAgentTickets />
          </ProtectedRoute>
        } />
        <Route path="/platform-settings" element={
          <ProtectedRoute requiredRole="admin">
            <PlatformSettings />
          </ProtectedRoute>
        } />
        <Route path="/account-deletion-requests" element={
          <ProtectedRoute requiredRole="admin">
            <AccountDeletionRequests />
          </ProtectedRoute>
        } />
        <Route path="/city-requests" element={
          <ProtectedRoute requiredRole="admin">
            <CityRequests />
          </ProtectedRoute>
        } />
        <Route path="/app-updates" element={
          <ProtectedRoute requiredRole="admin">
            <AppUpdates />
          </ProtectedRoute>
        } />
        
        {/* Test route */}
        <Route path="/test" element={<TestPage />} />
        
        {/* 404 route */}
        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;