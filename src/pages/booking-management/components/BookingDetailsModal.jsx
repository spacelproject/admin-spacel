import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import BookingStatusBadge from './BookingStatusBadge';
import PaymentStatusBadge from './PaymentStatusBadge';

const BookingDetailsModal = ({ booking, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('details');

  if (!isOpen || !booking) return null;

  const tabs = [
    { id: 'details', label: 'Booking Details', icon: 'FileText' },
    { id: 'payment', label: 'Payment Info', icon: 'CreditCard' },
    { id: 'communication', label: 'Messages', icon: 'MessageCircle' }
  ];

  const mockMessages = [
    {
      id: 1,
      sender: 'Guest',
      message: 'Hi, I have a question about the check-in process.',
      timestamp: new Date(Date.now() - 86400000),
      type: 'guest'
    },
    {
      id: 2,
      sender: 'Host',
      message: 'Hello! Check-in is available from 3 PM. I will send you the access code closer to your arrival date.',
      timestamp: new Date(Date.now() - 82800000),
      type: 'host'
    },
    {
      id: 3,
      sender: 'Admin',
      message: 'Booking confirmed and payment processed successfully.',
      timestamp: new Date(Date.now() - 79200000),
      type: 'admin'
    }
  ];

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Booking Details
            </h2>
            <p className="text-sm text-muted-foreground">
              Booking ID: {booking.id}
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            iconName="X"
            size="icon"
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-smooth ${
                  activeTab === tab.id
                    ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon name={tab.icon} size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Guest Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Guest Information</h3>
                  <div className="flex items-center space-x-3">
                    <Image
                      src={booking.guestAvatar}
                      alt={booking.guestName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-foreground">{booking.guestName}</p>
                      <p className="text-sm text-muted-foreground">{booking.guestEmail}</p>
                      <p className="text-sm text-muted-foreground">{booking.guestPhone}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Space Information</h3>
                  <div className="flex items-center space-x-3">
                    <Image
                      src={booking.spaceImage}
                      alt={booking.spaceName}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                      <p className="font-medium text-foreground">{booking.spaceName}</p>
                      <p className="text-sm text-muted-foreground">{booking.spaceLocation}</p>
                      <p className="text-sm text-muted-foreground">Host: {booking.hostName}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground">Booking Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Check-in:</span>
                      <span className="font-medium">{formatDate(booking.checkIn)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Check-out:</span>
                      <span className="font-medium">{formatDate(booking.checkOut)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Guests:</span>
                      <span className="font-medium">{booking.guests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <BookingStatusBadge status={booking.status} />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground">Special Requests</h3>
                  <p className="text-sm text-muted-foreground">
                    {booking.specialRequests || 'No special requests'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Payment Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">${booking.subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Fee:</span>
                      <span className="font-medium">${booking.serviceFee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxes:</span>
                      <span className="font-medium">${booking.taxes}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="font-medium text-foreground">Total:</span>
                      <span className="font-semibold text-foreground">${booking.total}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Payment Status</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <PaymentStatusBadge status={booking.paymentStatus} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Method:</span>
                      <span className="font-medium">{booking.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transaction ID:</span>
                      <span className="font-medium font-mono text-xs">{booking.transactionId}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Commission Breakdown</h3>
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Commission (15%):</span>
                    <span className="font-medium">${(booking.total * 0.15).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Host Payout:</span>
                    <span className="font-medium">${(booking.total * 0.85).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'communication' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground">Communication History</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {mockMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'admin' ? 'justify-center' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${
                      message.type === 'guest' ?'bg-muted text-foreground'
                        : message.type === 'host' ?'bg-primary text-primary-foreground' :'bg-accent text-accent-foreground'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{message.sender}</span>
                        <span className="text-xs opacity-75">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm">{message.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="default" iconName="MessageCircle" iconPosition="left">
            Send Message
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsModal;