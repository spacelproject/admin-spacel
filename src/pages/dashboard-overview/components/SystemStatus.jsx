import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { useSystemStatus } from '../../../hooks/useSystemStatus';

const SystemStatus = () => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { metrics, loading, error, overallStatus } = useSystemStatus();

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-amber-600 bg-amber-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
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

  const handleShowDetailsModal = () => {
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-4 card-shadow h-full flex flex-col">
        <div className="mb-2.5">
          <h3 className="text-base font-semibold text-gray-900 tracking-tight">System Status</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            See live health indicators for key services at a glance and spot issues early.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          <div className="space-y-2 flex-1">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-muted animate-pulse rounded-full" />
                    <div className="space-y-1">
                      <div className="h-4 bg-muted animate-pulse rounded w-24" />
                      <div className="h-3 bg-muted animate-pulse rounded w-16" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-4 bg-muted animate-pulse rounded w-20" />
                    <div className="h-3 bg-muted animate-pulse rounded w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <Icon name="AlertCircle" size={20} className="text-error mx-auto mb-2" />
              <p className="text-xs text-error">Failed to load system status</p>
              <p className="text-[11px] text-muted-foreground">{error}</p>
            </div>
          ) : (
            <>
              {metrics?.map((metric) => (
                <div 
                  key={metric?.id} 
                  className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-smooth cursor-pointer"
                  onClick={handleShowDetailsModal}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-1.5 rounded-full ${getStatusColor(metric?.status)}`}>
                      <Icon name={getStatusIcon(metric?.status)} size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 leading-tight">
                        {metric?.name}
                      </p>
                      <p className="text-xs font-normal text-gray-500 leading-tight">
                        {metric?.lastCheck}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-sm font-semibold leading-tight ${
                      metric?.status === 'operational' ? 'text-green-600' :
                      metric?.status === 'warning' ? 'text-amber-600' :
                      metric?.status === 'error' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {getStatusText(metric?.status)}
                    </p>
                    <p className="text-xs font-normal text-gray-500 leading-tight">
                      {metric?.uptime}
                    </p>
                  </div>
                </div>
              ))}
              {/* Overall Status */}
              <div className="pt-2 mt-2 border-t border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-600">Overall Status</span>
                  <div className="flex items-center space-x-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      overallStatus.status === 'operational' ? 'bg-green-500' :
                      overallStatus.status === 'warning' ? 'bg-amber-500' :
                      overallStatus.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                    }`}></div>
                    <span className={`font-semibold text-sm ${overallStatus.color}`}>
                      {overallStatus.text}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
          </div>
        </div>

        <div className="mt-auto pt-2.5 border-t border-gray-200 flex-shrink-0">
          <Button 
            variant="outline" 
            fullWidth 
            size="xs"
            iconName="Activity"
            onClick={handleShowDetailsModal}
            className="text-xs font-medium hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
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
              {metrics?.map((metric) => (
                <div key={metric?.id} className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`p-2 rounded-full ${getStatusColor(metric?.status)}`}>
                      <Icon name={getStatusIcon(metric?.status)} size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-card-foreground">{metric?.name}</h3>
                      <p className={`text-sm font-medium ${
                        metric?.status === 'operational' ? 'text-green-600' :
                        metric?.status === 'warning' ? 'text-amber-600' :
                        metric?.status === 'error' ? 'text-red-600' : 'text-gray-600'
                      }`}>
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