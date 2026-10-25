'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import {
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  Award,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [hasSurveyResult, setHasSurveyResult] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    async function checkUserAndSurvey() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        try {
          const { data: survey } = await supabase
            .from('survey_responses')
            .select('id, average_grade')
            .eq('user_id', user.id)
            .not('average_grade', 'is', null)
            .limit(1)
            .maybeSingle();

          if (survey && survey.average_grade !== null && survey.average_grade !== undefined) {
            setHasSurveyResult(true);
          } else {
            setHasSurveyResult(false);
          }
        } catch {
          setHasSurveyResult(false);
        }
      } else {
        setHasSurveyResult(false);
      }
      setLoading(false);
    }

    checkUserAndSurvey();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        try {
          const { data: survey } = await supabase
            .from('survey_responses')
            .select('id, average_grade')
            .eq('user_id', currentUser.id)
            .not('average_grade', 'is', null)
            .limit(1)
            .maybeSingle();

          if (survey && survey.average_grade !== null && survey.average_grade !== undefined) {
            setHasSurveyResult(true);
          } else {
            setHasSurveyResult(false);
          }
        } catch {
          setHasSurveyResult(false);
        }
      } else {
        setHasSurveyResult(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setHasSurveyResult(false);
    setMobileMenuOpen(false);
    router.push('/login');
    router.refresh();
  };

  const fullName =
    user?.user_metadata?.full_name ||
    [user?.user_metadata?.first_name, user?.user_metadata?.last_name]
      .filter(Boolean)
      .join(' ') ||
    user?.email?.split('@')[0] ||
    'Student';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#2a632d] flex items-center justify-center shadow-sm border border-[#214e24] group-hover:scale-[1.02] transition-transform">
              <span className="text-white font-bold text-xl tracking-tight">∑</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  Math<span className="text-[#2a632d]">Foresee</span>
                </span>
                <span className="inline-block w-2 h-2 rounded-full bg-[#f6d548]" title="System Active" />
              </div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                Mathematical Analytics & Forecasting
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-slate-700 hover:text-[#2a632d] flex items-center gap-1.5 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-500" />
              <span>Dashboard</span>
            </Link>

            {hasSurveyResult && (
              <Link
                href="/dashboard#detailed-results"
                className="text-sm font-semibold text-[#2a632d] hover:text-[#214e24] flex items-center gap-1.5 transition-colors"
              >
                <Award className="w-4 h-4 text-[#2a632d]" />
                <span>Math Result</span>
              </Link>
            )}
          </nav>

          {/* Desktop Auth Actions */}
          <div className="hidden md:flex items-center gap-3">
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-3">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#2a632d]/10 text-[#2a632d] border border-[#2a632d]/20 text-xs font-semibold hover:bg-[#2a632d]/15 transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-[#2a632d]" />
                      <span className="max-w-[130px] truncate">{fullName}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#f6d548] text-slate-900 font-bold">
                        Online
                      </span>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 hover:text-red-700 hover:border-red-200 transition-colors cursor-pointer"
                      title="Sign Out"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <Link
                      href="/login"
                      className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-[#2a632d] transition-colors"
                    >
                      Log In
                    </Link>
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2a632d] hover:bg-[#214e24] text-white text-sm font-semibold shadow-sm transition-all hover:shadow cursor-pointer"
                    >
                      <span>Register</span>
                      <ChevronRight className="w-4 h-4 text-[#f6d548]" />
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 hover:text-[#2a632d] hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu Sheet */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white/98 shadow-lg transition-all animate-in slide-in-from-top-2 duration-200">
          <div className="px-4 pt-3 pb-6 space-y-4">
            {/* Nav links */}
            <div className="space-y-1">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 hover:bg-[#2a632d]/10 hover:text-[#2a632d] transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-slate-500" />
                <span>Dashboard</span>
              </Link>

              {hasSurveyResult && (
                <Link
                  href="/dashboard#detailed-results"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#2a632d] hover:bg-[#2a632d]/10 transition-colors"
                >
                  <Award className="w-4 h-4 text-[#2a632d]" />
                  <span>Math Result</span>
                </Link>
              )}
            </div>

            {/* User profile & Auth Controls */}
            <div className="pt-3 border-t border-slate-200">
              {!loading && (
                <>
                  {user ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#2a632d]/10 flex items-center justify-center text-[#2a632d]">
                            <UserIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                              {fullName}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f6d548] text-slate-900">
                          Online
                        </span>
                      </div>

                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Link
                        href="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full flex items-center justify-center py-2.5 px-3 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                      >
                        <span>Log In</span>
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#2a632d] hover:bg-[#214e24] text-white text-xs font-semibold shadow transition-colors"
                      >
                        <span>Register</span>
                        <ChevronRight className="w-4 h-4 text-[#f6d548]" />
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
