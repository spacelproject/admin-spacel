import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
// Add your imports here
import AdminLogin from "pages/admin-login";
import DashboardOverview from "pages/dashboard-overview";
import CommissionManagement from "pages/commission-management";
import BookingManagement from "pages/booking-management";
import SpaceManagement from "pages/space-management";
import UserManagement from "pages/user-management";
import AnalyticsReports from "pages/analytics-reports";
import ContentManagement from "pages/content-management";
import SupportTicketSystem from "pages/support-ticket-system";
import PlatformSettings from "pages/platform-settings";
import NotFound from "pages/NotFound";

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <ScrollToTop />
      <RouterRoutes>
        {/* Define your routes here */}
        <Route path="/" element={<DashboardOverview />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/dashboard-overview" element={<DashboardOverview />} />
        <Route path="/commission-management" element={<CommissionManagement />} />
        <Route path="/booking-management" element={<BookingManagement />} />
        <Route path="/space-management" element={<SpaceManagement />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/analytics-reports" element={<AnalyticsReports />} />
        <Route path="/content-management" element={<ContentManagement />} />
        <Route path="/support-ticket-system" element={<SupportTicketSystem />} />
        <Route path="/platform-settings" element={<PlatformSettings />} />
        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;