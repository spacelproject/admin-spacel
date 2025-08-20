import React, { useState } from 'react';
import AdminSidebar from '../../components/ui/AdminSidebar';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import ContentTabs from './components/ContentTabs';
import AnnouncementsTab from './components/AnnouncementsTab';
import DocumentationTab from './components/DocumentationTab';
import LegalPagesTab from './components/LegalPagesTab';
import ModerationTab from './components/ModerationTab';

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
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      
      <div className="lg:ml-sidebar">
        {/* Header */}
        <header className="h-header bg-header-background border-b border-header-border px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-header-foreground">Content Management</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <UserProfileDropdown />
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          <BreadcrumbNavigation />
          
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <ContentTabs activeTab={activeTab} onTabChange={setActiveTab} />
            {renderTabContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ContentManagement;