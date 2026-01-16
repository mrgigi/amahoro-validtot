import React, { useState, useEffect } from 'react';
import { supabase, checkAdminRole } from '../src/supabaseClient';
import { ArrowLeft, Trash2, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function SuperAdminDashboard() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAdminId, setNewAdminId] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'super_admin'>('admin');
  const [currentUserRole, setCurrentUserRole] = useState<'super_admin' | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const role = await checkAdminRole(user.id);
      if (role !== 'super_admin') {
        alert('Access denied: Super Admin only.');
        navigate('/admin'); 
        return;
      }
      setCurrentUserRole(role);
      fetchAdmins();
    };
    init();
  }, [navigate]);

  const fetchAdmins = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admins')
      .select(`
        *,
        profiles:user_id (username)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching admins:', error);
    } else {
      setAdmins(data || []);
    }
    setLoading(false);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminId) return;

    try {
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', newAdminId).single();
        if (!profile) {
            alert('User ID not found in profiles.');
            return;
        }

        const { error } = await supabase.from('admins').insert({
            user_id: newAdminId,
            role: newAdminRole
        });

        if (error) throw error;
        
        setNewAdminId('');
        fetchAdmins();
        alert('Admin added successfully.');
    } catch (error: any) {
        alert('Error adding admin: ' + error.message);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this admin?')) return;
    
    const { error } = await supabase.from('admins').delete().eq('user_id', userId);
    
    if (error) {
        alert('Error removing admin: ' + error.message);
    } else {
        fetchAdmins();
    }
  };

  if (!currentUserRole) return <div className="h-screen flex items-center justify-center font-black text-xl">Verifying Super Admin Access...</div>;

  return (
    <div className="min-h-screen bg-[#F5F5F5] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
            <Link to="/" className="p-3 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-4xl font-black">SUPER ADMIN DASHBOARD</h1>
        </div>

        <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 mb-8">
            <h2 className="text-2xl font-black mb-4 flex items-center gap-2">
                <UserPlus className="w-6 h-6" /> Add New Admin
            </h2>
            <form onSubmit={handleAddAdmin} className="flex gap-4 flex-wrap">
                <input 
                    type="text" 
                    placeholder="User ID (UUID)" 
                    value={newAdminId}
                    onChange={(e) => setNewAdminId(e.target.value)}
                    className="flex-1 p-3 border-4 border-black font-bold min-w-[200px]"
                />
                <select 
                    value={newAdminRole}
                    onChange={(e: any) => setNewAdminRole(e.target.value)}
                    className="p-3 border-4 border-black font-bold bg-white"
                >
                    <option value="admin">Normal Admin</option>
                    <option value="super_admin">Super Admin</option>
                </select>
                <button type="submit" className="bg-black text-white px-6 py-3 font-black hover:bg-gray-800 transition-colors">
                    ADD ADMIN
                </button>
            </form>
        </div>

        <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
            <h2 className="text-2xl font-black mb-4">Current Admins</h2>
            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="space-y-3">
                    {admins.map((admin) => (
                        <div key={admin.user_id} className="flex items-center justify-between p-4 border-2 border-black bg-gray-50">
                            <div>
                                <div className="font-black text-lg">{admin.profiles?.username || 'Unknown User'}</div>
                                <div className="font-mono text-sm text-gray-500">{admin.user_id}</div>
                                <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-black uppercase border border-black ${admin.role === 'super_admin' ? 'bg-purple-200' : 'bg-blue-200'}`}>
                                    {admin.role.replace('_', ' ')}
                                </span>
                            </div>
                            <button 
                                onClick={() => handleRemoveAdmin(admin.user_id)} 
                                className="p-2 bg-red-100 border-2 border-black hover:bg-red-200 text-red-600"
                                title="Remove Admin Access"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                    {admins.length === 0 && <div className="text-gray-500 italic">No admins found.</div>}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}