import React, { useState, useEffect } from 'react';
import { supabase } from '../src/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, ArrowLeft, Eye, EyeOff, Trash2, Check, AlertTriangle, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../src/lib/utils';

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('Pending');
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      // Temporary: Allow anyone for now since auth isn't fully set up
      // In production, you'd check supabase.auth.getUser() and verify admin role
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user || { email: 'admin@example.com', role: 'admin' });
    };
    checkAuth();
  }, []);

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
    enabled: !!currentUser
  });

  const { data: ghostProtocolSettings = [] } = useQuery({
    queryKey: ['settings', 'ghost_protocol'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('setting_key', 'ghost_protocol_active');
      if (error) return []; // Fail silently for settings
      return data || [];
    },
    enabled: !!currentUser
  });

  const isGhostProtocolActive = ghostProtocolSettings[0]?.setting_value === true;

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
    }
  });

  const handleHideContent = async (report: any, hide: boolean) => {
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
    }
  };

  const handleDeleteContent = async (report: any) => {
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
    }
  };

  const handleDismiss = async (report: any) => {
    if (confirm('Dismiss this report as invalid?')) {
      await updateReportMutation.mutateAsync({
        reportId: report.id,
        data: {
          status: 'Dismissed',
          reviewed_by_admin_email: currentUser.email
        }
      });
    }
  };

  const toggleGhostProtocolMutation = useMutation({
    mutationFn: async (newValue: boolean) => {
      const existing = ghostProtocolSettings[0];
      if (existing) {
        await supabase.from('settings').update({ setting_value: newValue }).eq('id', existing.id);
      } else {
        await supabase.from('settings').insert({
          setting_key: 'ghost_protocol_active',
          setting_value: newValue
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'ghost_protocol'] });
    }
  });

  const handleToggleGhostProtocol = async () => {
    const newValue = !isGhostProtocolActive;
    const action = newValue ? 'activate' : 'deactivate';
    if (confirm(`Are you sure you want to ${action} Ghost Protocol?\n\n${newValue ? '🤖 AI will generate 5-10 comments and 50-1000 votes for each new post.' : '⚠️ AI generation will stop for new posts.'}`)) {
      await toggleGhostProtocolMutation.mutateAsync(newValue);
    }
  };

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
        </div>

        {/* Ghost Protocol Toggle */}
        <div className="mb-6 p-6 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Zap className={`w-6 h-6 ${isGhostProtocolActive ? 'text-yellow-500' : 'text-gray-400'}`} />
                <h2 className="text-2xl font-black">GHOST PROTOCOL</h2>
                <span className={`px-3 py-1 border-2 border-black font-black text-sm ${
                  isGhostProtocolActive ? 'bg-[#00FF00]' : 'bg-gray-300'
                }`}>
                  {isGhostProtocolActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <p className="font-medium text-gray-600">
                AI generates 5-10 comments and 50-1000 votes for each new post
              </p>
            </div>
            <button
              onClick={handleToggleGhostProtocol}
              disabled={toggleGhostProtocolMutation.isPending}
              className={`px-6 py-3 border-4 border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all ${
                isGhostProtocolActive ? 'bg-red-500 text-white' : 'bg-[#00FF00]'
              }`}
            >
              {isGhostProtocolActive ? 'DEACTIVATE' : 'ACTIVATE'}
            </button>
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

                {report.reviewed_by_admin_email && (
                  <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-300">
                    <div className="font-bold text-sm">Reviewed by: {report.reviewed_by_admin_email}</div>
                    {report.review_notes && (
                      <div className="text-sm mt-1">{report.review_notes}</div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                {report.status === 'Pending' && (
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => handleHideContent(report, true)}
                      className="px-4 py-3 bg-[#FF006E] text-white border-4 border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex items-center gap-2"
                    >
                      <EyeOff className="w-5 h-5" />
                      HIDE CONTENT
                    </button>
                    <button
                      onClick={() => handleDeleteContent(report)}
                      className="px-4 py-3 bg-red-600 text-white border-4 border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex items-center gap-2"
                    >
                      <Trash2 className="w-5 h-5" />
                      DELETE PERMANENTLY
                    </button>
                    <button
                      onClick={() => handleDismiss(report)}
                      className="px-4 py-3 bg-white border-4 border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex items-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      DISMISS
                    </button>
                  </div>
                )}

                {report.status === 'Reviewed' && (
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => handleHideContent(report, false)}
                      className="px-4 py-3 bg-[#00FF00] border-4 border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex items-center gap-2"
                    >
                      <Eye className="w-5 h-5" />
                      UNHIDE CONTENT
                    </button>
                    <button
                      onClick={() => handleDeleteContent(report)}
                      className="px-4 py-3 bg-red-600 text-white border-4 border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex items-center gap-2"
                    >
                      <Trash2 className="w-5 h-5" />
                      DELETE PERMANENTLY
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}