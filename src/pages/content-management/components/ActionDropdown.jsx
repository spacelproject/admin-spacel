import React, { useState, useRef, useEffect } from 'react';
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
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef?.current && !dropdownRef?.current?.contains(event?.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        iconName="MoreHorizontal"
        className="h-8 w-8 p-0"
      />
      {isOpen && (
        <div className={`absolute top-full z-50 mt-1 min-w-[180px] bg-card border border-border rounded-md shadow-lg ${
          position === 'left' ? 'right-0' : 'left-0'
        }`}>
          <div className="py-1">
            {actions?.map((action, index) => (
              <div key={index}>
                {action?.divider && index > 0 && (
                  <div className="h-px bg-border my-1" />
                )}
                <button
                  onClick={() => handleAction(action?.label, action?.onClick)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center space-x-2 hover:bg-muted ${
                    action?.variant === 'destructive' ?'text-destructive hover:bg-destructive/10' 
                      : action?.variant === 'success' ?'text-success hover:bg-success/10' :'text-foreground'
                  }`}
                >
                  <Icon name={action?.icon} size={14} />
                  <span>{action?.label}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionDropdown;