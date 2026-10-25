'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/Navbar';
import {
  UserCheck,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  // Form state
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [suffix, setSuffix] = useState('N/A');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!lastName.trim() || !firstName.trim()) {
      setErrorMessage('Please provide both your First Name and Last Name.');
      return;
    }

    const parsedAge = parseInt(age, 10);
    if (!age || isNaN(parsedAge) || parsedAge < 5 || parsedAge > 125) {
      setErrorMessage('Please enter a valid age between 5 and 125.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);

    try {
      const sanitizedMiddle = middleName.trim() === '' ? 'N/A' : middleName.trim();
      const sanitizedSuffix = suffix.trim() === '' ? 'N/A' : suffix.trim();
      const middleDisplay =
        sanitizedMiddle.toUpperCase() !== 'N/A' ? `${sanitizedMiddle} ` : '';
      const suffixDisplay =
        sanitizedSuffix.toUpperCase() !== 'N/A' ? ` ${sanitizedSuffix}` : '';
      const fullName = `${firstName.trim()} ${middleDisplay}${lastName.trim()}${suffixDisplay}`.trim();

      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            middle_name: sanitizedMiddle,
            suffix: sanitizedSuffix,
            age: parsedAge,
            full_name: fullName,
          },
        },
      });

      if (error) {
        throw error;
      }

      // Supabase email confirmation is disabled as requested by the user
      // If a session exists, we can route directly.
      if (data.session) {
        setSuccessMessage('Registration successful! Redirecting to your dashboard...');
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 800);
        return;
      }

      // If no session is automatically returned, immediately sign in to create the active session
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        // If signIn returned an error, notify user or fallback
        setErrorMessage(
          signInError.message || 'Account created, but automatic sign in failed. Please sign in.'
        );
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      } else if (signInData.session) {
        setSuccessMessage('Account created and verified! Redirecting to your dashboard...');
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 800);
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMessage(
        error.message || 'An unexpected error occurred during registration. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-slate-200 p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f6d548]/20 border border-[#f6d548]/60 text-slate-800 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#2a632d]" />
              <span>Instant Verification Active (No Email Confirmation Required)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Create Your <span className="text-[#2a632d]">MathForesee</span> Account
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
              Register your mathematical profile to access predictive modeling, curriculum forecasting, and analytics.
            </p>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Registration Issue</p>
                <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 rounded-lg bg-[#2a632d]/10 border border-[#2a632d]/30 flex items-start gap-3 text-[#2a632d] text-sm">
              <CheckCircle2 className="w-5 h-5 text-[#2a632d] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{successMessage}</p>
                <p className="text-xs text-slate-600 mt-0.5">Setting up your predictive dashboard...</p>
              </div>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Row 1: First Name & Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Alexander"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2a632d] focus:border-[#2a632d] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Gauss"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2a632d] focus:border-[#2a632d] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Middle Name & Suffix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Middle Name
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium italic">
                    (not applicable if none)
                  </span>
                </div>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="e.g. Friedrich or N/A"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2a632d] focus:border-[#2a632d] transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Suffix
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium italic">
                    (not applicable if none)
                  </span>
                </div>
                <select
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2a632d] focus:border-[#2a632d] transition-all"
                >
                  <option value="N/A">N/A (Not Applicable)</option>
                  <option value="Jr.">Jr. (Junior)</option>
                  <option value="Sr.">Sr. (Senior)</option>
                  <option value="II">II (Second)</option>
                  <option value="III">III (Third)</option>
                  <option value="IV">IV (Fourth)</option>
                  <option value="Ph.D.">Ph.D.</option>
                  <option value="M.Sc.">M.Sc.</option>
                </select>
              </div>
            </div>

            {/* Row 3: Age & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Age <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    required
                    min="5"
                    max="125"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="24"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2a632d] focus:border-[#2a632d] transition-all"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analyst@mathforesee.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2a632d] focus:border-[#2a632d] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2a632d] focus:border-[#2a632d] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2a632d] focus:border-[#2a632d] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Match Indicator */}
            {confirmPassword && (
              <div className="text-xs">
                {password === confirmPassword ? (
                  <p className="text-emerald-700 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                  </p>
                ) : (
                  <p className="text-amber-700 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match yet
                  </p>
                )}
              </div>
            )}

            {/* Information note */}
            <div className="bg-[#2a632d]/5 border-l-4 border-[#2a632d] p-3 rounded-r-md text-xs text-slate-700">
              <span className="font-semibold text-[#2a632d]">Direct Account Activation:</span>{' '}
              Email confirmation has been deactivated for this system. Once submitted, your profile will be immediately authenticated and will take you straight to your dashboard.
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#2a632d] hover:bg-[#214e24] text-white font-semibold text-sm shadow transition-all duration-150 disabled:opacity-60 cursor-pointer border border-[#214e24] group"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-[#f6d548] rounded-full animate-spin" />
                  <span>Activating Account...</span>
                </div>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-[#f6d548]" />
                  <span>Register & Open Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform text-[#f6d548]" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-semibold text-[#2a632d] hover:text-[#214e24] hover:underline"
              >
                Sign In here
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
