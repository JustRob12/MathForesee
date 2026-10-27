'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/Navbar';
import {
  SURVEY_CATEGORIES,
  SURVEY_QUESTIONS,
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
  Award,
  Sparkles,
  BarChart,
  RotateCcw,
  LayoutDashboard,
  ShieldCheck,
  SkipForward,
  Lock,
  Check,
  Loader2,
  Brain,
  Target,
  Shield,
  Zap,
  GraduationCap,
  Trophy,
  Flame,
  Compass,
  Calculator,
  User,
  History,
} from 'lucide-react';

const CATEGORY_ORDER: ('concentration' | 'organizing' | 'anxiety' | 'selfConcept')[] = [
  'concentration',
  'organizing',
  'anxiety',
  'selfConcept',
];

const CATEGORY_THEMES = {
  concentration: {
    title: 'Concentration and Memory',
    subtitle: 'Laser Focus & Retaining Math Formulas',
    badge: 'Focus Dimension',
    icon: Target,
    accent: 'emerald',
    gradient: 'from-emerald-500/10 via-teal-500/5 to-white',
    cardBorder: 'border-emerald-200',
    activeBg: 'bg-[#2a632d]',
    activeText: 'text-emerald-800',
    lightBg: 'bg-emerald-50/80',
    ringColor: 'ring-emerald-500',
    tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    itemCount: 7,
    citation: 'Inojales, 2026',
    friendlyTip: 'Reflect on how easily you stay tuned in during math discussions, even when there are background distractions.',
  },
  organizing: {
    title: 'Organizing and Processing Information',
    subtitle: 'Systematic Fact Sorting & Logical Steps',
    badge: 'Structure Dimension',
    icon: Compass,
    accent: 'blue',
    gradient: 'from-blue-500/10 via-indigo-500/5 to-white',
    cardBorder: 'border-blue-200',
    activeBg: 'bg-blue-600',
    activeText: 'text-blue-800',
    lightBg: 'bg-blue-50/80',
    ringColor: 'ring-blue-500',
    tagColor: 'bg-blue-100 text-blue-800 border-blue-300',
    itemCount: 8,
    citation: 'Hasani et al., 2024',
    friendlyTip: 'Think about how you break down complex word problems and distinguish key formulas from extra details.',
  },
  anxiety: {
    title: 'Math Anxiety',
    subtitle: 'Stress Handling, Exam Jitters & Calm Resilience',
    badge: 'Calmness Shield',
    icon: Shield,
    accent: 'rose',
    gradient: 'from-rose-500/10 via-amber-500/5 to-white',
    cardBorder: 'border-rose-200',
    activeBg: 'bg-rose-600',
    activeText: 'text-rose-800',
    lightBg: 'bg-rose-50/80',
    ringColor: 'ring-rose-500',
    tagColor: 'bg-rose-100 text-rose-800 border-rose-300',
    itemCount: 12,
    citation: 'Hossain et al., 2025; Weir, 2023',
    friendlyTip: 'Be completely honest — there are no wrong answers! Everyone experiences feelings of tension before tests.',
  },
  selfConcept: {
    title: 'Math Self-Concept',
    subtitle: 'Inner Confidence & Belief in Your Math Power',
    badge: 'Confidence Dimension',
    icon: Zap,
    accent: 'amber',
    gradient: 'from-amber-500/10 via-yellow-500/5 to-white',
    cardBorder: 'border-amber-200',
    activeBg: 'bg-amber-600',
    activeText: 'text-amber-900',
    lightBg: 'bg-amber-50/80',
    ringColor: 'ring-amber-500',
    tagColor: 'bg-amber-100 text-amber-900 border-amber-300',
    itemCount: 5,
    citation: 'Peteros et al., 2026',
    friendlyTip: 'How do you view your own mathematical skills? Rate how much you believe in your capability to conquer math!',
  },
};

const LIKERT_CONFIG: Record<
  number,
  {
    emoji: string;
    label: string;
    short: string;
    subtext: string;
    activeClasses: string;
    hoverClasses: string;
  }
> = {
  5: {
    emoji: '🌟',
    label: 'Always true in my case',
    short: 'Always',
    subtext: 'Totally me!',
    activeClasses: 'bg-[#2a632d] text-white shadow-lg ring-2 ring-[#f6d548] scale-[1.02]',
    hoverClasses: 'hover:border-emerald-300 hover:bg-emerald-50/80',
  },
  4: {
    emoji: '👍',
    label: 'Often or usually true in my case',
    short: 'Often',
    subtext: 'Most times',
    activeClasses: 'bg-teal-700 text-white shadow-lg ring-2 ring-teal-300 scale-[1.02]',
    hoverClasses: 'hover:border-teal-300 hover:bg-teal-50/80',
  },
  3: {
    emoji: '🤔',
    label: 'Sometimes true in my case',
    short: 'Sometimes',
    subtext: 'Half & half',
    activeClasses: 'bg-amber-600 text-white shadow-lg ring-2 ring-amber-300 scale-[1.02]',
    hoverClasses: 'hover:border-amber-300 hover:bg-amber-50/80',
  },
  2: {
    emoji: '👎',
    label: 'Rarely or often never true in my case',
    short: 'Rarely',
    subtext: 'Not really',
    activeClasses: 'bg-slate-700 text-white shadow-lg ring-2 ring-slate-400 scale-[1.02]',
    hoverClasses: 'hover:border-slate-300 hover:bg-slate-100/80',
  },
  1: {
    emoji: '⛔',
    label: 'Never true in my case',
    short: 'Never',
    subtext: 'Not at all',
    activeClasses: 'bg-rose-700 text-white shadow-lg ring-2 ring-rose-400 scale-[1.02]',
    hoverClasses: 'hover:border-rose-300 hover:bg-rose-50/80',
  },
};

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male', emoji: '👦', desc: 'Junior High Male' },
  { value: 'Female', label: 'Female', emoji: '👧', desc: 'Junior High Female' },
  { value: 'Prefer not to say', label: 'Prefer not to say', emoji: '🌟', desc: 'Keep Private' },
];

function SurveyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const isRetakeRequested = searchParams?.get('retake') === 'true';

  // Wizard Steps:
  // 0: App Description / Intro Landing (with option to skip)
  // 1: Part I – Demographic Profile & Grades
  // 2: Part II – Factors Affecting Math Achievement
  // 3: Results & Diagnostic Calculation
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [activeFactorTab, setActiveFactorTab] = useState<
    'concentration' | 'organizing' | 'anxiety' | 'selfConcept'
  >('concentration');

  // User, Take & Draft State
  const [userId, setUserId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isRestored, setIsRestored] = useState<boolean>(false);
  const [takeNumber, setTakeNumber] = useState<number>(1);
  const [totalPreviousTakes, setTotalPreviousTakes] = useState<number>(0);

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
        setLastSavedTime(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      }
    } catch {
      // Fail silently for background auto-save
    }
  }, []);

  // Listen to beforeunload & visibilitychange
  useEffect(() => {
    const handleBeforeUnload = () => {
      syncDraftToDatabase(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        syncDraftToDatabase(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncDraftToDatabase]);

  // Load existing user & active draft from Supabase on mount
  useEffect(() => {
    async function loadUserAndDraft() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserId(null);
        return;
      }

      setUserId(user.id);

      try {
        // 1. Fetch count and history of completed surveys for this user
        const { data: previousTakes } = await supabase
          .from('survey_responses')
          .select('id, sex, age, grade_q1, grade_q2, grade_q3, monthly_income, created_at')
          .eq('user_id', user.id)
          .or('is_completed.eq.true,predicted_grade.not.is.null,average_grade.not.is.null')
          .order('created_at', { ascending: false });

        const count = previousTakes?.length || 0;
        setTotalPreviousTakes(count);

        // If explicit retake requested from dashboard or URL:
        if (isRetakeRequested) {
          try {
            localStorage.removeItem('mathforesee_survey_draft');
          } catch {}

          setDraftId(null);
          setAnswers({});
          setTakeNumber(count + 1);

          // Pre-populate demographic fields if previous take exists
          if (previousTakes && previousTakes.length > 0) {
            const last = previousTakes[0];
            if (last.sex) setSex(last.sex);
            if (last.age) setAge(String(last.age));
            if (last.monthly_income) setMonthlyIncome(last.monthly_income);
            if (last.grade_q1 != null) setGradeQ1(String(last.grade_q1));
            if (last.grade_q2 != null) setGradeQ2(String(last.grade_q2));
            if (last.grade_q3 != null) setGradeQ3(String(last.grade_q3));
          }

          setCurrentStep(1);
          return;
        }

        // 2. Check for in-progress draft (is_completed = false)
        const { data: activeDraft } = await supabase
          .from('survey_responses')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_completed', false)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeDraft) {
          setDraftId(activeDraft.id);
          setTakeNumber(count + 1);
          if (activeDraft.sex) setSex(activeDraft.sex);
          if (activeDraft.age) setAge(String(activeDraft.age));
          if (activeDraft.grade_q1 != null) setGradeQ1(String(activeDraft.grade_q1));
          if (activeDraft.grade_q2 != null) setGradeQ2(String(activeDraft.grade_q2));
          if (activeDraft.grade_q3 != null) setGradeQ3(String(activeDraft.grade_q3));
          if (activeDraft.monthly_income) setMonthlyIncome(activeDraft.monthly_income);
          if (activeDraft.answers && typeof activeDraft.answers === 'object') {
            const cleanAnswers: Record<string, number> = {};
            for (const [k, v] of Object.entries(activeDraft.answers)) {
              if (!k.startsWith('_') && typeof v === 'number') {
                cleanAnswers[k] = v;
              }
            }
            setAnswers(cleanAnswers);
          }
          if (activeDraft.current_category) {
            setActiveFactorTab(
              activeDraft.current_category as 'concentration' | 'organizing' | 'anxiety' | 'selfConcept'
            );
          }
          if (
            (activeDraft.answers && Object.keys(activeDraft.answers).length > 0) ||
            activeDraft.grade_q1 ||
            activeDraft.grade_q2 ||
            activeDraft.grade_q3
          ) {
            setCurrentStep(2);
          }
          setIsRestored(true);
          return;
        }

        // 3. Check localStorage draft
        try {
          const localDraft = localStorage.getItem('mathforesee_survey_draft');
          if (localDraft) {
            const parsed = JSON.parse(localDraft);
            setTakeNumber(count + 1);
            if (parsed.sex) setSex(parsed.sex);
            if (parsed.age) setAge(String(parsed.age));
            if (parsed.gradeQ1 != null) setGradeQ1(String(parsed.gradeQ1));
            if (parsed.gradeQ2 != null) setGradeQ2(String(parsed.gradeQ2));
            if (parsed.gradeQ3 != null) setGradeQ3(String(parsed.gradeQ3));
            if (parsed.monthlyIncome) setMonthlyIncome(parsed.monthlyIncome);
            if (parsed.answers) setAnswers(parsed.answers);
            if (parsed.currentCategory) {
              setActiveFactorTab(
                parsed.currentCategory as 'concentration' | 'organizing' | 'anxiety' | 'selfConcept'
              );
            }
            if (
              (parsed.answers && Object.keys(parsed.answers).length > 0) ||
              parsed.gradeQ1 ||
              parsed.gradeQ2 ||
              parsed.gradeQ3
            ) {
              setCurrentStep(2);
            }
            setIsRestored(true);
            return;
          }
        } catch {}

        // 4. If no draft exists and user already completed take(s):
        // Allow starting a fresh take (Take #count+1) without redirecting!
        if (count > 0) {
          setTakeNumber(count + 1);
          setDraftId(null);
          setAnswers({});
          if (previousTakes && previousTakes.length > 0) {
            const last = previousTakes[0];
            if (last.sex) setSex(last.sex);
            if (last.age) setAge(String(last.age));
            if (last.monthly_income) setMonthlyIncome(last.monthly_income);
            if (last.grade_q1 != null) setGradeQ1(String(last.grade_q1));
            if (last.grade_q2 != null) setGradeQ2(String(last.grade_q2));
            if (last.grade_q3 != null) setGradeQ3(String(last.grade_q3));
          }
        }
      } catch (err) {
        console.warn('[Survey Load User Catch]', err);
      }
    }

    loadUserAndDraft();
  }, [supabase, isRetakeRequested]);

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
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // "Previous" button handler in Part II
  const handlePrevious = () => {
    const currentIndex = CATEGORY_ORDER.indexOf(activeFactorTab);
    if (currentIndex === 0) {
      setCurrentStep(1);
    } else {
      setActiveFactorTab(CATEGORY_ORDER[currentIndex - 1]);
      window.scrollTo({ top: 160, behavior: 'smooth' });
    }
  };

  // "Next" button handler in Part II
  const handleNextCategory = () => {
    const currentIndex = CATEGORY_ORDER.indexOf(activeFactorTab);
    if (!isCategoryComplete(activeFactorTab)) {
      setErrorMessage('Please answer all statements in this dimension before moving forward.');
      return;
    }

    setErrorMessage(null);
    if (currentIndex < CATEGORY_ORDER.length - 1) {
      const nextCategory = CATEGORY_ORDER[currentIndex + 1];
      setActiveFactorTab(nextCategory);
      syncDraftToDatabase(false);
      window.scrollTo({ top: 160, behavior: 'smooth' });
    }
  };

  // Reset to retake another attempt cleanly
  const handleRetakeReset = () => {
    try {
      localStorage.removeItem('mathforesee_survey_draft');
    } catch {}
    setDraftId(null);
    setAnswers({});
    setResults(null);
    setTakeNumber((prev) => prev + 1);
    setCurrentStep(1);
    setActiveFactorTab('concentration');
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Final Submission & Calculation (Requires ALL 32 questions completed)
  const allQuestionsAnswered = SURVEY_QUESTIONS.every(
    (q) => answers[q.id] !== undefined && answers[q.id] !== null
  );

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

      // 1. Direct save
      const { data: saved, error } = await safeSaveSurveyResponse(supabase, recordData, draftId);

      // 2. Server API fallback if direct save failed
      if (error || !saved) {
        await fetch('/api/survey/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recordData, draftId }),
        });
      }

      // Clear draft from localStorage
      try {
        localStorage.removeItem('mathforesee_survey_draft');
      } catch {}

      setSavedSuccess(true);
      setCurrentStep(3);
    } catch (err) {
      console.error('[Survey Submission Error]', err);
      setCurrentStep(3);
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

  // Helper for grade mastery badge
  const getGradeMasteryBadge = (val: string) => {
    const g = parseFloat(val);
    if (isNaN(g) || g <= 0) return null;
    if (g >= 90) return { label: '🌟 Outstanding', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (g >= 85) return { label: '⚡ Very Satisfactory', color: 'bg-teal-100 text-teal-800 border-teal-300' };
    if (g >= 80) return { label: '🌱 Satisfactory', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (g >= 75) return { label: '📈 Fairly Satisfactory', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { label: '🎯 Target for Growth', color: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  // Motivational student quote
  const getMotivationalSlogan = (count: number, total: number) => {
    if (count === 0) return 'Ready to unlock your math mindset? Let\'s go!';
    if (count <= 7) return '🌱 Great focus! Dimension 1 in motion!';
    if (count <= 15) return '⚡ Building awesome momentum — halfway through the factors!';
    if (count <= 24) return '🔥 Incredible stamina, mathematician! Almost at the finish line!';
    if (count < total) return '🏁 Final sprint! Only a few statements left to reveal your grade!';
    return '🏆 All 32 statements complete! Your grade prediction is ready to unlock!';
  };

  const currentTheme = CATEGORY_THEMES[activeFactorTab];

  return (
    <div className="min-h-screen flex flex-col bg-math-pattern text-slate-900 relative selection:bg-[#f6d548] selection:text-slate-900">
      <Navbar />

      {/* Decorative Floating Math Background Doodles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0 opacity-40">
        <div className="absolute top-28 left-8 text-2xl font-mono font-black text-emerald-600/20 animate-float-slow">
          π ≈ 3.14159
        </div>
        <div className="absolute top-64 right-12 text-3xl font-mono font-black text-amber-500/20 animate-float-reverse">
          f(x) = ŷ
        </div>
        <div className="absolute bottom-32 left-12 text-4xl font-serif text-teal-600/20 animate-float-reverse">
          ∑(X − X̄)²
        </div>
        <div className="absolute bottom-20 right-20 text-3xl font-mono font-bold text-emerald-700/20 animate-float-slow">
          Δ = b² − 4ac
        </div>
        <div className="absolute top-1/2 left-4 text-emerald-500/15 animate-float-slow">
          <Brain className="w-16 h-16" />
        </div>
        <div className="absolute top-1/3 right-6 text-amber-500/15 animate-float-reverse">
          <Calculator className="w-16 h-16" />
        </div>
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* ========================================================================= */}
        {/* GAMIFIED TOP QUEST PROGRESSION HEADER (STEPS 0 TO 3) */}
        {/* ========================================================================= */}
        <div className="mb-6 bg-white/90 backdrop-blur-md rounded-2xl border border-emerald-900/10 shadow-sm p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2a632d] to-[#1a3d1c] text-[#f6d548] flex items-center justify-center font-black shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    MathForesee AI Quest
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f6d548]/30 text-amber-900 border border-[#f6d548]/60">
                    Attempt #{takeNumber}
                  </span>
                  {totalPreviousTakes > 0 && (
                    <Link
                      href="/dashboard"
                      className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    >
                      <History className="w-3 h-3 text-[#2a632d]" />
                      <span>{totalPreviousTakes} Past Take{totalPreviousTakes > 1 ? 's' : ''} in History</span>
                    </Link>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {getMotivationalSlogan(totalAnswered, totalQuestions)}
                </p>
              </div>
            </div>

            {/* Auto-Save Active Cloud Badge */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#2a632d]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px]">
                  {lastSavedTime
                    ? `Auto-Saved (${lastSavedTime})`
                    : isRestored
                    ? 'Resumed from Draft'
                    : 'Auto-Save Active'}
                </span>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* 4-Stage Interactive Adventure Stepper */}
          <div className="grid grid-cols-4 gap-2 pt-3.5">
            {[
              { step: 0, label: 'Start Quest', icon: Sparkles, short: 'Launch' },
              { step: 1, label: 'Student Profile', icon: User, short: 'Profile' },
              { step: 2, label: 'Mindset Factors', icon: Brain, short: 'Factors' },
              { step: 3, label: 'Predicted Grade', icon: Trophy, short: 'Results' },
            ].map((st) => {
              const isActive = currentStep === st.step;
              const isPast = currentStep > st.step;
              const Icon = st.icon;

              return (
                <div
                  key={st.step}
                  className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-[#2a632d]/10 border-[#2a632d] shadow-xs'
                      : isPast
                      ? 'bg-emerald-50/60 border-emerald-200 text-[#2a632d]'
                      : 'bg-slate-50 border-slate-200/80 text-slate-400'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-transform ${
                      isActive
                        ? 'bg-[#2a632d] text-[#f6d548] scale-105'
                        : isPast
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isPast ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0 hidden md:block">
                    <p
                      className={`text-[11px] font-bold truncate ${
                        isActive ? 'text-[#2a632d]' : isPast ? 'text-slate-800' : 'text-slate-500'
                      }`}
                    >
                      {st.label}
                    </p>
                    <p className="text-[9px] text-slate-400 uppercase font-semibold">
                      {isPast ? 'Done' : isActive ? 'In Progress' : 'Pending'}
                    </p>
                  </div>
                  <div className="min-w-0 md:hidden text-[10px] font-bold truncate">
                    {st.short}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gamified XP Progress Bar */}
          {currentStep === 2 && (
            <div className="mt-3.5 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Flame className="w-4 h-4 text-amber-500" /> Overall Quest Progress:
                </span>
                <span className="text-[#2a632d] font-mono">
                  {totalAnswered} / {totalQuestions} answered ({overallProgress}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 p-0.5 overflow-hidden border border-slate-200">
                <div
                  className="bg-gradient-to-r from-[#2a632d] via-emerald-500 to-[#f6d548] h-full rounded-full transition-all duration-300 shadow-xs"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-900 text-xs font-semibold shadow-xs animate-shake">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 0: APP LAUNCH PAD / ENGAGING STUDENT HERO */}
        {/* ========================================================================= */}
        {currentStep === 0 && (
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-emerald-900/10 shadow-xl overflow-hidden">
            {/* Top Student Banner */}
            <div className="p-6 sm:p-10 border-b border-slate-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-amber-50/50 relative">
              {totalPreviousTakes > 0 && (
                <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-between text-xs text-emerald-900 font-medium">
                  <div className="flex items-center gap-2.5">
                    <History className="w-4 h-4 text-[#2a632d] shrink-0" />
                    <span>
                      You have completed <strong>{totalPreviousTakes}</strong> assessment take{totalPreviousTakes > 1 ? 's' : ''}. Starting this quest records <strong>Attempt #{takeNumber}</strong> in your history.
                    </span>
                  </div>
                  <Link
                    href="/dashboard"
                    className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-[#2a632d] hover:bg-emerald-100 transition-colors shrink-0 ml-3"
                  >
                    View History
                  </Link>
                </div>
              )}

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f6d548]/30 border border-[#f6d548] text-slate-900 text-xs font-bold mb-4 shadow-xs">
                <Sparkles className="w-4 h-4 text-[#2a632d]" />
                <span>AI Mathematics Achievement & Non-Academic Factor Forecaster</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Discover Your <span className="text-[#2a632d]">Math Superpowers</span> & Predicted Final Grade 🚀
              </h2>

              <p className="mt-3.5 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl font-medium">
                Mathematics isn&apos;t just about memorizing formulas — your <strong>focus</strong>,{' '}
                <strong>organization</strong>, <strong>stress resilience</strong>, and{' '}
                <strong>confidence</strong> play a huge role in your academic success. Let&apos;s map out your unique math habits!
              </p>

              {/* 4 Superpower Factor Dimension Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-8">
                {SURVEY_CATEGORIES.map((cat) => {
                  const theme = CATEGORY_THEMES[cat.key];
                  const Icon = theme.icon;

                  return (
                    <div
                      key={cat.key}
                      className={`p-4 rounded-2xl border ${theme.cardBorder} bg-gradient-to-br ${theme.gradient} transition-transform hover:-translate-y-1 hover:shadow-md cursor-default`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl ${theme.lightBg} border ${theme.cardBorder} flex items-center justify-center font-bold shadow-xs`}
                        >
                          <Icon className="w-5 h-5 text-[#2a632d]" />
                        </div>
                        <div>
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider ${theme.activeText}`}>
                            {theme.badge} • {cat.itemCount} Items
                          </span>
                          <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                            {cat.title}
                          </h3>
                        </div>
                      </div>
                      <p className="mt-2.5 text-xs text-slate-600 leading-relaxed font-medium">
                        {cat.description}
                      </p>
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-semibold italic">
                        <span>Research Citation:</span>
                        <span>{cat.citation}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Real-Time Auto Save Assurance */}
              <div className="mt-6 p-4 rounded-2xl bg-[#2a632d]/5 border border-[#2a632d]/20 text-xs text-slate-700 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#2a632d] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[#2a632d]">Never Lose Your Progress:</p>
                  <p className="mt-0.5 text-slate-600 leading-relaxed">
                    Take your time! Every single response is recorded to the cloud automatically as you select it. You can close or resume at any time.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#2a632d] hover:bg-[#214e24] text-white text-sm font-extrabold shadow-lg cursor-pointer btn-tactile-green group"
                >
                  <span>Start Student Assessment</span>
                  <ArrowRight className="w-4 h-4 text-[#f6d548] group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-sm font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <SkipForward className="w-4 h-4 text-slate-500" />
                  <span>Skip to Dashboard</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: PART I – DEMOGRAPHIC PROFILE & OPTIONAL GRADES */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-emerald-900/10 shadow-xl p-6 sm:p-10 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-200">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-[#2a632d] text-xs font-extrabold mb-1.5 border border-emerald-200">
                  <User className="w-3.5 h-3.5" />
                  <span>Phase 1 of 2: Student Identity & Baseline</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900">
                  PART I – Student Demographic Profile
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Tell us a bit about yourself to calibrate your personal mathematical regression baseline.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <span>Skip to Dashboard</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Interactive Gender Cards */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2.5">
                  Sex / Gender
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {GENDER_OPTIONS.map((opt) => {
                    const isSelected = sex === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSex(opt.value)}
                        className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/90 border-[#2a632d] shadow-sm ring-2 ring-[#2a632d]/20'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <span className="text-2xl">{opt.emoji}</span>
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-black ${
                              isSelected ? 'text-[#2a632d]' : 'text-slate-800'
                            }`}
                          >
                            {opt.label}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">{opt.desc}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-[#2a632d] ml-auto shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Age Stepper / Numeric Input */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-800 mb-0.5">
                    Your Age
                  </label>
                  <p className="text-xs text-slate-500 font-medium">
                    Junior High School students are typically between 12 and 18 years old.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseInt(age, 10);
                      if (!isNaN(cur) && cur > 10) setAge(String(cur - 1));
                    }}
                    className="w-9 h-9 rounded-xl bg-white border border-slate-300 text-slate-700 font-black hover:bg-slate-100 flex items-center justify-center text-base cursor-pointer shadow-xs active:scale-95"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-20 px-3 py-2 rounded-xl border border-slate-300 text-center text-lg font-black bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2a632d]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseInt(age, 10);
                      if (!isNaN(cur) && cur < 99) setAge(String(cur + 1));
                    }}
                    className="w-9 h-9 rounded-xl bg-white border border-slate-300 text-slate-700 font-black hover:bg-slate-100 flex items-center justify-center text-base cursor-pointer shadow-xs active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Gamified Quarterly Grades Tracker */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 border border-emerald-900/15 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[#2a632d] text-[#f6d548] flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </span>
                    <label className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Quarterly Mathematics Grades
                    </label>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#f6d548] text-slate-900 border border-amber-300 shadow-xs">
                      Optional
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">Grading Scale: 50 – 100</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Got your report card handy? Enter your quarterly grades for Q1, Q2, and Q3. If you haven&apos;t received them yet, you can leave them blank — MathForesee will still forecast your grade using your 5 psychological factor predictors!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                  {[
                    { key: 'q1', label: 'Quarter 1 (Q1)', val: gradeQ1, setter: setGradeQ1 },
                    { key: 'q2', label: 'Quarter 2 (Q2)', val: gradeQ2, setter: setGradeQ2 },
                    { key: 'q3', label: 'Quarter 3 (Q3)', val: gradeQ3, setter: setGradeQ3 },
                  ].map((item) => {
                    const badge = getGradeMasteryBadge(item.val);
                    return (
                      <div
                        key={item.key}
                        className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-2 hover:border-[#2a632d]/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-slate-700">
                            {item.label}
                          </label>
                          {badge && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          min="50"
                          max="100"
                          step="0.1"
                          value={item.val}
                          onChange={(e) => item.setter(e.target.value)}
                          placeholder="e.g. 85 (optional)"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-base font-extrabold text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2a632d]"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Live Average Grade Banner */}
                {(gradeQ1.trim() !== '' || gradeQ2.trim() !== '' || gradeQ3.trim() !== '') && (
                  <div className="mt-2 p-3 rounded-xl bg-[#2a632d]/10 border border-[#2a632d]/20 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#2a632d]" /> Current Baseline Grade Average:
                    </span>
                    <span className="text-base font-black text-[#2a632d]">
                      {(
                        [parseFloat(gradeQ1), parseFloat(gradeQ2), parseFloat(gradeQ3)]
                          .filter((g) => !isNaN(g) && g > 0)
                          .reduce((a, b, _, arr) => a + b / arr.length, 0)
                      ).toFixed(2)}
                      %
                    </span>
                  </div>
                )}
              </div>

              {/* Monthly Parental Income Selection */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-800 mb-2">
                  Parental Monthly Income Bracket
                </label>
                <p className="text-xs text-slate-500 mb-3 font-medium">
                  Research shows family economic context is a significant factor in educational support.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {PARENT_INCOME_OPTIONS.map((bracket) => {
                    const isSelected = monthlyIncome === bracket;
                    return (
                      <button
                        key={bracket}
                        type="button"
                        onClick={() => setMonthlyIncome(bracket)}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2.5 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#2a632d] text-white border-[#2a632d] shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-sm">{isSelected ? '✓' : '💳'}</span>
                        <span className="truncate">{bracket}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 1 Navigation */}
            <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(0)}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={handleProceedToPart2}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#2a632d] hover:bg-[#214e24] text-white text-xs font-black shadow-md cursor-pointer btn-tactile-green"
              >
                <span>Continue to Mindset Factors</span>
                <ArrowRight className="w-4 h-4 text-[#f6d548]" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: PART II – FACTORS AFFECTING MATHEMATICS ACHIEVEMENT */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-emerald-900/10 shadow-xl p-6 sm:p-10 space-y-6">
            {/* Header with Title and Rating Guide */}
            <div className="pb-4 border-b border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-[#2a632d] text-xs font-extrabold mb-1 border border-emerald-200">
                    <Brain className="w-3.5 h-3.5" />
                    <span>Phase 2 of 2: Non-Academic Factor Inventory</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">
                    PART II – Non-Academic Factors Evaluation
                  </h2>
                </div>

                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs self-start sm:self-auto font-bold">
                  <span className="text-slate-500">Progress:</span>
                  <span className="text-[#2a632d]">
                    {totalAnswered} / {totalQuestions}
                  </span>
                  <span className="text-slate-400">({overallProgress}%)</span>
                </div>
              </div>

              {/* Creative Rating Scale Legend Bar */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-emerald-50/30 to-amber-50/30 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2a632d]" /> Rating Guide (1 to 5):
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold hidden sm:inline">
                    Choose the reaction that best describes your behavior
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {Object.entries(LIKERT_CONFIG)
                    .reverse()
                    .map(([val, cfg]) => (
                      <div
                        key={val}
                        className="px-2.5 py-2 rounded-xl bg-white border border-slate-200 flex items-center gap-2 shadow-2xs"
                      >
                        <span className="text-base">{cfg.emoji}</span>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 leading-none">
                            {val} • {cfg.short}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">{cfg.subtext}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* 4 Category Quest Navigation Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {SURVEY_CATEGORIES.map((cat) => {
                const count = getCategoryAnsweredCount(cat.key);
                const isComplete = count === cat.itemCount;
                const isActive = activeFactorTab === cat.key;
                const theme = CATEGORY_THEMES[cat.key];
                const Icon = theme.icon;

                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      const targetIdx = CATEGORY_ORDER.indexOf(cat.key);
                      const currentIdx = CATEGORY_ORDER.indexOf(activeFactorTab);
                      if (targetIdx <= currentIdx) {
                        setActiveFactorTab(cat.key);
                      } else {
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
                            `Please complete all statements in preceding dimensions before moving to ${cat.title}.`
                          );
                        }
                      }
                    }}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isActive
                        ? 'bg-[#2a632d] text-white border-[#2a632d] shadow-md ring-2 ring-[#f6d548]'
                        : isComplete
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100/70'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                          isActive
                            ? 'bg-white/20 text-[#f6d548]'
                            : isComplete
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isActive
                            ? 'bg-[#f6d548] text-slate-900'
                            : isComplete
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {count}/{cat.itemCount} {isComplete && '✓'}
                      </span>
                    </div>

                    <div>
                      <p
                        className={`text-xs font-black line-clamp-1 ${
                          isActive ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {cat.title}
                      </p>
                      <p
                        className={`text-[10px] truncate ${
                          isActive ? 'text-emerald-100' : 'text-slate-500'
                        }`}
                      >
                        {theme.badge}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Category Mission Briefing Banner */}
            <div
              className={`p-4 rounded-2xl border ${currentTheme.cardBorder} bg-gradient-to-r ${currentTheme.gradient} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${currentTheme.tagColor}`}
                  >
                    {currentTheme.badge}
                  </span>
                  <span className="text-xs font-black text-slate-900">
                    {currentTheme.title}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  {currentTheme.friendlyTip}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-[11px] font-extrabold text-slate-700">
                  {activeAnsweredCount} of {activeTotalCount} answered
                </div>
                <span className="text-[10px] text-slate-500 italic">
                  Citation: {currentTheme.citation}
                </span>
              </div>
            </div>

            {/* Statement Cards with Creative Emoji Reaction Buttons */}
            <div className="space-y-4 pt-1">
              {activeQuestions.map((question) => {
                const selectedValue = answers[question.id];
                const isAnswered = selectedValue !== undefined && selectedValue !== null;

                return (
                  <div
                    key={question.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isAnswered
                        ? 'bg-white border-emerald-300 shadow-sm'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Question Header & Status */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${
                            isAnswered
                              ? 'bg-[#2a632d] text-[#f6d548]'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {question.number}
                        </span>
                        <p className="text-sm font-bold text-slate-900 leading-snug">
                          {question.text}
                        </p>
                      </div>

                      {isAnswered ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-[#2a632d] border border-emerald-200 text-[10px] font-extrabold shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" /> Answered
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-500 text-[10px] font-bold shrink-0">
                          Pending
                        </span>
                      )}
                    </div>

                    {/* 5 Tactile Likert Reaction Buttons */}
                    <div className="grid grid-cols-5 gap-2 pt-3 border-t border-slate-100">
                      {[5, 4, 3, 2, 1].map((val) => {
                        const isSelected = selectedValue === val;
                        const cfg = LIKERT_CONFIG[val];

                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleSelectAnswer(question.id, val)}
                            className={`py-3 px-2 rounded-xl text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 border ${
                              isSelected
                                ? cfg.activeClasses
                                : `bg-white border-slate-200 text-slate-700 ${cfg.hoverClasses}`
                            }`}
                          >
                            <span className="text-xl leading-none">{cfg.emoji}</span>
                            <span className="text-xs font-black leading-none">{val}</span>
                            <span
                              className={`text-[10px] font-bold truncate max-w-[70px] hidden sm:inline ${
                                isSelected ? 'text-white/90' : 'text-slate-500'
                              }`}
                            >
                              {cfg.short}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dimension Complete Celebration Banner */}
            {currentCategoryIsComplete && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center justify-between gap-3 shadow-xs animate-bounce-short">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🎉</span>
                  <div>
                    <p className="font-black text-[#2a632d]">
                      Dimension Completed! ({activeTotalCount}/{activeTotalCount} answered)
                    </p>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      Awesome job! You are ready to proceed to the next quest stage.
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              </div>
            )}

            {/* Bottom Controls */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={handlePrevious}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="w-full sm:w-auto flex items-center gap-3">
                {!isLastCategory ? (
                  <button
                    type="button"
                    onClick={handleNextCategory}
                    disabled={!currentCategoryIsComplete}
                    className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-xs font-black transition-all border ${
                      currentCategoryIsComplete
                        ? 'bg-[#2a632d] hover:bg-[#214e24] text-white shadow-md border-[#214e24] cursor-pointer btn-tactile-green'
                        : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed opacity-80'
                    }`}
                  >
                    <span>
                      {currentCategoryIsComplete
                        ? 'Next Dimension'
                        : `Complete All Statements to Proceed (${activeAnsweredCount}/${activeTotalCount})`}
                    </span>
                    {currentCategoryIsComplete ? (
                      <ArrowRight className="w-4 h-4 text-[#f6d548]" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCalculateAndSubmit}
                    disabled={!allQuestionsAnswered || saving}
                    className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl text-xs font-black transition-all border ${
                      allQuestionsAnswered && !saving
                        ? 'bg-[#2a632d] hover:bg-[#214e24] text-white shadow-xl border-[#214e24] cursor-pointer ring-4 ring-[#f6d548]/40 btn-tactile-green'
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
                        ? 'Calculating Regression Model...'
                        : allQuestionsAnswered
                        ? 'Calculate Grade & Reveal Math Insights 🏆'
                        : `Complete All 32 Statements to Calculate (${totalAnswered}/${totalQuestions})`}
                    </span>
                    {!allQuestionsAnswered && !saving && (
                      <Lock className="w-4 h-4 text-slate-400" />
                    )}
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
            {/* Celebratory Victory Header */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-emerald-900/10 shadow-xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2a632d] to-[#1a3d1c] text-[#f6d548] flex items-center justify-center shrink-0 shadow-md">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2a632d]/10 text-[#2a632d] text-xs font-extrabold mb-1.5 border border-[#2a632d]/20">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2a632d]" />
                      <span>Multiple Linear Regression Evaluated • Attempt #{takeNumber}</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                      Mathematics Achievement Diagnostic & Superpower Report
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Student Profile: {sex} • Age: {age} • Parental Monthly Income: {monthlyIncome}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleRetakeReset}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Retake / New Take</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2a632d] hover:bg-[#214e24] text-white text-xs font-black shadow-md cursor-pointer border border-[#214e24] btn-tactile-green"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-[#f6d548]" />
                    <span>View in History</span>
                  </button>
                </div>
              </div>

              {savedSuccess && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Attempt #{takeNumber} has been safely saved to your record. Your previous takes remain preserved in your history.
                  </span>
                </div>
              )}
            </div>

            {/* Academic Grade & Statistical Accuracy Test (4 Hero Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-5 shadow-sm space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Actual Average Grade
                </span>
                <div className="text-3xl font-black text-slate-900">
                  {results.averageGrade != null ? `${results.averageGrade}%` : 'Optional (N/A)'}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  {results.averageGrade != null
                    ? 'Formula: (Q1 + Q2 + Q3) / 3'
                    : 'Quarterly grades were not provided'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 via-white to-amber-50/50 rounded-2xl border border-emerald-300 p-5 shadow-sm space-y-1 relative overflow-hidden">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#2a632d]">
                  Predicted Final Grade
                </span>
                <div className="text-3xl font-black text-[#2a632d]">
                  {results.predictedGrade}%
                </div>
                <div className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#f6d548] text-slate-900">
                  Formed Regression Model
                </div>
              </div>

              <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-5 shadow-sm space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Accuracy Test Error Rate
                </span>
                <div className="text-3xl font-black text-slate-900">
                  {results.errorRate != null ? `${results.errorRate}%` : '3.56%'}
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                  {results.errorRate != null
                    ? '[(|Actual − Pred|) / Actual] × 100'
                    : 'Benchmark Average (Table 2)'}
                </p>
              </div>

              <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-5 shadow-sm space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#2a632d]">
                  Model Prediction Accuracy
                </span>
                <div className="text-3xl font-black text-[#2a632d]">
                  {results.predictionAccuracy != null ? `${results.predictionAccuracy}%` : '96.44%'}
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                  {results.errorRate != null
                    ? 'Formula: 100 − Error Rate (%)'
                    : 'Research Model Accuracy (N=222, 96.44%)'}
                </p>
              </div>
            </div>

            {/* Regression Model Formula Card */}
            <div className="bg-[#2a632d]/5 rounded-2xl border border-[#2a632d]/25 p-6 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-xs uppercase font-black text-[#2a632d] tracking-wider">
                  Multiple Linear Regression Equation (5 Significant Factors)
                </span>
                <span className="text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                  R = 0.886 | R² = 0.785 | F = 72.706 (p = 0.000)
                </span>
              </div>
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 font-mono text-xs sm:text-sm text-slate-900 overflow-x-auto font-bold shadow-2xs">
                Grades = 80.92 + 0.294(PMI) + 0.887(CM) + 0.865(OPI) − 1.281(MAnx) + 1.673(MSc)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] text-slate-600 font-medium">
                <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
                  <strong className="block text-slate-800">PMI: {results.pmiScore}</strong>
                  <span>Parent Monthly Income</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
                  <strong className="block text-slate-800">CM: {results.concentrationScore}</strong>
                  <span>Concentration &amp; Memory</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
                  <strong className="block text-slate-800">OPI: {results.organizingScore}</strong>
                  <span>Organizing &amp; Processing</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
                  <strong className="block text-slate-800">MAnx: {results.anxietyScore}</strong>
                  <span>Math Anxiety (Negative)</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
                  <strong className="block text-slate-800">MSc: {results.selfConceptScore}</strong>
                  <span>Math Self-Concept</span>
                </div>
              </div>
            </div>

            {/* Non-Academic Factor Manifestations Cards */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-emerald-900/10 p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Your 4 Factor Dimensions & Research Interpretations
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Evaluated against the standardized 5-tier Range of Means educational research scale
                  </p>
                </div>
                <div className="text-xs font-black px-3 py-1.5 rounded-full bg-[#2a632d]/10 text-[#2a632d] border border-[#2a632d]/20 self-start sm:self-auto">
                  Overall Factor Composite: {results.overallFactorScore} / 5.00
                </div>
              </div>

              {/* 4 Factor Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    title: 'Concentration and Memory',
                    score: results.concentration.score,
                    desc: results.concentration.description,
                    range: results.concentration.range,
                    citation: results.concentration.citation,
                    interpretation: results.concentration.interpretation,
                    advice: results.concentration.advice,
                    icon: Target,
                    color: 'emerald',
                  },
                  {
                    title: 'Organizing and Processing Information',
                    score: results.organizing.score,
                    desc: results.organizing.description,
                    range: results.organizing.range,
                    citation: results.organizing.citation,
                    interpretation: results.organizing.interpretation,
                    advice: results.organizing.advice,
                    icon: Compass,
                    color: 'blue',
                  },
                  {
                    title: 'Math Anxiety',
                    score: results.anxiety.score,
                    desc: results.anxiety.description,
                    range: results.anxiety.range,
                    citation: results.anxiety.citation,
                    interpretation: results.anxiety.interpretation,
                    advice: results.anxiety.advice,
                    icon: Shield,
                    color: 'rose',
                  },
                  {
                    title: 'Math Self-Concept',
                    score: results.selfConcept.score,
                    desc: results.selfConcept.description,
                    range: results.selfConcept.range,
                    citation: results.selfConcept.citation,
                    interpretation: results.selfConcept.interpretation,
                    advice: results.selfConcept.advice,
                    icon: Zap,
                    color: 'amber',
                  },
                ].map((factor) => {
                  const Icon = factor.icon;
                  return (
                    <div
                      key={factor.title}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-[#2a632d]" />
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                            {factor.title}
                          </span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            factor.desc === 'Very High' || factor.desc === 'High'
                              ? 'bg-[#2a632d] text-white'
                              : factor.desc === 'Moderate'
                              ? 'bg-[#f6d548] text-slate-900'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {factor.desc} ({factor.score})
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 font-medium">
                        Range of Means: <strong>{factor.range}</strong> • Citation: <em>{factor.citation}</em>
                      </div>

                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 space-y-2">
                        <div>
                          <p className="font-bold text-[#2a632d]">Official Interpretation:</p>
                          <p className="mt-0.5 font-medium leading-relaxed">{factor.interpretation}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                          <strong className="text-slate-800">Pedagogical Advice:</strong> {factor.advice}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Research Scale Table */}
              <div className="mt-6 pt-5 border-t border-slate-200">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5">
                  Standardized Research Scale Reference Table
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3.5">Range of Means</th>
                        <th className="py-2.5 px-3.5">Description</th>
                        <th className="py-2.5 px-3.5">Standard Manifestation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {RANGE_OF_MEANS_TABLE.map((row) => (
                        <tr key={row.range} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3.5 font-mono font-bold">{row.range}</td>
                          <td className="py-2.5 px-3.5">
                            <span className="font-extrabold text-[#2a632d]">{row.description}</span>
                          </td>
                          <td className="py-2.5 px-3.5">
                            Indicates that the factor of junior high students <strong>{row.manifestation}</strong>.
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Overall Student Advice Summary Card */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-emerald-900/10 p-6 sm:p-8 shadow-xl space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-[#2a632d] text-white flex items-center justify-center shadow-xs">
                  <Award className="w-5 h-5 text-[#f6d548]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Comprehensive Pedagogical Intervention & Action Items
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Personalized tips to elevate your mathematics performance
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#2a632d]/5 border border-[#2a632d]/20 space-y-3">
                <div className="text-xs font-black text-[#2a632d] uppercase tracking-wider">
                  Achievement Trajectory:
                </div>
                <p className="text-sm font-extrabold text-slate-900 leading-relaxed">
                  {results.interpretation}
                </p>

                <div className="pt-3 border-t border-[#2a632d]/15">
                  <div className="text-xs font-black text-[#2a632d] uppercase tracking-wider mb-2.5">
                    Dimension-Specific Action Items:
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 font-medium">
                    {results.actionableAdvice.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-[#2a632d] shrink-0 mt-0.5 stroke-[3]" />
                        <span className="leading-relaxed">{item}</span>
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

export default function SurveyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-slate-50 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-slate-200 border-t-[#2a632d] rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-700">Loading Assessment...</p>
          </div>
        </div>
      }
    >
      <SurveyContent />
    </Suspense>
  );
}
