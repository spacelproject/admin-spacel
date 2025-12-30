import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';

const UserTagsSection = ({ userId }) => {
  const { user: adminUser } = useAuth();
  const { showToast } = useToast();
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(true);

  const tagColors = [
    { name: 'blue', value: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    { name: 'green', value: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    { name: 'red', value: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    { name: 'yellow', value: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
    { name: 'purple', value: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
    { name: 'pink', value: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' }
  ];

  useEffect(() => {
    if (userId) {
      fetchTags();
    }
  }, [userId]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_tags')
        .select('id, tag, color, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      // Table might not exist yet, that's okay
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async (e) => {
    e?.preventDefault();
    
    if (!newTag.trim()) {
      showToast('Please enter a tag', 'error');
      return;
    }

    try {
      const randomColor = tagColors[Math.floor(Math.random() * tagColors.length)];
      
      const { error } = await supabase
        .from('user_tags')
        .insert({
          user_id: userId,
          tag: newTag.trim(),
          color: randomColor.name,
          created_by: adminUser?.id,
          created_at: new Date().toISOString()
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          showToast('This tag already exists for this user', 'error');
        } else {
          throw error;
        }
        return;
      }

      showToast('Tag added successfully', 'success');
      setNewTag('');
      await fetchTags();
    } catch (error) {
      console.error('Error adding tag:', error);
      showToast(`Error adding tag: ${error.message}`, 'error');
    }
  };

  const handleDeleteTag = async (tagId) => {
    try {
      const { error } = await supabase
        .from('user_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      showToast('Tag removed successfully', 'success');
      await fetchTags();
    } catch (error) {
      console.error('Error deleting tag:', error);
      showToast(`Error removing tag: ${error.message}`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Icon name="Loader2" className="animate-spin text-primary" size={20} />
        <span className="ml-2 text-sm text-muted-foreground">Loading tags...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">User Tags</h4>
        <span className="text-xs text-muted-foreground">{tags.length} tag(s)</span>
      </div>

      {/* Add Tag Form */}
      <form onSubmit={handleAddTag} className="flex items-center space-x-2">
        <Input
          type="text"
          placeholder="Add a tag..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          className="flex-1"
        />
        <Button
          type="submit"
          variant="default"
          size="sm"
          iconName="Plus"
        >
          Add
        </Button>
      </form>

      {/* Tags List */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const colorClass = tagColors.find(c => c.name === tag.color)?.value || tagColors[0].value;
            return (
              <span
                key={tag.id}
                className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${colorClass}`}
              >
                <span>{tag.tag}</span>
                <button
                  onClick={() => handleDeleteTag(tag.id)}
                  className="hover:opacity-70"
                >
                  <Icon name="X" size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {tags.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No tags added yet
        </p>
      )}
    </div>
  );
};

export default UserTagsSection;

