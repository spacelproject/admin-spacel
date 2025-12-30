import React, { useState, useEffect, useContext, useRef } from 'react';
import Icon from '../AppIcon';
import { cn } from '../../utils/cn';

const Toast = ({ 
  message, 
  type = 'success', 
  duration = 4000, 
  onClose, 
  position = 'top-right',
  showIcon = true 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  if (!isVisible) return null;

  const getToastStyles = () => {
    const baseStyles = 'flex items-center space-x-3 px-4 py-3 rounded-lg border shadow-lg max-w-md transition-all duration-300';
    
    const typeStyles = {
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    const positionStyles = {
      'top-right': 'fixed top-4 right-4 z-toast',
      'top-left': 'fixed top-4 left-4 z-toast',
      'bottom-right': 'fixed bottom-4 right-4 z-toast',
      'bottom-left': 'fixed bottom-4 left-4 z-toast',
      'top-center': 'fixed top-4 left-1/2 transform -translate-x-1/2 z-toast'
    };

    const animationClass = isExiting 
      ? 'opacity-0 translate-y-2' :'opacity-100 translate-y-0';

    return cn(
      baseStyles,
      typeStyles?.[type],
      positionStyles?.[position],
      animationClass
    );
  };

  const getIconName = () => {
    const icons = {
      success: 'CheckCircle',
      error: 'XCircle',
      warning: 'AlertTriangle',
      info: 'Info'
    };
    return icons?.[type];
  };

  return (
    <div className={getToastStyles()}>
      {showIcon && (
        <Icon name={getIconName()} size={20} className="flex-shrink-0" />
      )}
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 ml-2 hover:opacity-70 transition-opacity"
      >
        <Icon name="X" size={16} />
      </button>
    </div>
  );
};

// Toast Provider Context
const ToastContext = React.createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  // Use a ref to avoid collisions caused by React state batching (multiple calls in same tick)
  const toastCounterRef = useRef(0);

  const showToast = (message, type = 'success', options = {}) => {
    // Date.now() can collide if multiple toasts are triggered in the same millisecond.
    // Use a counter + time + random for stable uniqueness.
    toastCounterRef.current += 1;
    const nextCounter = toastCounterRef.current;
    const randomPart =
      typeof crypto !== 'undefined' && crypto?.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    const id = `${Date.now()}-${nextCounter}-${randomPart}`;
    const toast = {
      id,
      message,
      type,
      ...options
    };

    setToasts(prev => [...prev, toast]);

    // Auto-remove toast after duration
    setTimeout(() => {
      removeToast(id);
    }, options?.duration || 4000);

    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev?.filter(toast => toast?.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts?.map(toast => (
          <Toast
            key={toast?.id}
            message={toast?.message}
            type={toast?.type}
            onClose={() => removeToast(toast?.id)}
            position={toast?.position}
            duration={toast?.duration}
            showIcon={toast?.showIcon}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Custom hook to use toast
export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default Toast;