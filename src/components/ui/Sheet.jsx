import React, { useEffect } from 'react';
import Icon from '../AppIcon';
import { cn } from '../../utils/cn';

const Sheet = ({ 
  isOpen, 
  onClose, 
  children, 
  title, 
  description,
  className = '',
  side = 'right' // 'right', 'left', 'top', 'bottom'
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const animationClasses = {
    right: isOpen ? 'translate-x-0' : 'translate-x-full',
    left: isOpen ? 'translate-x-0' : '-translate-x-full',
    top: isOpen ? 'translate-y-0' : '-translate-y-full',
    bottom: isOpen ? 'translate-y-0' : 'translate-y-full'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div 
        className={cn(
          'fixed inset-0 bg-black/50 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div 
        className={cn(
          'fixed z-50 bg-white shadow-xl transition-transform duration-300 ease-in-out flex flex-col',
          side === 'right' && 'right-0 top-0 h-full w-full max-w-2xl',
          side === 'left' && 'left-0 top-0 h-full w-full max-w-2xl',
          side === 'top' && 'top-0 left-0 w-full max-h-[85vh]',
          side === 'bottom' && 'bottom-0 left-0 w-full max-h-[85vh]',
          animationClasses[side],
          className
        )}
        data-state={isOpen ? 'open' : 'closed'}
      >
        {children}
      </div>
    </div>
  );
};

export const SheetHeader = ({ children, onClose, className = '' }) => {
  return (
    <div className={cn('flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0', className)}>
      <div className="flex-1">
        {children}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-4"
        >
          <Icon name="X" size={20} />
        </button>
      )}
    </div>
  );
};

export const SheetContent = ({ children, className = '' }) => {
  return (
    <div className={cn('flex-1 overflow-y-auto p-6 min-h-0', className)}>
      {children}
    </div>
  );
};

export const SheetFooter = ({ children, className = '' }) => {
  return (
    <div className={cn('px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end space-x-3 flex-shrink-0', className)}>
      {children}
    </div>
  );
};

export default Sheet;

