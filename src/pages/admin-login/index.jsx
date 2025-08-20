import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import SecurityBadges from './components/SecurityBadges';
import BrandingHeader from './components/BrandingHeader';

const AdminLogin = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const adminUser = localStorage.getItem('adminUser');
    if (adminUser) {
      navigate('/dashboard-overview');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Main Container */}
      <div className="flex flex-col min-h-screen">
        {/* Header Section */}
        <header className="flex-shrink-0 pt-12 pb-8">
          <div className="container mx-auto px-4">
            <BrandingHeader />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            <LoginForm />
          </div>
        </main>

        {/* Footer Section */}
        <footer className="flex-shrink-0 py-12 border-t border-border bg-muted/30">
          <div className="container mx-auto px-4">
            <SecurityBadges />
            
            {/* Copyright */}
            <div className="text-center mt-8 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} SPACIO. All rights reserved. | 
                <span className="ml-1">Admin Portal v2.1.0</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                For technical support, contact: admin-support@spacio.com
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AdminLogin;