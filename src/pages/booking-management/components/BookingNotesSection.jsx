import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';

const BookingNotesSection = ({ bookingId }) => {
  const { user: adminUser } = useAuth();
  const { showToast } = useToast();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteText, setEditNoteText] = useState('');

  useEffect(() => {
    if (bookingId) {
      fetchNotes();
    }
  }, [bookingId]);

  const fetchNotes = async () => {
    if (!bookingId) return;

    try {
      setLoading(true);
      // Try to fetch from booking_notes table, but handle gracefully if table doesn't exist
      const { data, error } = await supabase
        .from('booking_notes')
        .select(`
          *,
          admin:admin_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist or has schema issues, just log and return empty array
        if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
          console.warn('Booking notes table not available:', error.message);
          setNotes([]);
          return;
        }
        throw error;
      }

      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching booking notes:', error);
      // Don't show toast for missing table errors, just log
      if (error.code !== 'PGRST204' && !error.message?.includes('does not exist')) {
        showToast('Error loading notes', 'error');
      }
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !adminUser?.id || !bookingId) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('booking_notes')
        .insert({
          booking_id: bookingId,
          admin_id: adminUser.id,
          note: newNote.trim(),
          is_internal: true
        })
        .select(`
          *,
          admin:admin_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) throw error;

      setNotes(prev => [data, ...prev]);
      setNewNote('');
      showToast('Note added successfully', 'success');
    } catch (error) {
      console.error('Error adding note:', error);
      showToast(`Error adding note: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateNote = async (noteId) => {
    if (!editNoteText.trim()) {
      setEditingNoteId(null);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('booking_notes')
        .update({
          note: editNoteText.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId)
        .eq('admin_id', adminUser.id); // Only allow updating own notes

      if (error) throw error;

      setNotes(prev => prev.map(note =>
        note.id === noteId
          ? { ...note, note: editNoteText.trim(), updated_at: new Date().toISOString() }
          : note
      ));
      setEditingNoteId(null);
      setEditNoteText('');
      showToast('Note updated successfully', 'success');
    } catch (error) {
      console.error('Error updating note:', error);
      showToast(`Error updating note: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('booking_notes')
        .delete()
        .eq('id', noteId)
        .eq('admin_id', adminUser.id); // Only allow deleting own notes

      if (error) throw error;

      setNotes(prev => prev.filter(note => note.id !== noteId));
      showToast('Note deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting note:', error);
      showToast(`Error deleting note: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (note) => {
    setEditingNoteId(note.id);
    setEditNoteText(note.note);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditNoteText('');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAdminName = (admin) => {
    if (!admin) return 'Unknown Admin';
    return `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || admin.email || 'Unknown Admin';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">Admin Notes</h3>
        <span className="text-sm text-muted-foreground">
          {notes.length} note{notes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Add Note Form */}
      <div className="space-y-2">
        <Input
          type="textarea"
          placeholder="Add an admin note about this booking..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={3}
          disabled={isSubmitting}
        />
        <div className="flex items-center justify-end">
          <Button
            variant="default"
            size="sm"
            onClick={handleAddNote}
            disabled={!newNote.trim() || isSubmitting}
            iconName="Plus"
            iconPosition="left"
          >
            Add Note
          </Button>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Icon name="FileText" size={32} className="mx-auto mb-2 opacity-50" />
            <p>No notes yet. Add a note to track important information about this booking.</p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="bg-muted/30 border border-border rounded-lg p-4 space-y-2"
            >
              {editingNoteId === note.id ? (
                <div className="space-y-2">
                  <Input
                    type="textarea"
                    value={editNoteText}
                    onChange={(e) => setEditNoteText(e.target.value)}
                    rows={3}
                    disabled={isSubmitting}
                  />
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEditing}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleUpdateNote(note.id)}
                      disabled={isSubmitting}
                      iconName="Save"
                      iconPosition="left"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{note.note}</p>
                    </div>
                    {note.admin_id === adminUser?.id && (
                      <div className="flex items-center space-x-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(note)}
                          iconName="Edit"
                          className="p-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNote(note.id)}
                          iconName="Trash2"
                          className="p-1 text-destructive hover:text-destructive"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {getAdminName(note.admin)} • {formatDate(note.created_at)}
                      {note.updated_at !== note.created_at && ' (edited)'}
                    </span>
                    {note.is_internal && (
                      <span className="px-2 py-0.5 bg-accent/10 text-accent rounded-full">
                        Internal
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BookingNotesSection;

