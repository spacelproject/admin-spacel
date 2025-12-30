import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';
import { logDebug, logError, logWarn } from '../../../utils/logger';

const StaffInvitesTab = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'admin',
    expiresInDays: 7
  });
  const [errors, setErrors] = useState({});
  const [copiedToken, setCopiedToken] = useState(null);

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invite_tokens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setInvites(data || []);
    } catch (error) {
      logError('Error fetching invite tokens:', error);
      showToast('Failed to load invite tokens', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateToken = () => {
    // Generate a secure random token
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const handleGenerateInvite = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    if (formData.expiresInDays < 1 || formData.expiresInDays > 365) {
      newErrors.expiresInDays = 'Expiration must be between 1 and 365 days';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setGenerating(true);
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(formData.expiresInDays));

      const { data, error } = await supabase
        .from('invite_tokens')
        .insert({
          token,
          email: formData.email.trim().toLowerCase() || null,
          role: formData.role,
          expires_at: expiresAt.toISOString(),
          invited_by: user?.id,
          used: false
        })
        .select()
        .single();

      if (error) throw error;

      logDebug('Invite token generated', { tokenId: data.id, email: data.email });

      // Show success with token
      const registrationUrl = `${window.location.origin}/admin-register?token=${token}`;
      
      showToast('Invite token generated successfully!', 'success');
      
      // Copy token to clipboard
      await navigator.clipboard.writeText(token);
      setCopiedToken(data.id);
      setTimeout(() => setCopiedToken(null), 3000);

      // Reset form
      setFormData({
        email: '',
        role: 'admin',
        expiresInDays: 7
      });

      // Refresh list
      await fetchInvites();

      // Show modal with token details
      showTokenDetails(data, token, registrationUrl);
    } catch (error) {
      logError('Error generating invite token:', error);
      if (error.code === '23505') {
        showToast('An invite token already exists for this email', 'error');
        setErrors({ email: 'An invite token already exists for this email' });
      } else {
        showToast(error.message || 'Failed to generate invite token', 'error');
      }
    } finally {
      setGenerating(false);
    }
  };

  const showTokenDetails = (inviteData, token, registrationUrl) => {
    // Create a modal-like alert with token details
    const message = `Invite Token Generated!\n\n` +
      `Token: ${token}\n` +
      `Registration URL: ${registrationUrl}\n\n` +
      `The token has been copied to your clipboard.\n` +
      `Share this URL with the user to complete registration.`;

    // For now, use alert. You can replace this with a proper modal component
    alert(message);
  };

  const handleRevokeInvite = async (inviteId) => {
    if (!confirm('Are you sure you want to revoke this invite token? It will no longer be usable.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('invite_tokens')
        .update({ used: true })
        .eq('id', inviteId);

      if (error) throw error;

      showToast('Invite token revoked', 'success');
      await fetchInvites();
    } catch (error) {
      logError('Error revoking invite token:', error);
      showToast('Failed to revoke invite token', 'error');
    }
  };

  const copyToClipboard = async (text, inviteId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(inviteId);
      showToast('Copied to clipboard!', 'success');
      setTimeout(() => setCopiedToken(null), 3000);
    } catch (error) {
      logError('Error copying to clipboard:', error);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (invite) => {
    if (invite.used) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
          Used
        </span>
      );
    }
    if (new Date(invite.expires_at) < new Date()) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-destructive/10 text-destructive">
          Expired
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
        Active
      </span>
    );
  };

  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'support', label: 'Support' }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Staff Invites</h2>
        <p className="text-muted-foreground">
          Generate invite tokens for new admin or support staff members. Users will need these tokens to register.
        </p>
      </div>

      {/* Generate Invite Form */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center space-x-2">
          <Icon name="UserPlus" size={20} className="text-primary" />
          <span>Generate New Invite Token</span>
        </h3>

        <form onSubmit={handleGenerateInvite} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, email: e.target.value }));
                if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
              }}
              error={errors.email}
              description="Optional: Leave empty for open invite"
              required={false}
            />

            <Select
              label="Role"
              options={roleOptions}
              value={formData.role}
              onChange={(value) => {
                setFormData(prev => ({ ...prev, role: value }));
                if (errors.role) setErrors(prev => ({ ...prev, role: '' }));
              }}
              error={errors.role}
              description="Admin or Support role"
              required
            />

            <Input
              label="Expires In (Days)"
              type="number"
              min="1"
              max="365"
              placeholder="7"
              value={formData.expiresInDays}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, expiresInDays: e.target.value }));
                if (errors.expiresInDays) setErrors(prev => ({ ...prev, expiresInDays: '' }));
              }}
              error={errors.expiresInDays}
              description="Token expiration period"
              required
            />
          </div>

          <div className="flex items-center justify-end">
            <Button
              type="submit"
              variant="default"
              loading={generating}
              iconName="Key"
              iconPosition="left"
            >
              {generating ? 'Generating...' : 'Generate Invite Token'}
            </Button>
          </div>
        </form>
      </div>

      {/* Invite Tokens List */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground flex items-center space-x-2">
            <Icon name="List" size={20} className="text-primary" />
            <span>Recent Invite Tokens</span>
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading invite tokens...</p>
          </div>
        ) : invites.length === 0 ? (
          <div className="p-8 text-center">
            <Icon name="Inbox" size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No invite tokens generated yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Token
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invites.map((invite) => {
                  const registrationUrl = `${window.location.origin}/admin-register?token=${invite.token}`;
                  return (
                    <tr key={invite.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {invite.token.substring(0, 8)}...
                          </code>
                          <button
                            onClick={() => copyToClipboard(invite.token, invite.id)}
                            className="text-muted-foreground hover:text-foreground transition-smooth"
                            title="Copy token"
                          >
                            <Icon 
                              name={copiedToken === invite.id ? "Check" : "Copy"} 
                              size={16} 
                            />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {invite.email || <span className="text-muted-foreground">Open invite</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded bg-primary/10 text-primary">
                          {invite.role || 'admin'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invite)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(invite.expires_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(invite.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => copyToClipboard(registrationUrl, `url-${invite.id}`)}
                            className="text-primary hover:text-primary/80 transition-smooth"
                            title="Copy registration URL"
                          >
                            <Icon name="Link" size={16} />
                          </button>
                          {!invite.used && new Date(invite.expires_at) > new Date() && (
                            <button
                              onClick={() => handleRevokeInvite(invite.id)}
                              className="text-destructive hover:text-destructive/80 transition-smooth"
                              title="Revoke token"
                            >
                              <Icon name="XCircle" size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffInvitesTab;

