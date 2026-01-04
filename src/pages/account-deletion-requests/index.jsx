import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/ui/AdminSidebar';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import NotificationBell from '../../components/NotificationBell';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

const AccountDeletionRequests = () => {
  const { user: adminUser } = useAuth();
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching deletion requests:', error);
        showToast('Error fetching deletion requests', 'error');
        setRequests([]);
      } else {
        setRequests(data || []);
      }
    } catch (err) {
      console.error('Error fetching deletion requests:', err);
      showToast('Error fetching deletion requests', 'error');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId, newStatus, actionType = 'approve') => {
    try {
      setIsProcessing(true);
      
      const updateData = {
        status: newStatus === 'approved' ? 'processed' : newStatus,
        processed_at: new Date().toISOString(),
        processed_by: adminUser?.id,
        notes: adminNotes || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('account_deletion_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // If processed (approved), also soft delete the user account by email
      if (actionType === 'approve') {
        const request = requests.find(r => r.id === requestId);
        if (request?.email) {
          // Find user by email and soft delete
          const { data: userData } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', request.email)
            .single();

          if (userData?.id) {
            await supabase
              .from('profiles')
              .update({
                deleted_at: new Date().toISOString(),
                deleted_by: adminUser?.id,
                deletion_reason: request.reason || 'Account deletion request processed',
                status: 'inactive',
                updated_at: new Date().toISOString()
              })
              .eq('id', userData.id);
          }
        }
      }

      showToast(`Request ${actionType === 'approve' ? 'processed' : 'cancelled'} successfully`, 'success');
      await fetchRequests();
      setIsDetailModalOpen(false);
      setAdminNotes('');
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error updating request:', error);
      showToast(`Error ${actionType === 'approve' ? 'processing' : 'cancelling'} request`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = !searchTerm || 
      request.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      
      <div className="lg:ml-sidebar">
        {/* Header */}
        <header className="h-header bg-header-background border-b border-header-border px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-header-foreground">Account Deletion Requests</h1>
              <p className="text-sm text-muted-foreground hidden lg:block">Manage user account deletion requests</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <NotificationBell />
            <UserProfileDropdown />
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 lg:p-6">
          <BreadcrumbNavigation />
          
          {/* Filters */}
          <div className="bg-card rounded-lg border border-border p-4 lg:p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by ID, email, or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  iconName="Search"
                />
              </div>
              <div className="w-full lg:w-48">
                  <Select
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'processed', label: 'Processed' },
                    { value: 'cancelled', label: 'Cancelled' }
                  ]}
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value)}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <Icon name="FileX" size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-card-foreground mb-2">No deletion requests found</h3>
              <p className="text-sm text-muted-foreground">
                {requests.length === 0 
                  ? 'No account deletion requests have been submitted yet.'
                  : 'No requests match your search criteria.'}
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Request ID</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-foreground">User</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Email</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Reason</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Requested</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 text-sm">
                          <span className="font-mono text-primary">{request.id?.substring(0, 8)}...</span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {request.email || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {request.email || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="max-w-xs truncate" title={request.reason}>
                            {request.reason || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadgeClass(request.status)}`}>
                            {request.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {formatDate(request.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsDetailModalOpen(true);
                            }}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Deletion Request Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setSelectedRequest(null);
                    setAdminNotes('');
                  }}
                >
                  <Icon name="X" size={20} />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Request ID</label>
                <p className="mt-1 text-sm font-mono">{selectedRequest.id}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="mt-1 text-sm">{selectedRequest.email || '-'}</p>
              </div>
              
              {selectedRequest.confirmation_accepted !== undefined && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Confirmation Accepted</label>
                  <p className="mt-1 text-sm">
                    {selectedRequest.confirmation_accepted ? 'Yes' : 'No'}
                  </p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Reason</label>
                <p className="mt-1 text-sm whitespace-pre-wrap">{selectedRequest.reason || 'No reason provided'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadgeClass(selectedRequest.status)}`}>
                    {selectedRequest.status || 'pending'}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Requested At</label>
                <p className="mt-1 text-sm">{formatDate(selectedRequest.created_at)}</p>
              </div>

              {selectedRequest.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Admin Notes</label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{selectedRequest.notes}</p>
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Admin Notes</label>
                    <textarea
                      className="mt-1 w-full px-3 py-2 border border-border rounded-lg text-sm"
                      rows={3}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this request..."
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      onClick={() => handleStatusUpdate(selectedRequest.id, 'cancelled', 'reject')}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      Cancel Request
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => handleStatusUpdate(selectedRequest.id, 'processed', 'approve')}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      Process & Delete Account
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountDeletionRequests;

