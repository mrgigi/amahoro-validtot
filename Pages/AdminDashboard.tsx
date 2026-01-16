import React, { useState, useEffect } from 'react';
import { supabase, checkAdminRole } from '../src/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, ArrowLeft, Eye, EyeOff, Trash2, Check, AlertTriangle, BarChart3, FileText, Users, UserX, UserCheck } from 'lucide-react';
import { createPageUrl } from '../src/lib/utils';
import { Link, useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('Pending');
  const [activeTab, setActiveTab] = useState<'reports' | 'posts' | 'users'>('reports');
  const [accessDenied, setAccessDenied] = useState(false);
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
      
      const role = data.role as "super_admin" | "admin";
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
      return data || [];
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
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser && activeTab === 'users'
  });

  // Analytics queries
  

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
      const { data, error } = await supabase.from('posts').select('*').order('total_votes', { ascending: false }).limit(5);
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
    return (
      <div className="h-screen flex items-center justify-center bg-[#F5F5F5]">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <div className="text-2xl font-black">Checking permissions...</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F5F5F5]">
        <div className="text-center">
          <div className="text-2xl font-black">Loading reports...</div>
        </div>
      </div>
    );
  }

  return (
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
          {currentUser?.role === 'super_admin' && (
            <Link
              to="/super-admin"
              className="px-4 py-2 bg-purple-600 text-white border-4 border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-sm"
            >
              SUPER ADMIN PANEL
            </Link>
          )}
        </div>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-6 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3"><BarChart3 className="w-6 h-6" /><div className="font-black text-2xl">{postsCount}</div><div className="font-bold ml-auto">Posts</div></div>
          <div className="p-6 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3"><BarChart3 className="w-6 h-6" /><div className="font-black text-2xl">{votesCount}</div><div className="font-bold ml-auto">Votes</div></div>
          <div className="p-6 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3"><BarChart3 className="w-6 h-6" /><div className="font-black text-2xl">{commentsCount}</div><div className="font-bold ml-auto">Comments</div></div>
          <div className="p-6 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3"><Users className="w-6 h-6" /><div className="font-black text-2xl">{usersCount}</div><div className="font-bold ml-auto">Users</div></div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-4 mb-8 border-b-4 border-black pb-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-6 py-3 font-black text-lg transition-all whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-black text-white translate-y-[4px]'
                : 'bg-transparent text-black hover:bg-gray-200'
            }`}
          >
            <Shield className="w-5 h-5" />
            Reports Management
          </button>
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
                        <div className="text-sm font-bold text-gray-600 mb-1">
                          Reported: {new Date(report.created_date).toLocaleString()}
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
            {allUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-2xl font-black text-gray-600">No users found</div>
              </div>
            ) : (
              allUsers.map((user: any) => (
                <div
                  key={user.id}
                  className={`bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col sm:flex-row justify-between items-center gap-4 ${user.is_banned ? 'bg-red-50' : ''}`}
                >
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-black text-xl">{user.username || 'Anonymous'}</div>
                      {user.is_banned && (
                        <span className="px-3 py-1 bg-red-600 text-white border-2 border-black font-black text-xs uppercase">
                          BANNED
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-gray-500">
                      ID: {user.id}
                    </div>
                    <div className="text-sm font-medium text-gray-400">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleToggleBan(user.id, user.is_banned)}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 border-4 border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all ${
                        user.is_banned 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {user.is_banned ? (
                        <>
                          <UserCheck className="w-5 h-5" /> UNBAN USER
                        </>
                      ) : (
                        <>
                          <UserX className="w-5 h-5" /> BAN USER
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}