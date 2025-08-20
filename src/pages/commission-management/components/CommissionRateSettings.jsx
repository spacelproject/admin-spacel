import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/Toast';

const CommissionRateSettings = ({ onRateChange }) => {
  const [commissionRates, setCommissionRates] = useState({
    seeker: 8.5,
    partner: 12.0
  });
  const [originalRates, setOriginalRates] = useState({
    seeker: 8.5,
    partner: 12.0
  });
  const [promotionalRates, setPromotionalRates] = useState([]);
  const [showPromotionalForm, setShowPromotionalForm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const handleRateChange = (type, value) => {
    const rate = Math.max(0, Math.min(50, parseFloat(value) || 0));
    const updatedRates = { ...commissionRates, [type]: rate };
    setCommissionRates(updatedRates);
    
    // Check if there are unsaved changes
    const hasChanges = updatedRates?.seeker !== originalRates?.seeker || 
                      updatedRates?.partner !== originalRates?.partner;
    setHasUnsavedChanges(hasChanges);
    
    onRateChange?.({ type, rate });
  };

  const handleBulkRateAdjustment = (adjustment) => {
    const updatedRates = {};
    Object.keys(commissionRates)?.forEach(type => {
      const newRate = Math.max(0, Math.min(50, commissionRates?.[type] + adjustment));
      updatedRates[type] = newRate;
    });
    setCommissionRates(updatedRates);
    
    const hasChanges = updatedRates?.seeker !== originalRates?.seeker || 
                      updatedRates?.partner !== originalRates?.partner;
    setHasUnsavedChanges(hasChanges);
    
    onRateChange?.({ type: 'bulk', rates: updatedRates });
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Simulate save process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update original rates after successful save
      setOriginalRates({ ...commissionRates });
      setHasUnsavedChanges(false);
      
      // Show success toast notification
      showToast(
        `Commission rates updated successfully! Seeker: ${commissionRates?.seeker}%, Partner: ${commissionRates?.partner}%`,
        'success',
        { duration: 5000 }
      );
      
      onRateChange?.({ type: 'save', rates: commissionRates });
    } catch (error) {
      console.error('Failed to save commission rates:', error);
      // Show error toast notification
      showToast(
        'Failed to save commission rates. Please try again.',
        'error',
        { duration: 6000 }
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelChanges = () => {
    setCommissionRates({ ...originalRates });
    setHasUnsavedChanges(false);
    
    // Show info toast for cancelled changes
    showToast('Changes cancelled. Rates reverted to last saved values.', 'info');
  };

  const addPromotionalRate = (rateData) => {
    const newRate = {
      id: Date.now(),
      ...rateData,
      createdAt: new Date()?.toISOString()
    };
    setPromotionalRates([...promotionalRates, newRate]);
    setShowPromotionalForm(false);
    
    // Show success toast for promotional rate
    showToast(
      `Promotional rate "${rateData?.name}" added successfully!`,
      'success'
    );
  };

  const removePromotionalRate = (id) => {
    const rateToRemove = promotionalRates?.find(rate => rate?.id === id);
    setPromotionalRates(promotionalRates?.filter(rate => rate?.id !== id));
    
    // Show info toast for removed promotional rate
    showToast(
      `Promotional rate "${rateToRemove?.name}" removed successfully.`,
      'info'
    );
  };

  const resetToDefaults = () => {
    const defaultRates = { seeker: 8.5, partner: 12.0 };
    setCommissionRates(defaultRates);
    const hasChanges = defaultRates?.seeker !== originalRates?.seeker || 
                      defaultRates?.partner !== originalRates?.partner;
    setHasUnsavedChanges(hasChanges);
    onRateChange?.({ type: 'reset', rates: defaultRates });
    
    // Show warning toast for reset action
    showToast(
      'Commission rates reset to default values. Don\'t forget to save!',
      'warning'
    );
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-card-foreground">Commission Rate Settings</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            iconName="RotateCcw"
            iconPosition="left"
            onClick={resetToDefaults}
          >
            Reset to Defaults
          </Button>
          <Button
            variant="outline"
            iconName="Plus"
            iconPosition="left"
            onClick={() => setShowPromotionalForm(true)}
          >
            Add Promotional Rate
          </Button>
        </div>
      </div>
      
      {/* Enhanced Save/Cancel Controls */}
      {hasUnsavedChanges && (
        <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Icon name="AlertTriangle" size={16} className="text-warning" />
              <div>
                <span className="text-sm font-medium text-card-foreground block">
                  You have unsaved changes
                </span>
                <span className="text-xs text-muted-foreground">
                  Click Save to apply your commission rate changes
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelChanges}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                iconName={isSaving ? "Loader2" : "Check"}
                iconPosition="left"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className={isSaving ? "animate-spin" : ""}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Commission Structure Overview */}
      <div className="mb-8">
        <div className="bg-muted rounded-lg p-4 mb-4">
          <h3 className="text-lg font-medium text-card-foreground mb-2">Commission Structure</h3>
          <p className="text-sm text-muted-foreground">
            Simplified commission model with two participant types. Rates are applied to successful bookings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Seeker Commission */}
          <div className="bg-muted rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary rounded-lg">
                  <Icon name="Search" size={20} className="text-primary-foreground" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-card-foreground">Seeker Commission</h4>
                  <p className="text-sm text-muted-foreground">Commission from space seekers</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{commissionRates?.seeker}%</div>
                <div className="text-xs text-muted-foreground">per booking</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Input
                    type="range"
                    min="0"
                    max="50"
                    step="0.1"
                    value={commissionRates?.seeker}
                    onChange={(e) => handleRateChange('seeker', e?.target?.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={commissionRates?.seeker}
                    onChange={(e) => handleRateChange('seeker', e?.target?.value)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Example: $100 booking</span>
                <span className="font-medium text-card-foreground">
                  Commission: ${(commissionRates?.seeker)?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Partner Commission */}
          <div className="bg-muted rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-accent rounded-lg">
                  <Icon name="Handshake" size={20} className="text-accent-foreground" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-card-foreground">Partner Commission</h4>
                  <p className="text-sm text-muted-foreground">Commission from space partners</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-accent">{commissionRates?.partner}%</div>
                <div className="text-xs text-muted-foreground">per booking</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Input
                    type="range"
                    min="0"
                    max="50"
                    step="0.1"
                    value={commissionRates?.partner}
                    onChange={(e) => handleRateChange('partner', e?.target?.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={commissionRates?.partner}
                    onChange={(e) => handleRateChange('partner', e?.target?.value)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Example: $100 booking</span>
                <span className="font-medium text-card-foreground">
                  Commission: ${(commissionRates?.partner)?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Adjustments */}
        <div className="flex items-center justify-between mt-6 p-4 bg-muted rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-card-foreground">Bulk Rate Adjustments</h4>
            <p className="text-xs text-muted-foreground">Apply the same adjustment to both commission types</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkRateAdjustment(-0.5)}
            >
              -0.5%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkRateAdjustment(-1)}
            >
              -1%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkRateAdjustment(1)}
            >
              +1%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkRateAdjustment(0.5)}
            >
              +0.5%
            </Button>
          </div>
        </div>
      </div>
      {/* Total Revenue Summary */}
      <div className="mb-8">
        <div className="bg-success/10 border border-success/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-medium text-card-foreground">Total Platform Commission</h4>
              <p className="text-sm text-muted-foreground">Combined rate from both participant types</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-success">
                {(commissionRates?.seeker + commissionRates?.partner)?.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">total per booking</div>
            </div>
          </div>
        </div>
      </div>
      {/* Promotional Rates */}
      <div>
        <h3 className="text-lg font-medium text-card-foreground mb-4">Promotional Rates</h3>
        {promotionalRates?.length === 0 ? (
          <div className="bg-muted rounded-lg p-6 text-center">
            <Icon name="Percent" size={32} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No promotional rates active</p>
          </div>
        ) : (
          <div className="space-y-3">
            {promotionalRates?.map(rate => (
              <div key={rate?.id} className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-card-foreground">{rate?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {rate?.userType === 'seeker' ? 'Seeker' : 'Partner'}: {rate?.rate}% • {rate?.startDate} to {rate?.endDate}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="Trash2"
                    onClick={() => removePromotionalRate(rate?.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Promotional Rate Form Modal */}
      {showPromotionalForm && (
        <PromotionalRateForm
          onSubmit={addPromotionalRate}
          onClose={() => setShowPromotionalForm(false)}
        />
      )}
    </div>
  );
};

const PromotionalRateForm = ({ onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    rate: 5.0,
    userType: 'seeker',
    startDate: '',
    endDate: ''
  });

  const handleSubmit = (e) => {
    e?.preventDefault();
    onSubmit(formData);
  };

  const userTypeOptions = [
    { value: 'seeker', label: 'Seeker Commission' },
    { value: 'partner', label: 'Partner Commission' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal">
      <div className="bg-card rounded-lg border border-border p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-card-foreground">Add Promotional Rate</h3>
          <Button variant="ghost" size="sm" iconName="X" onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Promotion Name"
            value={formData?.name}
            onChange={(e) => setFormData({ ...formData, name: e?.target?.value })}
            placeholder="e.g., Summer Special"
            required
          />

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              User Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {userTypeOptions?.map((option) => (
                <button
                  key={option?.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, userType: option?.value })}
                  className={`
                    p-3 rounded-md border text-sm font-medium transition-smooth
                    ${formData?.userType === option?.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                    }
                  `}
                >
                  {option?.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Commission Rate (%)"
            type="number"
            min="0"
            max="50"
            step="0.1"
            value={formData?.rate}
            onChange={(e) => setFormData({ ...formData, rate: parseFloat(e?.target?.value) })}
            required
          />

          <Input
            label="Start Date"
            type="date"
            value={formData?.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e?.target?.value })}
            required
          />

          <Input
            label="End Date"
            type="date"
            value={formData?.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e?.target?.value })}
            min={formData?.startDate}
            required
          />

          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1">
              Add Promotional Rate
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommissionRateSettings;