import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ActionDropdown = ({ 
  item, 
  type = 'content', 
  onEdit, 
  onDuplicate, 
  onPublish, 
  onArchive, 
  onDelete,
  onApprove,
  onReject,
  onViewHistory,
  position = 'right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, placement: 'bottom' });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef?.current && 
        !containerRef?.current?.contains(event?.target) &&
        dropdownRef?.current &&
        !dropdownRef?.current?.contains(event?.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePosition = () => {
        if (!buttonRef.current) return;
        
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const spaceBelow = viewportHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        const estimatedDropdownHeight = 300; // Approximate height
        const dropdownWidth = 220; // max-w-[220px]

        // Calculate horizontal position
        let left = buttonRect.left;
        if (position === 'left') {
          left = buttonRect.right - dropdownWidth;
        }
        
        // Ensure dropdown doesn't go off screen
        if (left + dropdownWidth > viewportWidth) {
          left = viewportWidth - dropdownWidth - 10;
        }
        if (left < 10) {
          left = 10;
        }

        // Calculate vertical position
        let top = buttonRect.bottom + 4; // mt-1 = 4px
        let placement = 'bottom';
        
        if (spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow) {
          // Position above
          top = buttonRect.top - estimatedDropdownHeight;
          placement = 'top';
        }

        setDropdownPosition({
          top: Math.max(10, top),
          left,
          placement
        });
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, position]);

  const handleAction = (action, callback) => {
    setIsOpen(false);
    if (callback) {
      callback(item);
    }
  };

  const getActions = () => {
    const commonActions = [
      {
        label: 'Edit',
        icon: 'Edit',
        onClick: onEdit,
        show: true
      },
      {
        label: 'Duplicate',
        icon: 'Copy',
        onClick: onDuplicate,
        show: type !== 'moderation'
      },
      {
        label: 'View History',
        icon: 'History',
        onClick: onViewHistory,
        show: type !== 'moderation'
      }
    ];

    // Status-based actions
    const statusActions = [];

    if (type === 'moderation') {
      if (item?.status === 'pending' || item?.status === 'under_review') {
        statusActions?.push(
          {
            label: 'Approve',
            icon: 'Check',
            onClick: onApprove,
            variant: 'success',
            show: true
          },
          {
            label: 'Reject',
            icon: 'X',
            onClick: onReject,
            variant: 'destructive',
            show: true
          }
        );
      }
    } else {
      // Publishing actions for content
      if (item?.status === 'draft') {
        statusActions?.push({
          label: 'Publish',
          icon: 'Globe',
          onClick: onPublish,
          variant: 'success',
          show: true
        });
      } else if (item?.status === 'published') {
        statusActions?.push({
          label: 'Unpublish',
          icon: 'EyeOff',
          onClick: onArchive,
          show: true
        });
      }

      if (item?.status === 'published' || item?.status === 'draft') {
        statusActions?.push({
          label: item?.status === 'published' ? 'Archive' : 'Move to Archive',
          icon: 'Archive',
          onClick: onArchive,
          show: true
        });
      }
    }

    // Destructive actions
    const destructiveActions = [
      {
        label: 'Delete',
        icon: 'Trash2',
        onClick: onDelete,
        variant: 'destructive',
        show: true,
        divider: true
      }
    ];

    return [...commonActions, ...statusActions, ...destructiveActions]?.filter(action => action?.show);
  };

  const actions = getActions();

  if (actions?.length === 0) return null;

  return (
    <div className="relative" ref={containerRef}>
      <div ref={buttonRef}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          iconName="MoreHorizontal"
          className="h-8 w-8 p-0"
        />
      </div>
      {isOpen && createPortal(
        <div 
          className="fixed z-[9999] min-w-[180px] max-w-[220px] bg-card border border-border rounded-md shadow-lg"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            maxHeight: '400px',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
          ref={dropdownRef}
        >
          <div className="py-1">
            {actions?.map((action, index) => (
              <div key={index}>
                {action?.divider && index > 0 && (
                  <div className="h-px bg-border my-1" />
                )}
                <button
                  onClick={() => handleAction(action?.label, action?.onClick)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center space-x-2 hover:bg-muted whitespace-nowrap ${
                    action?.variant === 'destructive' ?'text-destructive hover:bg-destructive/10' 
                      : action?.variant === 'success' ?'text-success hover:bg-success/10' :'text-foreground'
                  }`}
                >
                  <Icon name={action?.icon} size={14} className="flex-shrink-0" />
                  <span className="truncate">{action?.label}</span>
                </button>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ActionDropdown;