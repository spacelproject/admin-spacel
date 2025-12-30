import React, { useState } from 'react';
import AdminSidebar from '../../components/ui/AdminSidebar';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import NotificationBell from '../../components/NotificationBell';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import ContentTabs from './components/ContentTabs';
import AnnouncementsTab from './components/AnnouncementsTab';
import DocumentationTab from './components/DocumentationTab';
import LegalPagesTab from './components/LegalPagesTab';
import ModerationTab from './components/ModerationTab';
import { ToastProvider } from '../../components/ui/Toast';
import { StatsCardSkeleton, TableSkeleton } from '../../components/ui/Skeleton';

const ContentManagement = () => {
  const [activeTab, setActiveTab] = useState('announcements');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'announcements':
        return <AnnouncementsTab />;
      case 'documentation':
        return <DocumentationTab />;
      case 'legal':
        return <LegalPagesTab />;
      case 'moderation':
        return <ModerationTab />;
      default:
        return <AnnouncementsTab />;
    }
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        <AdminSidebar />
        
        <div className="lg:ml-sidebar">
          {/* Header */}
          <header className="sticky top-0 z-header header-modern">
            <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <h1 className="text-xl font-semibold text-gray-900">Content Management</h1>
              </div>
              
              <div className="flex items-center space-x-3">
                <NotificationBell />
                <UserProfileDropdown />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-4 lg:p-6">
            <BreadcrumbNavigation />
            
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden card-shadow">
              <ContentTabs activeTab={activeTab} onTabChange={setActiveTab} />
              {renderTabContent()}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
};

export default ContentManagement;