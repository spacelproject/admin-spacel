import React, { useState, useMemo, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Image from '../../../components/AppImage';
import TransactionDetailsModal from './TransactionDetailsModal';
import { supabase } from '../../../lib/supabase';

const RevenueTrackingTable = ({ bookings, onExport }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [filters, setFilters] = useState({
    dateRange: 'all',
    customStartDate: '',
    customEndDate: '',
    host: '',
    category: 'all',
    minAmount: '',
    maxAmount: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const itemsPerPage = 10;

  // Use only real data from props
  const transactions = bookings && bookings.length > 0 ? 
    bookings.map(booking => {
      // For partial refunds, platform keeps full application fee
      // For full refunds, platform earnings should be 0 (already handled in useCommissionData)
      const platformEarnings = booking.netApplicationFee !== null && booking.netApplicationFee !== undefined 
        ? booking.netApplicationFee 
        : booking.platformEarnings || 0
      
      return {
        id: booking.id,
        bookingId: booking.booking_reference || booking.bookingId,
        paymentIntentId: booking.stripePaymentIntentId,
        host: {
          name: booking.hostName,
          avatar: booking.hostAvatar
        },
        space: {
          name: booking.spaceName,
          category: booking.spaceCategory || 'office'
        },
        bookingAmount: booking.bookingAmount,
        // Use netApplicationFee (Net Application Fee) as Platform Earnings - this is what platform keeps after Stripe fees
        // For partial refunds, this includes the full application fee (platform keeps it)
        platformEarnings: platformEarnings,
        hostPayout: booking.hostPayout,
        date: booking.bookingDate && booking.bookingDate instanceof Date 
          ? booking.bookingDate.toISOString().split('T')[0]
          : booking.bookingDate 
            ? new Date(booking.bookingDate).toISOString().split('T')[0]
            : '',
        status: booking.paymentStatus || booking.bookingStatus || 'pending',
        // Refund information
        refundAmount: booking.refundAmount || 0,
        transferReversalAmount: booking.transferReversalAmount || 0,
        isFullRefund: booking.isFullRefund || false,
        isPartialRefund: booking.isPartialRefund || false,
        is50_50Split: booking.is50_50Split || false,
        bookingData: booking // Store full booking data for modal
      }
    }) : [];

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const { data: mainCategories, error } = await supabase
          .from('main_categories')
          .select('name')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) {
          console.error('Error fetching categories:', error);
          // Fallback to empty array
          setCategories([]);
        } else {
          // Transform to options format
          const categoryOptions = (mainCategories || []).map(cat => ({
            value: cat.name,
            label: cat.name
          }));
          setCategories(categoryOptions);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'last-week', label: 'Last Week' },
    { value: 'month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'last-quarter', label: 'Last Quarter' },
    { value: 'year', label: 'This Year' },
    { value: 'last-year', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories
  ];

  const filteredTransactions = useMemo(() => {
    return transactions?.filter(transaction => {
      if (filters?.host && !transaction?.host?.name?.toLowerCase()?.includes(filters?.host?.toLowerCase())) {
        return false;
      }
      // Case-insensitive category filtering
      if (filters?.category !== 'all' && filters?.category) {
        const transactionCategory = (transaction?.space?.category || '').toLowerCase().trim();
        const filterCategory = filters.category.toLowerCase().trim();
        if (transactionCategory !== filterCategory) {
          return false;
        }
      }
      if (filters?.minAmount && transaction?.bookingAmount < parseFloat(filters?.minAmount)) {
        return false;
      }
      if (filters?.maxAmount && transaction?.bookingAmount > parseFloat(filters?.maxAmount)) {
        return false;
      }
      
      // Date range filtering logic
      if (filters?.dateRange !== 'all' && filters?.dateRange !== 'custom') {
        const transactionDate = new Date(transaction.date);
        const now = new Date();
        
        switch (filters?.dateRange) {
          case 'today':
            if (transactionDate?.toDateString() !== now?.toDateString()) return false;
            break;
          case 'week':
            const weekStart = new Date(now);
            weekStart?.setDate(now?.getDate() - now?.getDay());
            if (transactionDate < weekStart) return false;
            break;
          case 'last-week':
            const lastWeekStart = new Date(now);
            lastWeekStart?.setDate(now?.getDate() - now?.getDay() - 7);
            const lastWeekEnd = new Date(lastWeekStart);
            lastWeekEnd?.setDate(lastWeekStart?.getDate() + 6);
            if (transactionDate < lastWeekStart || transactionDate > lastWeekEnd) return false;
            break;
          case 'month':
            if (transactionDate?.getMonth() !== now?.getMonth() || 
                transactionDate?.getFullYear() !== now?.getFullYear()) return false;
            break;
          case 'last-month':
            const lastMonth = new Date(now);
            lastMonth?.setMonth(now?.getMonth() - 1);
            if (transactionDate?.getMonth() !== lastMonth?.getMonth() || 
                transactionDate?.getFullYear() !== lastMonth?.getFullYear()) return false;
            break;
          case 'quarter':
            const currentQuarter = Math.floor(now?.getMonth() / 3);
            const transactionQuarter = Math.floor(transactionDate?.getMonth() / 3);
            if (transactionQuarter !== currentQuarter || 
                transactionDate?.getFullYear() !== now?.getFullYear()) return false;
            break;
          case 'last-quarter':
            const lastQuarter = Math.floor((now?.getMonth() - 3) / 3);
            const transactionLastQuarter = Math.floor(transactionDate?.getMonth() / 3);
            const lastQuarterYear = lastQuarter < 0 ? now?.getFullYear() - 1 : now?.getFullYear();
            const adjustedLastQuarter = lastQuarter < 0 ? 3 : lastQuarter;
            if (transactionLastQuarter !== adjustedLastQuarter || 
                transactionDate?.getFullYear() !== lastQuarterYear) return false;
            break;
          case 'year':
            if (transactionDate?.getFullYear() !== now?.getFullYear()) return false;
            break;
          case 'last-year':
            if (transactionDate?.getFullYear() !== now?.getFullYear() - 1) return false;
            break;
        }
      }
      
      // Custom date range filtering
      if (filters?.dateRange === 'custom' && (filters?.customStartDate || filters?.customEndDate)) {
        const transactionDate = new Date(transaction.date);
        if (filters?.customStartDate && transactionDate < new Date(filters.customStartDate)) return false;
        if (filters?.customEndDate && transactionDate > new Date(filters.customEndDate)) return false;
      }
      
      return true;
    });
  }, [filters]);

  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions]?.sort((a, b) => {
      let aValue = a?.[sortConfig?.key];
      let bValue = b?.[sortConfig?.key];

      if (sortConfig?.key === 'host') {
        aValue = a?.host?.name;
        bValue = b?.host?.name;
      } else if (sortConfig?.key === 'space') {
        aValue = a?.space?.name;
        bValue = b?.space?.name;
      } else if (sortConfig?.key === 'platformEarnings') {
        // Sort by platform earnings (after Stripe fees)
        aValue = a?.platformEarnings || 0;
        bValue = b?.platformEarnings || 0;
      } else if (sortConfig?.key === 'status') {
        // Sort by status
        aValue = a?.status || 'pending';
        bValue = b?.status || 'pending';
      } else if (sortConfig?.key === 'date') {
        // Parse dates for proper date sorting
        aValue = new Date(aValue);
        bValue = new Date(bValue);
        // Compare dates directly (numbers)
        if (aValue < bValue) return sortConfig?.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig?.direction === 'asc' ? 1 : -1;
        return 0;
      }

      // Handle numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        if (aValue < bValue) return sortConfig?.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig?.direction === 'asc' ? 1 : -1;
        return 0;
      }

      // Handle string values
      if (typeof aValue === 'string') {
        aValue = aValue?.toLowerCase();
        bValue = bValue?.toLowerCase();
      }

      if (aValue < bValue) return sortConfig?.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig?.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredTransactions, sortConfig]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTransactions?.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTransactions, currentPage]);

  const totalPages = Math.ceil(sortedTransactions?.length / itemsPerPage);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig?.key === key && prevConfig?.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    
    // Show/hide custom date range inputs
    if (key === 'dateRange') {
      setShowCustomDateRange(value === 'custom');
      if (value !== 'custom') {
        newFilters.customStartDate = '';
        newFilters.customEndDate = '';
      }
    }
    
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      dateRange: 'all',
      customStartDate: '',
      customEndDate: '',
      host: '',
      category: 'all',
      minAmount: '',
      maxAmount: ''
    });
    setShowCustomDateRange(false);
    setCurrentPage(1);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    })?.format(amount);
  };

  const getCategoryLabel = (category) => {
    if (!category) return 'Unknown';
    const option = categoryOptions?.find(opt => opt?.value?.toLowerCase() === category?.toLowerCase());
    return option ? option?.label : category;
  };

  return (
    <div className="bg-card rounded-lg border border-border w-full">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-card-foreground">Revenue Tracking</h2>
          <Button
            variant="outline"
            iconName="Download"
            iconPosition="left"
            onClick={onExport}
          >
            Export Data
          </Button>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select
              label="Date Range"
              options={dateRangeOptions}
              value={filters?.dateRange}
              onChange={(value) => handleFilterChange('dateRange', value)}
            />

            <Input
              label="Host Name"
              placeholder="Search by host..."
              value={filters?.host}
              onChange={(e) => handleFilterChange('host', e?.target?.value)}
            />

            <Select
              label="Category"
              options={categoryOptions}
              value={filters?.category}
              onChange={(value) => handleFilterChange('category', value)}
              clearable={true}
            />

            <Input
              label="Min Amount"
              type="number"
              placeholder="A$0"
              value={filters?.minAmount}
              onChange={(e) => handleFilterChange('minAmount', e?.target?.value)}
            />

            <div className="flex items-end space-x-2">
              <Input
                label="Max Amount"
                type="number"
                placeholder="A$10000"
                value={filters?.maxAmount}
                onChange={(e) => handleFilterChange('maxAmount', e?.target?.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                iconName="X"
                onClick={clearFilters}
              />
            </div>
          </div>

          {/* Custom Date Range Inputs */}
          {showCustomDateRange && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <Input
                label="Start Date"
                type="date"
                value={filters?.customStartDate}
                onChange={(e) => handleFilterChange('customStartDate', e?.target?.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={filters?.customEndDate}
                onChange={(e) => handleFilterChange('customEndDate', e?.target?.value)}
                min={filters?.customStartDate}
              />
            </div>
          )}
        </div>
      </div>
      {/* Table */}
      <div className="overflow-x-auto w-full">
        <table className="w-full min-w-full table-auto">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('bookingId')}
                  className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>Reference</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('host')}
                  className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>Host</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('space')}
                  className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>Space</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('bookingAmount')}
                  className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>Booking Amount</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('platformEarnings')}
                  className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>Platform Earnings</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('hostPayout')}
                  className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>Host Payout</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
                <p className="text-xs text-muted-foreground mt-1">Actual transfer amount</p>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>Status</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('date')}
                  className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>Date</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4">
                <span className="text-sm font-medium text-muted-foreground">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions?.map((transaction) => (
              <tr key={transaction?.id} className="border-b border-border hover:bg-muted/50">
                <td className="p-4">
                  <span className="font-mono text-sm text-primary">{transaction?.bookingId}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <Image
                      src={transaction?.host?.avatar}
                      alt={transaction?.host?.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="text-sm font-medium text-card-foreground">
                      {transaction?.host?.name}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{transaction?.space?.name}</p>
                    <p className="text-xs text-muted-foreground">{getCategoryLabel(transaction?.space?.category)}</p>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-sm font-medium text-card-foreground">
                    {formatCurrency(transaction?.bookingAmount || 0)}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-sm font-medium text-success">
                    {formatCurrency(transaction?.platformEarnings || 0)}
                  </span>
                  <p className="text-xs text-success/70 mt-1">
                    {transaction?.isPartialRefund || transaction?.is50_50Split 
                      ? 'Net Application Fee (Kept)' 
                      : 'Net Application Fee'}
                  </p>
                  {(transaction?.isPartialRefund || transaction?.is50_50Split) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Partial refund - Platform keeps full fee
                    </p>
                  )}
                </td>
                <td className="p-4">
                  <span className="text-sm font-medium text-card-foreground">
                    {formatCurrency(transaction?.hostPayout || 0)}
                  </span>
                  <p className={`text-xs mt-1 ${
                    transaction?.hostPayoutStatus === 'paid' 
                      ? 'text-success' 
                      : transaction?.hostPayoutStatus === 'pending'
                      ? 'text-warning'
                      : 'text-muted-foreground'
                  }`}>
                    {transaction?.hostPayoutStatus === 'paid' 
                      ? '✓ Withdrawn to bank' 
                      : transaction?.hostPayoutStatus === 'pending'
                      ? '⏳ Pending withdrawal'
                      : 'Via Stripe Connect'}
                  </p>
                </td>
                <td className="p-4">
                  <span className="text-sm font-medium">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction?.status === 'paid' || transaction?.status === 'successful' 
                        ? 'bg-success/10 text-success' 
                        : transaction?.status === 'refunded'
                        ? transaction?.isPartialRefund || transaction?.is50_50Split
                          ? 'bg-warning/10 text-warning'
                          : 'bg-error/10 text-error'
                        : transaction?.status === 'failed'
                        ? 'bg-error/10 text-error'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {transaction?.status === 'paid' ? 'Successful' : 
                       transaction?.status === 'refunded' 
                         ? transaction?.is50_50Split 
                           ? '50/50 Refund'
                           : transaction?.isPartialRefund
                           ? 'Partial Refund'
                           : 'Full Refund'
                       : transaction?.status === 'failed' ? 'Failed' :
                       transaction?.status === 'pending' ? 'Pending' :
                       transaction?.status?.charAt(0).toUpperCase() + transaction?.status?.slice(1) || 'Pending'}
                    </span>
                  </span>
                  {(transaction?.isPartialRefund || transaction?.is50_50Split) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Refund: {formatCurrency((transaction?.refundAmount || 0) + (transaction?.transferReversalAmount || 0))}
                    </p>
                  )}
                </td>
                <td className="p-4">
                  <span className="text-sm text-muted-foreground">
                    {transaction.date 
                      ? (() => {
                          const date = new Date(transaction.date);
                          return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString('en-US');
                        })()
                      : 'N/A'}
                  </span>
                </td>
                <td className="p-4">
                  {transaction.paymentIntentId ? (
                    <Button
                      variant="outline"
                      size="sm"
                      iconName="Eye"
                      onClick={() => setSelectedTransaction(transaction)}
                    >
                      View Details
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">No Payment ID</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionDetailsModal
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          paymentIntentId={selectedTransaction.paymentIntentId}
          bookingData={selectedTransaction.bookingData}
        />
      )}
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedTransactions?.length)} of {sortedTransactions?.length} transactions
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              iconName="ChevronLeft"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            />
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              iconName="ChevronRight"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueTrackingTable;