import React, { useState, useEffect } from 'react';
import { Send, MessageCircle, Flag, Trash2, Edit2, X, Check } from 'lucide-react';
import { supabase } from '../src/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import ReportModal from './ReportModal';

const ANON_NAMES = ['Anon Owl', 'Mystery Duck', 'Secret Cat', 'Hidden Bear', 'Ghost Fox', 'Shadow Deer', 'Ninja Panda', 'Stealth Wolf'];

export default function CommentSection({ post }: { post: any }) {
  const postId = post.id;
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
  const [anonymousId, setAnonymousId] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let id = localStorage.getItem('validtot_anon_id');
    if (!id) {
      id = 'anon_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('validtot_anon_id', id);
    }
    setAnonymousId(id);

    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, []);

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: showComments
  });

  const commentCount = Math.max(post.comment_count || 0, comments.length);

  const addCommentMutation = useMutation({
    mutationFn: async ({ content, userId }: { content: string; userId: string }) => {
      let authorName = ANON_NAMES[Math.floor(Math.random() * ANON_NAMES.length)];

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();
    
      if (profile?.username) {
        authorName = profile.username;
      }
      
      const { error: commentError } = await supabase.from('comments').insert({
        post_id: postId,
        content,
        anonymous_name: authorName,
        user_id: userId
      });

      if (commentError) throw commentError;

      const { error: updateError } = await supabase
        .from('posts')
        .update({
          comment_count: commentCount + 1
        })
        .eq('id', postId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setNewComment('');
    }
  });

  const editCommentMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string, content: string }) => {
      const { error } = await supabase
        .from('comments')
        .update({ content })
        .eq('id', id)
        .eq('user_id', currentUser?.id); // Ensure ownership

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      setEditingCommentId(null);
      setEditContent('');
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser?.id); // Ensure ownership

      if (error) throw error;

      // Update post comment count
      await supabase
        .from('posts')
        .update({
          comment_count: Math.max(commentCount - 1, 0)
        })
        .eq('id', postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed || trimmed.length > 140) {
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth', { state: { from: location, reason: 'comment' } });
      return;
    }

    addCommentMutation.mutate({ content: trimmed, userId: user.id });
  };

  const handleReportComment = async (reason: string, details?: string) => {
    await supabase.from('reports').insert({
      reported_item_id: reportingCommentId,
      reported_item_type: 'Comment',
      reason,
      details: details || '',
      reporter_anonymous_id: anonymousId,
      status: 'Pending'
    });
    alert('Report submitted. Thanks for keeping ValidToT safe!');
  };

  return (
    <div className="mt-6">
      <button
        onClick={() => setShowComments(!showComments)}
        className="flex items-center gap-2 mb-4 p-3 bg-[#FFFF00] border-4 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
      >
        <MessageCircle className="w-5 h-5" />
        {showComments
          ? 'Hide comments'
          : `${commentCount} comment${commentCount !== 1 ? 's' : ''} • Tap to view`}
      </button>

      {showComments && (
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Say something..."
                className="w-full p-3 pr-12 border-4 border-black font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                maxLength={140}
              />
              <button 
                type="submit"
                disabled={!newComment.trim() || addCommentMutation.isPending}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="text-right text-xs font-bold text-gray-500">
              {newComment.length}/140
            </div>
          </form>

          <div className="space-y-3">
            {comments.map((comment: any) => (
              <div key={comment.id} className="bg-white border-4 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-black text-sm">{comment.anonymous_name}</div>
                  <div className="flex items-center gap-2">
                    {currentUser && comment.user_id === currentUser.id && (
                      <>
                        <button
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditContent(comment.content);
                          }}
                          className="text-gray-400 hover:text-blue-500"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this comment?')) {
                              deleteCommentMutation.mutate(comment.id);
                            }
                          }}
                          className="text-gray-400 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setReportingCommentId(comment.id);
                        setReportModalOpen(true);
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {editingCommentId === comment.id ? (
                  <div className="mt-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-2 border-2 border-black font-medium bg-white text-sm focus:outline-none focus:bg-[#FFFF00] transition-colors mb-2"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditContent('');
                        }}
                        className="p-1 bg-gray-200 border-2 border-black hover:bg-gray-300"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => editCommentMutation.mutate({ id: comment.id, content: editContent })}
                        className="p-1 bg-[#FFFF00] border-2 border-black hover:bg-[#F0F000]"
                        title="Save"
                        disabled={!editContent.trim()}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="font-bold text-lg leading-snug">{comment.content}</div>
                )}
                <div className="mt-2 text-xs text-gray-500 font-bold">
                  {new Date(comment.created_at || Date.now()).toLocaleDateString()}
                </div>
              </div>
            ))}
            
            {comments.length === 0 && (
              <div className="text-center text-gray-700 font-bold py-4 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                No comments yet. Be the first to share your take.
              </div>
            )}
          </div>
        </div>
      )}

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSubmit={handleReportComment}
        itemType="Comment"
      />
    </div>
  );
}
