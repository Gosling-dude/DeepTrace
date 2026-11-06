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
    <div className="min-h-dvh pt-24 pb-20 px-5 sm:px-8">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
          <h1 className="page-title mb-2">Profile and settings</h1>
          <p className="text-gray-400">Your account details.</p>
        </motion.div>

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="panel p-8 mb-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded bg-bone text-ink-950 flex items-center justify-center text-xl font-semibold">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="heading text-xl text-bone">{user?.full_name}</h2>
              <p className="text-sm text-gray-400">{user?.email}</p>
              <span className="tag mt-2">
                {user?.role === 'admin' ? 'Admin' : 'Member'}
              </span>
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <div>
                <label className="field-label">Full name</label>
                <input {...register('full_name')} className="input-field" />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input {...register('email')} type="email" className="input-field" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={isSaving} className="btn-primary flex items-center gap-2 text-sm">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save changes
                </button>
                <button type="button" onClick={() => { setIsEditing(false); reset(); }} className="btn-secondary text-sm">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 py-3 border-b border-line">
                <User size={16} className="text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">Full name</div>
                  <div className="text-sm text-bone">{user?.full_name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 py-3 border-b border-line">
                <Mail size={16} className="text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">Email</div>
                  <div className="text-sm text-bone">{user?.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 py-3">
                <Shield size={16} className="text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">Member since</div>
                  <div className="text-sm text-bone">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsEditing(true)} className="btn-secondary text-sm">
                Edit profile
              </button>
            </div>
          )}
        </motion.div>

        {/* Danger Zone */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="panel p-8">
          <h3 className="heading text-lg text-bone mb-2">Delete account</h3>
          <p className="text-sm text-gray-400 mb-4">
            This permanently removes your account and all of its data, including analysis history and uploads. It cannot be undone.
          </p>
          <button onClick={handleDelete} disabled={isDeleting} className="btn-danger flex items-center gap-2 text-sm">
            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Delete account
          </button>
        </motion.div>
      </div>
    </div>
  );
}
