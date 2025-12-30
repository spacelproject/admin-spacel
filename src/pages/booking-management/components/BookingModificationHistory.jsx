import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../components/ui/Toast';

const BookingModificationHistory = ({ bookingId }) => {
  const { showToast } = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookingId) {
      fetchHistory();
    }
  }, [bookingId]);

  const fetchHistory = async () => {
    if (!bookingId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('booking_modifications')
        .select(`
          *,
          modified_by_profile:modified_by (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching modification history:', error);
      showToast('Error loading modification history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getModificationIcon = (type) => {
    switch (type) {
      case 'status_change':
        return 'RefreshCw';
      case 'payment_change':
        return 'CreditCard';
      case 'date_change':
        return 'Calendar';
      case 'amount_change':
        return 'DollarSign';
      case 'refund':
        return 'ArrowLeft';
      default:
        return 'Edit';
    }
  };

  const getModificationColor = (type) => {
    switch (type) {
      case 'status_change':
        return 'text-blue-600 bg-blue-100';
      case 'payment_change':
        return 'text-green-600 bg-green-100';
      case 'date_change':
        return 'text-purple-600 bg-purple-100';
      case 'amount_change':
        return 'text-orange-600 bg-orange-100';
      case 'refund':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getAdminName = (admin) => {
    if (!admin) return 'Unknown Admin';
    return `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || admin.email || 'Unknown Admin';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">Modification History</h3>
        <span className="text-sm text-muted-foreground">
          {history.length} change{history.length !== 1 ? 's' : ''}
        </span>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="History" size={32} className="mx-auto mb-2 opacity-50" />
          <p>No modifications recorded yet.</p>
          <p className="text-sm mt-1">Changes to this booking will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((modification) => (
            <div
              key={modification.id}
              className="bg-muted/30 border border-border rounded-lg p-4 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getModificationColor(modification.modification_type)}`}>
                    <Icon 
                      name={getModificationIcon(modification.modification_type)} 
                      size={16} 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground capitalize">
                      {modification.modification_type?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getAdminName(modification.modified_by_profile)} • {formatDate(modification.created_at)}
                    </p>
                  </div>
                </div>
              </div>
              
              {(modification.old_value || modification.new_value) && (
                <div className="ml-11 space-y-1">
                  {modification.old_value && (
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-muted-foreground">From:</span>
                      <span className="text-foreground line-through">{modification.old_value}</span>
                    </div>
                  )}
                  {modification.new_value && (
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-muted-foreground">To:</span>
                      <span className="text-foreground font-medium">{modification.new_value}</span>
                    </div>
                  )}
                </div>
              )}
              
              {modification.reason && (
                <div className="ml-11 mt-2">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Reason:</span> {modification.reason}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingModificationHistory;

