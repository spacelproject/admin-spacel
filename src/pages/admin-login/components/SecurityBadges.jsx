import React from 'react';
import Icon from '../../../components/AppIcon';

const SecurityBadges = () => {
  const securityFeatures = [
    {
      id: 'ssl',
      icon: 'Shield',
      label: 'SSL Secured',
      description: '256-bit encryption'
    },
    {
      id: 'auth',
      icon: 'Lock',
      label: 'Secure Authentication',
      description: 'Multi-factor ready'
    },
    {
      id: 'monitoring',
      icon: 'Eye',
      label: 'Activity Monitoring',
      description: 'Real-time security'
    },
    {
      id: 'compliance',
      icon: 'CheckCircle',
      label: 'SOC 2 Compliant',
      description: 'Enterprise grade'
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-foreground mb-2">
          Enterprise Security Standards
        </h3>
        <p className="text-sm text-muted-foreground">
          Your admin session is protected by industry-leading security measures
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {securityFeatures.map((feature) => (
          <div
            key={feature.id}
            className="flex flex-col items-center p-4 bg-card border border-border rounded-lg hover:shadow-card transition-smooth"
          >
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-3">
              <Icon 
                name={feature.icon} 
                size={20} 
                className="text-primary"
              />
            </div>
            <h4 className="text-sm font-medium text-foreground mb-1 text-center">
              {feature.label}
            </h4>
            <p className="text-xs text-muted-foreground text-center">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* Trust Indicators */}
      <div className="flex items-center justify-center space-x-6 mt-8 pt-6 border-t border-border">
        <div className="flex items-center space-x-2">
          <Icon name="Shield" size={16} className="text-success" />
          <span className="text-xs text-muted-foreground">Secure Connection</span>
        </div>
        <div className="flex items-center space-x-2">
          <Icon name="Clock" size={16} className="text-primary" />
          <span className="text-xs text-muted-foreground">Session Timeout: 8 hours</span>
        </div>
        <div className="flex items-center space-x-2">
          <Icon name="Database" size={16} className="text-accent" />
          <span className="text-xs text-muted-foreground">Data Encrypted</span>
        </div>
      </div>
    </div>
  );
};

export default SecurityBadges;