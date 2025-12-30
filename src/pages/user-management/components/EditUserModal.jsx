import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { supabase } from '../../../lib/supabase';
import { formatCurrencyDisplay } from '../../../utils/currency';
import { useToast } from '../../../components/ui/Toast';

const EditUserModal = ({ isOpen, onClose, user, onUpdateUser }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    userType: '',
    location: '',
    status: ''
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
    forceChange: false
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [isUpdatingVerification, setIsUpdatingVerification] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        userType: user?.userType || '',
        location: user?.location || '',
        status: user?.status || ''
      });
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const userTypeOptions = [
    { value: 'partner', label: 'Partner' },
    { value: 'seeker', label: 'Seeker' }
  ];

  // Status changes (suspend/activate) are handled via the dedicated Suspend/Activate flow in the table.

  // Location is a free-form value stored in DB (avoid dummy dropdown options)

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors?.[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.name?.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData?.email?.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(formData?.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData?.userType) {
      newErrors.userType = 'User type is required';
    }

    if (!formData?.location) {
      newErrors.location = 'Location is required';
    }

    // status is intentionally not editable here

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Update email in auth.users if it changed
      if (formData.email !== user.email) {
        const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
          email: formData.email
        });
        
        if (authError) {
          console.warn('Error updating auth email:', authError);
          // Continue with profile update even if auth update fails
        }
      }

      // Update profile in profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({
          email: formData.email,
          first_name: formData.name.split(' ')[0],
          last_name: formData.name.split(' ').slice(1).join(' '),
          role: formData.userType,
          phone: formData.phone?.trim() || null,
          location: formData.location?.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();
      
      if (profileError) throw profileError;
      
      // Skip user_preferences updates from admin panel (RLS-protected; managed by app/user lifecycle)
      
      // Transform data for UI
      const updatedUser = {
        ...user,
        name: `${profileData.first_name} ${profileData.last_name}`.trim(),
        email: profileData.email,
        role: profileData.role,
        phone: profileData.phone,
        location: profileData.location || 'Not specified',
        lastActive: profileData.updated_at
      };
      
      onUpdateUser(updatedUser);
      handleClose();
      
    } catch (error) {
      console.error('Error updating user:', error);
      setErrors({ general: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVerification = async (type) => {
    setIsUpdatingVerification(true);

    try {
      const field = type === 'phone' ? 'is_phone_verified' : 'email_verified';
      const currentValue = type === 'phone' ? user?.isPhoneVerified : user?.emailVerified;
      const newValue = !currentValue;

      const { error } = await supabase
        .from('profiles')
        .update({
          [field]: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      // If verifying email, also update auth.users
      if (type === 'email' && newValue) {
        await supabase.auth.admin.updateUserById(user.id, {
          email_confirm: true
        });
      }

      showToast(`${type === 'phone' ? 'Phone' : 'Email'} verification ${newValue ? 'enabled' : 'disabled'}`, 'success');
      
      // Update local user object
      if (type === 'phone') {
        user.isPhoneVerified = newValue;
      } else {
        user.emailVerified = newValue;
      }
      
      // Trigger refresh
      onUpdateUser(user);
    } catch (error) {
      console.error('Error updating verification:', error);
      showToast(`Error updating verification: ${error.message}`, 'error');
    } finally {
      setIsUpdatingVerification(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!passwordData.newPassword) {
      showToast('Please enter a new password', 'error');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setIsResettingPassword(true);

    try {
      // Update password using admin API
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        password: passwordData.newPassword
      });

      if (error) throw error;

      // If force change is enabled, we could set a flag in user metadata
      // Note: Supabase doesn't have a built-in "force password change" feature
      // This would need to be handled in your application logic
      if (passwordData.forceChange) {
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            force_password_change: true
          }
        });
      }

      showToast('Password reset successfully', 'success');
      setPasswordData({
        newPassword: '',
        confirmPassword: '',
        forceChange: false
      });
      setShowPasswordSection(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      showToast(`Error resetting password: ${error.message}`, 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    setIsSubmitting(false);
    setPasswordData({
      newPassword: '',
      confirmPassword: '',
      forceChange: false
    });
    setShowPasswordSection(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="Edit" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Edit User</h2>
              <p className="text-sm text-muted-foreground">Update user information for {user?.name}</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* General Error */}
          {errors?.general && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <div className="flex items-center space-x-2">
                <Icon name="AlertCircle" size={16} className="text-destructive" />
                <p className="text-sm text-destructive">{errors.general}</p>
              </div>
            </div>
          )}
          
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                type="text"
                placeholder="Enter full name"
                value={formData?.name}
                onChange={(e) => handleInputChange('name', e?.target?.value)}
                error={errors?.name}
                required
              />
              
              <div className="space-y-2">
              <Input
                label="Email Address"
                type="email"
                placeholder="Enter email address"
                value={formData?.email}
                onChange={(e) => handleInputChange('email', e?.target?.value)}
                error={errors?.email}
                required
              />
                {user?.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Email Verification: {user.emailVerified !== false ? 'Verified' : 'Not Verified'}
                    </span>
                    {user.emailVerified === false && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleVerification('email')}
                        loading={isUpdatingVerification}
                        iconName="CheckCircle"
                      >
                        Verify
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
              <Input
                  label="Phone Number (Optional)"
                type="tel"
                placeholder="Enter phone number"
                value={formData?.phone}
                onChange={(e) => handleInputChange('phone', e?.target?.value)}
                error={errors?.phone}
                />
                {user?.isPhoneVerified !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Phone Verification: {user.isPhoneVerified ? 'Verified' : 'Not Verified'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleVerification('phone')}
                      loading={isUpdatingVerification}
                      iconName={user.isPhoneVerified ? 'XCircle' : 'CheckCircle'}
                    >
                      {user.isPhoneVerified ? 'Unverify' : 'Verify'}
                    </Button>
                  </div>
                )}
              </div>
              
              <Select
                label="User Type"
                options={userTypeOptions}
                value={formData?.userType}
                onChange={(value) => handleInputChange('userType', value)}
                error={errors?.userType}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Location"
                type="text"
                placeholder="Enter location"
                value={formData?.location}
                onChange={(e) => handleInputChange('location', e?.target?.value)}
                error={errors?.location}
                required
              />
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-4 border-t border-border pt-6">
            <h3 className="text-lg font-medium text-foreground">Account Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">User ID</label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
                  {user?.id}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Registration Date</label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
                  {user?.joinedDate 
                    ? new Date(user.joinedDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Not available'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Password Reset Section */}
          <div className="space-y-4 border-t border-border pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-foreground">Password Management</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
              >
                {showPasswordSection ? 'Hide' : 'Reset Password'}
              </Button>
            </div>

            {showPasswordSection && (
              <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="Enter new password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    description="Minimum 8 characters"
                  />
                  
                  <Input
                    label="Confirm Password"
                    type="password"
                    placeholder="Confirm new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  />
              </div>
              
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="forceChange"
                    checked={passwordData.forceChange}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, forceChange: e.target.checked }))}
                    className="rounded border-border"
                  />
                  <label htmlFor="forceChange" className="text-sm text-foreground">
                    Force password change on next login
                </label>
                </div>

                <Button
                  variant="default"
                  onClick={handlePasswordReset}
                  loading={isResettingPassword}
                  iconName="Key"
                  iconPosition="left"
                >
                  Reset Password
                </Button>
              </div>
            )}
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
            {isSubmitting ? 'Updating User...' : 'Update User'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;