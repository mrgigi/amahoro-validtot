import React, { useState } from 'react';
import { Send, MessageCircle, Flag } from 'lucide-react';
import { supabase } from '../src/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReportModal from './ReportModal';

const ANON_NAMES = ['Anon Owl', 'Mystery Duck', 'Secret Cat', 'Hidden Bear', 'Ghost Fox', 'Shadow Deer', 'Ninja Panda', 'Stealth Wolf'];

export default function CommentSection({ post }: { post: any }) {
  const postId = post.id;
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
  const [anonymousId, setAnonymousId] = useState('');
  const queryClient = useQueryClient();

  React.useEffect(() => {
    let id = localStorage.getItem('validtot_anon_id');
    if (!id) {
      id = 'anon_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('validtot_anon_id', id);
    }
    setAnonymousId(id);
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

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      // 1. Get current user's profile username
      const { data: { user } } = await supabase.auth.getUser();
      let authorName = ANON_NAMES[Math.floor(Math.random() * ANON_NAMES.length)];

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (profile?.username) {
          authorName = profile.username;
        }
      }
      
      const { error: commentError } = await supabase.from('comments').insert({
        post_id: postId,
        content,
        anonymous_name: authorName
      });

      if (commentError) throw commentError;

      // Increment comment count
      const { data: updatedPost, error: updateError } = await supabase
        .from('posts')
        .update({
          comment_count: (post.comment_count || 0) + 1
        })
        .eq('id', postId)
        .select()
        .single();

      if (updateError) throw updateError;
      
      if (!updatedPost) {
        throw new Error('Post update failed - check permissions');
      }
    },
    onError: (error) => {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setNewComment('');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() && newComment.length <= 140) {
      addCommentMutation.mutate(newComment.trim());
    }
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
        {post.comment_count || 0} comment{(post.comment_count || 0) !== 1 ? 's' : ''}
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
                <div className="font-bold text-lg leading-snug">{comment.content}</div>
                <div className="mt-2 text-xs text-gray-500 font-bold">
                  {new Date(comment.created_at || Date.now()).toLocaleDateString()}
                </div>
              </div>
            ))}
            
            {comments.length === 0 && (
              <div className="text-center text-gray-500 font-bold py-4">
                No comments yet. Be the first!
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