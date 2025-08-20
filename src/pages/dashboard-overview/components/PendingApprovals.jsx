import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const PendingApprovals = () => {
  const navigate = useNavigate();
  const [pendingItems, setPendingItems] = useState([
    {
      id: 1,
      type: 'space',
      title: 'Modern Conference Room',
      description: 'Downtown location with AV equipment',
      submittedBy: 'Alex Thompson',
      submittedAt: '2 hours ago',
      priority: 'high',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=150'
    },
    {
      id: 2,
      type: 'user',
      title: 'Business Account Verification',
      description: 'Corporate account upgrade request',
      submittedBy: 'TechCorp Solutions',
      submittedAt: '4 hours ago',
      priority: 'normal',
      image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?w=150'
    },
    {
      id: 3,
      type: 'content',
      title: 'Space Description Update',
      description: 'Updated amenities and pricing',
      submittedBy: 'Maria Garcia',
      submittedAt: '6 hours ago',
      priority: 'low',
      image: 'https://images.pixabay.com/photo/2016/11/19/13/06/business-1839191_150.jpg'
    },
    {
      id: 4,
      type: 'space',
      title: 'Creative Studio Space',
      description: 'Art studio with natural lighting',
      submittedBy: 'Creative Hub',
      submittedAt: '8 hours ago',
      priority: 'normal',
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=150'
    }
  ]);
  const [processedItems, setProcessedItems] = useState([]);

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
        return 'text-error';
      case 'normal':
        return 'text-warning';
      case 'low':
        return 'text-success';
      default:
        return 'text-muted-foreground';
    }
  };

  const handleApprove = (id) => {
    const item = pendingItems?.find(item => item?.id === id);
    if (item) {
      // Remove from pending items
      setPendingItems(prev => prev?.filter(item => item?.id !== id));
      // Add to processed items
      setProcessedItems(prev => [...prev, { ...item, status: 'approved', processedAt: new Date()?.toISOString() }]);
      
      // Show success feedback
      console.log(`✅ Approved: ${item?.title}`);
      
      // You can add toast notification here
      // toast.success(`${item.title} has been approved successfully!`);
    }
  };

  const handleReject = (id) => {
    const item = pendingItems?.find(item => item?.id === id);
    if (item) {
      // Remove from pending items
      setPendingItems(prev => prev?.filter(item => item?.id !== id));
      // Add to processed items
      setProcessedItems(prev => [...prev, { ...item, status: 'rejected', processedAt: new Date()?.toISOString() }]);
      
      // Show feedback
      console.log(`❌ Rejected: ${item?.title}`);
      
      // You can add toast notification here
      // toast.error(`${item.title} has been rejected`);
    }
  };

  const handleViewAllPendingItems = () => {
    // Navigate to space management with pending filter to show all pending items
    navigate('/space-management?filter=pending&tab=approvals');
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 card-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-card-foreground">Pending Approvals</h3>
        <div className="flex items-center space-x-2">
          <span className="bg-error text-error-foreground text-xs px-2 py-1 rounded-full">
            {pendingItems?.length}
          </span>
          <button 
            onClick={handleViewAllPendingItems}
            className="text-sm text-primary hover:text-primary/80 transition-smooth"
          >
            View All
          </button>
        </div>
      </div>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {pendingItems?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Icon name="CheckCircle" size={48} className="mx-auto mb-2 opacity-50" />
            <p>No pending approvals</p>
          </div>
        ) : (
          pendingItems?.map((item) => (
            <div key={item?.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-smooth">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Image
                    src={item?.image}
                    alt={item?.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className={`p-1 rounded ${getTypeColor(item?.type)}`}>
                      <Icon name={getTypeIcon(item?.type)} size={12} />
                    </div>
                    <h4 className="text-sm font-medium text-card-foreground truncate">
                      {item?.title}
                    </h4>
                    <span className={`text-xs font-medium ${getPriorityColor(item?.priority)}`}>
                      {item?.priority}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    {item?.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      <span>By {item?.submittedBy}</span>
                      <span className="mx-1">•</span>
                      <span>{item?.submittedAt}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="xs"
                        iconName="X"
                        onClick={() => handleReject(item?.id)}
                        className="hover:bg-error hover:text-error-foreground hover:border-error"
                      >
                        Reject
                      </Button>
                      <Button
                        variant="default"
                        size="xs"
                        iconName="Check"
                        onClick={() => handleApprove(item?.id)}
                        className="bg-success hover:bg-success/90 text-success-foreground"
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-border">
        <Button 
          variant="outline" 
          fullWidth 
          iconName="Eye"
          onClick={handleViewAllPendingItems}
        >
          View All Pending Items
        </Button>
      </div>
    </div>
  );
};

export default PendingApprovals;