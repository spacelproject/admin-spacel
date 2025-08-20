import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import SpaceStatusBadge from './SpaceStatusBadge';

const SpaceTable = ({ 
  spaces, 
  selectedSpaces, 
  onSelectSpace, 
  onSelectAll, 
  onQuickAction, 
  onViewDetails,
  sortConfig,
  onSort 
}) => {
  const [hoveredRow, setHoveredRow] = useState(null);

  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    onSort({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return 'ArrowUpDown';
    return sortConfig.direction === 'asc' ? 'ArrowUp' : 'ArrowDown';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatPrice = (price) => {
    return `$${price}/hr`;
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
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
              <th 
                className="text-left px-4 py-3 text-sm font-medium text-foreground cursor-pointer hover:text-primary"
                onClick={() => handleSort('host')}
              >
                <div className="flex items-center space-x-1">
                  <span>Host</span>
                  <Icon name={getSortIcon('host')} size={14} />
                </div>
              </th>
              <th 
                className="text-left px-4 py-3 text-sm font-medium text-foreground cursor-pointer hover:text-primary"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center space-x-1">
                  <span>Category</span>
                  <Icon name={getSortIcon('category')} size={14} />
                </div>
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-foreground">
                Location
              </th>
              <th 
                className="text-left px-4 py-3 text-sm font-medium text-foreground cursor-pointer hover:text-primary"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center space-x-1">
                  <span>Price</span>
                  <Icon name={getSortIcon('price')} size={14} />
                </div>
              </th>
              <th 
                className="text-left px-4 py-3 text-sm font-medium text-foreground cursor-pointer hover:text-primary"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  <Icon name={getSortIcon('status')} size={14} />
                </div>
              </th>
              <th 
                className="text-left px-4 py-3 text-sm font-medium text-foreground cursor-pointer hover:text-primary"
                onClick={() => handleSort('submittedAt')}
              >
                <div className="flex items-center space-x-1">
                  <span>Submitted</span>
                  <Icon name={getSortIcon('submittedAt')} size={14} />
                </div>
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {spaces.map((space) => (
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
                        src={space.images[0]}
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
                        src={space.host.avatar}
                        alt={space.host.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{space.host.name}</p>
                      <p className="text-xs text-muted-foreground">{space.host.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-foreground capitalize">{space.category}</span>
                </td>
                <td className="px-4 py-4">
                  <p className="text-sm text-foreground">{space.location.city}</p>
                  <p className="text-xs text-muted-foreground">{space.location.state}</p>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm font-medium text-foreground">{formatPrice(space.price)}</span>
                </td>
                <td className="px-4 py-4">
                  <SpaceStatusBadge status={space.status} />
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-muted-foreground">{formatDate(space.submittedAt)}</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end space-x-2">
                    {space.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onQuickAction(space.id, 'approve')}
                          iconName="Check"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onQuickAction(space.id, 'reject')}
                          iconName="X"
                        >
                          Reject
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
        {spaces.map((space) => (
          <div key={space.id} className="p-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                checked={selectedSpaces.includes(space.id)}
                onChange={(e) => onSelectSpace(space.id, e.target.checked)}
                className="mt-1"
              />
              
              <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden">
                <Image
                  src={space.images[0]}
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
                      src={space.host.avatar}
                      alt={space.host.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{space.host.name}</span>
                </div>
                
                <p className="text-xs text-muted-foreground mb-3">
                  {space.location.city}, {space.location.state} • {formatDate(space.submittedAt)}
                </p>
                
                <div className="flex items-center space-x-2">
                  {space.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onQuickAction(space.id, 'approve')}
                        iconName="Check"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onQuickAction(space.id, 'reject')}
                        iconName="X"
                      >
                        Reject
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
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpaceTable;