import React from 'react'
import Icon from '../AppIcon'
import Button from './Button'
import { formatErrorForUser } from '../../utils/errorHandler'

/**
 * Standardized error state component
 * Provides consistent error UI across the application
 */
const ErrorState = ({ 
  error, 
  onRetry,
  title = 'Something went wrong',
  className = '' 
}) => {
  const errorMessage = error ? formatErrorForUser(error) : 'An unexpected error occurred'

  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      <div className="mb-4 p-3 bg-destructive/10 rounded-full">
        <Icon name="AlertCircle" size={32} className="text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">{errorMessage}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="default" iconName="RefreshCw">
          Try Again
        </Button>
      )}
    </div>
  )
}

export default ErrorState

