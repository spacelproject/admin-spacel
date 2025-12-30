import React, { createContext, useContext, useState, useEffect } from 'react';

const SidebarContext = createContext({
  isExpanded: true,
  setIsExpanded: () => {}
});

export const SidebarProvider = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const savedExpanded = localStorage.getItem('sidebar-expanded');
    if (savedExpanded !== null) {
      setIsExpanded(JSON.parse(savedExpanded));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  return (
    <SidebarContext.Provider value={{ isExpanded, setIsExpanded }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

