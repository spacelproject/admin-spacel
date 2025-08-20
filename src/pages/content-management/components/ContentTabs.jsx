import React from 'react';
import Icon from '../../../components/AppIcon';

const ContentTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    {
      id: 'announcements',
      label: 'Announcements',
      icon: 'Megaphone',
      count: 12
    },
    {
      id: 'documentation',
      label: 'Documentation',
      icon: 'BookOpen',
      count: 45
    },
    {
      id: 'legal',
      label: 'Legal Pages',
      icon: 'Scale',
      count: 8
    },
    {
      id: 'moderation',
      label: 'Content Moderation',
      icon: 'Shield',
      count: 23
    }
  ];

  return (
    <div className="border-b border-border bg-card">
      <nav className="flex space-x-8 px-6" aria-label="Content management tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-smooth
              ${activeTab === tab.id
                ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
              }
            `}
          >
            <Icon name={tab.icon} size={16} />
            <span>{tab.label}</span>
            <span className={`
              inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full
              ${activeTab === tab.id
                ? 'bg-primary/10 text-primary' :'bg-muted text-muted-foreground'
              }
            `}>
              {tab.count}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default ContentTabs;