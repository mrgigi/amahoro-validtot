import React, { useState, useEffect } from 'react';
import { Share2, Flag, Eye, Check } from 'lucide-react';
import ImageViewer from './ImageViewer';
import VoteInterface from './VoteInterface';
import StarRating from './StarRating';
import CommentSection from './CommentSection';
import ReportModal from './ReportModal';
import { supabase } from '../src/supabaseClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '../src/lib/utils';

export default function PostCard({ post }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [anonymousId, setAnonymousId] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Get or create anonymous ID
    let id = localStorage.getItem('validtot_anon_id');
    if (!id) {
      id = 'anon_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('validtot_anon_id', id);
    }
    setAnonymousId(id);

    // Check if user has already voted
    const voteKey = `vote_${post.id}`;
    const existingVote = localStorage.getItem(voteKey);
    if (existingVote) {
      setHasVoted(true);
      setUserVote(parseInt(existingVote));
    }
  }, [post.id]);

  const voteMutation = useMutation({
    mutationFn: async (optionIndexOrRating: number) => {
      if (post.type === 'single_review') {
        // Handle star rating
        const rating = optionIndexOrRating;
        await supabase.from('votes').insert({
          post_id: post.id,
          rating,
          anonymous_id: anonymousId
        });

        const starDist = [...(post.star_distribution || [0, 0, 0, 0, 0])];
        starDist[rating - 1] += 1;
        const newRatingCount = (post.rating_count || 0) + 1;
        const totalStars = starDist.reduce((sum: number, count: number, idx: number) => sum + count * (idx + 1), 0);
        const newAverage = totalStars / newRatingCount;

        await supabase.from('posts').update({
          star_distribution: starDist,
          rating_count: newRatingCount,
          average_rating: newAverage
        }).eq('id', post.id);

        return rating;
      } else {
        // Handle comparison voting
        const optionIndex = optionIndexOrRating;
        await supabase.from('votes').insert({
          post_id: post.id,
          option_index: optionIndex,
          anonymous_id: anonymousId
        });

        const currentVotes = post.votes || new Array(post.images?.length || 3).fill(0);
        const updatedVotes = [...currentVotes];
        updatedVotes[optionIndex] = (updatedVotes[optionIndex] || 0) + 1;

        await supabase.from('posts').update({
          votes: updatedVotes,
          total_votes: (post.total_votes || 0) + 1
        }).eq('id', post.id);
        
        return optionIndex;
      }
    },
    onSuccess: (value) => {
      localStorage.setItem(`vote_${post.id}`, value.toString());
      setHasVoted(true);
      setUserVote(value);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });

  const handleShare = () => {
    const postUrl = `${window.location.origin}${createPageUrl('Feed')}?postId=${post.id}`;
    const shareText = `${post.title}\n\n${postUrl}`;
    
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: shareText
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Link copied!');
    }
  };

  const handleReport = async (reason, details) => {
    await supabase.from('reports').insert({
      reported_item_id: post.id,
      reported_item_type: 'Post',
      reason,
      details: details || '',
      reporter_anonymous_id: anonymousId,
      status: 'Pending'
    });
    alert('Report submitted. Thanks for keeping ValidToT safe!');
  };

  return (
    <div className="w-full bg-[#F5F5F5]">
      <div className="max-w-2xl mx-auto p-4 pb-8 pt-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-black leading-tight pr-4 transform -rotate-1">
            {post.title}
          </h1>
          <button
            onClick={() => setReportModalOpen(true)}
            className="p-2 bg-red-500 text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <Flag className="w-5 h-5" />
          </button>
        </div>

        {/* Images */}
        <div className={`grid gap-3 mb-6 ${
          (post.images?.length || 0) === 1 ? 'grid-cols-1' : 
          (post.images?.length || 0) === 2 ? 'grid-cols-2' : 
          'grid-cols-2'
        }`}>
          {(post.images || []).map((image, index) => {
            const isVotedImage = hasVoted && userVote === index;
            return (
              <div
                key={index}
                onClick={() => {
                  setSelectedImageIndex(index);
                  setViewerOpen(true);
                }}
                className={`relative cursor-pointer group ${
                  (post.images?.length || 0) === 3 && index === 0 ? 'col-span-2' : ''
                }`}
              >
                <img
                  src={image}
                  alt={`Post image ${index + 1}`}
                  className={`w-full h-64 object-cover border-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${
                    isVotedImage ? 'border-[#00FF00] border-8' : 'border-black'
                  }`}
                />
                {isVotedImage && (
                  <div className="absolute top-2 right-2 bg-[#00FF00] border-4 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <Check className="w-6 h-6 text-black" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                  <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Vote Stats - Always visible */}
        {!hasVoted && (
          <div className="mb-4 p-3 bg-white border-4 border-black font-bold text-center">
            {post.type === 'single_review' 
              ? `${post.rating_count || 0} rating${(post.rating_count || 0) !== 1 ? 's' : ''}`
              : `${post.total_votes || 0} vote${(post.total_votes || 0) !== 1 ? 's' : ''}`
            } • {post.comment_count || 0} comment{(post.comment_count || 0) !== 1 ? 's' : ''}
          </div>
        )}

        {/* Vote/Rating Interface */}
        {post.type === 'single_review' ? (
          <StarRating
            postId={post.id}
            currentRating={post.average_rating || 0}
            onVote={(rating) => voteMutation.mutateAsync(rating)}
            hasVoted={hasVoted}
            userRating={userVote}
          />
        ) : (
          <VoteInterface
            post={post}
            onVote={(option) => voteMutation.mutateAsync(option)}
            hasVoted={hasVoted}
            userVote={userVote}
          />
        )}

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="w-full mt-4 p-4 bg-[#FFFF00] border-4 border-black font-black text-lg flex items-center justify-center gap-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
        >
          <Share2 className="w-5 h-5" />
          SHARE
        </button>

        {/* Comments - Only accessible after voting */}
        {hasVoted && <CommentSection post={post} />}


      </div>

      <ImageViewer
        images={post.images}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        initialIndex={selectedImageIndex}
      />

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSubmit={handleReport}
        itemType="Post"
      />
      </div>
      );
      }