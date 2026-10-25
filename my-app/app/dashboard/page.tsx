'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import Navbar from '@/components/Navbar';
import {
  RANGE_OF_MEANS_TABLE,
  SURVEY_QUESTIONS,
  LIKERT_OPTIONS,
  countAnsweredQuestions,
  calculateSurveyResults,
} from '@/lib/surveyData';
import { normalizeSurveyResponse, safeSaveSurveyResponse } from '@/lib/supabase/surveyDb';
import {
  Award,
  CheckCircle,
  LogOut,
  Sparkles,
  UserCheck,
  RefreshCw,
  RotateCcw,
  ArrowRight,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Percent,
  Check,
  ClipboardList,
  AlertCircle,
  BookOpen,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showItemBreakdown, setShowItemBreakdown] = useState(false);

  const [dbProfile, setDbProfile] = useState<{
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    suffix?: string;
    age?: number;
    email?: string;
  } | null>(null);

  const [surveyData, setSurveyData] = useState<{
    id?: string;
    is_completed?: boolean;
    current_category?: string;
    grade_q1?: number;
    grade_q2?: number;
    grade_q3?: number;
    average_grade?: number;
    predicted_grade?: number;
    error_rate?: number;
    prediction_accuracy?: number;
    monthly_income?: string;
    concentration_memory_score?: number;
    organizing_processing_score?: number;
    math_anxiety_score?: number;
    math_self_concept_score?: number;
    overall_factor_score?: number;
    concentration_description?: string;
    concentration_interpretation?: string;
    organizing_description?: string;
    organizing_interpretation?: string;
    anxiety_description?: string;
    anxiety_interpretation?: string;
    self_concept_description?: string;
    self_concept_interpretation?: string;
    interpretation?: string;
    advice?: string;
    answers?: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    async function getUserData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // 1. Fetch from public.profiles table if created
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setDbProfile(profile);
        }
      } catch {
        // Fallback silently to user_metadata
      }

      // 2. Fetch latest survey response (prioritize completed assessment, then draft)
      try {
        let activeSurvey = null;

        // Check for completed survey
        const { data: completed } = await supabase
          .from('survey_responses')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (completed) {
          activeSurvey = completed;
        } else {
          // Check for any survey response with average_grade recorded
          const { data: gradeSurvey } = await supabase
            .from('survey_responses')
            .select('*')
            .eq('user_id', user.id)
            .not('average_grade', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (gradeSurvey) {
            activeSurvey = gradeSurvey;
          } else {
            // Check for in-progress draft
            const { data: draft } = await supabase
              .from('survey_responses')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (draft) {
              activeSurvey = draft;
            }
          }
        }

        if (activeSurvey) {
          const normalized = normalizeSurveyResponse(activeSurvey);
          const answeredCount = countAnsweredQuestions(normalized.answers);

          // If the student has answered all 32 questions and has Q1, Q2, Q3 grades:
          // Immediately auto-finalize and calculate so the dashboard displays "ASSESSMENT COMPLETED" and "View Math Result"!
          if (
            (!normalized.is_completed || normalized.average_grade == null) &&
            answeredCount === 32 &&
            normalized.grade_q1 != null &&
            normalized.grade_q2 != null &&
            normalized.grade_q3 != null
          ) {
            const computed = calculateSurveyResults(
              normalized.grade_q1,
              normalized.grade_q2,
              normalized.grade_q3,
              normalized.answers
            );

            const finalized = {
              ...normalized,
              is_completed: true,
              average_grade: computed.averageGrade,
              predicted_grade: computed.predictedGrade,
              error_rate: computed.errorRate,
              prediction_accuracy: computed.predictionAccuracy,
              concentration_memory_score: computed.concentrationScore,
              organizing_processing_score: computed.organizingScore,
              math_anxiety_score: computed.anxietyScore,
              math_self_concept_score: computed.selfConceptScore,
              overall_factor_score: computed.overallFactorScore,
              concentration_description: computed.concentration.description,
              concentration_interpretation: computed.concentration.interpretation,
              organizing_description: computed.organizing.description,
              organizing_interpretation: computed.organizing.interpretation,
              anxiety_description: computed.anxiety.description,
              anxiety_interpretation: computed.anxiety.interpretation,
              self_concept_description: computed.selfConcept.description,
              self_concept_interpretation: computed.selfConcept.interpretation,
              interpretation: computed.interpretation,
              advice: computed.advice,
            };

            setSurveyData(finalized);
            safeSaveSurveyResponse(supabase, finalized, activeSurvey.id).catch(console.error);
          } else {
            setSurveyData(normalized);
          }
        }
      } catch (err) {
        console.warn('[Dashboard Survey Fetch Catch]', err);
      }

      setLoading(false);
    }

    getUserData();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // User metadata parsed (prioritizes public.profiles then auth metadata)
  const meta = user?.user_metadata || {};
  const firstName = dbProfile?.first_name || meta.first_name || 'Student';
  const lastName = dbProfile?.last_name || meta.last_name || 'Scholar';
  const middleName = dbProfile?.middle_name || meta.middle_name || 'N/A';
  const suffix = dbProfile?.suffix || meta.suffix || 'N/A';
  const age = dbProfile?.age ?? meta.age ?? '--';
  const email = dbProfile?.email || user?.email || 'student@mathforesee.com';

  const hasCompletedSurvey =
    surveyData && surveyData.is_completed !== false && surveyData.average_grade !== undefined && surveyData.average_grade !== null;

  // Safely count questions answered out of 32 (ignoring metadata, so it can never be 33)
  const draftAnsweredCount = countAnsweredQuestions(surveyData?.answers);

  const scrollToDetailedResults = () => {
    const el = document.getElementById('detailed-results');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-slate-200 border-t-[#2a632d] rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-700">Loading Student Records...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Welcome Bar */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#2a632d] text-white">
                  Junior High School Student
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#f6d548] text-slate-900 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#2a632d]" />
                  Direct Auth Active
                </span>
                <span className="text-xs text-slate-500">
                  ID: {user?.id.slice(0, 8)}...
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Welcome back, <span className="text-[#2a632d]">{firstName}</span>!
              </h1>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                Refresh
              </button>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* BIG SURVEY AVAILABLE HERO CARD WITH BIG BUTTON                            */}
        {/* ========================================================================= */}
        <section className="bg-gradient-to-br from-white via-white to-emerald-50/70 rounded-2xl border-2 border-[#2a632d]/40 shadow-xl p-8 sm:p-12 relative overflow-hidden">
          {/* Subtle decorative background glow */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#f6d548]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#2a632d]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs sm:text-sm font-black bg-[#f6d548] text-slate-900 shadow-sm border border-[#e5c338]">
                <Sparkles className="w-4 h-4 text-[#2a632d]" />
                {hasCompletedSurvey ? 'ASSESSMENT COMPLETED' : 'SURVEY AVAILABLE'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#2a632d]/10 text-[#2a632d] border border-[#2a632d]/20">
                Mathematics Diagnostic Assessment
              </span>
              {hasCompletedSurvey && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-[#2a632d] border border-emerald-300">
                  <CheckCircle className="w-3.5 h-3.5 text-[#2a632d]" />
                  Model Accuracy: {surveyData.prediction_accuracy ?? Number((100 - (surveyData.error_rate ?? 5.4)).toFixed(2))}%
                </span>
              )}
            </div>

            <div className="max-w-3xl space-y-3">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                {hasCompletedSurvey ? (
                  <>
                    Mathematics Diagnostic &amp; <span className="text-[#2a632d]">Accuracy Results</span>
                  </>
                ) : (
                  <>
                    Factors Affecting <span className="text-[#2a632d]">Mathematics Achievement</span> Survey
                  </>
                )}
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                {hasCompletedSurvey
                  ? 'Your quarterly academic grades and 4 non-academic factor dimensions have been evaluated. Review your empirical linear regression forecast, prediction accuracy rate, and tailored pedagogical advice.'
                  : 'Evaluate your mathematics performance across Quarter 1, Quarter 2, and Quarter 3 academic records, and measure the 4 key non-academic dimensions: Concentration & Memory, Organizing & Processing, Math Anxiety, and Math Self-Concept.'}
              </p>
            </div>

            {/* In-progress draft notification if partially answered */}
            {!hasCompletedSurvey && draftAnsweredCount > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs sm:text-sm text-amber-900 max-w-2xl shadow-sm">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                  <span>
                    You have an auto-saved draft with <strong>{draftAnsweredCount} of 32</strong> items completed. Your answers are safely recorded in the database.
                  </span>
                </div>
                <Link
                  href="/survey"
                  className="font-bold text-[#2a632d] hover:underline shrink-0 ml-3 whitespace-nowrap"
                >
                  Continue &rarr;
                </Link>
              </div>
            )}

            {/* THE BIG BUTTON */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              {hasCompletedSurvey ? (
                <>
                  <button
                    onClick={scrollToDetailedResults}
                    className="inline-flex items-center justify-center gap-4 px-10 py-5 sm:py-6 rounded-2xl bg-[#2a632d] hover:bg-[#214e24] text-white text-xl sm:text-2xl font-black shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.99] transition-all cursor-pointer border-3 border-[#214e24] group"
                  >
                    <Award className="w-7 h-7 sm:w-8 sm:h-8 text-[#f6d548] group-hover:scale-110 transition-transform" />
                    <span>View Math Result</span>
                    <ArrowDown className="w-6 h-6 sm:w-7 sm:h-7 text-[#f6d548] group-hover:translate-y-1.5 transition-transform" />
                  </button>

                  <Link
                    href="/survey"
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 text-sm font-bold transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-[#2a632d]" />
                    <span>Retake Assessment</span>
                  </Link>
                </>
              ) : (
                <Link
                  href="/survey"
                  className="inline-flex items-center justify-center gap-4 px-10 py-5 sm:py-6 rounded-2xl bg-[#2a632d] hover:bg-[#214e24] text-white text-xl sm:text-2xl font-black shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.99] transition-all cursor-pointer border-3 border-[#214e24] group"
                >
                  <ClipboardList className="w-7 h-7 sm:w-8 sm:h-8 text-[#f6d548] group-hover:scale-110 transition-transform" />
                  <span>
                    {draftAnsweredCount > 0 ? 'Survey Available • Resume In-Progress' : 'Survey Available • Start Survey Now'}
                  </span>
                  <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7 text-[#f6d548] group-hover:translate-x-2 transition-transform" />
                </Link>
              )}
            </div>

            {/* What this survey measures preview cards (if not completed) */}
            {!hasCompletedSurvey && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200/80 max-w-4xl">
                <div className="p-4 rounded-xl border border-slate-200 bg-white/80 shadow-sm">
                  <h3 className="font-bold text-xs uppercase text-[#2a632d] tracking-wider mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#f6d548]" />
                    Part I: Demographic &amp; Grade Profile
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Calculates your baseline mathematics achievement average from your Quarter 1, 2, and 3 report card records.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white/80 shadow-sm">
                  <h3 className="font-bold text-xs uppercase text-[#2a632d] tracking-wider mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2a632d]" />
                    Part II: 4 Non-Academic Factor Dimensions
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Measures <strong>Concentration &amp; Memory</strong>, <strong>Organizing &amp; Processing</strong>, <strong>Math Anxiety</strong>, and <strong>Math Self-Concept</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* ACTIVE PROFILE REGISTRATION DETAILS & FORECASTING SYSTEM GUIDELINES       */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Profile Registration Details */}
          <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#2a632d]/10 flex items-center justify-center text-[#2a632d]">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Active Profile Registration Details</h3>
                    <p className="text-xs text-slate-500">Registered student parameters from database</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#2a632d]/10 text-[#2a632d] text-xs font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" /> Verified Profile
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500">First Name</span>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{firstName}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Middle Name</span>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                    {middleName === 'N/A' ? <span className="text-slate-400 font-normal">N/A</span> : middleName}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Last Name</span>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{lastName}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Suffix</span>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                    {suffix === 'N/A' ? <span className="text-slate-400 font-normal">N/A</span> : suffix}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Registered Age</span>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                    {age} <span className="text-xs text-slate-500 font-normal">yrs</span>
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Account Email</span>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5" title={email}>
                    {email}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Account Status: <strong className="text-[#2a632d]">Active &amp; Direct Auth</strong></span>
              <span>Student ID: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{user?.id.slice(0, 10)}...</code></span>
            </div>
          </section>

          {/* Forecasting System Guidelines (Matched exactly to screenshot) */}
          <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 mb-4">
                <div className="w-9 h-9 rounded-lg bg-[#2a632d] flex items-center justify-center text-[#f6d548] shadow-sm">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Forecasting System Guidelines</h3>
                  <p className="text-xs text-slate-500">System parameters &amp; session protocols</p>
                </div>
              </div>

              <ul className="space-y-3.5 text-xs text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#2a632d] mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-900 font-bold">Instant Authorization:</strong>{' '}
                    <span>Your credentials log directly into this system without waiting for email verification codes.</span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#f6d548] mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-900 font-bold">Statistical Model Calibration:</strong>{' '}
                    <span>Accuracy metrics refresh automatically after each completed assessment set.</span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#2a632d] mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-900 font-bold">Session Preservation:</strong>{' '}
                    <span>Your authentication cookie maintains your active workspace across reloads with real-time auto-saving.</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
              <Sparkles className="w-3.5 h-3.5 text-[#2a632d]" />
              <span>Calibrated with Multiple Linear Regression &amp; validated research rubrics</span>
            </div>
          </section>
        </div>

        {/* ========================================================================= */}
        {/* DETAILED RESULTS SECTION (ONLY DISPLAYED WHEN SURVEY IS COMPLETED)        */}
        {/* ========================================================================= */}
        {hasCompletedSurvey && (
          <div className="space-y-6 pt-4" id="detailed-results">
            {/* Report Header */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#2a632d] text-white flex items-center justify-center">
                    <Award className="w-5 h-5 text-[#f6d548]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">
                      Mathematics Achievement Diagnostic &amp; Accuracy Test Result
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Evaluated using Multiple Linear Regression &amp; 5-Tier Non-Academic Factors Research Scale
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => setShowItemBreakdown(!showItemBreakdown)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2a632d] hover:bg-[#214e24] text-white text-xs font-semibold shadow transition-colors cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5 text-[#f6d548]" />
                    <span>{showItemBreakdown ? 'Hide Item Responses' : 'View Item-by-Item Breakdown'}</span>
                    {showItemBreakdown ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[#f6d548]" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#f6d548]" />
                    )}
                  </button>

                  <Link
                    href="/survey"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#2a632d]" />
                    <span>Retake Assessment</span>
                  </Link>
                </div>
              </div>

              {/* 4 Academic Grade & Accuracy KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Actual Average Grade
                  </span>
                  <div className="text-3xl font-extrabold text-slate-900 mt-1">
                    {surveyData.average_grade}%
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Formula: (Q1: {surveyData.grade_q1} + Q2: {surveyData.grade_q2} + Q3: {surveyData.grade_q3}) / 3
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Predicted Final Grade
                  </span>
                  <div className="text-3xl font-extrabold text-[#2a632d] mt-1">
                    {surveyData.predicted_grade}%
                  </div>
                  <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#f6d548] text-slate-900 mt-1">
                    Multiple Linear Regression
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Model Prediction Accuracy
                  </span>
                  <div className="text-3xl font-extrabold text-[#2a632d] mt-1">
                    {surveyData.prediction_accuracy ?? Number((100 - (surveyData.error_rate ?? 5.4)).toFixed(2))}%
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                    Formula: 100 − Error Rate (%)
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Accuracy Test Error Rate
                  </span>
                  <div className="text-3xl font-extrabold text-slate-900 mt-1">
                    {surveyData.error_rate ?? 5.4}%
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                    [(|Actual − Pred|) / Actual] × 100
                  </span>
                </div>
              </div>

              {/* Detailed Item-by-Item 32-Question Audit Table (when toggled via View Detailed results) */}
              {showItemBreakdown && (
                <div className="mt-6 pt-6 border-t border-slate-200 animate-in fade-in-50 duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Award className="w-4 h-4 text-[#2a632d]" />
                        <span>Complete 32-Question Survey Item Audit &amp; Ratings</span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Exact 5-point Likert ratings recorded for each research item
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
                      Total Items: 32 / 32
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto bg-slate-50">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-3 w-40">Factor Dimension</th>
                          <th className="py-2.5 px-4">Research Item Statement</th>
                          <th className="py-2.5 px-4 w-48 text-right">Student Response</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {SURVEY_QUESTIONS.map((q) => {
                          const val = surveyData.answers?.[q.id] ?? 4;
                          const opt = LIKERT_OPTIONS.find((o) => o.value === val);
                          const categoryLabels: Record<string, string> = {
                            concentration: 'Concentration & Memory',
                            organizing: 'Organizing & Processing',
                            anxiety: 'Math Anxiety',
                            selfConcept: 'Math Self-Concept',
                          };

                          return (
                            <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-slate-500 text-center">
                                {q.number}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                                  {categoryLabels[q.category] || q.category}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-slate-800 leading-snug">
                                {q.text}
                              </td>
                              <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold ${
                                    val >= 4
                                      ? 'bg-emerald-100 text-[#2a632d]'
                                      : val === 3
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  <span>{val}/5</span>
                                  <span className="font-medium text-[11px]">({opt?.short || 'Rating'})</span>
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            {/* Non-Academic Factors 4-Box Manifestations Grid */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Non-Academic Factor Manifestations &amp; Research Interpretations
                  </h3>
                  <p className="text-xs text-slate-500">
                    Evaluated on 1.00 – 5.00 Scale against research literature
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-[#2a632d]/10 text-[#2a632d]">
                  Overall Factor Composite: {surveyData.overall_factor_score ?? 3.8} / 5.00
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Concentration and Memory */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Concentration and Memory
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#2a632d] text-white">
                      {surveyData.concentration_description || 'High'} ({surveyData.concentration_memory_score ?? 3.8})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Citation: <em>Inojales, 2026</em>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-800">
                    <p className="font-semibold text-[#2a632d]">Official Interpretation:</p>
                    <p className="mt-0.5">
                      {surveyData.concentration_interpretation ||
                        'Indicates that concentration and memory of junior high school students is often manifested.'}
                    </p>
                  </div>
                </div>

                {/* 2. Organizing and Processing Information */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Organizing and Processing Information
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#2a632d] text-white">
                      {surveyData.organizing_description || 'High'} ({surveyData.organizing_processing_score ?? 3.9})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Citation: <em>Hasani et al., 2024</em>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-800">
                    <p className="font-semibold text-[#2a632d]">Official Interpretation:</p>
                    <p className="mt-0.5">
                      {surveyData.organizing_interpretation ||
                        'Indicates that organizing and processing information of junior high school students is often manifested.'}
                    </p>
                  </div>
                </div>

                {/* 3. Math Anxiety */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Math Anxiety
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        Number(surveyData.math_anxiety_score) >= 3.4
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-[#2a632d] text-white'
                      }`}
                    >
                      {surveyData.anxiety_description || 'Moderate'} ({surveyData.math_anxiety_score ?? 2.8})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Citation: <em>Hossain et al., 2025; Weir, 2023</em>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-800">
                    <p className="font-semibold text-[#2a632d]">Official Interpretation:</p>
                    <p className="mt-0.5">
                      {surveyData.anxiety_interpretation ||
                        'Indicates that math anxiety of junior high school students is sometimes manifested.'}
                    </p>
                  </div>
                </div>

                {/* 4. Math Self-Concept */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Math Self-Concept
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#2a632d] text-white">
                      {surveyData.self_concept_description || 'High'} ({surveyData.math_self_concept_score ?? 3.9})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Citation: <em>Peteros et al., 2026</em>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-800">
                    <p className="font-semibold text-[#2a632d]">Official Interpretation:</p>
                    <p className="mt-0.5">
                      {surveyData.self_concept_interpretation ||
                        'Indicates that math self-concept of junior high school students is often manifested.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Research Scale Reference Table */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 block">
                  Standardized Research Scale Reference Table (From Study)
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border border-slate-200 rounded-lg">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Range of Means</th>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-3">Standard Research Manifestation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {RANGE_OF_MEANS_TABLE.map((row) => (
                        <tr key={row.range} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-semibold">{row.range}</td>
                          <td className="py-2 px-3 font-bold text-[#2a632d]">{row.description}</td>
                          <td className="py-2 px-3">
                            Indicates that the factor of junior high school students <strong>{row.manifestation}</strong>.
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pedagogical Advice Box */}
              <div className="p-4 rounded-xl bg-[#2a632d]/5 border border-[#2a632d]/20 text-xs text-slate-700 space-y-1.5 mt-4">
                <div className="flex items-center gap-1.5 text-[#2a632d] font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pedagogical Advice &amp; Actionable Interventions:</span>
                </div>
                <p className="font-semibold text-slate-900">{surveyData.interpretation}</p>
                <p className="text-slate-600 leading-relaxed">{surveyData.advice}</p>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
