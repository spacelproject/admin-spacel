import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';

const BookingTagsSection = ({ bookingId }) => {
  const { user: adminUser } = useAuth();
  const { showToast } = useToast();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('blue');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tagColors = [
    { value: 'blue', label: 'Blue', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'green', label: 'Green', className: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'red', label: 'Red', className: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'yellow', label: 'Yellow', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { value: 'purple', label: 'Purple', className: 'bg-purple-100 text-purple-700 border-purple-200' },
    { value: 'orange', label: 'Orange', className: 'bg-orange-100 text-orange-700 border-orange-200' }
  ];

  useEffect(() => {
    if (bookingId) {
      fetchTags();
    }
  }, [bookingId]);

  const fetchTags = async () => {
    if (!bookingId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('booking_tags')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTags(data || []);
    } catch (error) {
      console.error('Error fetching booking tags:', error);
      showToast('Error loading tags', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim() || !adminUser?.id || !bookingId) {
      return;
    }

    // Check if tag already exists
    if (tags.some(tag => tag.tag_name.toLowerCase() === newTagName.trim().toLowerCase())) {
      showToast('This tag already exists for this booking', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('booking_tags')
        .insert({
          booking_id: bookingId,
          tag_name: newTagName.trim(),
          tag_color: newTagColor,
          created_by: adminUser.id
        })
        .select()
        .single();

      if (error) throw error;

      setTags(prev => [data, ...prev]);
      setNewTagName('');
      setNewTagColor('blue');
      showToast('Tag added successfully', 'success');
    } catch (error) {
      console.error('Error adding tag:', error);
      showToast(`Error adding tag: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTag = async (tagId) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('booking_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      setTags(prev => prev.filter(tag => tag.id !== tagId));
      showToast('Tag removed successfully', 'success');
    } catch (error) {
      console.error('Error deleting tag:', error);
      showToast(`Error removing tag: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTagColorClass = (color) => {
    const colorConfig = tagColors.find(c => c.value === color);
    return colorConfig?.className || tagColors[0].className;
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
        <h3 className="text-lg font-medium text-foreground">Booking Tags</h3>
        <span className="text-sm text-muted-foreground">
          {tags.length} tag{tags.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Add Tag Form */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Enter tag name..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddTag();
              }
            }}
            disabled={isSubmitting}
            className="flex-1"
          />
          <select
            value={newTagColor}
            onChange={(e) => setNewTagColor(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
            disabled={isSubmitting}
          >
            {tagColors.map(color => (
              <option key={color.value} value={color.value}>
                {color.label}
              </option>
            ))}
          </select>
          <Button
            variant="default"
            size="sm"
            onClick={handleAddTag}
            disabled={!newTagName.trim() || isSubmitting}
            iconName="Plus"
            iconPosition="left"
          >
            Add
          </Button>
        </div>
      </div>

      {/* Tags List */}
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground w-full">
            <Icon name="Tag" size={32} className="mx-auto mb-2 opacity-50" />
            <p>No tags yet. Add tags to categorize this booking.</p>
          </div>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${getTagColorClass(tag.tag_color)}`}
            >
              <span className="text-xs font-medium">{tag.tag_name}</span>
              <button
                onClick={() => handleDeleteTag(tag.id)}
                disabled={isSubmitting}
                className="hover:opacity-70 transition-smooth"
              >
                <Icon name="X" size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BookingTagsSection;

