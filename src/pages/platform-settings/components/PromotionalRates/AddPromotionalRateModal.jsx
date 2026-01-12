import React, { useState, useEffect } from 'react';
import Icon from '../../../../components/AppIcon';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import PartnerSelector from './PartnerSelector';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/ui/Toast';

const AddPromotionalRateModal = ({ isOpen, onClose, onSuccess, editingRate = null }) => {
  const { user: adminUser } = useAuth();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({
    promotionName: '',
    userType: 'partner', // 'seeker' or 'partner'
    commissionRate: '',
    partnerId: null, // null for all, or specific partner ID
    startDate: '',
    endDate: '',
    isIndefinite: false,
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingOverlap, setCheckingOverlap] = useState(false);

  // Load editing rate data
  useEffect(() => {
    if (editingRate && isOpen) {
      const startDate = new Date(editingRate.start_date).toISOString().split('T')[0];
      const endDate = editingRate.end_date ? new Date(editingRate.end_date).toISOString().split('T')[0] : '';
      
      setFormData({
        promotionName: editingRate.promotion_name || '',
        userType: editingRate.partner_commission_rate !== null ? 'partner' : 'seeker',
        commissionRate: editingRate.partner_commission_rate !== null 
          ? editingRate.partner_commission_rate 
          : editingRate.seeker_commission_rate || '',
        partnerId: editingRate.partner_id || 'all',
        startDate: startDate,
        endDate: endDate,
        isIndefinite: !editingRate.end_date,
        notes: editingRate.notes || ''
      });
    } else if (isOpen && !editingRate) {
      // Reset form for new rate
      setFormData({
        promotionName: '',
        userType: 'partner',
        commissionRate: '',
        partnerId: null,
        startDate: '',
        endDate: '',
        isIndefinite: false,
        notes: ''
      });
      setErrors({});
    }
  }, [editingRate, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.promotionName.trim()) {
      newErrors.promotionName = 'Promotion name is required';
    }

    if (!formData.commissionRate || formData.commissionRate === '') {
      newErrors.commissionRate = 'Commission rate is required';
    } else {
      const rate = parseFloat(formData.commissionRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        newErrors.commissionRate = 'Commission rate must be between 0 and 100';
      }
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.isIndefinite && !formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate && !formData.isIndefinite) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    if (!formData.partnerId && formData.partnerId !== 'all') {
      newErrors.partnerId = 'Please select a partner or "All Partners"';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkOverlappingRates = async () => {
    if (!formData.partnerId || !formData.startDate) return true;

    setCheckingOverlap(true);
    try {
      const partnerId = formData.partnerId === 'all' ? null : formData.partnerId;
      const startDate = new Date(formData.startDate);
      const endDate = formData.isIndefinite ? null : (formData.endDate ? new Date(formData.endDate) : null);

      // Build query - get all active rates for this partner
      let query = supabase
        .from('partner_promotional_rates')
        .select('id, promotion_name, start_date, end_date')
        .eq('is_active', true);

      if (partnerId) {
        query = query.eq('partner_id', partnerId);
      } else {
        query = query.is('partner_id', null);
      }

      // Exclude current rate if editing
      if (editingRate) {
        query = query.neq('id', editingRate.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) return true;

      // Check for overlaps
      const hasOverlap = data.some(rate => {
        const rateStart = new Date(rate.start_date);
        const rateEnd = rate.end_date ? new Date(rate.end_date) : null;

        // Two date ranges overlap if: start1 <= end2 && start2 <= end1
        // For indefinite rates (null end_date), treat as infinite future
        
        if (rateEnd && endDate) {
          // Both have end dates - standard overlap check
          return startDate <= rateEnd && rateStart <= endDate;
        } else if (rateEnd && !endDate) {
          // Existing rate has end date, new rate is indefinite
          // Overlaps if new start is before or equal to existing end
          return startDate <= rateEnd;
        } else if (!rateEnd && endDate) {
          // Existing rate is indefinite, new rate has end date
          // Overlaps if new end is after or equal to existing start
          return endDate >= rateStart;
        } else {
          // Both are indefinite - overlaps if they start at the same time or one starts after the other
          // Since we're checking active rates, if both are indefinite, they overlap
          return true;
        }
      });

      if (hasOverlap) {
        setErrors(prev => ({
          ...prev,
          general: 'This promotional rate overlaps with an existing active rate for the selected partner(s). Please adjust the dates.'
        }));
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking overlaps:', error);
      showToast('Error checking for overlapping rates', 'error');
      return false;
    } finally {
      setCheckingOverlap(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Check for overlapping rates
    const noOverlap = await checkOverlappingRates();
    if (!noOverlap) {
      return;
    }

    setIsSubmitting(true);

    try {
      const partnerId = formData.partnerId === 'all' ? null : formData.partnerId;
      const startDate = new Date(formData.startDate).toISOString();
      const endDate = formData.isIndefinite ? null : (formData.endDate ? new Date(formData.endDate).toISOString() : null);

      const rateData = {
        promotion_name: formData.promotionName.trim(),
        partner_id: partnerId,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
        notes: formData.notes || null,
        created_by: adminUser?.id,
        updated_by: adminUser?.id
      };

      // Set commission rates based on user type
      if (formData.userType === 'partner') {
        rateData.partner_commission_rate = parseFloat(formData.commissionRate);
        rateData.seeker_commission_rate = null;
      } else {
        rateData.seeker_commission_rate = parseFloat(formData.commissionRate);
        rateData.partner_commission_rate = null;
      }

      let result;
      if (editingRate) {
        // Update existing rate
        const { data, error } = await supabase
          .from('partner_promotional_rates')
          .update(rateData)
          .eq('id', editingRate.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new rate
        const { data, error } = await supabase
          .from('partner_promotional_rates')
          .insert(rateData)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      showToast(
        editingRate ? 'Promotional rate updated successfully' : 'Promotional rate created successfully',
        'success'
      );
      onSuccess?.(result);
      handleClose();
    } catch (error) {
      console.error('Error saving promotional rate:', error);
      setErrors({ general: error.message || 'Failed to save promotional rate' });
      showToast('Failed to save promotional rate', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      promotionName: '',
      userType: 'partner',
      commissionRate: '',
      partnerId: null,
      startDate: '',
      endDate: '',
      isIndefinite: false,
      notes: ''
    });
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="Tag" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {editingRate ? 'Edit Promotional Rate' : 'Add Promotional Rate'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {editingRate ? 'Update promotional rate details' : 'Create a new promotional commission rate'}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* General Error */}
          {errors.general && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <div className="flex items-center space-x-2">
                <Icon name="AlertCircle" size={16} className="text-destructive" />
                <p className="text-sm text-destructive">{errors.general}</p>
              </div>
            </div>
          )}

          {/* Promotion Name */}
          <Input
            label="Promotion Name"
            type="text"
            placeholder="e.g., Summer Special"
            value={formData.promotionName}
            onChange={(e) => handleInputChange('promotionName', e.target.value)}
            error={errors.promotionName}
            required
          />

          {/* Partner Selection */}
          <PartnerSelector
            label="Partner"
            value={formData.partnerId}
            onChange={(value) => handleInputChange('partnerId', value)}
            error={errors.partnerId}
            required
          />

          {/* User Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              User Type
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleInputChange('userType', 'seeker')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-smooth ${
                  formData.userType === 'seeker'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Icon name="User" size={18} />
                  <span className="font-medium">Seeker Commission</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('userType', 'partner')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-smooth ${
                  formData.userType === 'partner'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Icon name="Building" size={18} />
                  <span className="font-medium">Partner Commission</span>
                </div>
              </button>
            </div>
          </div>

          {/* Commission Rate */}
          <Input
            label="Commission Rate (%)"
            type="number"
            placeholder="0"
            value={formData.commissionRate}
            onChange={(e) => handleInputChange('commissionRate', e.target.value)}
            error={errors.commissionRate}
            min="0"
            max="100"
            step="0.1"
            required
            description={
              formData.userType === 'partner'
                ? 'Set to 0% for no fee charge'
                : 'Reduced service fee for seekers'
            }
          />

          {/* Start Date */}
          <Input
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleInputChange('startDate', e.target.value)}
            error={errors.startDate}
            required
          />

          {/* End Date */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isIndefinite"
                checked={formData.isIndefinite}
                onChange={(e) => handleInputChange('isIndefinite', e.target.checked)}
                className="h-4 w-4 rounded border border-input"
              />
              <label htmlFor="isIndefinite" className="text-sm text-foreground">
                No end date (indefinite)
              </label>
            </div>
            {!formData.isIndefinite && (
              <Input
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                error={errors.endDate}
                required
              />
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Add any additional notes about this promotional rate..."
              className="w-full min-h-[100px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSubmitting || checkingOverlap}
          >
            Cancel
          </Button>
          <Button 
            variant="default" 
            onClick={handleSubmit}
            loading={isSubmitting || checkingOverlap}
            iconName={editingRate ? "Save" : "Plus"}
            iconPosition="left"
          >
            {checkingOverlap ? 'Checking...' : (isSubmitting ? (editingRate ? 'Updating...' : 'Adding...') : (editingRate ? 'Update Promotional Rate' : 'Add Promotional Rate'))}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddPromotionalRateModal;

