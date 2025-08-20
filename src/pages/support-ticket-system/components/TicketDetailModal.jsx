import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const TicketDetailModal = ({ ticket, isOpen, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('conversation');
  const [newMessage, setNewMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [ticketStatus, setTicketStatus] = useState(ticket?.status || 'open');
  const [ticketPriority, setTicketPriority] = useState(ticket?.priority || 'medium');
  const [assignee, setAssignee] = useState(ticket?.assignee?.id || '');

  if (!isOpen || !ticket) return null;

  const statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const assigneeOptions = [
    { value: '', label: 'Unassigned' },
    { value: 'sarah-johnson', label: 'Sarah Johnson' },
    { value: 'mike-chen', label: 'Mike Chen' },
    { value: 'emily-davis', label: 'Emily Davis' },
    { value: 'alex-rodriguez', label: 'Alex Rodriguez' }
  ];

  const templateResponses = [
    {
      id: 'welcome',
      title: 'Welcome & Acknowledgment',
      content: `Thank you for contacting SPACIO support. We have received your inquiry and will respond within 24 hours. Your ticket number is #${ticket.id} for future reference.`
    },
    {
      id: 'technical',
      title: 'Technical Issue Resolution',
      content: `We have identified the technical issue you reported. Our development team is working on a fix. We will update you as soon as the issue is resolved.`
    },
    {
      id: 'billing',
      title: 'Billing Inquiry Response',
      content: `Thank you for your billing inquiry. We have reviewed your account and will provide detailed information about your charges within the next business day.`
    },
    {
      id: 'resolved',
      title: 'Issue Resolved',
      content: `Your issue has been resolved. Please let us know if you need any further assistance. We appreciate your patience and thank you for using SPACIO.`
    }
  ];

  const mockConversation = [
    {
      id: 1,
      sender: 'user',
      message: ticket.description || `I'm having trouble with my booking. The payment went through but I haven't received a confirmation email. Can you please help me check the status of my reservation?`,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      attachments: []
    },
    {
      id: 2,
      sender: 'support',
      message: `Hello ${ticket.user.name}, thank you for contacting us. I've located your booking and can see that the payment was processed successfully. Let me check why you didn't receive the confirmation email.`,
      timestamp: new Date(Date.now() - 90 * 60 * 1000),
      attachments: [],
      supportAgent: 'Sarah Johnson'
    },
    {
      id: 3,
      sender: 'support',
      message: `I've found the issue - there was a temporary problem with our email service. I've manually sent your confirmation email and you should receive it within the next few minutes. Your booking is confirmed for the dates you selected.`,
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      attachments: [],
      supportAgent: 'Sarah Johnson'
    }
  ];

  const mockInternalNotes = [
    {
      id: 1,
      author: 'Sarah Johnson',
      note: 'Customer payment verified. Email service issue identified and resolved.',
      timestamp: new Date(Date.now() - 60 * 60 * 1000)
    }
  ];

  const mockRelatedBookings = [
    {
      id: 'BK-2024-001',
      spaceName: 'Modern Conference Room',
      date: '2024-07-20',
      status: 'confirmed',
      amount: '$150.00'
    }
  ];

  const priorityColors = {
    urgent: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200'
  };

  const statusColors = {
    open: 'bg-blue-100 text-blue-800 border-blue-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'in-progress': 'bg-purple-100 text-purple-800 border-purple-200',
    resolved: 'bg-green-100 text-green-800 border-green-200',
    closed: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Handle sending message
      console.log('Sending message:', newMessage);
      setNewMessage('');
    }
  };

  const handleAddInternalNote = () => {
    if (internalNote.trim()) {
      // Handle adding internal note
      console.log('Adding internal note:', internalNote);
      setInternalNote('');
    }
  };

  const handleUpdateTicket = () => {
    onUpdate({
      ...ticket,
      status: ticketStatus,
      priority: ticketPriority,
      assignee: assigneeOptions.find(opt => opt.value === assignee)
    });
  };

  const handleTemplateSelect = (template) => {
    setNewMessage(template.content);
  };

  const formatTimestamp = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const tabs = [
    { id: 'conversation', label: 'Conversation', icon: 'MessageCircle' },
    { id: 'details', label: 'User Details', icon: 'User' },
    { id: 'notes', label: 'Internal Notes', icon: 'FileText' },
    { id: 'related', label: 'Related Items', icon: 'Link' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-modal flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-modal w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-foreground">
              Ticket #{ticket.id}
            </h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${priorityColors[ticket.priority]}`}>
              {ticket.priority}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[ticket.status]}`}>
              {ticket.status.replace('-', ' ')}
            </span>
          </div>
          <Button variant="ghost" size="sm" iconName="X" onClick={onClose} />
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-border">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-smooth ${
                    activeTab === tab.id
                      ? 'text-primary border-b-2 border-primary' :'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon name={tab.icon} size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'conversation' && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="font-medium text-foreground mb-2">{ticket.subject}</h3>
                    <p className="text-sm text-muted-foreground">Category: {ticket.category}</p>
                  </div>

                  {/* Conversation Thread */}
                  <div className="space-y-4">
                    {mockConversation.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div className={`max-w-2xl ${message.sender === 'user' ? 'bg-muted' : 'bg-primary text-primary-foreground'} rounded-lg p-4`}>
                          <div className="flex items-center space-x-2 mb-2">
                            {message.sender === 'user' ? (
                              <Image
                                src={ticket.user.avatar}
                                alt={ticket.user.name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 bg-primary-foreground rounded-full flex items-center justify-center">
                                <Icon name="Headphones" size={14} className="text-primary" />
                              </div>
                            )}
                            <span className="text-sm font-medium">
                              {message.sender === 'user' ? ticket.user.name : message.supportAgent}
                            </span>
                            <span className="text-xs opacity-70">
                              {formatTimestamp(message.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm">{message.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Response Templates */}
                  <div className="border-t border-border pt-4">
                    <h4 className="font-medium text-foreground mb-3">Quick Templates</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {templateResponses.map((template) => (
                        <Button
                          key={template.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleTemplateSelect(template)}
                          className="justify-start"
                        >
                          {template.title}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="border-t border-border pt-4">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your response..."
                      className="w-full h-32 p-3 border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" iconName="Paperclip">
                          Attach File
                        </Button>
                        <Button variant="outline" size="sm" iconName="Image">
                          Add Image
                        </Button>
                      </div>
                      <Button onClick={handleSendMessage} iconName="Send" iconPosition="right">
                        Send Response
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Image
                      src={ticket.user.avatar}
                      alt={ticket.user.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{ticket.user.name}</h3>
                      <p className="text-muted-foreground">{ticket.user.email}</p>
                      <p className="text-sm text-muted-foreground">Member since: March 2024</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-foreground mb-3">Contact Information</h4>
                      <div className="space-y-2">
                        <p className="text-sm"><span className="font-medium">Phone:</span> +1 (555) 123-4567</p>
                        <p className="text-sm"><span className="font-medium">Location:</span> New York, NY</p>
                        <p className="text-sm"><span className="font-medium">Time Zone:</span> EST (UTC-5)</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-3">Account Statistics</h4>
                      <div className="space-y-2">
                        <p className="text-sm"><span className="font-medium">Total Bookings:</span> 12</p>
                        <p className="text-sm"><span className="font-medium">Total Spent:</span> $1,850.00</p>
                        <p className="text-sm"><span className="font-medium">Support Tickets:</span> 3</p>
                        <p className="text-sm"><span className="font-medium">Account Status:</span> Active</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-4">
                  {/* Existing Notes */}
                  <div className="space-y-3">
                    {mockInternalNotes.map((note) => (
                      <div key={note.id} className="bg-muted rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-foreground">{note.author}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatTimestamp(note.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{note.note}</p>
                      </div>
                    ))}
                  </div>

                  {/* Add New Note */}
                  <div className="border-t border-border pt-4">
                    <textarea
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      placeholder="Add internal note (only visible to support team)..."
                      className="w-full h-24 p-3 border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex justify-end mt-3">
                      <Button onClick={handleAddInternalNote} iconName="Plus" iconPosition="left">
                        Add Note
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'related' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-foreground mb-3">Related Bookings</h4>
                    <div className="space-y-2">
                      {mockRelatedBookings.map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium text-foreground">{booking.spaceName}</p>
                            <p className="text-sm text-muted-foreground">
                              {booking.id} • {booking.date}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-foreground">{booking.amount}</p>
                            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                              {booking.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-3">Previous Tickets</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">Payment Processing Issue</p>
                          <p className="text-sm text-muted-foreground">#TK-2024-089 • Resolved</p>
                        </div>
                        <span className="text-sm text-muted-foreground">2 weeks ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-border p-6 space-y-6">
            <div>
              <h3 className="font-medium text-foreground mb-4">Ticket Management</h3>
              
              <div className="space-y-4">
                <Select
                  label="Status"
                  options={statusOptions}
                  value={ticketStatus}
                  onChange={setTicketStatus}
                />

                <Select
                  label="Priority"
                  options={priorityOptions}
                  value={ticketPriority}
                  onChange={setTicketPriority}
                />

                <Select
                  label="Assignee"
                  options={assigneeOptions}
                  value={assignee}
                  onChange={setAssignee}
                />

                <Button
                  onClick={handleUpdateTicket}
                  iconName="Save"
                  iconPosition="left"
                  fullWidth
                >
                  Update Ticket
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="font-medium text-foreground mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <Button variant="outline" size="sm" fullWidth iconName="ArrowUp">
                  Escalate to Manager
                </Button>
                <Button variant="outline" size="sm" fullWidth iconName="Users">
                  Transfer to Team
                </Button>
                <Button variant="outline" size="sm" fullWidth iconName="Clock">
                  Set Reminder
                </Button>
                <Button variant="destructive" size="sm" fullWidth iconName="Archive">
                  Archive Ticket
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="font-medium text-foreground mb-3">Ticket Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="text-foreground">{formatTimestamp(ticket.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="text-foreground">{formatTimestamp(ticket.lastUpdated)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Response Time:</span>
                  <span className="text-foreground">1.5 hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolution Time:</span>
                  <span className="text-foreground">-</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;