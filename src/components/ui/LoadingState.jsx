import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import Icon from '../AppIcon';

/**
 * Standardized loading state component
 * Shows a spinner with "Fetching information..." message
 */
const LoadingState = ({ 
  message = 'Fetching information...',
  fullScreen = false,
  className = ''
}) => {
  const content = (
    <div className={`flex flex-col items-center justify-center ${fullScreen ? 'min-h-screen' : 'py-12'} ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        <Icon name="Loader2" size={20} className="animate-spin text-primary" />
        {message && (
          <p className="text-sm font-medium text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-background">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingState;
