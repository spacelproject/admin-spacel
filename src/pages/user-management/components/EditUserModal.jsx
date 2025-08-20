import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const EditUserModal = ({ isOpen, onClose, user, onUpdateUser }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    userType: '',
    location: '',
    status: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'pending', label: 'Pending' },
    { value: 'inactive', label: 'Inactive' }
  ];

  const locationOptions = [
    { value: 'New York, NY', label: 'New York, NY' },
    { value: 'Los Angeles, CA', label: 'Los Angeles, CA' },
    { value: 'Chicago, IL', label: 'Chicago, IL' },
    { value: 'Houston, TX', label: 'Houston, TX' },
    { value: 'Phoenix, AZ', label: 'Phoenix, AZ' },
    { value: 'Philadelphia, PA', label: 'Philadelphia, PA' },
    { value: 'San Antonio, TX', label: 'San Antonio, TX' },
    { value: 'San Diego, CA', label: 'San Diego, CA' },
    { value: 'Dallas, TX', label: 'Dallas, TX' },
    { value: 'San Jose, CA', label: 'San Jose, CA' }
  ];

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

    if (!formData?.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData?.userType) {
      newErrors.userType = 'User type is required';
    }

    if (!formData?.location) {
      newErrors.location = 'Location is required';
    }

    if (!formData?.status) {
      newErrors.status = 'Status is required';
    }

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatedUser = {
        ...user,
        name: formData?.name,
        email: formData?.email,
        phone: formData?.phone,
        userType: formData?.userType,
        location: formData?.location,
        status: formData?.status
      };

      onUpdateUser(updatedUser);
      handleClose();
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
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
              
              <Input
                label="Email Address"
                type="email"
                placeholder="Enter email address"
                value={formData?.email}
                onChange={(e) => handleInputChange('email', e?.target?.value)}
                error={errors?.email}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                type="tel"
                placeholder="Enter phone number"
                value={formData?.phone}
                onChange={(e) => handleInputChange('phone', e?.target?.value)}
                error={errors?.phone}
                required
              />
              
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
              <Select
                label="Location"
                options={locationOptions?.map(loc => ({ value: loc?.value, label: loc?.label }))}
                value={formData?.location}
                onChange={(value) => handleInputChange('location', value)}
                error={errors?.location}
                searchable
                required
              />

              <Select
                label="Status"
                options={statusOptions}
                value={formData?.status}
                onChange={(value) => handleInputChange('status', value)}
                error={errors?.status}
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
                  {new Date(user?.registrationDate)?.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Total Bookings</label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
                  {user?.totalBookings} bookings
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Total Spent</label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
                  ${user?.totalSpent}
                </div>
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
            {isSubmitting ? 'Updating User...' : 'Update User'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;