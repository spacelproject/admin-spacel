import React from 'react';

const BrandingHeader = () => {
  return (
    <div className="text-center mb-12">
      {/* Logo */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <svg width="48" height="48" viewBox="0 0 48 48" className="text-primary">
              <rect width="48" height="48" rx="8" fill="currentColor"/>
              <text x="24" y="32" textAnchor="middle" className="fill-white font-bold text-2xl">S</text>
            </svg>
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-bold text-foreground">SPACIO</h1>
            <p className="text-sm text-muted-foreground">Administrative Dashboard</p>
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="max-w-md mx-auto">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Welcome Back
        </h2>
        <p className="text-muted-foreground">
          Access your administrative dashboard to manage the SPACIO platform efficiently and securely.
        </p>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center justify-center space-x-2 mt-6 p-3 bg-success/10 border border-success/20 rounded-md max-w-sm mx-auto">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
        <span className="text-sm text-success font-medium">System Status: Operational</span>
      </div>
    </div>
  );
};

export default BrandingHeader;