import React from 'react'
import Icon from '../AppIcon'
import Skeleton from './Skeleton'

const LoadingSpinner = ({ 
  size = 24, 
  className = '', 
  text = 'Loading...',
  variant = 'spinner' // 'spinner' | 'skeleton'
}) => {
  // Convert string sizes to numbers
  const sizeMap = {
    'sm': 16,
    'md': 24,
    'lg': 32,
    'xl': 48
  }
  const iconSize = typeof size === 'string' ? sizeMap[size] || 24 : size
  if (variant === 'skeleton') {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen ${className}`}>
        <Skeleton className={`h-${size} w-${size} rounded-full mb-4`} />
        {text && (
          <Skeleton className="h-4 w-20" />
        )}
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen ${className}`}>
      <Icon 
        name="Loader2" 
        size={iconSize} 
        className="animate-spin text-primary mb-4" 
      />
      {text && (
        <p className="text-muted-foreground text-sm">{text}</p>
      )}
    </div>
  )
}

export default LoadingSpinner
