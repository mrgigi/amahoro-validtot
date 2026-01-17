import React, { useState, useEffect } from 'react';
import { Share2, MoreVertical, Eye, Check, Lock } from 'lucide-react';
import ImageViewer from './ImageViewer';
import VoteInterface from './VoteInterface';
import CommentSection from './CommentSection';
import ReportModal from './ReportModal';
import { supabase, checkPostCode } from '../src/supabaseClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '../src/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';

export default function PostCard({ post }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [anonymousId, setAnonymousId] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(!post.is_private);
  const [unlockCode, setUnlockCode] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [now, setNow] = useState(() => new Date());

  const optionColors = ['#FF006E', '#0066FF', '#FFFF00'];
  const optionTextColors = ['text-white', 'text-white', 'text-black'];

  useEffect(() => {
    setIsUnlocked(!post.is_private);
  }, [post.id, post.is_private]);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      let id = localStorage.getItem('validtot_anon_id');
      if (!id) {
        id = 'anon_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('validtot_anon_id', id);
      }
      if (!isMounted) return;
      setAnonymousId(id);

      const voteKey = `vote_${post.id}`;
      const existingVote = localStorage.getItem(voteKey);
      if (existingVote) {
        if (!isMounted) return;
        setHasVoted(true);
        setUserVote(parseInt(existingVote));
        setIsUnlocked(true);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();

        let query = supabase
          .from('votes')
          .select('option_index')
          .eq('post_id', post.id);

        if (user) {
          query = query.or(`user_id.eq.${user.id},anonymous_id.eq.${id}`);
        } else {
          query = query.eq('anonymous_id', id);
        }

        const { data: remoteVote, error } = await query.maybeSingle();

        if (error) {
          console.error('Error preloading vote:', error);
          return;
        }

        if (remoteVote && typeof remoteVote.option_index === 'number') {
          const index = remoteVote.option_index;
          if (!isMounted) return;
          localStorage.setItem(voteKey, index.toString());
          setHasVoted(true);
          setUserVote(index);
          setIsUnlocked(true);
        }
      } catch (error) {
        console.error('Error preloading vote:', error);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [post.id]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setIsOwner(!!user && user.id === post.created_by);
      } catch (error) {
        console.error('Error checking owner status:', error);
        setIsOwner(false);
      }
    };
    loadUser();
  }, [post.created_by]);

  const voteMutation = useMutation({
    mutationFn: async ({ optionIndex, userId }: { optionIndex: number, userId: string }) => {
      const { data: existingVote, error: existingError } = await supabase
        .from('votes')
        .select('id, option_index')
        .eq('post_id', post.id)
        .or(`user_id.eq.${userId},anonymous_id.eq.${anonymousId}`)
        .maybeSingle();

      if (existingError) {
        console.error('Error checking existing vote:', existingError);
        throw existingError;
      }

      if (existingVote) {
        const existingIndex = existingVote.option_index ?? 0;
        localStorage.setItem(`vote_${post.id}`, existingIndex.toString());
        setHasVoted(true);
        setUserVote(existingIndex);
        alert('You have already voted on this post.');
        return existingIndex;
      }

      const currentVotes = Array.isArray(post.votes) 
        ? [...post.votes] 
        : new Array(post.images?.length || post.options?.length || 2).fill(0);

      while (currentVotes.length <= optionIndex) {
        currentVotes.push(0);
      }

      currentVotes[optionIndex] = (currentVotes[optionIndex] || 0) + 1;
      const newTotal = (post.total_votes || 0) + 1;

      const { error: voteError } = await supabase.from('votes').insert({
        post_id: post.id,
        option_index: optionIndex,
        anonymous_id: anonymousId,
        user_id: userId
      });

      if (voteError) {
        console.error('Error recording vote:', voteError);

        if ((voteError as any).code === '23505') {
          const { data: conflictVote, error: conflictError } = await supabase
            .from('votes')
            .select('option_index')
            .eq('post_id', post.id)
            .or(`user_id.eq.${userId},anonymous_id.eq.${anonymousId}`)
            .maybeSingle();

          if (!conflictError && conflictVote) {
            const existingIndex = conflictVote.option_index ?? 0;
            localStorage.setItem(`vote_${post.id}`, existingIndex.toString());
            setHasVoted(true);
            setUserVote(existingIndex);
            alert('You have already voted on this post.');
            return existingIndex;
          }
        }

        throw voteError;
      }

      const { data: updatedPost, error: updateError } = await supabase
        .from('posts')
        .update({
          votes: currentVotes,
          total_votes: newTotal
        })
        .eq('id', post.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating post stats:', updateError);
        throw updateError;
      }

      if (!updatedPost) {
        throw new Error('Post update failed - check permissions');
      }
      
      return optionIndex;
    },
    onError: (error) => {
      console.error('Vote failed:', error);
      alert('Failed to submit vote. Please try again.');
    },
    onSuccess: (value) => {
      localStorage.setItem(`vote_${post.id}`, value.toString());
      setHasVoted(true);
      setUserVote(value);
      setIsUnlocked(true);
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

  const handleDeletePost = async () => {
    if (isDeleting) {
      return;
    }
    const confirmed = window.confirm('Are you sure you want to delete this post?');
    if (!confirmed) {
      return;
    }
    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== post.created_by) {
        alert('You can only delete posts you created.');
        return;
      }
      const { error } = await supabase
        .from('posts')
        .update({ is_hidden: true })
        .eq('id', post.id);
      if (error) {
        console.error('Error deleting post:', error);
        alert('Failed to delete post. Please try again.');
        return;
      }
      setMenuOpen(false);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      alert('Post deleted.');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const votingStartsAt = post.voting_starts_at ? new Date(post.voting_starts_at) : null;
  const votingEndsAt = post.voting_ends_at ? new Date(post.voting_ends_at) : null;

  let votingState: 'always_active' | 'countdown' | 'active' | 'closed' = 'always_active';
  if (votingStartsAt || votingEndsAt) {
    if (votingStartsAt && now < votingStartsAt) {
      votingState = 'countdown';
    } else if (votingEndsAt && now > votingEndsAt) {
      votingState = 'closed';
    } else {
      votingState = 'active';
    }
  }

  const isBeforeVoting = votingState === 'countdown';
  const isAfterVoting = votingState === 'closed';
  const isVotingActive = votingState === 'active' || votingState === 'always_active';

  const formatStartCountdown = () => {
    if (!votingStartsAt) return '';
    const diffMs = votingStartsAt.getTime() - now.getTime();
    if (diffMs <= 0) return '00:00:00';
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value: number) => value.toString().padStart(2, '0');
    const time = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    if (days > 0) {
      return `${days}d ${time}`;
    }
    return time;
  };

  const formatEndCountdown = () => {
    if (!votingEndsAt) return '';
    const diffMs = votingEndsAt.getTime() - now.getTime();
    if (diffMs <= 0) return '00:00:00';
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value: number) => value.toString().padStart(2, '0');
    const time = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    if (days > 0) {
      return `${days}d ${time}`;
    }
    return time;
  };

  const handleVoteAction = async (option: number) => {
    if (!isVotingActive) {
      alert('Voting is not active for this campaign.');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth', { state: { from: location } });
      return;
    }
    const confirmed = window.confirm(
      "Are you sure? You can't change your vote after this."
    );
    if (!confirmed) {
      return;
    }
    await voteMutation.mutateAsync({ optionIndex: option, userId: user.id });
  };

  const handleUnlock = async () => {
    if (!unlockCode.trim()) {
      setUnlockError('Enter the access code for this post.');
      return;
    }
    setUnlocking(true);
    setUnlockError(null);
    try {
      const ok = await checkPostCode(post.id, unlockCode.trim());
      if (!ok) {
        setUnlockError('Incorrect access code. Try again.');
        return;
      }
      setIsUnlocked(true);
      setUnlockCode('');
    } catch (error: any) {
      setUnlockError(error.message || 'Failed to check access code.');
    } finally {
      setUnlocking(false);
    }
  };

  const isPrivate = !!post.is_private;
  const isLocked = isPrivate && !isUnlocked;

  return (
    <div className="w-full bg-[#F5F5F5]">
      <div className="max-w-2xl mx-auto p-4 pb-8 pt-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-black leading-tight pr-4 transform -rotate-1">
              {post.title}
            </h1>
            {isLocked && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-black text-[#FFFF00] border-4 border-black font-black text-xs">
                <Lock className="w-4 h-4" />
                <span>Private post • locked with code</span>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="p-2 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50">
                {isOwner ? (
                  <button
                    onClick={handleDeletePost}
                    disabled={isDeleting}
                    className="w-full px-3 py-2 text-left font-black text-sm text-red-600 hover:bg-[#F5F5F5] disabled:opacity-50"
                  >
                    Delete
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setReportModalOpen(true);
                    }}
                    className="w-full px-3 py-2 text-left font-black text-sm hover:bg-[#F5F5F5]"
                  >
                    Report
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Images */}
        <div className={`grid gap-3 mb-6 ${
          (post.images?.length || 0) === 1 ? 'grid-cols-1' : 
          (post.images?.length || 0) === 2 ? 'grid-cols-2' : 
          'grid-cols-2'
        }`}>
          {(post.images || []).map((image, index) => {
            const optionColor = optionColors[index % optionColors.length];
            const optionTextClass = optionTextColors[index % optionTextColors.length];
            const optionLabel = String.fromCharCode(65 + index);
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
                  } ${isLocked ? 'opacity-75' : ''}`}
                />
                <div
                  className={`absolute top-2 left-2 z-30 px-2 py-0.5 border-4 border-black font-black text-[10px] md:text-xs rounded-sm ${optionTextClass}`}
                  style={{ backgroundColor: optionColor }}
                >
                  {optionLabel}
                </div>
                {isVotedImage && (
                  <div className="absolute top-2 right-2 z-30 bg-[#00FF00] border-4 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <Check className="w-6 h-6 text-black" />
                  </div>
                )}
                <div className="absolute inset-0 z-20 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                  <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>

        {isBeforeVoting && (
          <div className="mb-4 p-3 bg-white border-4 border-black font-black text-center">
            Voting opens in {formatStartCountdown()}
          </div>
        )}

        {isVotingActive && votingEndsAt && (
          <div className="mb-4 p-3 bg-white border-4 border-black font-black text-center">
            Voting closes in {formatEndCountdown()}
          </div>
        )}

        {isVotingActive && !isLocked && !hasVoted && (
          <div className="mb-4 p-3 bg-white border-4 border-black font-bold text-center">
            {`${post.total_votes || 0} vote${(post.total_votes || 0) !== 1 ? 's' : ''}`} • {post.comment_count || 0} comment{(post.comment_count || 0) !== 1 ? 's' : ''}
          </div>
        )}

        {isVotingActive && !isLocked && !hasVoted && (
          <div className="mb-4 p-3 bg-black text-[#FFFF00] border-4 border-black font-black text-center text-sm md:text-base">
            Vote once to unlock live results. Your vote cannot be changed.
          </div>
        )}

        {isAfterVoting && (
          <div className="mb-4 p-3 bg-white border-4 border-black font-black text-center">
            Voting closed
          </div>
        )}

        {isBeforeVoting ? null : isAfterVoting ? (
          <VoteInterface
            post={post}
            onVote={async () => {}}
            hasVoted={true}
            userVote={userVote}
          />
        ) : isLocked ? (
          <div className="mb-4 p-3 bg-white border-4 border-black">
            {unlockError && (
              <div className="mb-2 text-xs font-bold text-red-600">
                {unlockError}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={unlockCode}
                onChange={(e) => setUnlockCode(e.target.value.toUpperCase())}
                className="flex-1 p-3 border-4 border-black font-bold uppercase bg-[#F5F5F5] focus:outline-none focus:bg-[#FFFF00] transition-colors"
                placeholder="Enter access code"
              />
              <button
                type="button"
                onClick={handleUnlock}
                disabled={unlocking}
                className="px-4 py-3 bg-black text-[#FFFF00] border-4 border-black font-black text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {unlocking ? 'Checking...' : 'Unlock'}
              </button>
            </div>
          </div>
        ) : (
          <VoteInterface
            post={post}
            onVote={handleVoteAction}
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

        {hasVoted && !isLocked && <CommentSection post={post} />}


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
