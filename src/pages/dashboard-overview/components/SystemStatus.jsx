import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const SystemStatus = () => {
  const navigate = useNavigate();
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const systemMetrics = [
    {
      id: 'server',
      name: 'Server Status',
      status: 'operational',
      uptime: '99.9%',
      lastCheck: '2 min ago',
      details: {
        location: 'US-East-1',
        responseTime: '45ms',
        cpu: '23%',
        memory: '67%',
        incidents: 0
      }
    },
    {
      id: 'database',
      name: 'Database',
      status: 'operational',
      uptime: '99.8%',
      lastCheck: '1 min ago',
      details: {
        location: 'US-East-1',
        responseTime: '12ms',
        connections: '45/100',
        storage: '78%',
        incidents: 0
      }
    },
    {
      id: 'payments',
      name: 'Payment Gateway',
      status: 'warning',
      uptime: '98.5%',
      lastCheck: '5 min ago',
      details: {
        provider: 'Stripe',
        responseTime: '120ms',
        successRate: '98.5%',
        failedTransactions: 12,
        incidents: 1
      }
    },
    {
      id: 'notifications',
      name: 'Notification Service',
      status: 'operational',
      uptime: '99.7%',
      lastCheck: '3 min ago',
      details: {
        emailQueue: '234',
        smsQueue: '45',
        deliveryRate: '99.7%',
        bounceRate: '0.8%',
        incidents: 0
      }
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational':
        return 'text-success bg-success/10';
      case 'warning':
        return 'text-warning bg-warning/10';
      case 'error':
        return 'text-error bg-error/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'operational':
        return 'CheckCircle';
      case 'warning':
        return 'AlertTriangle';
      case 'error':
        return 'XCircle';
      default:
        return 'Clock';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'warning':
        return 'Degraded';
      case 'error':
        return 'Down';
      default:
        return 'Unknown';
    }
  };

  const handleViewDetails = () => {
    // For now, navigate to platform settings where system monitoring could be configured
    // In a real application, this might open a detailed system status page or modal
    navigate('/platform-settings?tab=system-monitoring');
  };

  const handleShowDetailsModal = () => {
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
  };

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-6 card-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-card-foreground">System Status</h3>
          <button 
            onClick={handleViewDetails}
            className="text-sm text-primary hover:text-primary/80 transition-smooth"
          >
            View Details
          </button>
        </div>

        <div className="space-y-4">
          {systemMetrics?.map((metric) => (
            <div 
              key={metric?.id} 
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-smooth cursor-pointer"
              onClick={handleShowDetailsModal}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-1 rounded-full ${getStatusColor(metric?.status)}`}>
                  <Icon name={getStatusIcon(metric?.status)} size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-card-foreground">
                    {metric?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last check: {metric?.lastCheck}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`text-sm font-medium ${getStatusColor(metric?.status)?.split(' ')?.[0]}`}>
                  {getStatusText(metric?.status)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {metric?.uptime} uptime
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Status</span>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span className="text-success font-medium">All Systems Operational</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Button 
            variant="outline" 
            fullWidth 
            size="sm"
            iconName="Activity"
            onClick={handleShowDetailsModal}
          >
            View Detailed Metrics
          </Button>
        </div>
      </div>
      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-border p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-card-foreground">System Status Details</h2>
              <button
                onClick={handleCloseDetailsModal}
                className="text-muted-foreground hover:text-foreground transition-smooth"
              >
                <Icon name="X" size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {systemMetrics?.map((metric) => (
                <div key={metric?.id} className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`p-2 rounded-full ${getStatusColor(metric?.status)}`}>
                      <Icon name={getStatusIcon(metric?.status)} size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-card-foreground">{metric?.name}</h3>
                      <p className={`text-sm font-medium ${getStatusColor(metric?.status)?.split(' ')?.[0]}`}>
                        {getStatusText(metric?.status)} - {metric?.uptime} uptime
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {Object.entries(metric?.details || {})?.map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">
                          {key?.replace(/([A-Z])/g, ' $1')?.trim()}:
                        </span>
                        <span className="text-card-foreground font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <Button variant="default" fullWidth onClick={handleCloseDetailsModal}>
                Close Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SystemStatus;