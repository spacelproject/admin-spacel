import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import Sheet, { SheetHeader, SheetContent, SheetFooter } from '../../../components/ui/Sheet';
import { usePendingApprovals } from '../../../hooks/usePendingApprovals';

const PendingApprovals = ({ onModalStateChange }) => {
  const navigate = useNavigate();
  const [showRejectSheet, setShowRejectSheet] = useState(false);
  const [showApproveSheet, setShowApproveSheet] = useState(false);
  const [showViewSheet, setShowViewSheet] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  
  const { 
    pendingItems, 
    allPendingItems,
    loading, 
    loadingMore,
    error, 
    hasMore,
    loadMore,
    approveItem, 
    rejectItem,
    isApproving,
    isRejecting
  } = usePendingApprovals();

  const observerRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Set up intersection observer for infinite scroll
  const lastItemRef = useCallback((node) => {
    if (loading || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    }, {
      threshold: 0.1,
      rootMargin: '100px'
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, loadingMore, hasMore, loadMore]);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'space':
        return 'Building';
      case 'user':
        return 'User';
      case 'content':
        return 'FileText';
      default:
        return 'Clock';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'space':
        return 'text-primary bg-primary/10';
      case 'user':
        return 'text-success bg-success/10';
      case 'content':
        return 'text-warning bg-warning/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-700 bg-red-50';
      case 'normal':
        return 'text-amber-700 bg-amber-50';
      case 'low':
        return 'text-green-700 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const handleApprove = (item) => {
    setSelectedItem(item);
    setShowApproveSheet(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedItem || isApproving) return;

    const result = await approveItem(selectedItem.id, adminNotes);
    if (result.success) {
      console.log(`✅ Approved: ${selectedItem.id}`);
      setShowApproveSheet(false);
      setSelectedItem(null);
      setAdminNotes('');
      // You can add toast notification here
    } else {
      console.error('Failed to approve:', result.error);
      // You can add error toast here
    }
  };

  const handleReject = (item) => {
      setSelectedItem(item);
    setShowRejectSheet(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedItem || isRejecting) return;

    const result = await rejectItem(selectedItem.id, rejectionReason || '', adminNotes);
    if (result.success) {
      console.log(`❌ Rejected: ${selectedItem.title}`);
      setShowRejectSheet(false);
      setSelectedItem(null);
      setRejectionReason('');
      setAdminNotes('');
      // You can add toast notification here
    } else {
      console.error('Failed to reject:', result.error);
      // You can add error toast here
    }
  };

  const handleViewAllPendingItems = () => {
    // Navigate to space management with pending filter to show all pending items
    navigate('/space-management?filter=pending&tab=approvals');
  };

  const handleViewSpace = (item) => {
    setSelectedItem(item);
    setShowViewSheet(true);
  };

  const closeAllSheets = () => {
    setShowViewSheet(false);
    setShowApproveSheet(false);
    setShowRejectSheet(false);
    setSelectedItem(null);
    setRejectionReason('');
    setAdminNotes('');
  };

  // Notify parent when any sheet/modal state changes
  useEffect(() => {
    if (onModalStateChange) {
      onModalStateChange(showRejectSheet || showApproveSheet || showViewSheet || showImagePreview);
    }
  }, [showRejectSheet, showApproveSheet, showViewSheet, showImagePreview, onModalStateChange]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 card-shadow">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">Loading pending approvals...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 card-shadow">
        <div className="text-center py-8 text-error">
          <Icon name="AlertCircle" size={48} className="mx-auto mb-2" />
          <p>Error loading pending approvals: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 card-shadow h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 tracking-tight">Pending Approvals</h3>
        <span className="bg-red-500 text-white text-xs px-2.5 py-1 rounded-full font-semibold">
            {allPendingItems?.length || pendingItems?.length || 0}
          </span>
      </div>
      <div 
        ref={scrollContainerRef}
        className="space-y-0 overflow-y-auto flex-1 min-h-0 max-h-[300px]"
      >
        {pendingItems?.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="CheckCircle" size={48} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No pending approvals</p>
          </div>
        ) : (
          <>
            {pendingItems?.map((item, index) => {
              const isLastItem = index === pendingItems.length - 1;
              return (
            <div 
              key={item?.id} 
                  ref={isLastItem ? lastItemRef : null}
              className={`flex items-center px-4 py-4 ${index !== pendingItems.length - 1 ? 'border-b border-gray-200' : ''} hover:bg-gray-50 transition-colors`}
            >
              {/* Profile Picture */}
              <div className="flex-shrink-0 mr-4">
                  <Image
                  src={item?.partnerAvatar || '/assets/images/no_image.png'}
                  alt={item?.submittedBy}
                  className="w-12 h-12 rounded-full object-cover"
                  />
                </div>
                
              {/* Name and Title */}
                <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 mb-0.5">
                  {item?.submittedBy}
                </p>
                <p className="text-xs font-normal text-gray-500">
                      {item?.title}
                </p>
                    </div>
                    
              {/* Action Icons */}
              <div className="flex items-center space-x-3 flex-shrink-0">
                <button
                  onClick={() => handleViewSpace(item)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="View Space"
                >
                  <Icon name="ExternalLink" size={18} />
                </button>
                <button
                      onClick={() => handleApprove(item)}
                      disabled={isApproving || isRejecting}
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Approve"
                    >
                      {isApproving && item.id === selectedItem?.id ? (
                        <Icon name="Loader2" size={18} className="animate-spin" />
                      ) : (
                      <Icon name="Check" size={18} />
                      )}
                    </button>
                    <button
                      onClick={() => handleReject(item)}
                      disabled={isApproving || isRejecting}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Reject"
                >
                      {isRejecting && item.id === selectedItem?.id ? (
                        <Icon name="Loader2" size={18} className="animate-spin" />
                      ) : (
                  <Icon name="X" size={18} />
                      )}
                </button>
              </div>
            </div>
              );
            })}
            
            {/* Loading more indicator */}
            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <Icon name="Loader2" size={18} className="animate-spin text-blue-600 mr-2" />
                <p className="text-sm text-gray-500">Loading more...</p>
              </div>
            )}
            
            {/* End of list indicator */}
            {!hasMore && pendingItems.length > 0 && (
              <div className="text-center py-4 border-t border-gray-200">
                <p className="text-xs text-gray-400">All items loaded</p>
              </div>
            )}
          </>
        )}
      </div>
      <div className="mt-auto pt-3 border-t border-gray-200">
        <Button 
          variant="outline" 
          fullWidth 
          size="xs"
          iconName="Eye"
          onClick={handleViewAllPendingItems}
          className="text-xs font-medium hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
        >
          View All Pending Items
        </Button>
      </div>

      {/* View Space Sheet */}
      <Sheet 
        isOpen={showViewSheet} 
        onClose={() => {
          setShowViewSheet(false);
          setSelectedItem(null);
        }}
        side="right"
        className="flex flex-col"
      >
        <SheetHeader
          onClose={() => {
            setShowViewSheet(false);
            setSelectedItem(null);
          }}
        >
              <div>
                <h3 className="text-lg font-bold text-gray-900">Space Details</h3>
                <p className="text-xs text-gray-500 mt-0.5">Review space information before approval</p>
              </div>
        </SheetHeader>
        
        <SheetContent>
          {selectedItem && (
            <>
              {/* Space Image and Header */}
              <div className="mb-5">
                <div 
                  className="relative w-32 h-32 rounded-lg overflow-hidden mb-4 bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity group"
                  onClick={() => setShowImagePreview(true)}
                >
                  <Image
                    src={selectedItem?.image || '/assets/images/no_image.png'}
                    alt={selectedItem?.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                    <Icon name="Maximize2" size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">{selectedItem?.title}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">{selectedItem?.description}</p>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Icon name="MapPin" size={16} className="text-gray-400" />
                    <span className="text-sm">{selectedItem?.listingData?.address || 'Address not provided'}</span>
                  </div>
                </div>
              </div>

              {/* Space Information Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <Icon name="Tag" size={14} className="text-gray-400" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{selectedItem?.listingData?.category || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <Icon name="Users" size={14} className="text-gray-400" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Capacity</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{selectedItem?.listingData?.capacity || 'N/A'} people</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <Icon name="Clock" size={14} className="text-gray-400" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hourly Rate</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">A${selectedItem?.listingData?.hourly_price || '0'}/hr</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <Icon name="Calendar" size={14} className="text-gray-400" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Daily Rate</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">A${selectedItem?.listingData?.daily_price || '0'}/day</p>
                </div>
              </div>

              {/* Partner Information */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2.5">Submitted By</p>
                <div className="flex items-center space-x-3">
                  <Image
                    src={selectedItem?.partnerAvatar || '/assets/images/no_image.png'}
                    alt={selectedItem?.submittedBy}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-white"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selectedItem?.submittedBy}</p>
                    <p className="text-xs text-gray-500">{selectedItem?.partnerEmail}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>

        <SheetFooter>
          {selectedItem && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowViewSheet(false);
                  handleReject(selectedItem);
                }}
                className="px-6 py-2.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 font-medium"
              >
                Reject
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  setShowViewSheet(false);
                  handleApprove(selectedItem);
                }}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm"
              >
                Approve
              </Button>
            </>
      )}
        </SheetFooter>
      </Sheet>

      {/* Image Preview Modal */}
      {showImagePreview && selectedItem && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
          onClick={() => setShowImagePreview(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setShowImagePreview(false)}
              className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white transition-colors z-10"
            >
              <Icon name="X" size={24} />
            </button>
            <Image
              src={selectedItem?.image || '/assets/images/no_image.png'}
              alt={selectedItem?.title}
              className="w-full h-full object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-4 right-4 text-center">
              <p className="text-white text-lg font-semibold bg-black bg-opacity-50 px-4 py-2 rounded-lg inline-block">
                {selectedItem?.title}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Approval Sheet */}
      <Sheet 
        isOpen={showApproveSheet} 
        onClose={closeAllSheets}
        side="right"
        className="flex flex-col"
      >
        <SheetHeader
          onClose={closeAllSheets}
          className="bg-green-50"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Icon name="CheckCircle" size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Approve Listing</h3>
              <p className="text-sm text-gray-600 mt-0.5">Confirm approval of this space listing</p>
            </div>
          </div>
        </SheetHeader>
        
        <SheetContent>
          {selectedItem && (
            <>
              {/* Listing Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-5 border border-gray-200">
                <div className="flex items-start space-x-3">
                  <Image
                    src={selectedItem?.image || '/assets/images/no_image.png'}
                    alt={selectedItem?.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">Listing</p>
                    <p className="text-base font-semibold text-gray-900 truncate">{selectedItem?.title}</p>
                    <p className="text-sm text-gray-600 mt-1">By {selectedItem?.submittedBy}</p>
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Admin Notes <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes for your reference (not visible to partner)..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm text-gray-700 placeholder-gray-400"
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1.5">These notes are only visible to admins</p>
              </div>
            </>
          )}
        </SheetContent>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={closeAllSheets}
            className="px-6 py-2.5 font-medium"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleConfirmApprove}
            disabled={isApproving}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            iconName={isApproving ? "Loader2" : "Check"}
          >
            {isApproving ? 'Approving...' : 'Approve Listing'}
          </Button>
        </SheetFooter>
      </Sheet>

      {/* Rejection Sheet */}
      <Sheet 
        isOpen={showRejectSheet} 
        onClose={closeAllSheets}
        side="right"
        className="flex flex-col"
      >
        <SheetHeader
          onClose={closeAllSheets}
          className="bg-red-50"
        >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Icon name="XCircle" size={20} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Reject Listing</h3>
              <p className="text-sm text-gray-600 mt-0.5">Reject this space listing</p>
            </div>
          </div>
        </SheetHeader>

        <SheetContent>
          {selectedItem && (
            <>
              {/* Listing Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-5 border border-gray-200">
                <div className="flex items-start space-x-3">
                  <Image
                    src={selectedItem?.image || '/assets/images/no_image.png'}
                    alt={selectedItem?.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">Listing</p>
                    <p className="text-base font-semibold text-gray-900 truncate">{selectedItem?.title}</p>
                    <p className="text-sm text-gray-600 mt-1">By {selectedItem?.submittedBy}</p>
                  </div>
                </div>
            </div>

              {/* Form Fields */}
            <div className="space-y-4">
              <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Rejection Reason <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please explain why this listing is being rejected. This message will be sent to the partner..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-gray-700 placeholder-gray-400"
                  rows={3}
                />
                  <p className="text-xs text-gray-500 mt-1.5">This reason will be visible to the partner</p>
              </div>

              <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Admin Notes <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Internal notes for your reference (not visible to partner)..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm text-gray-700 placeholder-gray-400"
                  rows={2}
                />
                  <p className="text-xs text-gray-500 mt-1.5">These notes are only visible to admins</p>
                </div>
              </div>
            </>
          )}
        </SheetContent>

        <SheetFooter>
              <Button
                variant="outline"
            onClick={closeAllSheets}
                className="px-6 py-2.5 font-medium"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmReject}
                disabled={isRejecting}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                iconName={isRejecting ? "Loader2" : "X"}
              >
                {isRejecting ? 'Rejecting...' : 'Reject Listing'}
              </Button>
        </SheetFooter>
      </Sheet>
    </div>
  );
};

export default PendingApprovals;
