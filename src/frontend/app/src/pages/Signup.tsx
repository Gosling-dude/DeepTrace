import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import AuthShell from '../components/AuthShell';

const signupSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupForm = z.infer<typeof signupSchema>;

export default function Signup() {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupForm) => {
    try {
      await registerUser(data.email, data.password, data.full_name);
      toast.success('Account created! Welcome to DeepTrace.');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.detail || 'Registration failed. Please try again.');
    }
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Run your first analysis in a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="link">Sign in</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <label htmlFor="full_name" className="field-label">Full name</label>
          <input
            id="full_name"
            type="text"
            {...register('full_name')}
            className="input-field"
            autoComplete="name"
            aria-invalid={!!errors.full_name}
          />
          {errors.full_name && <p className="mt-1.5 text-sm text-signal-400">{errors.full_name.message}</p>}
        </div>

        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="input-field"
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="mt-1.5 text-sm text-signal-400">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="field-label">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              className="input-field pr-11"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              aria-describedby="password-hint"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-bone-mute hover:text-bone transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password
            ? <p className="mt-1.5 text-sm text-signal-400">{errors.password.message}</p>
            : <p id="password-hint" className="mt-1.5 text-sm text-bone-mute">At least 8 characters.</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="field-label">Confirm password</label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            {...register('confirmPassword')}
            className="input-field"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
          />
          {errors.confirmPassword && <p className="mt-1.5 text-sm text-signal-400">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary w-full">
          {isLoading ? <><Loader2 size={16} className="animate-spin" /> Creating account…</> : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
