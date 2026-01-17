import React, { useState, useEffect } from 'react';
import { supabase } from '../src/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, ArrowLeft, Eye, EyeOff, Trash2, Check, AlertTriangle, BarChart3, FileText, Users, UserX, UserCheck } from 'lucide-react';
import { createPageUrl } from '../src/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import LoadingScreen from '../Components/LoadingScreen';

function PieChart({ segments }: { segments: { value: number; color: string }[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (total <= 0) {
    return (
      <div className="w-48 h-48 flex items-center justify-center text-sm font-bold text-gray-500">
        No data
      </div>
    );
  }

  const radius = 15.915;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  return (
    <svg viewBox="0 0 32 32" className="w-48 h-48 mx-auto">
      <circle
        r={radius}
        cx="16"
        cy="16"
        fill="transparent"
        stroke="#E5E7EB"
        strokeWidth="6"
      />
      {segments.map((segment, index) => {
        const valuePercent = segment.value / total;
        const dashArray = `${valuePercent * circumference} ${circumference}`;
        const dashOffset = -cumulativePercent * circumference;
        cumulativePercent += valuePercent;

        return (
          <circle
            key={index}
            r={radius}
            cx="16"
            cy="16"
            fill="transparent"
            stroke={segment.color}
            strokeWidth="6"
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
          />
        );
      })}
    </svg>
  );
}

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('Pending');
  const [activeTab, setActiveTab] = useState<'reports' | 'posts' | 'users'>('posts');
  const [accessDenied, setAccessDenied] = useState(false);
  const [selectedPostForAnalytics, setSelectedPostForAnalytics] = useState<any | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      
      // Store user immediately so we can show ID even if denied
      setCurrentUser(user);

      // Direct check to capture error details for debugging
      const { data, error } = await supabase
        .from("admins")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        console.error("Admin Access Error:", error, data);
        setDebugInfo({ error, data, userId: user.id });
        setAccessDenied(true);
        return;
      }
      
      const role = data.role || "admin";
      setCurrentUser({ ...user, role });
    };
    checkAuth();
  }, [navigate]);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', filterStatus],
    queryFn: async () => {
      let query = supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(100);
      
      if (filterStatus !== 'All') {
        query = query.eq('status', filterStatus);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      const baseReports = (data || []) as any[];

      const postIds = Array.from(
        new Set(
          baseReports
            .filter((r) => r.reported_item_type === 'Post')
            .map((r) => r.reported_item_id)
        )
      );

      if (postIds.length === 0) {
        return baseReports;
      }

      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, title, created_at')
        .in('id', postIds);

      if (postsError) throw postsError;

      const postMap = new Map(
        (posts || []).map((p: any) => [p.id, p])
      );

      return baseReports.map((report) => ({
        ...report,
        post: report.reported_item_type === 'Post'
          ? postMap.get(report.reported_item_id) || null
          : null
      }));
    },
    enabled: !!currentUser && activeTab === 'reports'
  });

  const { data: allPosts = [], isLoading: isLoadingPosts } = useQuery({
    queryKey: ['all_posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser && activeTab === 'posts'
  });

  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['all_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email, created_at, gender, country, age_range, onboarding_complete, is_banned')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser && activeTab === 'users'
  });

  const { data: postAnalytics, isLoading: isLoadingPostAnalytics } = useQuery({
    queryKey: ['post_analytics', selectedPostId],
    queryFn: async () => {
      if (!selectedPostId) {
        return null;
      }

      const postId = selectedPostId;

      const { data: voteRows, error: votesError } = await supabase
        .from('votes')
        .select('option_index, user_id, created_at')
        .eq('post_id', postId);

      if (votesError) {
        throw votesError;
      }

      const uniqueUserIds = new Set<string>();
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      const weekMs = 7 * dayMs;
      let votesLast24h = 0;
      let votesLast7d = 0;
      let firstVoteTimestamp: number | null = null;
      let lastVoteTimestamp: number | null = null;

      const voteCountsMap: Record<string, number> = {};

      if (voteRows && voteRows.length > 0) {
        for (const row of voteRows) {
          const index = (row as any).option_index ?? 0;
          const key = String(index);
          voteCountsMap[key] = (voteCountsMap[key] || 0) + 1;

          const userId = (row as any).user_id as string | null;
          if (userId) {
            uniqueUserIds.add(userId);
          }

          const createdAtRaw = (row as any).created_at as string | null;
          if (createdAtRaw) {
            const ts = new Date(createdAtRaw).getTime();
            if (!Number.isNaN(ts)) {
              if (firstVoteTimestamp === null || ts < firstVoteTimestamp) {
                firstVoteTimestamp = ts;
              }
              if (lastVoteTimestamp === null || ts > lastVoteTimestamp) {
                lastVoteTimestamp = ts;
              }
              const diff = now - ts;
              if (diff <= dayMs) {
                votesLast24h += 1;
              }
              if (diff <= weekMs) {
                votesLast7d += 1;
              }
            }
          }
        }
      } else if (selectedPostForAnalytics && Array.isArray((selectedPostForAnalytics as any).votes)) {
        const votesArray = (selectedPostForAnalytics as any).votes as number[];
        votesArray.forEach((count, index) => {
          if (typeof count === 'number' && count > 0) {
            const key = String(index);
            voteCountsMap[key] = (voteCountsMap[key] || 0) + count;
          }
        });
      }

      const voteCounts = Object.entries(voteCountsMap).map(([key, count]) => ({
        option_index: Number(key),
        count
      }));

      let uniqueVoters = uniqueUserIds.size;

      if (uniqueVoters === 0 && selectedPostForAnalytics) {
        const totalVotesFromPost = (selectedPostForAnalytics as any).total_votes;
        if (typeof totalVotesFromPost === 'number' && totalVotesFromPost > 0) {
          uniqueVoters = totalVotesFromPost;
        }
      }

      let byCountry: { label: string; count: number }[] = [];
      let byAgeRange: { label: string; count: number }[] = [];
      let byGender: { label: string; count: number }[] = [];

      if (uniqueUserIds.size > 0) {
        const userIds = Array.from(uniqueUserIds);

        const { data: voterProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, gender, country, age_range')
          .in('id', userIds);

        if (profilesError) {
          throw profilesError;
        }

        const countryCounts: Record<string, number> = {};
        const ageRangeCounts: Record<string, number> = {};
        const genderCounts: Record<string, number> = {};

        for (const profile of voterProfiles || []) {
          const country = (profile as any).country || 'Not set';
          const ageRange = (profile as any).age_range || 'Not set';
          const rawGender = ((profile as any).gender || '') as string;
          const normalizedGender =
            rawGender.toLowerCase() === 'male' || rawGender.toLowerCase() === 'female'
              ? rawGender
              : 'Not set';

          countryCounts[country] = (countryCounts[country] || 0) + 1;
          ageRangeCounts[ageRange] = (ageRangeCounts[ageRange] || 0) + 1;
          genderCounts[normalizedGender] = (genderCounts[normalizedGender] || 0) + 1;
        }

        byCountry = Object.entries(countryCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([label, count]) => ({ label, count }));
        byAgeRange = Object.entries(ageRangeCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([label, count]) => ({ label, count }));
        byGender = Object.entries(genderCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([label, count]) => ({ label, count }));
      }

      const { data: reportRows, error: reportsError } = await supabase
        .from('reports')
        .select('reason')
        .eq('reported_item_type', 'Post')
        .eq('reported_item_id', postId);

      if (reportsError) {
        throw reportsError;
      }

      const reportCountsMap: Record<string, number> = {};
      for (const row of reportRows || []) {
        const reason = (row as any).reason || 'Other';
        reportCountsMap[reason] = (reportCountsMap[reason] || 0) + 1;
      }

      const reportCounts = Object.entries(reportCountsMap).map(([reason, count]) => ({
        reason,
        count
      }));

      const { data: viewRows, error: viewsError } = await supabase
        .from('post_views')
        .select('user_id, created_at')
        .eq('post_id', postId);

      if (viewsError) {
        throw viewsError;
      }

      const uniqueViewUserIds = new Set<string>();
      let viewsLast24h = 0;
      let viewsLast7d = 0;
      let firstViewTimestamp: number | null = null;
      let lastViewTimestamp: number | null = null;

      for (const row of viewRows || []) {
        const userId = (row as any).user_id as string | null;
        if (userId) {
          uniqueViewUserIds.add(userId);
        }

        const createdAtRaw = (row as any).created_at as string | null;
        if (createdAtRaw) {
          const ts = new Date(createdAtRaw).getTime();
          if (!Number.isNaN(ts)) {
            if (firstViewTimestamp === null || ts < firstViewTimestamp) {
              firstViewTimestamp = ts;
            }
            if (lastViewTimestamp === null || ts > lastViewTimestamp) {
              lastViewTimestamp = ts;
            }
            const diff = now - ts;
            if (diff <= dayMs) {
              viewsLast24h += 1;
            }
            if (diff <= weekMs) {
              viewsLast7d += 1;
            }
          }
        }
      }

      const totalViews = (viewRows || []).length;
      const uniqueViewers = uniqueViewUserIds.size;

      const voterToViewerRate =
        uniqueViewers > 0 ? uniqueVoters / uniqueViewers : null;

      return {
        votesByOption: voteCounts,
        reportsByReason: reportCounts,
        uniqueVoters,
        timeStats: {
          votesLast24h,
          votesLast7d,
          firstVoteAt: firstVoteTimestamp !== null ? new Date(firstVoteTimestamp).toISOString() : null,
          lastVoteAt: lastVoteTimestamp !== null ? new Date(lastVoteTimestamp).toISOString() : null
        },
        demographics: {
          byCountry,
          byAgeRange,
          byGender
        },
        views: {
          totalViews,
          uniqueViewers,
          viewsLast24h,
          viewsLast7d,
          firstViewAt: firstViewTimestamp !== null ? new Date(firstViewTimestamp).toISOString() : null,
          lastViewAt: lastViewTimestamp !== null ? new Date(lastViewTimestamp).toISOString() : null
        },
        conversion: {
          voterToViewerRate,
          voters: uniqueVoters,
          viewers: uniqueViewers
        }
      };
    },
    enabled: !!currentUser && !!selectedPostId
  });

  const analyticsVotes = (postAnalytics as any)?.votesByOption || [];
  const analyticsReports = (postAnalytics as any)?.reportsByReason || [];
  const uniqueAnalyticsVoters = (postAnalytics as any)?.uniqueVoters || 0;
  const analyticsTimeStats = (postAnalytics as any)?.timeStats || {};
  const analyticsDemographics = (postAnalytics as any)?.demographics || {};
  const analyticsByCountry = (analyticsDemographics as any).byCountry || [];
  const analyticsByAgeRange = (analyticsDemographics as any).byAgeRange || [];
  const analyticsByGender = (analyticsDemographics as any).byGender || [];
  const analyticsVotesLast24h = (analyticsTimeStats as any).votesLast24h || 0;
  const analyticsVotesLast7d = (analyticsTimeStats as any).votesLast7d || 0;
  const analyticsFirstVoteAt = (analyticsTimeStats as any).firstVoteAt || null;
  const analyticsLastVoteAt = (analyticsTimeStats as any).lastVoteAt || null;
  const totalAnalyticsVotes = (analyticsVotes as any[]).reduce(
    (sum, row: any) => sum + (row.count || 0),
    0
  );
  const totalAnalyticsReports = (analyticsReports as any[]).reduce(
    (sum, row: any) => sum + (row.count || 0),
    0
  );

  const analyticsViews = (postAnalytics as any)?.views || {};
  const analyticsTotalViews = (analyticsViews as any).totalViews || 0;
  const analyticsUniqueViewers = (analyticsViews as any).uniqueViewers || 0;
  const analyticsViewsLast24h = (analyticsViews as any).viewsLast24h || 0;
  const analyticsViewsLast7d = (analyticsViews as any).viewsLast7d || 0;

  const analyticsConversion = (postAnalytics as any)?.conversion || {};
  const analyticsVoterToViewerRate =
    typeof (analyticsConversion as any).voterToViewerRate === 'number'
      ? (analyticsConversion as any).voterToViewerRate
      : null;

  const { data: postsCount = 0 } = useQuery({
    queryKey: ['stats', 'posts_count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('posts').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: !!currentUser
  });

  const { data: votesCount = 0 } = useQuery({
    queryKey: ['stats', 'votes_count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('votes').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: !!currentUser
  });

  const { data: commentsCount = 0 } = useQuery({
    queryKey: ['stats', 'comments_count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('comments').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: !!currentUser
  });

  const { data: usersCount = 0 } = useQuery({
    queryKey: ['stats', 'users_count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: !!currentUser
  });

  const { data: pendingReportsCount = 0 } = useQuery({
    queryKey: ['stats', 'pending_reports'],
    queryFn: async () => {
      const { count, error } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
      if (error) throw error;
      return count || 0;
    },
    enabled: !!currentUser
  });

  const { data: topPosts = [] } = useQuery({
    queryKey: ['stats', 'top_posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, total_votes')
        .order('total_votes', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser
  });

  

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, data }: { reportId: any, data: any }) => {
      const { error } = await supabase
        .from('reports')
        .update(data)
        .eq('id', reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['all_posts'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    }
  });

  const hideContentMutation = useMutation({
    mutationFn: async ({ itemType, itemId, isHidden }: { itemType: string, itemId: any, isHidden: boolean }) => {
      const table = itemType === 'Post' ? 'posts' : 'comments';
      const { error } = await supabase
        .from(table)
        .update({ is_hidden: isHidden })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['all_posts'] });
    }
  });

  const deleteContentMutation = useMutation({
    mutationFn: async ({ itemType, itemId }: { itemType: string, itemId: any }) => {
      const table = itemType === 'Post' ? 'posts' : 'comments';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['all_posts'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    }
  });

  const toggleBanMutation = useMutation({
    mutationFn: async ({ userId, isBanned }: { userId: string, isBanned: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: isBanned })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_users'] });
    }
  });

  const handleHideContent = async (report: any, hide: boolean) => {
    try {
      if (confirm(`Are you sure you want to ${hide ? 'hide' : 'unhide'} this ${report.reported_item_type.toLowerCase()}?`)) {
        await hideContentMutation.mutateAsync({
          itemType: report.reported_item_type,
          itemId: report.reported_item_id,
          isHidden: hide
        });
        await updateReportMutation.mutateAsync({
          reportId: report.id,
          data: {
            status: 'Reviewed',
            reviewed_by_admin_email: currentUser.email,
            review_notes: hide ? 'Content hidden' : 'Content unhidden'
          }
        });
        alert('Content hidden and report updated.');
      }
    } catch (error) {
      console.error('Error hiding content:', error);
      alert('Failed to hide content. Please check database permissions.');
    }
  };

  const handleDeleteContent = async (report: any) => {
    try {
      if (confirm('⚠️ PERMANENT DELETE - This action cannot be undone. Are you sure?')) {
        await deleteContentMutation.mutateAsync({
          itemType: report.reported_item_type,
          itemId: report.reported_item_id
        });
        await updateReportMutation.mutateAsync({
          reportId: report.id,
          data: {
            status: 'Resolved',
            reviewed_by_admin_email: currentUser.email,
            review_notes: 'Content permanently deleted'
          }
        });
        alert('Content deleted and report resolved.');
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Failed to delete content. Please check database permissions.');
    }
  };

  const handleDismiss = async (report: any) => {
    try {
      if (confirm('Dismiss this report as invalid?')) {
        await updateReportMutation.mutateAsync({
          reportId: report.id,
          data: {
            status: 'Dismissed',
            reviewed_by_admin_email: currentUser.email
          }
        });
        alert('Report dismissed.');
      }
    } catch (error) {
      console.error('Error dismissing report:', error);
      alert('Failed to dismiss report. Please check database permissions.');
    }
  };

  const handleDeletePostDirectly = async (postId: string) => {
    try {
      if (confirm('⚠️ Are you sure you want to delete this post? This cannot be undone.')) {
        await deleteContentMutation.mutateAsync({
          itemType: 'Post',
          itemId: postId
        });
        alert('Post deleted successfully.');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please check database permissions.');
    }
  };

  const handleToggleBan = async (userId: string, currentStatus: boolean) => {
    try {
      if (confirm(`Are you sure you want to ${currentStatus ? 'UNBAN' : 'BAN'} this user?`)) {
        await toggleBanMutation.mutateAsync({
          userId,
          isBanned: !currentStatus
        });
        alert(`User ${currentStatus ? 'unbanned' : 'banned'} successfully.`);
      }
    } catch (error) {
      console.error('Error toggling ban:', error);
      alert('Failed to update user status. Please check database permissions.');
    }
  };

  if (accessDenied) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F5F5F5]">
        <div className="text-center p-8 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <h1 className="text-3xl font-black mb-4">ACCESS DENIED</h1>
          <p className="font-bold mb-6">You do not have permission to view this page.</p>
          <div className="mb-6 p-4 bg-gray-100 border-2 border-dashed border-gray-400 text-left max-w-md">
            <p className="text-xs font-mono text-gray-500 mb-1">Your User ID:</p>
            <p className="font-mono font-bold select-all mb-4">{currentUser?.id || 'Loading ID...'}</p>
            
            <p className="text-xs font-mono text-gray-500 mb-1">Database Response:</p>
            <pre className="text-xs bg-gray-200 p-2 overflow-auto font-mono">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
            <p className="text-xs text-gray-500 mt-2">
              (If data is null, the SQL Policy is blocking access or the row is missing)
            </p>
          </div>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-[#FF006E] text-white border-4 border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
          >
            GO HOME
          </Link>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoadingScreen mainText="Checking permissions…" />;
  }

  if (isLoading) {
    return <LoadingScreen mainText="Loading admin dashboard…" />;
  }

  return (
    <>
      <div className="min-h-screen bg-[#F5F5F5] p-4">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to={createPageUrl('Feed')}
              className="p-3 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8" />
              <h1 className="text-4xl font-black transform -rotate-1">ADMIN DASHBOARD</h1>
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-6 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3"><BarChart3 className="w-6 h-6" /><div className="font-black text-2xl">{postsCount}</div><div className="font-bold ml-auto">Posts</div></div>
          <div className="p-6 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3"><BarChart3 className="w-6 h-6" /><div className="font-black text-2xl">{votesCount}</div><div className="font-bold ml-auto">Votes</div></div>
          <div className="p-6 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3"><BarChart3 className="w-6 h-6" /><div className="font-black text-2xl">{commentsCount}</div><div className="font-bold ml-auto">Comments</div></div>
          <div className="p-6 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3"><Users className="w-6 h-6" /><div className="font-black text-2xl">{usersCount}</div><div className="font-bold ml-auto">Users</div></div>
        </div>

        <div className="mb-6">
          {pendingReportsCount > 0 ? (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-[#FFF3F3] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div className="font-black text-sm md:text-base">
                  {pendingReportsCount} pending report
                  {pendingReportsCount !== 1 ? "s" : ""} needing review
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('reports');
                  setFilterStatus('Pending');
                }}
                className="px-4 py-2 bg-[#FF006E] text-white border-2 border-black font-black text-xs md:text-sm hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              >
                Go to pending reports
              </button>
            </div>
          ) : (
            <div className="p-4 bg-white border-2 border-dashed border-gray-400 text-sm font-bold text-gray-600">
              No pending reports right now.
            </div>
          )}
        </div>

        {/* View Tabs */}
        <div className="flex gap-4 mb-8 border-b-4 border-black pb-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center gap-2 px-6 py-3 font-black text-lg transition-all whitespace-nowrap ${
              activeTab === 'posts'
                ? 'bg-black text-white translate-y-[4px]'
                : 'bg-transparent text-black hover:bg-gray-200'
            }`}
          >
            <FileText className="w-5 h-5" />
            All Posts Management
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-6 py-3 font-black text-lg transition-all whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-black text-white translate-y-[4px]'
                : 'bg-transparent text-black hover:bg-gray-200'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span>Reports Management</span>
            {pendingReportsCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-black bg-red-600 text-white border-2 border-black rounded-sm">
                {pendingReportsCount} pending
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-3 font-black text-lg transition-all whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-black text-white translate-y-[4px]'
                : 'bg-transparent text-black hover:bg-gray-200'
            }`}
          >
            <Users className="w-5 h-5" />
            Users Management
          </button>
        </div>

        {activeTab === 'reports' ? (
          <>
            <div className="mb-6 p-6 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="font-black text-2xl mb-3">Top Posts</div>
              <div className="space-y-2">
                {topPosts.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 border-2 border-black">
                    <div className="font-bold truncate max-w-[70%]">{p.title || 'Untitled'}</div>
                    <div className="font-black">{p.total_votes || 0}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-3 mb-6 flex-wrap">
              {['All', 'Pending', 'Reviewed', 'Resolved', 'Dismissed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-6 py-3 border-4 border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${
                    filterStatus === status
                      ? 'bg-[#FF006E] text-white'
                      : 'bg-white hover:translate-x-[-2px] hover:translate-y-[-2px]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Reports List */}
            {reports.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <div className="text-2xl font-black text-gray-600">No {filterStatus.toLowerCase()} reports</div>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report: any) => (
                  <div
                    key={report.id}
                    className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 bg-[#FF006E] text-white border-2 border-black font-black text-sm">
                            {report.reported_item_type}
                          </span>
                          <span className="px-3 py-1 bg-[#FFFF00] border-2 border-black font-black text-sm">
                            {report.status}
                          </span>
                        </div>
                        {report.post && (
                          <div className="text-sm font-bold text-gray-600 mb-1">
                            Post: {report.post.title || 'Untitled Post'}
                          </div>
                        )}
                        <div className="text-sm font-bold text-gray-600 mb-1">
                          Reported: {new Date(report.created_at || report.created_date).toLocaleString()}
                        </div>
                        <div className="text-sm font-bold text-gray-600">
                          Reporter ID: {report.reporter_anonymous_id}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-gray-600">
                        Report ID: {report.id.substring(0, 8)}...
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="font-black text-lg mb-2 text-red-600">{report.reason}</div>
                      {report.details && (
                        <div className="p-3 bg-gray-50 border-2 border-gray-300 font-medium">
                          {report.details}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 pt-4 border-t-2 border-gray-200">
                      <Link 
                        to={createPageUrl('Post', report.reported_item_id)} 
                        target="_blank"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 border-2 border-black font-bold hover:bg-blue-200"
                      >
                        <Eye className="w-4 h-4" /> View Content
                      </Link>
                      
                      {report.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleHideContent(report, true)}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-100 border-2 border-black font-bold hover:bg-orange-200"
                          >
                            <EyeOff className="w-4 h-4" /> Hide Content
                          </button>
                          
                          <button
                            onClick={() => handleDeleteContent(report)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-100 border-2 border-black font-bold hover:bg-red-200 text-red-700"
                          >
                            <Trash2 className="w-4 h-4" /> Delete Permanently
                          </button>

                          <button
                            onClick={() => handleDismiss(report)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-100 border-2 border-black font-bold hover:bg-green-200"
                          >
                            <Check className="w-4 h-4" /> Dismiss Report
                          </button>
                        </>
                      )}
                      
                      {report.status === 'Reviewed' && (
                        <button
                          onClick={() => handleHideContent(report, false)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 border-2 border-black font-bold hover:bg-gray-200"
                        >
                          <Eye className="w-4 h-4" /> Unhide Content
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : activeTab === 'posts' ? (
          <div className="space-y-4">
            <h2 className="text-3xl font-black mb-6">Manage All Posts</h2>
            {allPosts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-2xl font-black text-gray-600">No posts found</div>
              </div>
            ) : (
              allPosts.map((post: any) => (
                <div
                  key={post.id}
                  className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 flex justify-between items-center gap-4"
                >
                  <div className="flex-1">
                    <div className="font-black text-xl mb-1">{post.title || 'Untitled Post'}</div>
                    <div className="text-sm font-bold text-gray-500 mb-2">
                      ID: {post.id} • Votes: {post.total_votes} • Comments: {post.comment_count}
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-2">
                      {post.description}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setSelectedPostForAnalytics(post);
                        setSelectedPostId(post.id);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-[#FFFF00] border-2 border-black font-bold hover:bg-yellow-300"
                    >
                      <BarChart3 className="w-4 h-4" /> Analytics
                    </button>
                    <Link
                      to={createPageUrl('Post', post.id)}
                      target="_blank"
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 border-2 border-black font-bold hover:bg-blue-200"
                    >
                      <Eye className="w-4 h-4" /> View
                    </Link>
                    <button
                      onClick={() => handleDeletePostDirectly(post.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 border-2 border-black font-bold hover:bg-red-200 text-red-700"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-3xl font-black mb-6">Manage Users</h2>
            {isLoadingUsers ? (
              <div className="text-center py-12">
                <div className="text-2xl font-black text-gray-600">Loading users…</div>
              </div>
            ) : allUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-2xl font-black text-gray-600">No users found</div>
              </div>
            ) : (
              <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 overflow-x-auto">
                <table className="min-w-full text-left text-xs sm:text-sm font-bold">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="py-2 pr-4">Username</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4 hidden md:table-cell">ID</th>
                      <th className="py-2 pr-4">Joined</th>
                      <th className="py-2 pr-4 hidden sm:table-cell">Gender</th>
                      <th className="py-2 pr-4 hidden sm:table-cell">Country</th>
                      <th className="py-2 pr-4 hidden sm:table-cell">Age range</th>
                      <th className="py-2 pr-4 hidden sm:table-cell">Onboarding</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pl-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((user: any) => (
                      <tr
                        key={user.id}
                        className={`${user.is_banned ? 'bg-red-50' : 'bg-white'} border-b border-gray-200`}
                      >
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm sm:text-base">
                              {user.username || 'Anonymous'}
                            </span>
                            {user.is_banned && (
                              <span className="px-2 py-0.5 bg-red-600 text-white border-2 border-black font-black text-[10px] uppercase">
                                BANNED
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          <div className="max-w-[180px] truncate">
                            {user.email || '—'}
                          </div>
                        </td>
                        <td className="py-2 pr-4 hidden md:table-cell">
                          <div className="max-w-[200px] truncate font-mono text-[10px] sm:text-xs">
                            {user.id}
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString()
                            : 'Unknown'}
                        </td>
                        <td className="py-2 pr-4 hidden sm:table-cell">
                          {user.gender || 'Not set'}
                        </td>
                        <td className="py-2 pr-4 hidden sm:table-cell">
                          {user.country || 'Not set'}
                        </td>
                        <td className="py-2 pr-4 hidden sm:table-cell">
                          {user.age_range || 'Not set'}
                        </td>
                        <td className="py-2 pr-4 hidden sm:table-cell">
                          {user.onboarding_complete ? 'Complete' : 'Incomplete'}
                        </td>
                        <td className="py-2 pr-4">
                          {user.is_banned ? 'Banned' : 'Active'}
                        </td>
                        <td className="py-2 pl-4">
                          <button
                            onClick={() => handleToggleBan(user.id, user.is_banned)}
                            className={`flex items-center justify-center gap-2 px-4 py-2 border-4 border-black font-black text-xs sm:text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all ${
                              user.is_banned
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          >
                            {user.is_banned ? (
                              <>
                                <UserCheck className="w-4 h-4" /> UNBAN
                              </>
                            ) : (
                              <>
                                <UserX className="w-4 h-4" /> BAN
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {selectedPostForAnalytics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="w-full max-w-xl bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-xs font-bold text-gray-500 mb-1">
                  Post ID: {selectedPostForAnalytics.id}
                </div>
                <div className="text-2xl font-black mb-1">
                  {selectedPostForAnalytics.title || 'Untitled Post'}
                </div>
                <div className="text-xs font-bold text-gray-500">
                  Created: {selectedPostForAnalytics.created_at
                    ? new Date(selectedPostForAnalytics.created_at).toLocaleString()
                    : 'Unknown'}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPostForAnalytics(null);
                  setSelectedPostId(null);
                }}
                className="px-3 py-2 bg-black text-white border-2 border-black font-bold text-xs"
              >
                CLOSE
              </button>
            </div>

            {isLoadingPostAnalytics ? (
              <div className="py-8 text-center font-bold">Loading analytics...</div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="text-lg font-black mb-2">Vote distribution</div>
                  <PieChart
                    segments={(analyticsVotes as any[]).map((row: any, index: number) => {
                      const colors = ['#FF006E', '#3B82F6', '#22C55E', '#F97316', '#A855F7'];
                      const color = colors[index % colors.length];
                      return {
                        value: row.count || 0,
                        color
                      };
                    })}
                  />
                  <div className="mt-4 space-y-1">
                    {(analyticsVotes as any[]).length === 0 ? (
                      <div className="text-sm font-bold text-gray-500">No votes yet for this post.</div>
                    ) : (
                      (analyticsVotes as any[]).map((row: any) => {
                        const index = row.option_index ?? 0;
                        const label =
                          (selectedPostForAnalytics.options || [])[index] ||
                          `Option ${String.fromCharCode(65 + index)}`;
                        const count = row.count || 0;
                        const percent =
                          totalAnalyticsVotes > 0
                            ? Math.round((count / totalAnalyticsVotes) * 100)
                            : 0;

                        return (
                          <div key={index} className="flex justify-between text-sm font-bold">
                            <span>
                              {label} (index {index})
                            </span>
                            <span>
                              {count} vote{count !== 1 ? 's' : ''} ({percent}%)
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-lg font-black mb-2">Voter stats</div>
                  <div className="space-y-1 text-sm font-bold">
                    <div>Total unique voters: {uniqueAnalyticsVoters}</div>
                    <div>Total votes counted: {totalAnalyticsVotes}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-lg font-black mb-2">Views and conversion</div>
                  <div className="space-y-1 text-sm font-bold">
                    <div>Total views (signed-in): {analyticsTotalViews}</div>
                    <div>Total unique viewers: {analyticsUniqueViewers}</div>
                    <div>Views in last 24 hours: {analyticsViewsLast24h}</div>
                    <div>Views in last 7 days: {analyticsViewsLast7d}</div>
                    {analyticsVoterToViewerRate !== null && (
                      <div>
                        Voter-to-viewer conversion:{' '}
                        {(analyticsVoterToViewerRate * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-lg font-black mb-2">Voter demographics</div>
                  {uniqueAnalyticsVoters === 0 ? (
                    <div className="py-2 text-sm font-bold text-gray-500">
                      No voter demographics yet.
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs font-bold text-gray-700">
                      <div>
                        <div className="mb-1">By country</div>
                        {(analyticsByCountry as any[]).length === 0 ? (
                          <div className="text-gray-500">No data.</div>
                        ) : (
                          (analyticsByCountry as any[]).map((row: any) => (
                            <div key={row.label} className="flex justify-between">
                              <span>{row.label}</span>
                              <span>{row.count}</span>
                            </div>
                          ))
                        )}
                      </div>
                      <div>
                        <div className="mb-1">By age range</div>
                        {(analyticsByAgeRange as any[]).length === 0 ? (
                          <div className="text-gray-500">No data.</div>
                        ) : (
                          (analyticsByAgeRange as any[]).map((row: any) => (
                            <div key={row.label} className="flex justify-between">
                              <span>{row.label}</span>
                              <span>{row.count}</span>
                            </div>
                          ))
                        )}
                      </div>
                      <div>
                        <div className="mb-1">By gender</div>
                        {(analyticsByGender as any[]).length === 0 ? (
                          <div className="text-gray-500">No data.</div>
                        ) : (
                          (analyticsByGender as any[]).map((row: any) => (
                            <div key={row.label} className="flex justify-between">
                              <span>{row.label}</span>
                              <span>{row.count}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <div className="text-lg font-black mb-2">Voting over time</div>
                  {totalAnalyticsVotes === 0 ? (
                    <div className="py-2 text-sm font-bold text-gray-500">
                      No votes yet for this post.
                    </div>
                  ) : (
                    <div className="space-y-1 text-sm font-bold text-gray-700">
                      <div>Votes in last 24 hours: {analyticsVotesLast24h}</div>
                      <div>Votes in last 7 days: {analyticsVotesLast7d}</div>
                      {analyticsFirstVoteAt && (
                        <div>
                          First vote:{' '}
                          {new Date(analyticsFirstVoteAt as string).toLocaleString()}
                        </div>
                      )}
                      {analyticsLastVoteAt && (
                        <div>
                          Most recent vote:{' '}
                          {new Date(analyticsLastVoteAt as string).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <div className="text-lg font-black mb-2">Reports by reason</div>
                  {totalAnalyticsReports === 0 ? (
                    <div className="py-2 text-sm font-bold text-gray-500">
                      No reports for this post.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {(analyticsReports as any[]).map((row: any) => {
                        const reason = row.reason || 'Other';
                        const count = row.count || 0;
                        const percent =
                          totalAnalyticsReports > 0
                            ? Math.round((count / totalAnalyticsReports) * 100)
                            : 0;

                        return (
                          <div key={reason} className="flex justify-between text-sm font-bold">
                            <span>{reason}</span>
                            <span>
                              {count} report{count !== 1 ? 's' : ''} ({percent}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-4 text-xs font-bold text-gray-500">
                  Total votes: {selectedPostForAnalytics.total_votes || 0} • Comments:{' '}
                  {selectedPostForAnalytics.comment_count || 0}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
