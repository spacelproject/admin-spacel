import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import SpaceStatusBadge from './SpaceStatusBadge';

const SpaceDetailsModal = ({ space, isOpen, onClose, onApprove, onReject, onSuspend }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [moderationNote, setModerationNote] = useState('');
  const [showModerationForm, setShowModerationForm] = useState(false);
  const [actionType, setActionType] = useState('');

  if (!isOpen || !space) return null;

  const handleAction = (action) => {
    setActionType(action);
    setShowModerationForm(true);
  };

  const handleSubmitAction = () => {
    switch (actionType) {
      case 'approve':
        onApprove(space.id, moderationNote);
        break;
      case 'reject':
        onReject(space.id, moderationNote);
        break;
      case 'suspend':
        onSuspend(space.id, moderationNote);
        break;
    }
    setModerationNote('');
    setShowModerationForm(false);
    setActionType('');
    onClose();
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % space.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + space.images.length) % space.images.length);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-modal max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-foreground">{space.name}</h2>
            <SpaceStatusBadge status={space.status} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            iconName="X"
          />
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Gallery */}
            <div>
              <div className="relative mb-4">
                <div className="aspect-video rounded-lg overflow-hidden">
                  <Image
                    src={space.images[currentImageIndex]}
                    alt={`${space.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {space.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                    >
                      <Icon name="ChevronLeft" size={20} />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                    >
                      <Icon name="ChevronRight" size={20} />
                    </button>
                    
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                      {currentImageIndex + 1} / {space.images.length}
                    </div>
                  </>
                )}
              </div>
              
              {/* Thumbnail Gallery */}
              {space.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {space.images.slice(0, 4).map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`aspect-square rounded-md overflow-hidden border-2 ${
                        currentImageIndex === index ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Space Details */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-medium text-foreground mb-3">Space Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span className="text-foreground capitalize">{space.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capacity:</span>
                    <span className="text-foreground">{space.capacity} people</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price:</span>
                    <span className="text-foreground font-medium">${space.price}/hour</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size:</span>
                    <span className="text-foreground">{space.size} sq ft</span>
                  </div>
                </div>
              </div>

              {/* Host Information */}
              <div>
                <h3 className="text-lg font-medium text-foreground mb-3">Host Information</h3>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <Image
                      src={space.host.avatar}
                      alt={space.host.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{space.host.name}</p>
                    <p className="text-sm text-muted-foreground">{space.host.email}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="text-foreground">{space.host.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member Since:</span>
                    <span className="text-foreground">{formatDate(space.host.joinedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-lg font-medium text-foreground mb-3">Location</h3>
                <div className="space-y-1">
                  <p className="text-foreground">{space.location.address}</p>
                  <p className="text-muted-foreground">{space.location.city}, {space.location.state} {space.location.zipCode}</p>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h3 className="text-lg font-medium text-foreground mb-3">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {space.amenities.map((amenity, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-muted text-muted-foreground text-sm rounded-md"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-foreground mb-3">Description</h3>
            <p className="text-muted-foreground leading-relaxed">{space.description}</p>
          </div>

          {/* Submission Details */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <h3 className="text-lg font-medium text-foreground mb-3">Submission Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground">Submitted:</span>
                <p className="text-foreground">{formatDate(space.submittedAt)}</p>
              </div>
              {space.moderationNotes && (
                <div>
                  <span className="text-muted-foreground">Previous Notes:</span>
                  <p className="text-foreground">{space.moderationNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Moderation Form */}
          {showModerationForm && (
            <div className="mt-6 p-4 border border-border rounded-lg">
              <h3 className="text-lg font-medium text-foreground mb-3">
                {actionType === 'approve' ? 'Approve Space' : 
                 actionType === 'reject' ? 'Reject Space' : 'Suspend Space'}
              </h3>
              <Input
                label="Moderation Note"
                type="text"
                placeholder="Add a note about this action..."
                value={moderationNote}
                onChange={(e) => setModerationNote(e.target.value)}
                className="mb-4"
              />
              <div className="flex items-center space-x-3">
                <Button
                  variant={actionType === 'approve' ? 'default' : 'destructive'}
                  onClick={handleSubmitAction}
                  iconName={actionType === 'approve' ? 'Check' : 'X'}
                >
                  Confirm {actionType === 'approve' ? 'Approval' : 
                           actionType === 'reject' ? 'Rejection' : 'Suspension'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowModerationForm(false);
                    setModerationNote('');
                    setActionType('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!showModerationForm && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
            {space.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleAction('reject')}
                  iconName="X"
                >
                  Reject
                </Button>
                <Button
                  variant="default"
                  onClick={() => handleAction('approve')}
                  iconName="Check"
                >
                  Approve
                </Button>
              </>
            )}
            
            {space.status === 'active' && (
              <Button
                variant="destructive"
                onClick={() => handleAction('suspend')}
                iconName="Pause"
              >
                Suspend
              </Button>
            )}
            
            <Button
              variant="ghost"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpaceDetailsModal;