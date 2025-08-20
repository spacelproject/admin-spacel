import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';

const UserTable = ({ users, onUserSelect, onSelectAll, selectedUsers, onUserAction, onUserClick }) => {
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedUsers = [...users]?.sort((a, b) => {
    let aValue = a?.[sortField];
    let bValue = b?.[sortField];

    if (sortField === 'registrationDate' || sortField === 'lastActivity') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const formatDate = (dateString) => {
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'text-success bg-success/10', label: 'Active' },
      suspended: { color: 'text-warning bg-warning/10', label: 'Suspended' },
      pending: { color: 'text-accent bg-accent/10', label: 'Pending' },
      inactive: { color: 'text-muted-foreground bg-muted', label: 'Inactive' }
    };

    const config = statusConfig?.[status] || statusConfig?.inactive;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  const getUserTypeBadge = (type) => {
    const typeConfig = {
      partner: { color: 'text-primary bg-primary/10', label: 'Partner' },
      seeker: { color: 'text-secondary bg-secondary/10', label: 'Seeker' }
    };

    const config = typeConfig?.[type] || typeConfig?.seeker;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  const SortableHeader = ({ field, children }) => (
    <th 
      className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-smooth"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <Icon 
          name={sortField === field ? (sortDirection === 'asc' ? 'ChevronUp' : 'ChevronDown') : 'ChevronsUpDown'} 
          size={14} 
          className="text-muted-foreground"
        />
      </div>
    </th>
  );

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden card-shadow">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left w-12">
                  <Checkbox
                    checked={selectedUsers?.length === users?.length && users?.length > 0}
                    onChange={(e) => onSelectAll(e?.target?.checked)}
                    indeterminate={selectedUsers?.length > 0 && selectedUsers?.length < users?.length}
                  />
                </th>
                <SortableHeader field="name">User</SortableHeader>
                <SortableHeader field="email">Email</SortableHeader>
                <SortableHeader field="userType">Type</SortableHeader>
                <SortableHeader field="registrationDate">Registered</SortableHeader>
                <SortableHeader field="status">Status</SortableHeader>
                <SortableHeader field="lastActivity">Last Activity</SortableHeader>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {sortedUsers?.map((user) => (
                <tr 
                  key={user?.id} 
                  className="hover:bg-muted/30 transition-smooth cursor-pointer"
                  onClick={() => onUserClick(user)}
                >
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap" onClick={(e) => e?.stopPropagation()}>
                    <Checkbox
                      checked={selectedUsers?.includes(user?.id)}
                      onChange={(e) => onUserSelect(user?.id, e?.target?.checked)}
                    />
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <Image
                        src={user?.avatar}
                        alt={user?.name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">ID: {user?.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-foreground truncate max-w-xs">{user?.email}</p>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    {getUserTypeBadge(user?.userType)}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-foreground">{formatDate(user?.registrationDate)}</p>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user?.status)}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-foreground">{formatDate(user?.lastActivity)}</p>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap" onClick={(e) => e?.stopPropagation()}>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Eye"
                        onClick={() => onUserAction('view', user)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Edit"
                        onClick={() => onUserAction('edit', user)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="MessageCircle"
                        onClick={() => onUserAction('message', user)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName={user?.status === 'suspended' ? 'CheckCircle' : 'XCircle'}
                        onClick={() => onUserAction(user?.status === 'suspended' ? 'activate' : 'suspend', user)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Mobile Cards */}
      <div className="md:hidden space-y-4 p-4">
        {sortedUsers?.map((user) => (
          <div 
            key={user?.id} 
            className="bg-card border border-border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/30 transition-smooth"
            onClick={() => onUserClick(user)}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <Checkbox
                  checked={selectedUsers?.includes(user?.id)}
                  onChange={(e) => onUserSelect(user?.id, e?.target?.checked)}
                  onClick={(e) => e?.stopPropagation()}
                />
                <Image
                  src={user?.avatar}
                  alt={user?.name}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">ID: {user?.id}</p>
                </div>
              </div>
              <div className="flex-shrink-0">
                {getStatusBadge(user?.status)}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Email:</span>
                <span className="text-sm text-foreground truncate max-w-xs">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Type:</span>
                <div className="flex-shrink-0">
                  {getUserTypeBadge(user?.userType)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Registered:</span>
                <span className="text-sm text-foreground">{formatDate(user?.registrationDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Last Activity:</span>
                <span className="text-sm text-foreground">{formatDate(user?.lastActivity)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border" onClick={(e) => e?.stopPropagation()}>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="Eye"
                  onClick={() => onUserAction('view', user)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="Edit"
                  onClick={() => onUserAction('edit', user)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="MessageCircle"
                  onClick={() => onUserAction('message', user)}
                />
              </div>
              <Button
                variant={user?.status === 'suspended' ? 'success' : 'warning'}
                size="sm"
                iconName={user?.status === 'suspended' ? 'CheckCircle' : 'XCircle'}
                onClick={() => onUserAction(user?.status === 'suspended' ? 'activate' : 'suspend', user)}
              >
                {user?.status === 'suspended' ? 'Activate' : 'Suspend'}
              </Button>
            </div>
          </div>
        ))}
      </div>
      {/* Empty State */}
      {users?.length === 0 && (
        <div className="text-center py-12">
          <Icon name="Users" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  );
};

export default UserTable;