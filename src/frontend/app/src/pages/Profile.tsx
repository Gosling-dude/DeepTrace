import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/client';
import { User, Mail, Shield, Trash2, Loader2, Save } from 'lucide-react';

export default function Profile() {
  const { user, refreshProfile, logout } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
    },
  });

  const onSave = async (data: { full_name: string; email: string }) => {
    setIsSaving(true);
    try {
      await authApi.updateProfile(data);
      await refreshProfile();
      toast.success('Profile updated');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.detail || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await authApi.deleteAccount();
      toast.success('Account deleted');
      logout();
    } catch {
      toast.error('Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Profile & Settings</h1>
          <p className="text-gray-400">Manage your account information</p>
        </motion.div>

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-8 mb-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{user?.full_name}</h2>
              <p className="text-sm text-gray-400">{user?.email}</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1
                ${user?.role === 'admin' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}
              >
                <Shield size={10} />
                {user?.role === 'admin' ? 'Admin' : 'Member'}
              </span>
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                <input {...register('full_name')} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                <input {...register('email')} type="email" className="input-field" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={isSaving} className="btn-primary flex items-center gap-2 text-sm">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Changes
                </button>
                <button type="button" onClick={() => { setIsEditing(false); reset(); }} className="btn-secondary text-sm">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 py-3 border-b border-white/5">
                <User size={16} className="text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">Full Name</div>
                  <div className="text-sm text-white">{user?.full_name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 py-3 border-b border-white/5">
                <Mail size={16} className="text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">Email</div>
                  <div className="text-sm text-white">{user?.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 py-3">
                <Shield size={16} className="text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">Member Since</div>
                  <div className="text-sm text-white">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsEditing(true)} className="btn-secondary text-sm">
                Edit Profile
              </button>
            </div>
          )}
        </motion.div>

        {/* Danger Zone */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-8 border border-rose-500/20">
          <h3 className="text-lg font-semibold text-rose-400 mb-2">Danger Zone</h3>
          <p className="text-sm text-gray-400 mb-4">
            Deleting your account will permanently remove all your data, including prediction history and uploads.
          </p>
          <button onClick={handleDelete} disabled={isDeleting} className="btn-danger flex items-center gap-2 text-sm">
            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Delete Account
          </button>
        </motion.div>
      </div>
    </div>
  );
}
