import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import SpaceStatusBadge from './SpaceStatusBadge';

const SpaceDetailsModal = ({ space, isOpen, onClose, onApprove, onReject, onSuspend, isProcessing = false }) => {
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
    if (isProcessing) return; // Prevent multiple clicks
    
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
    // Don't close immediately - let the parent handle closing after success
    // setModerationNote('');
    // setShowModerationForm(false);
    // setActionType('');
    // onClose();
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
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Center Modal */}
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-background border border-border shadow-modal rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-[1] flex items-center justify-between px-6 py-4 border-b border-border bg-card/90 backdrop-blur">
          <div className="flex items-center space-x-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Space details
              </span>
              <h2 className="text-[17px] font-semibold text-foreground line-clamp-1">
                {space.name}
              </h2>
            </div>
            <SpaceStatusBadge status={space.status} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            iconName="X"
            className="rounded-full hover:bg-muted"
          />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Image Gallery */}
            <div>
              <div className="relative mb-3 rounded-2xl overflow-hidden bg-muted/40">
                <div className="aspect-[4/3]">
                  <Image
                    src={space.images && space.images.length > 0 ? space.images[currentImageIndex] : '/assets/images/no_image.png'}
                    alt={`${space.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {space.images && space.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/55 text-white p-1.5 rounded-full hover:bg-black/75 transition-smooth"
                    >
                      <Icon name="ChevronLeft" size={18} />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/55 text-white p-1.5 rounded-full hover:bg-black/75 transition-smooth"
                    >
                      <Icon name="ChevronRight" size={18} />
                    </button>

                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white px-2.5 py-1 rounded-full text-[11px] font-medium">
                      {currentImageIndex + 1} / {space.images.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {space.images && space.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {space.images.slice(0, 4).map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`aspect-video rounded-xl overflow-hidden transition-smooth ${
                        currentImageIndex === index ? 'ring-2 ring-primary/40' : 'opacity-80 hover:opacity-100'
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

            {/* Space Details (primary) */}
            <div className="space-y-3">
              {/* Basic Info */}
              <div className="px-1">
                <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-3">
                  Space information
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-6 py-2 border-b border-border/50">
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="text-foreground font-medium capitalize text-right">
                      {space.category}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-6 py-2 border-b border-border/50">
                    <dt className="text-muted-foreground">Capacity</dt>
                    <dd className="text-foreground text-right">
                      {space.capacity} people
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-6 py-2 border-b border-border/50">
                    <dt className="text-muted-foreground">Price per hour</dt>
                    <dd className="text-foreground font-semibold text-right">
                      A${space.price || space.hourly_price || 0}/hour
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-6 py-2 border-b border-border/50">
                    <dt className="text-muted-foreground">Price per day</dt>
                    <dd className="text-foreground font-semibold text-right">
                      A${space.price_per_day || space.daily_price || 0}/day
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-6 py-2">
                    <dt className="text-muted-foreground">Size</dt>
                    <dd className="text-foreground text-right">
                      {space.size} sq ft
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Host Information */}
              <div className="px-1 pt-2">
                <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-3">
                  Host
                </h3>
                <div className="flex items-center space-x-3.5 mb-3.5">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-muted/40">
                    <Image
                      src={space.host?.avatar || '/assets/images/no_image.png'}
                      alt={space.host?.name || 'Unknown Host'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {space.host?.name || 'Unknown Host'}
                    </p>
                    {space.host?.email && (
                      <p className="text-xs text-muted-foreground">
                        {space.host.email}
                      </p>
                    )}
                  </div>
                </div>
                <dl className="space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-6 py-2 border-b border-border/50">
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd className="text-foreground text-right">
                      {space.host?.phone || 'N/A'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-6 py-2">
                    <dt className="text-muted-foreground">Member since</dt>
                    <dd className="text-foreground text-right">
                      {formatDate(space.host?.joinedAt || space.host?.created_at)}
                    </dd>
                  </div>
                </dl>
              </div>

            </div>
          </div>

        {/* Secondary details: Location & Amenities below image */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Location */}
            <div className="px-1">
              <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-3">
                Location
              </h3>
              <div className="space-y-1.5 text-sm">
                {space.location?.address ? (
                  <>
                    <p className="text-foreground">{space.location.address}</p>
                    {(space.location.city || space.location.state || space.location.zipCode) && (
                      <p className="text-muted-foreground">
                        {[space.location.city, space.location.state, space.location.zipCode]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                    {space.location.country && (
                      <p className="text-muted-foreground text-xs">
                        {space.location.country}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No location information available
                  </p>
                )}
              </div>
            </div>

            {/* Amenities */}
            <div className="px-1">
              <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-3">
                Amenities
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {space.amenities && space.amenities.length > 0 ? (
                  space.amenities.map((amenity, index) => (
                    <span
                      key={index}
                      className="px-2.5 py-1 rounded-full bg-muted/40 text-xs text-muted-foreground"
                    >
                      {amenity}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground text-xs">
                    No amenities listed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="px-1 space-y-2">
            <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground">
              Description
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {space.description || 'No additional description provided for this space.'}
            </p>
          </div>

          {/* Submission Details */}
          <div className="px-1">
            <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-3">
              Submission details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Submitted</span>
                <p className="text-foreground">
                  {formatDate(space.submitted_at || space.created_at)}
                </p>
              </div>
              {space.moderation_notes && (
                <div>
                  <span className="text-muted-foreground text-xs">
                    Previous notes
                  </span>
                  <p className="text-foreground">
                    {space.moderation_notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Moderation Form */}
          {showModerationForm && (
            <div className="mt-5 p-4 rounded-2xl bg-muted/30">
              <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-2">
                {actionType === 'approve'
                  ? 'Approve space'
                  : actionType === 'reject'
                  ? 'Reject space'
                  : 'Suspend space'}
              </h3>
              <Input
                label="Moderation note"
                type="text"
                placeholder="Add a note about this action..."
                value={moderationNote}
                onChange={(e) => setModerationNote(e.target.value)}
                className="mb-4"
              />
              <div className="flex items-center justify-end space-x-2.5">
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
                <Button
                  variant={actionType === 'approve' ? 'default' : 'destructive'}
                  onClick={handleSubmitAction}
                  disabled={isProcessing}
                  iconName={isProcessing ? 'Loader2' : (actionType === 'approve' ? 'Check' : 'X')}
                  className={isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  {isProcessing ? 'Processing...' : `Confirm ${actionType === 'approve'
                    ? 'approval'
                    : actionType === 'reject'
                    ? 'rejection'
                    : 'suspension'}`}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!showModerationForm && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-card/96 backdrop-blur">
            <div className="text-xs text-muted-foreground">
              ID: <span className="font-mono">{space.id}</span>
            </div>
            <div className="flex items-center space-x-2">
              {space.status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleAction('reject')}
                    iconName="X"
                    disabled={isProcessing}
                    className={isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => handleAction('approve')}
                    iconName={isProcessing ? 'Loader2' : 'Check'}
                    disabled={isProcessing}
                    className={isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    {isProcessing ? 'Approving...' : 'Approve'}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default SpaceDetailsModal;