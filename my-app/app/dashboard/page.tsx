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
  ClipboardList,
  AlertCircle,
  History,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface NormalizedSurveyData {
  id?: string;
  created_at?: string;
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
}

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

  // Active survey displayed in detailed view
  const [surveyData, setSurveyData] = useState<NormalizedSurveyData | null>(null);

  // Assessment History list (all completed takes)
  const [assessmentHistory, setAssessmentHistory] = useState<NormalizedSurveyData[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

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

      // 2. Fetch ALL completed survey responses (History) and any active in-progress draft
      try {
        // Fetch all completed surveys (or surveys with calculated grades)
        const { data: allCompleted } = await supabase
          .from('survey_responses')
          .select('*')
          .eq('user_id', user.id)
          .or('is_completed.eq.true,predicted_grade.not.is.null,average_grade.not.is.null')
          .order('created_at', { ascending: false });

        // Fetch any in-progress draft (is_completed = false)
        const { data: activeDraft } = await supabase
          .from('survey_responses')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_completed', false)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const normalizedHistory: NormalizedSurveyData[] = (allCompleted || []).map((row) =>
          normalizeSurveyResponse(row)
        );

        setAssessmentHistory(normalizedHistory);

        // Determine active survey to display
        if (normalizedHistory.length > 0) {
          const latest = normalizedHistory[0];
          setSelectedHistoryId(latest.id || null);
          setSurveyData(latest);
        } else if (activeDraft) {
          const normalizedDraft = normalizeSurveyResponse(activeDraft);
          const answeredCount = countAnsweredQuestions(normalizedDraft.answers);

          // If student answered all 32 questions in draft, auto-finalize it
          if (answeredCount === 32) {
            const computed = calculateSurveyResults(
              normalizedDraft.grade_q1,
              normalizedDraft.grade_q2,
              normalizedDraft.grade_q3,
              normalizedDraft.answers,
              normalizedDraft.monthly_income
            );

            const finalized: NormalizedSurveyData = {
              ...normalizedDraft,
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
            setAssessmentHistory([finalized]);
            setSelectedHistoryId(activeDraft.id || null);
            safeSaveSurveyResponse(supabase, finalized, activeDraft.id).catch(console.error);
          } else {
            setSurveyData(normalizedDraft);
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

  // Switch active survey view when student selects an attempt from history
  const handleSelectHistoryTake = (takeId: string) => {
    setSelectedHistoryId(takeId);
    const found = assessmentHistory.find((t) => t.id === takeId);
    if (found) {
      setSurveyData(found);
      const el = document.getElementById('detailed-results');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
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
    assessmentHistory.length > 0 ||
    (!!surveyData &&
      (surveyData.is_completed === true ||
        (surveyData.predicted_grade != null && surveyData.predicted_grade > 0)));

  // Safely count questions answered out of 32 (ignoring metadata)
  const draftAnsweredCount = countAnsweredQuestions(surveyData?.answers);

  const scrollToDetailedResults = () => {
    const el = document.getElementById('detailed-results');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Helper to format date & time nicely
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Recent Take';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoString;
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

  // Growth comparison helper between latest take (index 0) and first take (last index)
  const latestTake = assessmentHistory[0];
  const firstTake = assessmentHistory[assessmentHistory.length - 1];
  const hasMultipleTakes = assessmentHistory.length >= 2;

  const predictedDiff =
    hasMultipleTakes && latestTake?.predicted_grade != null && firstTake?.predicted_grade != null
      ? Number((latestTake.predicted_grade - firstTake.predicted_grade).toFixed(2))
      : null;

  const anxietyDiff =
    hasMultipleTakes && latestTake?.math_anxiety_score != null && firstTake?.math_anxiety_score != null
      ? Number((latestTake.math_anxiety_score - firstTake.math_anxiety_score).toFixed(2))
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Welcome Bar */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
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
                {assessmentHistory.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-[#2a632d] border border-emerald-200 flex items-center gap-1">
                    <History className="w-3 h-3" />
                    {assessmentHistory.length} Take{assessmentHistory.length > 1 ? 's' : ''} in History
                  </span>
                )}
                <span className="text-xs text-slate-500">ID: {user?.id.slice(0, 8)}...</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Welcome back, <span className="text-[#2a632d]">{firstName}</span>!
              </h1>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                Refresh
              </button>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
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
        <section className="bg-gradient-to-br from-white via-white to-emerald-50/70 rounded-3xl border-2 border-[#2a632d]/40 shadow-xl p-8 sm:p-12 relative overflow-hidden">
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
              {hasCompletedSurvey && surveyData && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-[#2a632d] border border-emerald-300">
                  <CheckCircle className="w-3.5 h-3.5 text-[#2a632d]" />
                  Model Accuracy:{' '}
                  {surveyData.prediction_accuracy ??
                    Number((100 - (surveyData.error_rate ?? 3.56)).toFixed(2))}
                  %
                </span>
              )}
            </div>

            <div className="max-w-3xl space-y-3">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                {hasCompletedSurvey ? (
                  <>
                    Mathematics Diagnostic &amp;{' '}
                    <span className="text-[#2a632d]">Accuracy Results</span>
                  </>
                ) : (
                  <>
                    Factors Affecting <span className="text-[#2a632d]">Mathematics Achievement</span>{' '}
                    Survey
                  </>
                )}
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-medium">
                {hasCompletedSurvey
                  ? 'Your quarterly academic grades and 4 non-academic factor dimensions have been evaluated. Review your empirical linear regression forecast, prediction accuracy rate, and tailored pedagogical advice.'
                  : 'Evaluate your mathematics performance across Quarter 1, Quarter 2, and Quarter 3 academic records, and measure the 4 key non-academic dimensions: Concentration & Memory, Organizing & Processing, Math Anxiety, and Math Self-Concept.'}
              </p>
            </div>

            {/* In-progress draft notification if partially answered */}
            {!hasCompletedSurvey && draftAnsweredCount > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs sm:text-sm text-amber-900 max-w-2xl shadow-sm">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                  <span>
                    You have an auto-saved draft with <strong>{draftAnsweredCount} of 32</strong> items
                    completed. Your answers are safely recorded in the database.
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

            {/* ACTION BUTTONS (VIEW RESULT & RETAKE) */}
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
                    href="/survey?retake=true"
                    className="inline-flex items-center justify-center gap-2.5 px-7 py-5 rounded-2xl border-2 border-emerald-600/30 bg-white text-slate-800 hover:bg-emerald-50/70 hover:border-[#2a632d] text-base font-extrabold transition-all cursor-pointer shadow-sm group"
                  >
                    <RotateCcw className="w-5 h-5 text-[#2a632d] group-hover:rotate-[-45deg] transition-transform" />
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
                    {draftAnsweredCount > 0
                      ? 'Survey Available • Resume In-Progress'
                      : 'Survey Available • Start Survey Now'}
                  </span>
                  <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7 text-[#f6d548] group-hover:translate-x-2 transition-transform" />
                </Link>
              )}
            </div>

            {/* Retake & Multi-Take Reassurance Note */}
            {hasCompletedSurvey && (
              <p className="text-xs text-slate-500 font-medium">
                💡 <strong>Retake Note:</strong> When you retake the assessment, all your past takes are
                permanently preserved in your <strong>Assessment History</strong> below.
              </p>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* ASSESSMENT TAKE HISTORY & PROGRESS TIMELINE SECTION                       */}
        {/* ========================================================================= */}
        {assessmentHistory.length > 0 && (
          <section className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2a632d]/10 text-[#2a632d] flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Assessment Take History &amp; Progress Timeline
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    All your completed takes are permanently stored here. Click any take to view its
                    analysis.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#2a632d] text-xs font-black">
                  {assessmentHistory.length} Take{assessmentHistory.length > 1 ? 's' : ''} Recorded
                </span>
                <Link
                  href="/survey?retake=true"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2a632d] hover:bg-[#214e24] text-white text-xs font-bold shadow-xs transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#f6d548]" />
                  <span>Start New Take</span>
                </Link>
              </div>
            </div>

            {/* Growth & Comparison Banner (if 2 or more takes exist) */}
            {hasMultipleTakes && predictedDiff !== null && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-amber-50/50 border border-emerald-200/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#2a632d] uppercase tracking-wide">
                    <TrendingUp className="w-4 h-4" /> Multi-Take Trajectory Comparison
                  </span>
                  <p className="text-xs text-slate-700 font-medium">
                    Comparing your latest attempt (Take #{assessmentHistory.length}) against your initial
                    attempt (Take #1).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Predicted Grade Diff */}
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600">Predicted Grade:</span>
                    <span
                      className={`text-xs font-black flex items-center gap-0.5 ${
                        predictedDiff >= 0 ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {predictedDiff >= 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      {predictedDiff > 0 ? `+${predictedDiff}%` : `${predictedDiff}%`}
                    </span>
                  </div>

                  {/* Math Anxiety Diff */}
                  {anxietyDiff !== null && (
                    <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600">Math Anxiety:</span>
                      <span
                        className={`text-xs font-black flex items-center gap-0.5 ${
                          anxietyDiff <= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {anxietyDiff <= 0 ? '−' : '+'}
                        {Math.abs(anxietyDiff)} pts {anxietyDiff <= 0 ? '(Calmer)' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* List of Take History Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assessmentHistory.map((take, idx) => {
                const takeNumber = assessmentHistory.length - idx;
                const isSelected = selectedHistoryId === take.id;
                const isLatest = idx === 0;

                return (
                  <div
                    key={take.id || idx}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                      isSelected
                        ? 'bg-emerald-50/70 border-[#2a632d] shadow-md ring-2 ring-[#2a632d]/30'
                        : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-white'
                    }`}
                    onClick={() => take.id && handleSelectHistoryTake(take.id)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${
                              isSelected
                                ? 'bg-[#2a632d] text-[#f6d548]'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            #{takeNumber}
                          </span>
                          <span className="text-sm font-black text-slate-900">
                            Take #{takeNumber} {isLatest && '(Latest)'}
                          </span>
                        </div>

                        {isSelected ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#2a632d] text-white">
                            Viewing
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 hover:text-[#2a632d]">
                            Click to View
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateTime(take.created_at)}</span>
                      </div>

                      {/* Main Metric Chips */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            Predicted Grade
                          </span>
                          <p className="text-lg font-black text-[#2a632d]">
                            {take.predicted_grade != null ? `${take.predicted_grade}%` : 'N/A'}
                          </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            Accuracy Rate
                          </span>
                          <p className="text-lg font-black text-slate-800">
                            {take.prediction_accuracy != null ? `${take.prediction_accuracy}%` : '96.44%'}
                          </p>
                        </div>
                      </div>

                      {/* 4 Factor Mini-Tags */}
                      <div className="grid grid-cols-4 gap-1 text-[10px] font-bold text-center">
                        <div className="p-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 truncate">
                          🎯 {take.concentration_memory_score ?? '-'}
                        </div>
                        <div className="p-1 rounded bg-blue-50 text-blue-800 border border-blue-200 truncate">
                          🧩 {take.organizing_processing_score ?? '-'}
                        </div>
                        <div className="p-1 rounded bg-rose-50 text-rose-800 border border-rose-200 truncate">
                          🛡️ {take.math_anxiety_score ?? '-'}
                        </div>
                        <div className="p-1 rounded bg-amber-50 text-amber-900 border border-amber-200 truncate">
                          ⚡ {take.math_self_concept_score ?? '-'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (take.id) handleSelectHistoryTake(take.id);
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
                        isSelected
                          ? 'bg-[#2a632d] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected ? '✓ Currently Selected' : 'View This Result'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* ACTIVE PROFILE REGISTRATION DETAILS & FORECASTING SYSTEM GUIDELINES       */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Profile Registration Details */}
          <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#2a632d]/10 flex items-center justify-center text-[#2a632d]">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Active Profile Registration Details
                    </h3>
                    <p className="text-xs text-slate-500">Registered student parameters from database</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#2a632d]/10 text-[#2a632d] text-xs font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" /> Verified Profile
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500">First Name</span>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{firstName}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Last Name</span>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{lastName}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Middle Name</span>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{middleName}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Suffix</span>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{suffix}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Age</span>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{age}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Account Email</span>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5" title={email}>
                    {email}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Database Sync Active</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Auth Token Connected
              </span>
            </div>
          </section>

          {/* Forecasting System Guidelines */}
          <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#f6d548]/30 flex items-center justify-center text-slate-900">
                  <Sparkles className="w-5 h-5 text-[#2a632d]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Assessment System Core Rules</h3>
                  <p className="text-xs text-slate-500">Standards governing MathForesee calculations</p>
                </div>
              </div>

              <ul className="space-y-3.5 text-xs text-slate-700 font-medium">
                <li className="flex items-start gap-2.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#2a632d] mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-900 font-bold">Multiple Assessment Takes:</strong>{' '}
                    <span>You can retake this assessment anytime. Every take is archived in your history for progress tracking.</span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#f6d548] mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-900 font-bold">Statistical Calibration:</strong>{' '}
                    <span>Multiple Linear Regression recalibrates in real-time using your 5 significant academic predictors.</span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#2a632d] mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-900 font-bold">Auto-Save Cloud Protection:</strong>{' '}
                    <span>Drafts are saved automatically as you answer, ensuring zero progress loss.</span>
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
        {hasCompletedSurvey && surveyData && (
          <div className="space-y-6 pt-4" id="detailed-results">
            {/* Report Header */}
            <section className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#2a632d] text-white flex items-center justify-center shadow-xs">
                    <Award className="w-6 h-6 text-[#f6d548]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-slate-900">
                        Mathematics Diagnostic &amp; Accuracy Test Result
                      </h2>
                      {surveyData.created_at && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {formatDateTime(surveyData.created_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      Evaluated using Multiple Linear Regression &amp; 5-Tier Non-Academic Factors
                      Research Scale
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => setShowItemBreakdown(!showItemBreakdown)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2a632d] hover:bg-[#214e24] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
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
                    href="/survey?retake=true"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#2a632d]" />
                    <span>Retake Assessment</span>
                  </Link>
                </div>
              </div>

              {/* 4 Academic Grade & Accuracy KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Actual Average Grade
                  </span>
                  <div className="text-3xl font-black text-slate-900">
                    {surveyData.average_grade != null ? `${surveyData.average_grade}%` : 'Optional (N/A)'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    {surveyData.average_grade != null
                      ? `Formula: (Q1: ${surveyData.grade_q1 ?? '-'} + Q2: ${surveyData.grade_q2 ?? '-'} + Q3: ${surveyData.grade_q3 ?? '-'}) / 3`
                      : 'Quarterly grades were not provided'}
                  </span>
                </div>

                <div className="p-5 bg-gradient-to-br from-emerald-50 via-white to-amber-50/50 rounded-2xl border border-emerald-300 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#2a632d]">
                    Predicted Final Grade
                  </span>
                  <div className="text-3xl font-black text-[#2a632d]">
                    {surveyData.predicted_grade}%
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f6d548] text-slate-900">
                    Formed Regression (5 Factors)
                  </span>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#2a632d]">
                    Model Prediction Accuracy
                  </span>
                  <div className="text-3xl font-black text-[#2a632d]">
                    {surveyData.prediction_accuracy != null
                      ? `${surveyData.prediction_accuracy}%`
                      : '96.44%'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    {surveyData.error_rate != null
                      ? 'Formula: 100 − Error Rate (%)'
                      : 'Research Benchmark (Table 2, N=222)'}
                  </span>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Accuracy Test Error Rate
                  </span>
                  <div className="text-3xl font-black text-slate-900">
                    {surveyData.error_rate != null ? `${surveyData.error_rate}%` : '3.56%'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    {surveyData.error_rate != null
                      ? '[(|Actual − Pred|) / Actual] × 100'
                      : 'Research Benchmark Average (Table 2)'}
                  </span>
                </div>
              </div>

              {/* Formed Regression Equation Details Card (Table 1, Page 30) */}
              <div className="mt-5 p-5 rounded-2xl bg-[#2a632d]/5 border border-[#2a632d]/20 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                  <span className="text-xs font-black text-[#2a632d] uppercase tracking-wide">
                    Formed Multiple Linear Regression Model (Table 1, Page 30)
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-full border border-slate-200 self-start sm:self-auto">
                    R = 0.886 | R² = 0.785 | F = 72.706 (p = 0.000)
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-xs sm:text-sm text-slate-900 font-bold overflow-x-auto shadow-2xs">
                  Grades = 80.92 + 0.294(PMI) + 0.887(CM) + 0.865(OPI) − 1.281(MAnx) + 1.673(MSc)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-[10px] text-slate-600 font-medium">
                  <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/70">
                    <strong className="block text-slate-800">
                      PMI: {surveyData.monthly_income ? surveyData.monthly_income.split(' ')[0] : 'Standard'}
                    </strong>
                    <span>Parent Income (p=.049)</span>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/70">
                    <strong className="block text-slate-800">
                      CM: {surveyData.concentration_memory_score ?? '-'}
                    </strong>
                    <span>Concentration (p=.043)</span>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/70">
                    <strong className="block text-slate-800">
                      OPI: {surveyData.organizing_processing_score ?? '-'}
                    </strong>
                    <span>Organization (p=.046)</span>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/70">
                    <strong className="block text-slate-800">
                      MAnx: {surveyData.math_anxiety_score ?? '-'}
                    </strong>
                    <span>Math Anxiety (p=.001)</span>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/70">
                    <strong className="block text-slate-800">
                      MSc: {surveyData.math_self_concept_score ?? '-'}
                    </strong>
                    <span>Self-Concept (p=.000)</span>
                  </div>
                </div>
              </div>

              {/* Detailed Item-by-Item 32-Question Audit Table */}
              {showItemBreakdown && (
                <div className="mt-6 pt-6 border-t border-slate-200 animate-in fade-in-50 duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <Award className="w-4 h-4 text-[#2a632d]" />
                        <span>Complete 32-Question Survey Item Audit &amp; Ratings</span>
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Exact 5-point Likert ratings recorded for this specific assessment attempt
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                      Total Items: 32 / 32
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-slate-50">
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
                              <td className="py-2.5 px-4 text-slate-800 leading-snug">{q.text}</td>
                              <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                    val >= 4
                                      ? 'bg-emerald-100 text-[#2a632d]'
                                      : val === 3
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-700'
                                  }`}
                                >
                                  <span>{val}/5</span>
                                  <span className="font-medium text-[11px]">
                                    ({opt?.short || 'Rating'})
                                  </span>
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
            <section className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Non-Academic Factor Manifestations &amp; Research Interpretations
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Evaluated on 1.00 – 5.00 Scale against educational research citations
                  </p>
                </div>
                <span className="text-xs font-black px-3 py-1.5 rounded-full bg-[#2a632d]/10 text-[#2a632d] border border-[#2a632d]/20 self-start sm:self-auto">
                  Overall Factor Composite: {surveyData.overall_factor_score ?? 3.8} / 5.00
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Concentration and Memory */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Concentration and Memory
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#2a632d] text-white">
                      {surveyData.concentration_description || 'High'} (
                      {surveyData.concentration_memory_score ?? 3.8})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Citation: <em>Inojales, 2026</em>
                  </div>
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-800">
                    <p className="font-bold text-[#2a632d]">Official Interpretation:</p>
                    <p className="mt-0.5 font-medium leading-relaxed">
                      {surveyData.concentration_interpretation ||
                        'Indicates that concentration and memory of junior high school students is often manifested.'}
                    </p>
                  </div>
                </div>

                {/* 2. Organizing and Processing Information */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Organizing and Processing Information
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#2a632d] text-white">
                      {surveyData.organizing_description || 'High'} (
                      {surveyData.organizing_processing_score ?? 3.9})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Citation: <em>Hasani et al., 2024</em>
                  </div>
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-800">
                    <p className="font-bold text-[#2a632d]">Official Interpretation:</p>
                    <p className="mt-0.5 font-medium leading-relaxed">
                      {surveyData.organizing_interpretation ||
                        'Indicates that organizing and processing information of junior high school students is often manifested.'}
                    </p>
                  </div>
                </div>

                {/* 3. Math Anxiety */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Math Anxiety
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                        Number(surveyData.math_anxiety_score) >= 3.4
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-[#2a632d] text-white'
                      }`}
                    >
                      {surveyData.anxiety_description || 'Moderate'} (
                      {surveyData.math_anxiety_score ?? 2.8})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Citation: <em>Hossain et al., 2025; Weir, 2023</em>
                  </div>
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-800">
                    <p className="font-bold text-[#2a632d]">Official Interpretation:</p>
                    <p className="mt-0.5 font-medium leading-relaxed">
                      {surveyData.anxiety_interpretation ||
                        'Indicates that math anxiety of junior high school students is sometimes manifested.'}
                    </p>
                  </div>
                </div>

                {/* 4. Math Self-Concept */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Math Self-Concept
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#2a632d] text-white">
                      {surveyData.self_concept_description || 'High'} (
                      {surveyData.math_self_concept_score ?? 3.9})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Citation: <em>Peteros et al., 2026</em>
                  </div>
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-800">
                    <p className="font-bold text-[#2a632d]">Official Interpretation:</p>
                    <p className="mt-0.5 font-medium leading-relaxed">
                      {surveyData.self_concept_interpretation ||
                        'Indicates that math self-concept of junior high school students is often manifested.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Research Scale Reference Table */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 block">
                  Standardized Research Scale Reference Table
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3.5">Range of Means</th>
                        <th className="py-2.5 px-3.5">Description</th>
                        <th className="py-2.5 px-3.5">Standard Manifestation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {RANGE_OF_MEANS_TABLE.map((row) => (
                        <tr key={row.range} className="hover:bg-slate-50">
                          <td className="py-2 px-3.5 font-mono font-bold">{row.range}</td>
                          <td className="py-2 px-3.5 font-extrabold text-[#2a632d]">{row.description}</td>
                          <td className="py-2 px-3.5">
                            Indicates that the factor of junior high students <strong>{row.manifestation}</strong>.
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pedagogical Advice Box */}
              <div className="p-5 rounded-2xl bg-[#2a632d]/5 border border-[#2a632d]/20 text-xs text-slate-700 space-y-2 mt-4">
                <div className="flex items-center gap-2 text-[#2a632d] font-black">
                  <Sparkles className="w-4 h-4" />
                  <span>Pedagogical Advice &amp; Actionable Interventions:</span>
                </div>
                <p className="font-bold text-slate-900 text-sm leading-snug">{surveyData.interpretation}</p>
                <p className="text-slate-600 leading-relaxed font-medium">{surveyData.advice}</p>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
