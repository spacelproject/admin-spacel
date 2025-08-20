import React, { useState, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Image from '../../../components/AppImage';

const RevenueTrackingTable = ({ onExport }) => {
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
  const itemsPerPage = 10;

  // Mock transaction data
  const transactions = [
    {
      id: 'BK-2025-001',
      bookingId: 'BK-2025-001',
      host: {
        name: 'Sarah Johnson',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9c9b8d8?w=150'
      },
      space: {
        name: 'Modern Conference Room',
        category: 'office'
      },
      bookingAmount: 450.00,
      commissionRate: 15,
      platformFee: 67.50,
      hostPayout: 382.50,
      date: '2025-01-15',
      status: 'completed'
    },
    {
      id: 'BK-2025-002',
      bookingId: 'BK-2025-002',
      host: {
        name: 'Michael Chen',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
      },
      space: {
        name: 'Creative Coworking Space',
        category: 'creative'
      },
      bookingAmount: 280.00,
      commissionRate: 18,
      platformFee: 50.40,
      hostPayout: 229.60,
      date: '2025-01-14',
      status: 'completed'
    },
    {
      id: 'BK-2025-003',
      bookingId: 'BK-2025-003',
      host: {
        name: 'Emily Rodriguez',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'
      },
      space: {
        name: 'Executive Office Suite',
        category: 'office'
      },
      bookingAmount: 750.00,
      commissionRate: 12,
      platformFee: 90.00,
      hostPayout: 660.00,
      date: '2025-01-13',
      status: 'completed'
    },
    {
      id: 'BK-2025-004',
      bookingId: 'BK-2025-004',
      host: {
        name: 'David Park',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
      },
      space: {
        name: 'Event Hall Premium',
        category: 'entertainment'
      },
      bookingAmount: 1200.00,
      commissionRate: 20,
      platformFee: 240.00,
      hostPayout: 960.00,
      date: '2025-01-12',
      status: 'completed'
    },
    {
      id: 'BK-2025-005',
      bookingId: 'BK-2025-005',
      host: {
        name: 'Lisa Thompson',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
      },
      space: {
        name: 'Retail Storefront',
        category: 'retail'
      },
      bookingAmount: 150.00,
      commissionRate: 10,
      platformFee: 15.00,
      hostPayout: 135.00,
      date: '2025-01-11',
      status: 'completed'
    }
  ];

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
    { value: 'office', label: 'Office' },
    { value: 'retail', label: 'Retail' },
    { value: 'industrial', label: 'Industrial' },
    { value: 'hospitality', label: 'Hospitality' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'mixed', label: 'Mixed' },
    { value: 'farm', label: 'Farm' },
    { value: 'creative', label: 'Creative' },
    { value: 'entertainment', label: 'Entertainment' }
  ];

  const filteredTransactions = useMemo(() => {
    return transactions?.filter(transaction => {
      if (filters?.host && !transaction?.host?.name?.toLowerCase()?.includes(filters?.host?.toLowerCase())) {
        return false;
      }
      if (filters?.category !== 'all' && transaction?.space?.category !== filters?.category) {
        return false;
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
      }

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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    })?.format(amount);
  };

  const getCategoryLabel = (category) => {
    const option = categoryOptions?.find(opt => opt?.value === category);
    return option ? option?.label : category;
  };

  return (
    <div className="bg-card rounded-lg border border-border">
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
            />

            <Input
              label="Min Amount"
              type="number"
              placeholder="$0"
              value={filters?.minAmount}
              onChange={(e) => handleFilterChange('minAmount', e?.target?.value)}
            />

            <div className="flex items-end space-x-2">
              <Input
                label="Max Amount"
                type="number"
                placeholder="$10000"
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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('bookingId')}
                  className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>Booking ID</span>
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
                  onClick={() => handleSort('commissionRate')}
                  className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>Commission Rate</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('platformFee')}
                  className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>Platform Fee</span>
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
                    {formatCurrency(transaction?.bookingAmount)}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-sm font-medium text-primary">
                    {transaction?.commissionRate}%
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-sm font-medium text-success">
                    {formatCurrency(transaction?.platformFee)}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-sm font-medium text-card-foreground">
                    {formatCurrency(transaction?.hostPayout)}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-sm text-muted-foreground">
                    {new Date(transaction.date)?.toLocaleDateString('en-US')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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