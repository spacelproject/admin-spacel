import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import SpaceStatusBadge from './SpaceStatusBadge';

const SpaceTable = ({ 
  spaces = [], 
  selectedSpaces, 
  onSelectSpace, 
  onSelectAll, 
  onQuickAction, 
  onViewDetails,
  onSuspendQuick,
  onUnsuspendQuick,
  isUpdatingStatus = false,
  updatingSpaceId = null
}) => {
  const [hoveredRow, setHoveredRow] = useState(null);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatPrice = (price) => {
    return `A$${price}/hr`;
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Debug/Visibility Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="text-sm font-medium text-foreground">Spaces</div>
        <div className="text-xs text-muted-foreground">{spaces.length} showing</div>
      </div>

      {(!Array.isArray(spaces) || spaces.length === 0) && (
        <div className="p-6 text-sm text-muted-foreground">
          No spaces to display for the current filters.
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="w-12 px-4 py-3">
                <Checkbox
                  checked={selectedSpaces.length === spaces.length && spaces.length > 0}
                  onChange={(e) => onSelectAll(e.target.checked)}
                />
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-foreground">
                Space
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-foreground">
                Host
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-foreground">
                Category
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-foreground">
                Price
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-foreground">
                Status
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-foreground">
                Submitted
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-foreground">
                Suspend
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.isArray(spaces) && spaces.map((space) => (
              <tr 
                key={space.id}
                className={`hover:bg-muted/30 transition-colors ${
                  space.status === 'pending' ? 'bg-warning/5' : ''
                }`}
                onMouseEnter={() => setHoveredRow(space.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td className="px-4 py-4">
                  <Checkbox
                    checked={selectedSpaces.includes(space.id)}
                    onChange={(e) => onSelectSpace(space.id, e.target.checked)}
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden">
                      <Image
                        src={space.images && space.images.length > 0 ? space.images[0] : '/assets/images/no_image.png'}
                        alt={space.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{space.name}</p>
                      <p className="text-xs text-muted-foreground">{space.capacity} people</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <Image
                        src={space.host?.avatar || '/assets/images/no_image.png'}
                        alt={space.host?.name || 'Unknown Host'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{space.host?.name || 'Unknown Host'}</p>
                      <p className="text-xs text-muted-foreground">{space.host?.email || ''}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-foreground capitalize">{space.category}</span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm font-medium text-foreground">{formatPrice(space.price)}</span>
                </td>
                <td className="px-4 py-4">
                  <SpaceStatusBadge status={space.status} />
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-muted-foreground">{formatDate(space.submitted_at || space.created_at)}</span>
                </td>
                <td className="px-4 py-4">
                  {space.status === 'suspended' ? (
                    <Button
                      variant="success"
                      size="sm"
                      iconName="CheckCircle"
                      onClick={() => onUnsuspendQuick?.(space)}
                    >
                      Unsuspend
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      iconName="Ban"
                      onClick={() => onSuspendQuick?.(space)}
                    >
                      Suspend
                    </Button>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end space-x-2">
                    {space.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onQuickAction(space.id, 'approve')}
                          iconName={isUpdatingStatus && updatingSpaceId === space.id ? "Loader2" : "Check"}
                          disabled={isUpdatingStatus}
                          className={isUpdatingStatus && updatingSpaceId === space.id ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          {isUpdatingStatus && updatingSpaceId === space.id ? 'Approving...' : 'Approve'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onQuickAction(space.id, 'reject')}
                          iconName={isUpdatingStatus && updatingSpaceId === space.id ? "Loader2" : "X"}
                          disabled={isUpdatingStatus}
                          className={isUpdatingStatus && updatingSpaceId === space.id ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          {isUpdatingStatus && updatingSpaceId === space.id ? 'Rejecting...' : 'Reject'}
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(space)}
                      iconName="Eye"
                    >
                      View
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Cards */}
      <div className="lg:hidden divide-y divide-border">
        {Array.isArray(spaces) && spaces.map((space) => (
          <div key={space.id} className="p-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                checked={selectedSpaces.includes(space.id)}
                onChange={(e) => onSelectSpace(space.id, e.target.checked)}
                className="mt-1"
              />
              
              <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden">
                <Image
                  src={space.images && space.images.length > 0 ? space.images[0] : '/assets/images/no_image.png'}
                  alt={space.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-foreground truncate">{space.name}</h3>
                    <p className="text-xs text-muted-foreground">{space.capacity} people • {formatPrice(space.price)}</p>
                  </div>
                  <SpaceStatusBadge status={space.status} />
                </div>
                
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 rounded-full overflow-hidden">
                    <Image
                      src={space.host?.avatar || '/assets/images/no_image.png'}
                      alt={space.host?.name || 'Unknown Host'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{space.host?.name || 'Unknown Host'}</span>
                </div>
                
                <p className="text-xs text-muted-foreground mb-3">
                  {formatDate(space.submitted_at || space.created_at)}
                </p>
                
                <div className="flex items-center space-x-2">
                  {space.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onQuickAction(space.id, 'approve')}
                        iconName={isUpdatingStatus && updatingSpaceId === space.id ? "Loader2" : "Check"}
                        disabled={isUpdatingStatus}
                        className={isUpdatingStatus && updatingSpaceId === space.id ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        {isUpdatingStatus && updatingSpaceId === space.id ? 'Approving...' : 'Approve'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onQuickAction(space.id, 'reject')}
                        iconName={isUpdatingStatus && updatingSpaceId === space.id ? "Loader2" : "X"}
                        disabled={isUpdatingStatus}
                        className={isUpdatingStatus && updatingSpaceId === space.id ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        {isUpdatingStatus && updatingSpaceId === space.id ? 'Rejecting...' : 'Reject'}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(space)}
                    iconName="Eye"
                  >
                    View
                  </Button>
                  {space.status === 'suspended' ? (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => onUnsuspendQuick?.(space)}
                      iconName="CheckCircle"
                    >
                      Unsuspend
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onSuspendQuick?.(space)}
                      iconName="Ban"
                    >
                      Suspend
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpaceTable;