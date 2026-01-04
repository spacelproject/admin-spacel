import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import { supabase } from '../../../lib/supabase';

const ContentTabs = ({ activeTab, onTabChange }) => {
  const [counts, setCounts] = useState({
    announcements: 0,
    documentation: 0,
    legal: 0,
    moderation: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setLoading(true);
        
        // Fetch announcements count
        const { count: announcementsCount } = await supabase
          .from('announcements')
          .select('*', { count: 'exact', head: true });
        
        // Fetch documentation count
        const { count: documentationCount } = await supabase
          .from('documentation')
          .select('*', { count: 'exact', head: true });
        
        // Fetch legal pages count
        const { count: legalCount } = await supabase
          .from('legal_pages')
          .select('*', { count: 'exact', head: true });
        
        // Fetch content reports count (pending/review)
        const { count: moderationCount } = await supabase
          .from('content_reports')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'under_review']);
        
        setCounts({
          announcements: announcementsCount || 0,
          documentation: documentationCount || 0,
          legal: legalCount || 0,
          moderation: moderationCount || 0
        });
      } catch (error) {
        console.error('Error fetching content counts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  const tabs = [
    {
      id: 'announcements',
      label: 'Announcements',
      icon: 'Megaphone',
      count: counts.announcements
    },
    {
      id: 'documentation',
      label: 'Documentation',
      icon: 'BookOpen',
      count: counts.documentation
    },
    {
      id: 'legal',
      label: 'Legal Pages',
      icon: 'Scale',
      count: counts.legal
    },
    {
      id: 'moderation',
      label: 'Content Moderation',
      icon: 'Shield',
      count: counts.moderation
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
              inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full min-w-[24px]
              ${activeTab === tab.id
                ? 'bg-primary/10 text-primary' :'bg-muted text-muted-foreground'
              }
            `}>
              {loading ? '...' : tab.count}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default ContentTabs;