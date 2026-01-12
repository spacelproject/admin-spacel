import React, { useState, useEffect } from 'react';
import Icon from '../../../../components/AppIcon';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import { supabase } from '../../../../lib/supabase';
import { useToast } from '../../../../components/ui/Toast';
import AddPromotionalRateModal from './AddPromotionalRateModal';

const PromotionalRatesTable = () => {
  const { showToast } = useToast();
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [deletingRate, setDeletingRate] = useState(null);

  useEffect(() => {
    fetchRates();
    // Set up auto-refresh to deactivate expired rates
    const interval = setInterval(() => {
      checkAndDeactivateExpired();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('partner_promotional_rates')
        .select(`
          *,
          partner:profiles!partner_promotional_rates_partner_id_fkey (
            id,
            email,
            first_name,
            last_name,
            company_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Auto-deactivate expired rates
      const now = new Date();
      const updatedRates = data.map(rate => {
        if (rate.is_active && rate.end_date) {
          const endDate = new Date(rate.end_date);
          if (endDate < now) {
            // Rate has expired, deactivate it
            supabase
              .from('partner_promotional_rates')
              .update({ is_active: false })
              .eq('id', rate.id)
              .then(() => {
                rate.is_active = false;
              });
          }
        }
        return rate;
      });

      setRates(updatedRates || []);
    } catch (error) {
      console.error('Error fetching promotional rates:', error);
      showToast('Error fetching promotional rates', 'error');
      setRates([]);
    } finally {
      setLoading(false);
    }
  };

  const checkAndDeactivateExpired = async () => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('partner_promotional_rates')
        .update({ is_active: false })
        .eq('is_active', true)
        .lt('end_date', now)
        .not('end_date', 'is', null);

      if (!error) {
        fetchRates(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deactivating expired rates:', error);
    }
  };

  const getRateStatus = (rate) => {
    const now = new Date();
    const startDate = new Date(rate.start_date);
    const endDate = rate.end_date ? new Date(rate.end_date) : null;

    if (!rate.is_active) {
      return { status: 'inactive', label: 'Inactive', color: 'gray' };
    }

    if (startDate > now) {
      return { status: 'upcoming', label: 'Upcoming', color: 'blue' };
    }

    if (endDate && endDate < now) {
      return { status: 'expired', label: 'Expired', color: 'red' };
    }

    if (!endDate || (startDate <= now && (endDate === null || endDate >= now))) {
      return { status: 'active', label: 'Active', color: 'green' };
    }

    return { status: 'inactive', label: 'Inactive', color: 'gray' };
  };

  const handleDelete = async (rate) => {
    if (!confirm(`Are you sure you want to delete the promotional rate "${rate.promotion_name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('partner_promotional_rates')
        .delete()
        .eq('id', rate.id);

      if (error) throw error;

      showToast('Promotional rate deleted successfully', 'success');
      fetchRates();
      setDeletingRate(null);
    } catch (error) {
      console.error('Error deleting promotional rate:', error);
      showToast('Error deleting promotional rate', 'error');
    }
  };

  const handleEdit = (rate) => {
    setEditingRate(rate);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingRate(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingRate(null);
  };

  const handleModalSuccess = () => {
    fetchRates();
  };

  const filteredRates = rates.filter(rate => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const partnerName = rate.partner
        ? `${rate.partner.first_name || ''} ${rate.partner.last_name || ''}`.trim() || rate.partner.company_name || ''
        : 'All Partners';
      const matchesSearch =
        rate.promotion_name?.toLowerCase().includes(searchLower) ||
        partnerName.toLowerCase().includes(searchLower) ||
        rate.partner?.email?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      const status = getRateStatus(rate);
      if (status.status !== statusFilter) return false;
    }

    // Partner filter
    if (partnerFilter !== 'all') {
      if (partnerFilter === 'all_partners' && rate.partner_id !== null) return false;
      if (partnerFilter === 'specific' && rate.partner_id === null) return false;
    }

    return true;
  });

  const getStatusBadge = (statusInfo) => {
    const colorClasses = {
      active: 'bg-green-100 text-green-800 border-green-200',
      upcoming: 'bg-blue-100 text-blue-800 border-blue-200',
      expired: 'bg-red-100 text-red-800 border-red-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses[statusInfo.status] || colorClasses.inactive}`}>
        {statusInfo.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Indefinite';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPartnerName = (rate) => {
    if (!rate.partner_id) return 'All Partners';
    if (!rate.partner) return 'Unknown Partner';
    return `${rate.partner.first_name || ''} ${rate.partner.last_name || ''}`.trim() || rate.partner.company_name || rate.partner.email || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="Loader2" size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Promotional Rates</h3>
        <Button
          variant="default"
          iconName="Plus"
          iconPosition="left"
          onClick={handleAddNew}
        >
          Add Promotional Rate
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          type="search"
          placeholder="Search by name, partner..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
        <Select
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'active', label: 'Active' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'expired', label: 'Expired' },
            { value: 'inactive', label: 'Inactive' }
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <Select
          options={[
            { value: 'all', label: 'All Partners' },
            { value: 'all_partners', label: 'All Partners (Global)' },
            { value: 'specific', label: 'Specific Partners' }
          ]}
          value={partnerFilter}
          onChange={setPartnerFilter}
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Promotion Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  End Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRates.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-muted-foreground">
                    <Icon name="Inbox" size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No promotional rates found</p>
                  </td>
                </tr>
              ) : (
                filteredRates.map((rate) => {
                  const statusInfo = getRateStatus(rate);
                  const isPartnerRate = rate.partner_commission_rate !== null;
                  
                  return (
                    <tr key={rate.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground font-medium">
                        {rate.promotion_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        <div className="flex items-center space-x-2">
                          <Icon 
                            name={rate.partner_id ? "Building" : "Users"} 
                            size={16} 
                            className="text-muted-foreground" 
                          />
                          <span>{formatPartnerName(rate)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        <span className="inline-flex items-center space-x-1">
                          <Icon 
                            name={isPartnerRate ? "Building" : "User"} 
                            size={14} 
                            className="text-muted-foreground" 
                          />
                          <span>{isPartnerRate ? 'Partner' : 'Seeker'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground font-medium">
                        {isPartnerRate ? rate.partner_commission_rate : rate.seeker_commission_rate}%
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {formatDate(rate.start_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {formatDate(rate.end_date)}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(statusInfo)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            iconName="Edit"
                            onClick={() => handleEdit(rate)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            iconName="Trash2"
                            onClick={() => handleDelete(rate)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AddPromotionalRateModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editingRate={editingRate}
      />
    </div>
  );
};

export default PromotionalRatesTable;

