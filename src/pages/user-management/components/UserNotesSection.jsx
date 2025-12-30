import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';

const UserNotesSection = ({ userId }) => {
  const { user: adminUser } = useAuth();
  const { showToast } = useToast();
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchNotes();
    }
  }, [userId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_notes')
        .select(`
          id,
          note,
          is_internal,
          created_at,
          created_by,
          profiles:created_by (
            first_name,
            last_name,
            email
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      showToast('Error loading notes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e?.preventDefault();
    
    if (!newNote.trim()) {
      showToast('Please enter a note', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('user_notes')
        .insert({
          user_id: userId,
          note: newNote.trim(),
          created_by: adminUser?.id,
          is_internal: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      showToast('Note added successfully', 'success');
      setNewNote('');
      await fetchNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      showToast(`Error adding note: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      showToast('Note deleted successfully', 'success');
      await fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      showToast(`Error deleting note: ${error.message}`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Icon name="Loader2" className="animate-spin text-primary" size={20} />
        <span className="ml-2 text-sm text-muted-foreground">Loading notes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Admin Notes</h4>
        <span className="text-xs text-muted-foreground">{notes.length} note(s)</span>
      </div>

      {/* Add Note Form */}
      <form onSubmit={handleAddNote} className="space-y-2">
        <textarea
          placeholder="Add an internal note about this user..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
          disabled={isSubmitting}
        />
        <div className="flex items-center justify-end">
          <Button
            type="submit"
            variant="default"
            size="sm"
            loading={isSubmitting}
            iconName="Plus"
            iconPosition="left"
          >
            Add Note
          </Button>
        </div>
      </form>

      {/* Notes List */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Icon name="FileText" size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notes yet</p>
          </div>
        ) : (
          notes.map((note) => {
            const authorName = note.profiles
              ? `${note.profiles.first_name || ''} ${note.profiles.last_name || ''}`.trim() || note.profiles.email || 'Admin'
              : 'Admin';

            return (
              <div
                key={note.id}
                className="bg-muted/50 rounded-lg p-3 border border-border"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{note.note}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="Trash2"
                    onClick={() => handleDeleteNote(note.id)}
                    className="ml-2 flex-shrink-0"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{authorName}</span>
                  <span>{new Date(note.created_at).toLocaleString()}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UserNotesSection;

