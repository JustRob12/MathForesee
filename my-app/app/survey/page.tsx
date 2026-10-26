'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/Navbar';
import {
  SURVEY_CATEGORIES,
  SURVEY_QUESTIONS,
  LIKERT_OPTIONS,
  PARENT_INCOME_OPTIONS,
  RANGE_OF_MEANS_TABLE,
  calculateSurveyResults,
  countAnsweredQuestions,
} from '@/lib/surveyData';
import { safeSaveSurveyResponse } from '@/lib/supabase/surveyDb';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  Sparkles,
  BarChart,
  RotateCcw,
  LayoutDashboard,
  ShieldCheck,
  SkipForward,
  Lock,
  CloudCheck,
  Check,
  Loader2,
} from 'lucide-react';

const CATEGORY_ORDER: ('concentration' | 'organizing' | 'anxiety' | 'selfConcept')[] = [
  'concentration',
  'organizing',
  'anxiety',
  'selfConcept',
];

export default function SurveyPage() {
  const router = useRouter();
  const supabase = createClient();

  // Wizard Steps:
  // 0: App Description / Intro Landing (with option to skip)
  // 1: Part I – Demographic Profile & Grades
  // 2: Part II – Factors Affecting Math Achievement
  // 3: Results & Diagnostic Calculation
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [activeFactorTab, setActiveFactorTab] = useState<
    'concentration' | 'organizing' | 'anxiety' | 'selfConcept'
  >('concentration');

  // User & Draft State
  const [userId, setUserId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isRestored, setIsRestored] = useState<boolean>(false);

  // Part I: Demographic Data
  const [sex, setSex] = useState<string>('Male');
  const [age, setAge] = useState<string>('16');
  const [gradeQ1, setGradeQ1] = useState<string>('85');
  const [gradeQ2, setGradeQ2] = useState<string>('87');
  const [gradeQ3, setGradeQ3] = useState<string>('89');
  const [monthlyIncome, setMonthlyIncome] = useState<string>('₱10,000 - ₱20,000');

  // Part II: Likert Answers (question id -> 1..5)
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // Calculation Results
  const [results, setResults] = useState<ReturnType<typeof calculateSurveyResults> | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs for auto-save on close/unload
  const stateRef = useRef({
    userId,
    draftId,
    sex,
    age,
    gradeQ1,
    gradeQ2,
    gradeQ3,
    monthlyIncome,
    answers,
    currentCategory: activeFactorTab,
    currentStep,
  });

  useEffect(() => {
    stateRef.current = {
      userId,
      draftId,
      sex,
      age,
      gradeQ1,
      gradeQ2,
      gradeQ3,
      monthlyIncome,
      answers,
      currentCategory: activeFactorTab,
      currentStep,
    };
  }, [userId, draftId, sex, age, gradeQ1, gradeQ2, gradeQ3, monthlyIncome, answers, activeFactorTab, currentStep]);

  // Save to database helper
  const syncDraftToDatabase = useCallback(async (isBeacon = false) => {
    const s = stateRef.current;
    const answeredCount = countAnsweredQuestions(s.answers);

    // Only save if user has entered grades or answered at least 1 question
    if (answeredCount === 0 && !s.gradeQ1) return;

    const payload = {
      userId: s.userId,
      draftId: s.draftId,
      sex: s.sex,
      age: s.age,
      gradeQ1: s.gradeQ1,
      gradeQ2: s.gradeQ2,
      gradeQ3: s.gradeQ3,
      monthlyIncome: s.monthlyIncome,
      answers: s.answers,
      currentCategory: s.currentCategory,
    };

    if (isBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/survey/draft', JSON.stringify(payload));
      return;
    }

    try {
      const res = await fetch('/api/survey/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.draftId) {
        setDraftId(data.draftId);
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch {
      // Fail silently for background auto-save
    }
  }, []);

  // Listen for beforeunload / page hide to record to database on close
  useEffect(() => {
    const handleUnload = () => {
      syncDraftToDatabase(true);
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [syncDraftToDatabase]);

  // Load existing draft from Supabase and LocalStorage on mount
  useEffect(() => {
    async function loadUserAndDraft() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const currentUid = user?.id || null;
      if (currentUid) {
        setUserId(currentUid);
        if (user?.user_metadata?.age) {
          setAge(String(user.user_metadata.age));
        }

        // Check if there is an in-progress draft in Supabase
        try {
          const { data: dbDraft } = await supabase
            .from('survey_responses')
            .select('*')
            .eq('user_id', currentUid)
            .eq('is_completed', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (dbDraft) {
            setDraftId(dbDraft.id);
            if (dbDraft.sex) setSex(dbDraft.sex);
            if (dbDraft.age) setAge(String(dbDraft.age));
            if (dbDraft.grade_q1) setGradeQ1(String(dbDraft.grade_q1));
            if (dbDraft.grade_q2) setGradeQ2(String(dbDraft.grade_q2));
            if (dbDraft.grade_q3) setGradeQ3(String(dbDraft.grade_q3));
            if (dbDraft.monthly_income) setMonthlyIncome(dbDraft.monthly_income);
            if (dbDraft.answers && typeof dbDraft.answers === 'object') {
              const cleanAnswers: Record<string, number> = {};
              for (const [k, v] of Object.entries(dbDraft.answers)) {
                if (!k.startsWith('_') && typeof v === 'number') {
                  cleanAnswers[k] = v;
                }
              }
              setAnswers(cleanAnswers);
            }
            if (dbDraft.current_category) {
              setActiveFactorTab(dbDraft.current_category as any);
            }
            if ((dbDraft.answers && Object.keys(dbDraft.answers).length > 0) || (dbDraft.grade_q1 || dbDraft.grade_q2 || dbDraft.grade_q3)) {
              setCurrentStep(2);
            }
            setIsRestored(true);
            return;
          }
        } catch {
          // fallback to localStorage
        }
      }

      // Check localStorage fallback
      try {
        const local = localStorage.getItem('mathforesee_survey_draft');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed.sex) setSex(parsed.sex);
          if (parsed.age) setAge(parsed.age);
          if (parsed.gradeQ1) setGradeQ1(parsed.gradeQ1);
          if (parsed.gradeQ2) setGradeQ2(parsed.gradeQ2);
          if (parsed.gradeQ3) setGradeQ3(parsed.gradeQ3);
          if (parsed.monthlyIncome) setMonthlyIncome(parsed.monthlyIncome);
          if (parsed.answers && typeof parsed.answers === 'object') {
            const cleanAnswers: Record<string, number> = {};
            for (const [k, v] of Object.entries(parsed.answers)) {
              if (!k.startsWith('_') && typeof v === 'number') {
                cleanAnswers[k] = v;
              }
            }
            setAnswers(cleanAnswers);
          }
          if (parsed.currentCategory) setActiveFactorTab(parsed.currentCategory);
          if (parsed.gradeQ1 && parsed.gradeQ2 && parsed.gradeQ3) {
            setCurrentStep(2);
          }
          setIsRestored(true);
        }
      } catch {
        // Continue clean
      }
    }

    loadUserAndDraft();
  }, [supabase]);

  // Answer handler with local and server auto-save
  const handleSelectAnswer = (questionId: string, value: number) => {
    const updated = {
      ...answers,
      [questionId]: value,
    };
    setAnswers(updated);

    // Save to localStorage immediately
    try {
      localStorage.setItem(
        'mathforesee_survey_draft',
        JSON.stringify({
          sex,
          age,
          gradeQ1,
          gradeQ2,
          gradeQ3,
          monthlyIncome,
          answers: updated,
          currentCategory: activeFactorTab,
        })
      );
    } catch {
      // Ignore localStorage quotas
    }

    // Debounced database sync
    const timer = setTimeout(() => {
      syncDraftToDatabase(false);
    }, 1200);

    return () => clearTimeout(timer);
  };

  // Category completion checks
  const getCategoryQuestions = (cat: 'concentration' | 'organizing' | 'anxiety' | 'selfConcept') =>
    SURVEY_QUESTIONS.filter((q) => q.category === cat);

  const isCategoryComplete = (cat: 'concentration' | 'organizing' | 'anxiety' | 'selfConcept') => {
    const questions = getCategoryQuestions(cat);
    return questions.every((q) => answers[q.id] !== undefined && answers[q.id] !== null);
  };

  const getCategoryAnsweredCount = (cat: 'concentration' | 'organizing' | 'anxiety' | 'selfConcept') => {
    const questions = getCategoryQuestions(cat);
    return questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== null).length;
  };

  // Part I validation and navigation
  const handleProceedToPart2 = () => {
    setErrorMessage(null);
    const parsedAge = parseInt(age, 10);

    if (age && (isNaN(parsedAge) || parsedAge < 5 || parsedAge > 120)) {
      setErrorMessage('Please enter a valid age between 5 and 120.');
      return;
    }

    const q1 = gradeQ1.trim() !== '' ? parseFloat(gradeQ1) : null;
    const q2 = gradeQ2.trim() !== '' ? parseFloat(gradeQ2) : null;
    const q3 = gradeQ3.trim() !== '' ? parseFloat(gradeQ3) : null;

    if (q1 !== null && (isNaN(q1) || q1 < 50 || q1 > 100)) {
      setErrorMessage('Quarter 1 (Q1) grade must be a number between 50 and 100 if provided.');
      return;
    }
    if (q2 !== null && (isNaN(q2) || q2 < 50 || q2 > 100)) {
      setErrorMessage('Quarter 2 (Q2) grade must be a number between 50 and 100 if provided.');
      return;
    }
    if (q3 !== null && (isNaN(q3) || q3 < 50 || q3 > 100)) {
      setErrorMessage('Quarter 3 (Q3) grade must be a number between 50 and 100 if provided.');
      return;
    }

    // Sync draft and proceed
    syncDraftToDatabase(false);
    setCurrentStep(2);
  };

  // "Previous" button handler in Part II
  const handlePrevious = () => {
    const currentIndex = CATEGORY_ORDER.indexOf(activeFactorTab);
    if (currentIndex === 0) {
      // On first category (concentration) -> go back to Part I (Demographic Profile)
      setCurrentStep(1);
    } else {
      // Go to previous category
      setActiveFactorTab(CATEGORY_ORDER[currentIndex - 1]);
      window.scrollTo({ top: 180, behavior: 'smooth' });
    }
  };

  // "Next" button handler in Part II
  const handleNextCategory = () => {
    const currentIndex = CATEGORY_ORDER.indexOf(activeFactorTab);
    if (!isCategoryComplete(activeFactorTab)) {
      setErrorMessage('Please answer all questions in this category before proceeding to the next.');
      return;
    }

    setErrorMessage(null);
    if (currentIndex < CATEGORY_ORDER.length - 1) {
      const nextCategory = CATEGORY_ORDER[currentIndex + 1];
      setActiveFactorTab(nextCategory);
      syncDraftToDatabase(false);
      window.scrollTo({ top: 180, behavior: 'smooth' });
    }
  };

  // Final Submission & Calculation (Only in last category, requires ALL 32 questions completed)
  const allQuestionsAnswered = SURVEY_QUESTIONS.every((q) => answers[q.id] !== undefined && answers[q.id] !== null);

  const handleCalculateAndSubmit = async () => {
    setErrorMessage(null);

    if (!allQuestionsAnswered) {
      setErrorMessage('You must complete all 32 statements across all categories before calculating your grade.');
      return;
    }

    const q1 = gradeQ1.trim() !== '' ? parseFloat(gradeQ1) : null;
    const q2 = gradeQ2.trim() !== '' ? parseFloat(gradeQ2) : null;
    const q3 = gradeQ3.trim() !== '' ? parseFloat(gradeQ3) : null;

    const computed = calculateSurveyResults(q1, q2, q3, answers, monthlyIncome);
    setResults(computed);

    // Save final completed response to Supabase
    setSaving(true);
    try {
      let currentUserId = userId;
      if (!currentUserId) {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        currentUserId = authUser?.id || null;
      }

      const recordData = {
        user_id: currentUserId,
        is_completed: true,
        sex,
        age: age ? parseInt(age, 10) : null,
        grade_q1: q1,
        grade_q2: q2,
        grade_q3: q3,
        average_grade: computed.averageGrade,
        predicted_grade: computed.predictedGrade,
        error_rate: computed.errorRate,
        prediction_accuracy: computed.predictionAccuracy,
        monthly_income: monthlyIncome,
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
        answers,
        updated_at: new Date().toISOString(),
      };

      // 1. Direct save with schema resilience and update/insert fallback
      const { data: saved, error } = await safeSaveSurveyResponse(supabase, recordData, draftId);

      // 2. If direct client encountered an error or empty record, invoke API endpoint
      if (error || !saved) {
        console.warn('[Direct DB save failed or empty, invoking server endpoint fallback]:', error);
        await fetch('/api/survey/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recordData, draftId }),
        });
      }

      // Clear local draft upon successful completion
      localStorage.removeItem('mathforesee_survey_draft');
      setSavedSuccess(true);

      // Automatically navigate to dashboard to display the completed status and 'View Math Result'
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      console.error('[Survey Submission Error]', err);
      // Fallback navigation to dashboard
      router.push('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  // State derivations for current category
  const activeQuestions = getCategoryQuestions(activeFactorTab);
  const activeAnsweredCount = getCategoryAnsweredCount(activeFactorTab);
  const activeTotalCount = activeQuestions.length;
  const currentCategoryIsComplete = activeAnsweredCount === activeTotalCount;

  const totalAnswered = countAnsweredQuestions(answers);
  const totalQuestions = SURVEY_QUESTIONS.length;
  const overallProgress = Math.round((totalAnswered / totalQuestions) * 100);

  const isLastCategory = activeFactorTab === 'selfConcept';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Auto-save & Restore Status Indicator */}
        {(isRestored || lastSavedTime) && currentStep > 0 && currentStep < 3 && (
          <div className="mb-4 flex items-center justify-between px-4 py-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2a632d]" />
              {isRestored && !lastSavedTime && (
                <span>Resumed from your saved progress. Any answers you submit are automatically preserved.</span>
              )}
              {lastSavedTime && (
                <span>
                  Progress automatically recorded to database (Last auto-saved at <strong>{lastSavedTime}</strong>).
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold text-[#2a632d] flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Auto-Save Active
            </span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 0: APP DESCRIPTION / INTRO LANDING (WITH SKIP BUTTON) */}
        {/* ========================================================================= */}
        {currentStep === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 sm:p-12 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f6d548]/30 border border-[#f6d548] text-slate-900 text-xs font-bold mb-4">
                <Sparkles className="w-3.5 h-3.5 text-[#2a632d]" />
                <span>Multiple Linear Regression & Non-Academic Factor Assessment</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                About the <span className="text-[#2a632d]">MathForesee</span> Assessment
              </h1>

              <p className="mt-4 text-base text-slate-600 leading-relaxed max-w-3xl">
                This study applies multiple linear regression to examine how independent non-academic factors affect junior high school students&apos; mathematics grades. By evaluating your academic baselines and psychological indicators, the application forecasts mathematical achievement and conducts real-time accuracy testing.
              </p>

              {/* Research Framework Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="p-5 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#2a632d]/10 flex items-center justify-center text-[#2a632d] font-bold">
                      1
                    </div>
                    <h3 className="font-bold text-sm text-slate-900">Part I: Demographic & Grade Profile</h3>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    Records Sex, Age, Parental Monthly Income, and Quarterly Grades ($Q_1, Q_2, Q_3$) to establish the actual achievement baseline.
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#f6d548]/40 flex items-center justify-center text-slate-900 font-bold">
                      2
                    </div>
                    <h3 className="font-bold text-sm text-slate-900">Part II: Non-Academic Factors Evaluation</h3>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    Evaluates <strong>Concentration & Memory</strong> (Inojales, 2026), <strong>Organizing & Processing</strong> (Hasani et al., 2024), <strong>Math Anxiety</strong> (Hossain et al., 2025), and <strong>Math Self-Concept</strong> (Peteros et al., 2026).
                  </p>
                </div>
              </div>

              {/* Progress and Close Notice */}
              <div className="mt-6 p-4 rounded-xl bg-[#2a632d]/5 border border-[#2a632d]/20 text-xs text-slate-700 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#2a632d] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[#2a632d]">Automatic Progress Recording Active:</p>
                  <p className="mt-0.5 text-slate-600">
                    You can complete this assessment at your own pace. All answers are progressively saved to the database in real-time, even if you close or leave the browser.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#2a632d] hover:bg-[#214e24] text-white text-sm font-semibold shadow transition-all cursor-pointer border border-[#214e24] group"
                >
                  <span>Start Assessment Survey</span>
                  <ArrowRight className="w-4 h-4 text-[#f6d548] group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-sm font-semibold transition-colors cursor-pointer"
                >
                  <SkipForward className="w-4 h-4 text-slate-500" />
                  <span>Skip to Dashboard</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: PART I – DEMOGRAPHIC PROFILE */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div>
                <span className="text-xs uppercase font-bold text-[#2a632d]">Survey Phase 1 of 2</span>
                <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  PART I – Demographic Profile
                </h2>
                <p className="text-xs text-slate-500">
                  Please provide your general information and quarterly mathematics grades.
                </p>
              </div>

              <button
                onClick={() => router.push('/dashboard')}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                <span>Skip to Dashboard</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3 text-red-800 text-xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-6">
              {/* Sex & Age */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Sex
                  </label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2a632d]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Age
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2a632d]"
                  />
                </div>
              </div>

              {/* Grades in Mathematics (Optional) */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Grades in Mathematics (Quarterly)
                    </label>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f6d548] text-slate-900 border border-[#f6d548]">
                      Optional
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">Scale: 50 – 100</span>
                </div>
                <p className="text-xs text-slate-500 mb-3.5">
                  Optional: If you haven&apos;t received your quarterly grades yet, you can leave these blank. MathForesee will still predict your mathematics achievement using the formed regression equation and your 5 significant non-academic factors.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1 font-semibold">
                      Quarter 1 (Q1) <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="100"
                      step="0.1"
                      value={gradeQ1}
                      onChange={(e) => setGradeQ1(e.target.value)}
                      placeholder="e.g. 85 (optional)"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#2a632d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1 font-semibold">
                      Quarter 2 (Q2) <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="100"
                      step="0.1"
                      value={gradeQ2}
                      onChange={(e) => setGradeQ2(e.target.value)}
                      placeholder="e.g. 87 (optional)"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#2a632d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1 font-semibold">
                      Quarter 3 (Q3) <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="100"
                      step="0.1"
                      value={gradeQ3}
                      onChange={(e) => setGradeQ3(e.target.value)}
                      placeholder="e.g. 89 (optional)"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#2a632d]"
                    />
                  </div>
                </div>

                {(gradeQ1.trim() !== '' || gradeQ2.trim() !== '' || gradeQ3.trim() !== '') && (
                  <div className="mt-3 text-xs text-slate-600 flex items-center justify-between border-t border-slate-200 pt-2 font-medium">
                    <span>Actual Grade Average of Entered Quarters:</span>
                    <span className="font-bold text-[#2a632d] text-sm">
                      {(
                        [parseFloat(gradeQ1), parseFloat(gradeQ2), parseFloat(gradeQ3)]
                          .filter((g) => !isNaN(g) && g > 0)
                          .reduce((a, b, _, arr) => a + b / arr.length, 0)
                      ).toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Monthly Income of Parents */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-2">
                  Monthly Income of Parents
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {PARENT_INCOME_OPTIONS.map((bracket) => (
                    <label
                      key={bracket}
                      onClick={() => setMonthlyIncome(bracket)}
                      className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                        monthlyIncome === bracket
                          ? 'bg-[#2a632d]/10 border-[#2a632d] text-[#2a632d] font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="income"
                        checked={monthlyIncome === bracket}
                        onChange={() => setMonthlyIncome(bracket)}
                        className="accent-[#2a632d]"
                      />
                      <span>{bracket}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation buttons: Using standard "Previous" as requested */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(0)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <button
                onClick={handleProceedToPart2}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#2a632d] hover:bg-[#214e24] text-white text-xs font-semibold shadow transition-all cursor-pointer border border-[#214e24]"
              >
                <span>Continue to Part II</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#f6d548]" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: PART II – FACTORS AFFECTING MATHEMATICS ACHIEVEMENT */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-6">
            <div className="pb-4 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-xs uppercase font-bold text-[#2a632d]">Survey Phase 2 of 2</span>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                    PART II – Factors Affecting Mathematics Achievement
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Total Answered:</span>
                  <span className="font-bold text-[#2a632d]">
                    {totalAnswered} / {totalQuestions}
                  </span>
                  <span className="text-slate-400">({overallProgress}%)</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className="bg-[#2a632d] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>

              {/* Rating key description */}
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <p className="font-semibold text-slate-900 mb-1">Directions & Rating Key:</p>
                <p className="text-slate-600 mb-2">
                  After each statement, mark the number 1 to 5 whichever best describes your behavior:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-medium">
                  <span className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-800">
                    <strong>5</strong> – Always true
                  </span>
                  <span className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-800">
                    <strong>4</strong> – Often true
                  </span>
                  <span className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-800">
                    <strong>3</strong> – Sometimes true
                  </span>
                  <span className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-800">
                    <strong>2</strong> – Rarely true
                  </span>
                  <span className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-800">
                    <strong>1</strong> – Never true
                  </span>
                </div>
              </div>
            </div>

            {/* Error message banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-amber-900 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Category Navigation Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
              {SURVEY_CATEGORIES.map((cat, idx) => {
                const count = getCategoryAnsweredCount(cat.key);
                const isComplete = count === cat.itemCount;
                const isActive = activeFactorTab === cat.key;

                return (
                  <button
                    key={cat.key}
                    onClick={() => {
                      // Only allow jumping back, or jumping to current if previous categories are complete
                      const targetIdx = CATEGORY_ORDER.indexOf(cat.key);
                      const currentIdx = CATEGORY_ORDER.indexOf(activeFactorTab);
                      if (targetIdx <= currentIdx) {
                        setActiveFactorTab(cat.key);
                      } else {
                        // Check if all preceding categories are complete
                        let canJump = true;
                        for (let i = 0; i < targetIdx; i++) {
                          if (!isCategoryComplete(CATEGORY_ORDER[i])) {
                            canJump = false;
                            break;
                          }
                        }
                        if (canJump) {
                          setActiveFactorTab(cat.key);
                        } else {
                          setErrorMessage(
                            `Please complete all questions in preceding categories before jumping to ${cat.title}.`
                          );
                        }
                      }
                    }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-[#2a632d] text-white shadow-sm'
                        : isComplete
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{cat.title}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        isActive
                          ? 'bg-[#f6d548] text-slate-900'
                          : isComplete
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}/{cat.itemCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Category Citation Header */}
            <div className="bg-[#2a632d]/5 p-3 rounded-lg border-l-4 border-[#2a632d] text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div>
                <span className="font-bold text-[#2a632d]">
                  {SURVEY_CATEGORIES.find((c) => c.key === activeFactorTab)?.title}:
                </span>{' '}
                {SURVEY_CATEGORIES.find((c) => c.key === activeFactorTab)?.description}
              </div>
              <span className="text-[10px] font-semibold text-slate-500 italic shrink-0">
                ({SURVEY_CATEGORIES.find((c) => c.key === activeFactorTab)?.citation})
              </span>
            </div>

            {/* Category Completion Status Pill */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-600">
                Category Progress: <strong>{activeAnsweredCount}</strong> of <strong>{activeTotalCount}</strong> answered
              </span>
              {currentCategoryIsComplete ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Category Completed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-xs">
                  <Lock className="w-3.5 h-3.5 text-amber-600" /> Complete all {activeTotalCount} items to proceed
                </span>
              )}
            </div>

            {/* Statements List */}
            <div className="space-y-4">
              {activeQuestions.map((question) => {
                const selectedValue = answers[question.id];

                return (
                  <div
                    key={question.id}
                    className={`p-4 rounded-xl border transition-all ${
                      selectedValue !== undefined
                        ? 'bg-white border-[#2a632d]/40 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {question.number}
                      </span>
                      <p className="text-sm font-medium text-slate-900 leading-snug">
                        {question.text}
                      </p>
                    </div>

                    {/* Likert Scale 1 to 5 selector */}
                    <div className="grid grid-cols-5 gap-2 pt-2 border-t border-slate-100">
                      {LIKERT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectAnswer(question.id, opt.value)}
                          className={`py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                            selectedValue === opt.value
                              ? 'bg-[#2a632d] text-white shadow-sm ring-2 ring-[#f6d548]'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          <span className="text-sm font-bold">{opt.value}</span>
                          <span className="text-[10px] hidden sm:inline truncate max-w-[70px]">
                            {opt.short}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Controls */}
            {/* Rule 1: Use simply "Previous" button */}
            {/* Rule 2: Cannot proceed Next if not complete */}
            {/* Rule 3: Calculate button ONLY placed in last category and disabled until all finished */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={handlePrevious}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-3">
                {!isLastCategory ? (
                  // Categories 1, 2, 3: Show "Next" button, LOCKED until current category is 100% complete
                  <button
                    type="button"
                    onClick={handleNextCategory}
                    disabled={!currentCategoryIsComplete}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all border ${
                      currentCategoryIsComplete
                        ? 'bg-[#2a632d] hover:bg-[#214e24] text-white shadow border-[#214e24] cursor-pointer'
                        : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed opacity-80'
                    }`}
                  >
                    <span>
                      {currentCategoryIsComplete
                        ? 'Next Category'
                        : `Complete Category to Proceed (${activeAnsweredCount}/${activeTotalCount})`}
                    </span>
                    {currentCategoryIsComplete ? (
                      <ArrowRight className="w-3.5 h-3.5 text-[#f6d548]" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                ) : (
                  // Last Category (Math Self-Concept): Place Calculate Grade & View Advice HERE ONLY!
                  // Locked until ALL 32 questions are completed!
                  <button
                    type="button"
                    onClick={handleCalculateAndSubmit}
                    disabled={!allQuestionsAnswered || saving}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all border ${
                      allQuestionsAnswered && !saving
                        ? 'bg-[#2a632d] hover:bg-[#214e24] text-white shadow border-[#214e24] cursor-pointer ring-2 ring-[#f6d548]'
                        : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed opacity-80'
                    }`}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#f6d548]" />
                    ) : (
                      <BarChart className="w-4 h-4 text-[#f6d548]" />
                    )}
                    <span>
                      {saving
                        ? 'Recording Results & Launching Dashboard...'
                        : allQuestionsAnswered
                        ? 'Calculate Grade & View Research Interpretation'
                        : `Complete All Questions to Calculate (${totalAnswered}/${totalQuestions})`}
                    </span>
                    {!allQuestionsAnswered && !saving && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: RESULTS & STATISTICAL ANALYSIS REPORT */}
        {/* ========================================================================= */}
        {currentStep === 3 && results && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2a632d]/10 text-[#2a632d] text-xs font-bold mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2a632d]" />
                    <span>Multiple Linear Regression & Accuracy Test Evaluated</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                    Mathematics Achievement Diagnostic & Interpretation Report
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Respondent Profile: {sex} • Age: {age} • Parental Income: {monthlyIncome}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCurrentStep(1);
                      setActiveFactorTab('concentration');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Retake</span>
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2a632d] hover:bg-[#214e24] text-white text-xs font-semibold shadow cursor-pointer border border-[#214e24]"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-[#f6d548]" />
                    <span>Open Dashboard</span>
                  </button>
                </div>
              </div>

              {savedSuccess && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Successfully recorded to Supabase database (<code>public.survey_responses</code>).
                  </span>
                </div>
              )}
            </div>

            {/* Academic Grade & Statistical Accuracy Test (Formed Regression & Page 6/32 Formulas) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Actual Average Grade
                </span>
                <div className="text-3xl font-extrabold text-slate-900 mt-2">
                  {results.averageGrade != null ? `${results.averageGrade}%` : 'Optional (N/A)'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {results.averageGrade != null
                    ? `Formula: (Q1 + Q2 + Q3) / 3`
                    : 'Quarterly grades were not provided'}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Predicted Final Grade
                </span>
                <div className="text-3xl font-extrabold text-[#2a632d] mt-2">
                  {results.predictedGrade}%
                </div>
                <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#f6d548] text-slate-900 mt-1">
                  Formed Regression (5 Significant Factors)
                </div>
              </div>

              {/* Statistical Error Rate Card (Page 6 / Table 2 Formula) */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Accuracy Test Error Rate
                </span>
                <div className="text-3xl font-extrabold text-slate-900 mt-2">
                  {results.errorRate != null ? `${results.errorRate}%` : '3.56%'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">
                  {results.errorRate != null
                    ? '[(|Actual − Pred|) / Actual] × 100'
                    : 'Research Benchmark Average (Table 2)'}
                </div>
              </div>

              {/* Model Prediction Accuracy Card (Page 6 / Table 2 Formula) */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Model Prediction Accuracy
                </span>
                <div className="text-3xl font-extrabold text-[#2a632d] mt-2">
                  {results.predictionAccuracy != null ? `${results.predictionAccuracy}%` : '96.44%'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">
                  {results.errorRate != null
                    ? 'Formula: 100 − Error Rate (%)'
                    : 'Research Model Benchmark (N=222, 96.44%)'}
                </div>
              </div>
            </div>

            {/* Regression Equation Formula Card (Table 1, Page 30) */}
            <div className="bg-[#2a632d]/5 rounded-xl border border-[#2a632d]/25 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <span className="text-xs uppercase font-extrabold text-[#2a632d] tracking-wider">
                  Formed Multiple Linear Regression Model (5 Significant Predictor Factors)
                </span>
                <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  R = 0.886 | R² = 0.785 | F = 72.706 (p = 0.000)
                </span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 font-mono text-xs sm:text-sm text-slate-900 overflow-x-auto font-semibold">
                Grades = 80.92 + 0.294(PMI) + 0.887(CM) + 0.865(OPI) − 1.281(MAnx) + 1.673(MSc)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 text-[11px] text-slate-600">
                <div className="bg-white/80 p-2 rounded border border-slate-200/70">
                  <strong className="block text-slate-800">PMI: {results.pmiScore}</strong>
                  <span>Parent Monthly Income (p=.049)</span>
                </div>
                <div className="bg-white/80 p-2 rounded border border-slate-200/70">
                  <strong className="block text-slate-800">CM: {results.concentrationScore}</strong>
                  <span>Concentration &amp; Memory (p=.043)</span>
                </div>
                <div className="bg-white/80 p-2 rounded border border-slate-200/70">
                  <strong className="block text-slate-800">OPI: {results.organizingScore}</strong>
                  <span>Organizing &amp; Processing (p=.046)</span>
                </div>
                <div className="bg-white/80 p-2 rounded border border-slate-200/70">
                  <strong className="block text-slate-800">MAnx: {results.anxietyScore}</strong>
                  <span>Math Anxiety (p=.001)</span>
                </div>
                <div className="bg-white/80 p-2 rounded border border-slate-200/70">
                  <strong className="block text-slate-800">MSc: {results.selfConceptScore}</strong>
                  <span>Math Self-Concept (p=.000)</span>
                </div>
              </div>
            </div>

            {/* Non-Academic Factors Detailed Research Table & Manifestation */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Non-Academic Factor Manifestations & Research Interpretations
                  </h2>
                  <p className="text-xs text-slate-500">
                    Standardized 5-tier Range of Means Scale evaluated against educational research citations
                  </p>
                </div>
                <div className="text-xs font-bold px-2.5 py-1 rounded bg-[#2a632d]/10 text-[#2a632d]">
                  Overall Factor Composite: {results.overallFactorScore} / 5.00
                </div>
              </div>

              {/* Factor Cards with Exact Research Descriptions & Interpretations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Concentration and Memory */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Concentration and Memory
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        results.concentration.description === 'Very High' || results.concentration.description === 'High'
                          ? 'bg-[#2a632d] text-white'
                          : results.concentration.description === 'Moderate'
                          ? 'bg-[#f6d548] text-slate-900'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {results.concentration.description} ({results.concentration.score})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Range of Means: <strong>{results.concentration.range}</strong> • Citation: <em>{results.concentration.citation}</em>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-800">
                    <p className="font-semibold text-[#2a632d]">Official Interpretation:</p>
                    <p className="mt-0.5">{results.concentration.interpretation}</p>
                    <p className="mt-2 text-[11px] text-slate-600 border-t border-slate-100 pt-1.5">
                      <strong>Pedagogical Advice:</strong> {results.concentration.advice}
                    </p>
                  </div>
                </div>

                {/* 2. Organizing and Processing Information */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Organizing and Processing Information
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        results.organizing.description === 'Very High' || results.organizing.description === 'High'
                          ? 'bg-[#2a632d] text-white'
                          : results.organizing.description === 'Moderate'
                          ? 'bg-[#f6d548] text-slate-900'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {results.organizing.description} ({results.organizing.score})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Range of Means: <strong>{results.organizing.range}</strong> • Citation: <em>{results.organizing.citation}</em>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-800">
                    <p className="font-semibold text-[#2a632d]">Official Interpretation:</p>
                    <p className="mt-0.5">{results.organizing.interpretation}</p>
                    <p className="mt-2 text-[11px] text-slate-600 border-t border-slate-100 pt-1.5">
                      <strong>Pedagogical Advice:</strong> {results.organizing.advice}
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
                        results.anxiety.score >= 3.4
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-[#2a632d] text-white'
                      }`}
                    >
                      {results.anxiety.description} ({results.anxiety.score})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Range of Means: <strong>{results.anxiety.range}</strong> • Citation: <em>{results.anxiety.citation}</em>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-800">
                    <p className="font-semibold text-[#2a632d]">Official Interpretation:</p>
                    <p className="mt-0.5">{results.anxiety.interpretation}</p>
                    <p className="mt-2 text-[11px] text-slate-600 border-t border-slate-100 pt-1.5">
                      <strong>Pedagogical Advice:</strong> {results.anxiety.advice}
                    </p>
                  </div>
                </div>

                {/* 4. Math Self-Concept */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Math Self-Concept
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        results.selfConcept.description === 'Very High' || results.selfConcept.description === 'High'
                          ? 'bg-[#2a632d] text-white'
                          : results.selfConcept.description === 'Moderate'
                          ? 'bg-[#f6d548] text-slate-900'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {results.selfConcept.description} ({results.selfConcept.score})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Range of Means: <strong>{results.selfConcept.range}</strong> • Citation: <em>{results.selfConcept.citation}</em>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-800">
                    <p className="font-semibold text-[#2a632d]">Official Interpretation:</p>
                    <p className="mt-0.5">{results.selfConcept.interpretation}</p>
                    <p className="mt-2 text-[11px] text-slate-600 border-t border-slate-100 pt-1.5">
                      <strong>Pedagogical Advice:</strong> {results.selfConcept.advice}
                    </p>
                  </div>
                </div>
              </div>

              {/* Research Reference Scale Legend Table (From PDF Pages 1-5) */}
              <div className="mt-6 pt-5 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Standardized Research Scale Reference Table
                </h3>
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
                          <td className="py-2 px-3">
                            <span className="font-bold text-[#2a632d]">{row.description}</span>
                          </td>
                          <td className="py-2 px-3">
                            Indicates that the factor of junior high school students <strong>{row.manifestation}</strong>.
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Overall Student Advice Summary Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-[#2a632d] text-white flex items-center justify-center">
                  <Award className="w-4 h-4 text-[#f6d548]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Comprehensive Pedagogical Intervention & Student Guidance
                  </h3>
                  <p className="text-xs text-slate-500">
                    Actionable interventions to elevate mathematics achievement
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#2a632d]/5 border border-[#2a632d]/20 space-y-3">
                <div className="text-xs font-bold text-[#2a632d] uppercase tracking-wider">
                  Achievement Trajectory Interpretation:
                </div>
                <p className="text-sm font-semibold text-slate-900">{results.interpretation}</p>

                <div className="pt-2 border-t border-[#2a632d]/15">
                  <div className="text-xs font-bold text-[#2a632d] uppercase tracking-wider mb-2">
                    Dimension-Specific Action Items:
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {results.actionableAdvice.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#2a632d] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
