import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';

const BulkRoleChangeModal = ({ isOpen, onClose, selectedUserIds, users, onSuccess }) => {
  const { user: adminUser } = useAuth();
  const { showToast } = useToast();
  const [selectedRole, setSelectedRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const roleOptions = [
    { value: '', label: 'Select new role' },
    { value: 'seeker', label: 'Seeker' },
    { value: 'partner', label: 'Partner' },
    { value: 'admin', label: 'Admin' }
  ];

  const selectedUsersData = users?.filter(u => selectedUserIds.includes(u.id)) || [];

  const validateForm = () => {
    const newErrors = {};

    if (!selectedRole) {
      newErrors.role = 'Please select a role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Update all selected users
      const { error } = await supabase
        .from('profiles')
        .update({
          role: selectedRole,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedUserIds);

      if (error) throw error;

      // If any users are admins, also update admin_users table
      const adminUserIds = selectedUsersData
        .filter(u => u.role === 'admin' || u.role === 'super_admin')
        .map(u => u.id);

      if (adminUserIds.length > 0 && selectedRole !== 'admin') {
        // Remove from admin_users if changing away from admin
        await supabase
          .from('admin_users')
          .update({ is_active: false })
          .in('user_id', adminUserIds);
      }

      if (selectedRole === 'admin') {
        // Add to admin_users if changing to admin
        for (const userId of selectedUserIds) {
          const { data: existing } = await supabase
            .from('admin_users')
            .select('id')
            .eq('user_id', userId)
            .single();

          if (!existing) {
            const user = selectedUsersData.find(u => u.id === userId);
            await supabase
              .from('admin_users')
              .insert({
                user_id: userId,
                email: user?.email || '',
                role: 'admin',
                permissions: {},
                is_active: true
              });
          } else {
            await supabase
              .from('admin_users')
              .update({ is_active: true, role: 'admin' })
              .eq('user_id', userId);
          }
        }
      }

      // Return updated users for optimistic update
      const updatedUsers = selectedUsersData.map(user => ({
        ...user,
        role: selectedRole
      }));
      
      showToast(`Successfully updated role for ${selectedUserIds.length} user(s)`, 'success');
      onSuccess?.(updatedUsers);
      handleClose();
    } catch (error) {
      console.error('Error updating roles:', error);
      setErrors({ general: error.message });
      showToast(`Error updating roles: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedRole('');
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="UserCog" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Bulk Role Change</h2>
              <p className="text-sm text-muted-foreground">
                Update role for {selectedUserIds.length} selected user(s)
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="X"
            onClick={handleClose}
            disabled={isSubmitting}
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* General Error */}
          {errors?.general && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <div className="flex items-center space-x-2">
                <Icon name="AlertCircle" size={16} className="text-destructive" />
                <p className="text-sm text-destructive">{errors.general}</p>
              </div>
            </div>
          )}

          {/* Selected Users Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium text-foreground mb-2">
              Selected Users ({selectedUserIds.length})
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {selectedUsersData.map((user) => (
                <div key={user.id} className="text-sm text-muted-foreground">
                  • {user.name} ({user.email}) - Current: {user.role}
                </div>
              ))}
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Select
              label="New Role"
              options={roleOptions}
              value={selectedRole}
              onChange={(value) => {
                setSelectedRole(value);
                if (errors?.role) {
                  setErrors(prev => ({ ...prev, role: '' }));
                }
              }}
              error={errors?.role}
              required
            />
            <p className="text-xs text-muted-foreground">
              All selected users will be updated to this role
            </p>
          </div>

          {/* Warning */}
          <div className="bg-warning/10 border border-warning/20 rounded-md p-4">
            <div className="flex items-start space-x-2">
              <Icon name="AlertTriangle" size={16} className="text-warning mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-warning mb-1">Warning</p>
                <p className="text-xs text-muted-foreground">
                  Changing user roles may affect their access and permissions. This action will be logged.
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            variant="default" 
            onClick={handleSubmit}
            loading={isSubmitting}
            iconName="Save"
            iconPosition="left"
          >
            {isSubmitting ? 'Updating Roles...' : 'Update Roles'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkRoleChangeModal;

