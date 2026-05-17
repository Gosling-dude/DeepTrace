import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authApi } from '../api/client';
import { Shield, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await authApi.requestPasswordReset(data.email);
      setSubmitted(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12 grid-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
              <Shield size={22} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white">DeepTrace</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Reset your password</h1>
          <p className="text-gray-400 text-sm">We'll send you instructions to reset it</p>
        </div>

        <div className="glass-card p-8">
          {submitted ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Check your email</h3>
              <p className="text-sm text-gray-400 mb-6">
                If an account exists with that email, we've sent password reset instructions.
              </p>
              <Link to="/login" className="btn-secondary inline-flex items-center gap-2">
                <ArrowLeft size={16} /> Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email address</label>
                <input
                  type="email"
                  {...register('email')}
                  className="input-field"
                  placeholder="you@example.com"
                />
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2">
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                Send Reset Link
              </button>

              <div className="text-center">
                <Link to="/login" className="text-sm text-gray-400 hover:text-white flex items-center justify-center gap-1">
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
