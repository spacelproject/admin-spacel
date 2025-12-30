import React, { useState, useEffect, useRef } from 'react';
import { supabase, storage } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from './Toast';
import Button from './Button';
import Input from './Input';
import Icon from '../AppIcon';
import Image from '../AppImage';
import { logDebug, logError, logWarn } from '../../utils/logger';

const ProfileSettingsModal = ({ isOpen, onClose }) => {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    avatarUrl: ''
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const fileInputRef = useRef(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchUserProfile();
    } else if (!isOpen) {
      // Reset form state when modal closes
      setAvatarPreview(null);
      setAvatarFile(null);
      setErrors({});
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, user?.id]);

  const fetchUserProfile = async () => {
    if (!user?.id) return;

    try {
      setFetching(true);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const avatarUrl = profile?.avatar_url || '/assets/images/no_image.png';
      setFormData({
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        email: profile?.email || user?.email || '',
        avatarUrl: avatarUrl
      });
      setAvatarPreview(null);
      setAvatarFile(null);
    } catch (error) {
      logError('Error fetching user profile:', error);
      showToast('Failed to load profile data', 'error');
      // Use auth user data as fallback
      setFormData({
        firstName: '',
        lastName: '',
        email: user?.email || '',
        avatarUrl: '/assets/images/no_image.png'
      });
      setAvatarPreview(null);
      setAvatarFile(null);
    } finally {
      setFetching(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Please select a valid image file (JPEG, PNG, GIF, or WebP)', 'error');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showToast('Image size must be less than 5MB', 'error');
      return;
    }

    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadAvatar = async (file) => {
    if (!file || !user?.id) return null;

    try {
      setUploadingAvatar(true);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      let filePath = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { error: uploadError } = await storage.users.upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

      if (uploadError) {
        // If file already exists, try with different name
        if (uploadError.message?.includes('already exists')) {
          filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { error: retryError } = await storage.users.upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });
          if (retryError) throw retryError;
        } else {
          throw uploadError;
        }
      }

      // Get public URL
      const { data: { publicUrl } } = storage.users.getPublicUrl(filePath);

      // Delete old avatar if it exists and is in our storage
      if (formData.avatarUrl && formData.avatarUrl.includes('user-avatars')) {
        try {
          const oldFileName = formData.avatarUrl.split('user-avatars/')[1]?.split('?')[0];
          if (oldFileName && oldFileName !== filePath) {
            await storage.users.remove([oldFileName]);
          }
        } catch (deleteError) {
          // Non-critical error, just log it
          logError('Error deleting old avatar:', deleteError);
        }
      }

      return publicUrl;
    } catch (error) {
      logError('Error uploading avatar:', error);
      throw error;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);

      let avatarUrl = formData.avatarUrl;

      // Upload avatar if a new file was selected
      if (avatarFile) {
        try {
          avatarUrl = await uploadAvatar(avatarFile);
          if (!avatarUrl) {
            showToast('Failed to upload avatar. Please try again.', 'error');
            return;
          }
        } catch (uploadError) {
          logError('Error uploading avatar:', uploadError);
          showToast('Failed to upload avatar. Profile will be updated without avatar change.', 'warning');
          // Continue with profile update without avatar change
        }
      }

      // Check if email changed
      const emailChanged = formData.email !== user?.email;

      // Update email in auth.users if changed
      if (emailChanged) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });

        if (emailError) {
          throw emailError;
        }

        // Note: Supabase will send a confirmation email to the new address
        showToast('Email update requested. Please check your new email for confirmation.', 'info');
      }

      // Update profile in profiles table
      const updateData = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        updated_at: new Date().toISOString()
      };

      // Only update avatar_url if we have a new one
      if (avatarFile && avatarUrl) {
        updateData.avatar_url = avatarUrl;
      }

      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (profileError) throw profileError;

      // Update auth user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          avatar_url: avatarUrl
        }
      });

      if (metadataError) {
        logError('Error updating user metadata:', metadataError);
        // Non-critical, continue
      }

      // Update local user state (if setUser is available)
      if (typeof setUser === 'function') {
        setUser(prev => ({
          ...prev,
          email: formData.email.trim(),
          avatar_url: avatarUrl,
          user_metadata: {
            ...prev?.user_metadata,
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            avatar_url: avatarUrl
          }
        }));
      } else {
        logWarn('setUser is not available in AuthContext - this may indicate a context setup issue');
      }

      logDebug('Profile updated successfully', { userId: user.id });

      // Trigger profile update event for other components to refresh
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      
      showToast('Profile updated successfully!', 'success');
      
      // Reset avatar preview and file
      setAvatarPreview(null);
      setAvatarFile(null);
      setErrors({});
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Close modal after a brief delay to show success message
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (error) {
      logError('Error updating profile:', error);
      let errorMessage = 'Failed to update profile. ';
      
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        errorMessage = 'This email is already registered. Please use a different email.';
      } else if (error.message?.includes('email')) {
        errorMessage = 'Invalid email address. Please check and try again.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }

      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="User" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Profile Settings</h2>
              <p className="text-sm text-muted-foreground">Update your personal information</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="X"
            onClick={onClose}
            disabled={loading}
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {fetching ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Loading profile...</span>
            </div>
          ) : (
            <>
              {/* Profile Image Upload */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border bg-muted">
                    <Image
                      src={avatarPreview || formData.avatarUrl}
                      alt="Profile avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
                      title="Remove image"
                    >
                      <Icon name="X" size={14} />
                    </button>
                  )}
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                    id="avatar-upload"
                    disabled={loading || uploadingAvatar}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    iconName="Upload"
                    iconPosition="left"
                    disabled={loading || uploadingAvatar}
                    className="cursor-pointer"
                    onClick={() => {
                      if (fileInputRef.current && !loading && !uploadingAvatar) {
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    {uploadingAvatar ? 'Uploading...' : avatarPreview ? 'Change Image' : 'Upload Image'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    JPEG, PNG, GIF, or WebP (max 5MB)
                  </p>
                </div>
              </div>

              {/* First Name and Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  type="text"
                  name="firstName"
                  placeholder="Enter first name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  error={errors.firstName}
                  required
                  disabled={loading}
                />

                <Input
                  label="Last Name"
                  type="text"
                  name="lastName"
                  placeholder="Enter last name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  error={errors.lastName}
                  required
                  disabled={loading}
                />
              </div>

              {/* Email Field */}
              <Input
                label="Email Address"
                type="email"
                name="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                description="Changing your email will require verification"
                required
                disabled={loading}
              />

              {/* Info Note */}
              <div className="p-4 bg-muted/50 rounded-md">
                <div className="flex items-start space-x-2">
                  <Icon name="Info" size={16} className="text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Note:</p>
                    <p>If you change your email address, you'll receive a confirmation email at the new address. You'll need to verify it before it becomes active.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={loading || fetching}
          >
            Cancel
          </Button>
          <Button 
            variant="default" 
            onClick={handleSubmit}
            loading={loading}
            disabled={fetching}
            iconName="Save"
            iconPosition="left"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsModal;

