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

    if (sortField === 'joinedDate' || sortField === 'lastActive') {
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
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  const getUserTypeBadge = (type) => {
    const typeConfig = {
      partner: { color: 'text-primary bg-primary/10', label: 'Partner' },
      seeker: { color: 'text-secondary bg-secondary/10', label: 'Seeker' },
      admin: { color: 'text-warning bg-warning/10', label: 'Admin' }
    };

    const config = typeConfig?.[type] || typeConfig?.seeker;
    return (
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  const SortableHeader = ({ field, children }) => (
    <th 
      className="px-1.5 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-smooth"
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
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden card-shadow">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="overflow-x-hidden w-full">
          <table className="w-full table-auto text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <Checkbox
                    checked={selectedUsers?.length === users?.length && users?.length > 0}
                    onChange={(e) => onSelectAll(e?.target?.checked)}
                    indeterminate={selectedUsers?.length > 0 && selectedUsers?.length < users?.length}
                  />
                </th>
                <SortableHeader field="name">User</SortableHeader>
                <SortableHeader field="email">Email</SortableHeader>
                <SortableHeader field="role">Type</SortableHeader>
                <SortableHeader field="joinedDate">Registered</SortableHeader>
                <SortableHeader field="status">Status</SortableHeader>
                <SortableHeader field="lastActive">Last Activity</SortableHeader>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Payout
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {sortedUsers?.map((user) => {
                const isSelected = selectedUsers?.includes(user?.id);
                return (
                <tr 
                  key={user?.id}
                  className={`transition-smooth cursor-pointer border-b last:border-b-0 ${
                    isSelected ? 'bg-blue-50/70' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onUserClick(user)}
                >
                  <td className="px-4 py-3" onClick={(e) => e?.stopPropagation()}>
                    <Checkbox
                      checked={selectedUsers?.includes(user?.id)}
                      onChange={(e) => onUserSelect(user?.id, e?.target?.checked)}
                    />
                  </td>
                  <td className="px-4 py-3 min-w-[180px] max-w-[240px]">
                    <div className="flex items-center space-x-3">
                      <Image
                        src={user?.avatar}
                        alt={user?.name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                        <p className="text-xs text-gray-400 truncate">ID: {user?.id?.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 min-w-[180px] max-w-[240px]">
                    <p className="text-sm text-gray-700 truncate">{user?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {getUserTypeBadge(user?.role)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-sm text-gray-700">{formatDate(user?.joinedDate)}</p>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(user?.status)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-sm text-gray-700">{formatDate(user?.lastActive)}</p>
                  </td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e?.stopPropagation()}>
                    {user?.role === 'partner' ? (
                      <div className="flex items-center justify-center">
                        {user?.payoutDisabled ? (
                          <span className="px-2 py-1 rounded-full text-[10px] font-medium text-red-600 bg-red-100 flex items-center space-x-1">
                            <Icon name="Ban" size={12} />
                            <span>Disabled</span>
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-[10px] font-medium text-green-600 bg-green-100 flex items-center space-x-1">
                            <Icon name="CheckCircle" size={12} />
                            <span>Enabled</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e?.stopPropagation()}>
                    <div className="flex items-center justify-end space-x-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Eye"
                        onClick={() => onUserAction('view', user)}
                        className="p-1.5"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Edit"
                        onClick={() => onUserAction('edit', user)}
                        className="p-1.5"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="MessageCircle"
                        onClick={() => onUserAction('message', user)}
                        className="p-1.5"
                      />
                      <Button
                        variant={user?.status === 'suspended' ? 'success' : 'warning'}
                        size="sm"
                        iconName={user?.status === 'suspended' ? 'CheckCircle' : 'Ban'}
                        onClick={() => onUserAction(user?.status === 'suspended' ? 'activate' : 'suspend', user)}
                        className="px-2"
                      >
                        {user?.status === 'suspended' ? 'Activate' : 'Suspend'}
                      </Button>
                      {user?.role === 'partner' && (
                        <Button
                          variant={user?.payoutDisabled ? 'success' : 'destructive'}
                          size="sm"
                          iconName={user?.payoutDisabled ? 'CheckCircle' : 'Ban'}
                          onClick={() => onUserAction('toggle-payout', user)}
                          className="px-2"
                          title={user?.payoutDisabled ? 'Enable payout' : 'Disable payout'}
                        >
                          {user?.payoutDisabled ? 'Enable' : 'Disable'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );})}
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
                  {getUserTypeBadge(user?.role)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Registered:</span>
                <span className="text-sm text-foreground">{formatDate(user?.joinedDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Last Activity:</span>
                <span className="text-sm text-foreground">{formatDate(user?.lastActive)}</span>
              </div>
              {user?.role === 'partner' && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Payout Status:</span>
                  {user?.payoutDisabled ? (
                    <span className="px-2 py-1 rounded-full text-[10px] font-medium text-red-600 bg-red-100 flex items-center space-x-1">
                      <Icon name="Ban" size={12} />
                      <span>Disabled</span>
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-[10px] font-medium text-green-600 bg-green-100 flex items-center space-x-1">
                      <Icon name="CheckCircle" size={12} />
                      <span>Enabled</span>
                    </span>
                  )}
                </div>
              )}
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
                iconName={user?.status === 'suspended' ? 'CheckCircle' : null}
                onClick={() => onUserAction(user?.status === 'suspended' ? 'activate' : 'suspend', user)}
              >
                {user?.status === 'suspended' ? 'Activate' : 'Suspend'}
              </Button>
            </div>
            {user?.role === 'partner' && (
              <div className="pt-2 border-t border-border" onClick={(e) => e?.stopPropagation()}>
                <Button
                  variant={user?.payoutDisabled ? 'success' : 'destructive'}
                  size="sm"
                  iconName={user?.payoutDisabled ? 'CheckCircle' : 'Ban'}
                  onClick={() => onUserAction('toggle-payout', user)}
                  className="w-full"
                >
                  {user?.payoutDisabled ? 'Enable Payout' : 'Disable Payout'}
                </Button>
              </div>
            )}
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