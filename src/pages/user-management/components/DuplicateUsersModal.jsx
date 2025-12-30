import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';
import Image from '../../../components/AppImage';

const DuplicateUsersModal = ({ isOpen, onClose, users }) => {
  const { user: adminUser } = useAuth();
  const { showToast } = useToast();
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (isOpen && users) {
      findDuplicates();
    }
  }, [isOpen, users]);

  const findDuplicates = () => {
    setLoading(true);
    
    // Group users by email (case-insensitive)
    const emailMap = new Map();
    users.forEach(user => {
      const emailKey = user.email?.toLowerCase();
      if (emailKey) {
        if (!emailMap.has(emailKey)) {
          emailMap.set(emailKey, []);
        }
        emailMap.get(emailKey).push(user);
      }
    });

    // Find groups with more than one user
    const duplicateGroups = Array.from(emailMap.values())
      .filter(group => group.length > 1)
      .map(group => ({
        email: group[0].email,
        users: group,
        primaryUserId: group[0].id // Default to first user as primary
      }));

    setDuplicates(duplicateGroups);
    setLoading(false);
  };

  const handleMerge = async (duplicateGroup) => {
    if (!window.confirm(
      `Are you sure you want to merge ${duplicateGroup.users.length} duplicate accounts? ` +
      `This will keep account ${duplicateGroup.primaryUserId} and transfer data from others.`
    )) {
      return;
    }

    setMerging(true);

    try {
      const primaryUser = duplicateGroup.users.find(u => u.id === duplicateGroup.primaryUserId);
      const otherUsers = duplicateGroup.users.filter(u => u.id !== primaryUser.id);

      // Transfer bookings from other users to primary
      for (const otherUser of otherUsers) {
        await supabase
          .from('bookings')
          .update({ seeker_id: primaryUser.id })
          .eq('seeker_id', otherUser.id);
      }

      // Transfer listings from other users to primary (if they're partners)
      for (const otherUser of otherUsers) {
        await supabase
          .from('listings')
          .update({ partner_id: primaryUser.id })
          .eq('partner_id', otherUser.id);
      }

      // Soft delete other users
      for (const otherUser of otherUsers) {
        await supabase
          .from('profiles')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: adminUser?.id,
            status: 'inactive',
            email: `deleted_${otherUser.id}@deleted.local` // Change email to prevent conflicts
          })
          .eq('id', otherUser.id);
      }

      showToast(`Successfully merged ${duplicateGroup.users.length} duplicate accounts`, 'success');
      onClose();
      // The real-time subscription will handle the update automatically
    } catch (error) {
      console.error('Error merging users:', error);
      showToast(`Error merging users: ${error.message}`, 'error');
    } finally {
      setMerging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="Users" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Duplicate Users</h2>
              <p className="text-sm text-muted-foreground">
                Found {duplicates.length} duplicate account(s)
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="X"
            onClick={onClose}
            disabled={merging}
          />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Icon name="Loader2" className="animate-spin text-primary" size={24} />
              <span className="ml-2 text-muted-foreground">Scanning for duplicates...</span>
            </div>
          ) : duplicates.length === 0 ? (
            <div className="text-center py-8">
              <Icon name="CheckCircle" size={48} className="mx-auto mb-4 text-success" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Duplicates Found</h3>
              <p className="text-muted-foreground">All user accounts have unique email addresses.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {duplicates.map((group, index) => (
                <div key={index} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Email: {group.email}</h3>
                      <p className="text-xs text-muted-foreground">
                        {group.users.length} duplicate account(s)
                      </p>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleMerge(group)}
                      loading={merging}
                      iconName="Merge"
                      iconPosition="left"
                    >
                      Merge Accounts
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {group.users.map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border ${
                          user.id === group.primaryUserId
                            ? 'bg-primary/10 border-primary'
                            : 'bg-muted/50 border-border'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`primary-${index}`}
                          checked={user.id === group.primaryUserId}
                          onChange={() => {
                            setDuplicates(prev => prev.map((g, i) => 
                              i === index ? { ...g, primaryUserId: user.id } : g
                            ));
                          }}
                          className="rounded border-border"
                        />
                        <Image
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ID: {user.id} • {user.role} • {user.totalBookings} bookings
                          </p>
                        </div>
                        {user.id === group.primaryUserId && (
                          <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={merging}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateUsersModal;

