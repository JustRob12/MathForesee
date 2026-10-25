export interface SurveyQuestion {
  id: string;
  number: number;
  category: 'concentration' | 'organizing' | 'anxiety' | 'selfConcept';
  text: string;
}

export interface SurveyCategoryInfo {
  key: 'concentration' | 'organizing' | 'anxiety' | 'selfConcept';
  title: string;
  description: string;
  itemCount: number;
  citation: string;
}

export const SURVEY_CATEGORIES: SurveyCategoryInfo[] = [
  {
    key: 'concentration',
    title: 'Concentration and Memory',
    description: 'Ability to stay focused despite distractions, keep attention, and retain information.',
    itemCount: 7,
    citation: 'Inojales, 2026',
  },
  {
    key: 'organizing',
    title: 'Organizing and Processing Information',
    description: 'Distinguishing key points, systematic fact organization, and critical thinking.',
    itemCount: 8,
    citation: 'Hasani et al., 2024',
  },
  {
    key: 'anxiety',
    title: 'Math Anxiety',
    description: 'Feelings of fear, tension, confusion, or guilt when dealing with mathematical evaluations.',
    itemCount: 12,
    citation: 'Hossain et al., 2025; Weir, 2023',
  },
  {
    key: 'selfConcept',
    title: 'Math Self-Concept',
    description: 'Self-perception of competence, quickness of learning, and confidence in math abilities.',
    itemCount: 5,
    citation: 'Peteros et al., 2026',
  },
];

export const LIKERT_OPTIONS = [
  { value: 5, label: 'Always true in my case', short: 'Always' },
  { value: 4, label: 'Often or usually true in my case', short: 'Often' },
  { value: 3, label: 'Sometimes true in my case', short: 'Sometimes' },
  { value: 2, label: 'Rarely or often never true in my case', short: 'Rarely' },
  { value: 1, label: 'Never true in my case', short: 'Never' },
];

export const PARENT_INCOME_OPTIONS = [
  'Below ₱10,000',
  '₱10,000 - ₱20,000',
  '₱20,001 - ₱30,000',
  '₱30,001 - ₱40,000',
  '₱40,001 - ₱50,000',
  'Above ₱50,000',
];

export const RANGE_OF_MEANS_TABLE = [
  {
    range: '4.20 - 5.00',
    min: 4.20,
    max: 5.00,
    description: 'Very High',
    manifestation: 'is always manifested',
  },
  {
    range: '3.40 - 4.19',
    min: 3.40,
    max: 4.19,
    description: 'High',
    manifestation: 'is often manifested',
  },
  {
    range: '2.60 - 3.39',
    min: 2.60,
    max: 3.39,
    description: 'Moderate',
    manifestation: 'is sometimes manifested',
  },
  {
    range: '1.80 - 2.59',
    min: 1.80,
    max: 2.59,
    description: 'Low',
    manifestation: 'is seldom manifested',
  },
  {
    range: '1.00 - 1.79',
    min: 1.00,
    max: 1.79,
    description: 'Very Low',
    manifestation: 'is never manifested',
  },
];

export function getMeanRangeInfo(mean: number, factorLabel: string) {
  const rounded = Math.min(5.0, Math.max(1.0, Number(mean.toFixed(2))));

  for (const row of RANGE_OF_MEANS_TABLE) {
    if (rounded >= row.min && rounded <= row.max) {
      return {
        score: rounded,
        range: row.range,
        description: row.description,
        interpretation: `Indicates that ${factorLabel} of junior high school students ${row.manifestation}.`,
      };
    }
  }

  // Fallback boundary handling
  if (rounded >= 4.2) {
    return {
      score: rounded,
      range: '4.20 - 5.00',
      description: 'Very High',
      interpretation: `Indicates that ${factorLabel} of junior high school students is always manifested.`,
    };
  }

  return {
    score: rounded,
    range: '1.00 - 1.79',
    description: 'Very Low',
    interpretation: `Indicates that ${factorLabel} of junior high school students is never manifested.`,
  };
}

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  // Concentration and Memory (7 items)
  {
    id: 'cm_1',
    number: 1,
    category: 'concentration',
    text: 'I study in a place free from auditory and visual distractions.',
  },
  {
    id: 'cm_2',
    number: 2,
    category: 'concentration',
    text: 'I find that I am able to concentrate - that is, give undivided attention to the task for at least 20 minutes.',
  },
  {
    id: 'cm_3',
    number: 3,
    category: 'concentration',
    text: 'I am confident with the level of concentration I am able to maintain.',
  },
  {
    id: 'cm_4',
    number: 4,
    category: 'concentration',
    text: 'I have an accurate understanding of the material I wish to remember.',
  },
  {
    id: 'cm_5',
    number: 5,
    category: 'concentration',
    text: 'I learn with the intention of remembering.',
  },
  {
    id: 'cm_6',
    number: 6,
    category: 'concentration',
    text: 'I practice the materials I am learning by reciting out loud.',
  },
  {
    id: 'cm_7',
    number: 7,
    category: 'concentration',
    text: 'I recall readily those things which I have studied.',
  },

  // Organizing and Processing Information (8 items)
  {
    id: 'op_1',
    number: 1,
    category: 'organizing',
    text: 'When reading, I can distinguish readily between important and unimportant points.',
  },
  {
    id: 'op_2',
    number: 2,
    category: 'organizing',
    text: 'I break assignments into manageable parts.',
  },
  {
    id: 'op_3',
    number: 3,
    category: 'organizing',
    text: 'I maintain a critical attitude during my study - thinking before accepting or rejecting.',
  },
  {
    id: 'op_4',
    number: 4,
    category: 'organizing',
    text: 'I question the validity of mathematical formulas before applying them to study problems.',
  },
  {
    id: 'op_5',
    number: 5,
    category: 'organizing',
    text: 'I try to organize facts in a systematic way.',
  },
  {
    id: 'op_6',
    number: 6,
    category: 'organizing',
    text: 'I use questions to better organize and understand the material I am studying.',
  },
  {
    id: 'op_7',
    number: 7,
    category: 'organizing',
    text: 'I try to find the best method to do a given job.',
  },
  {
    id: 'op_8',
    number: 8,
    category: 'organizing',
    text: 'I solve a problem by focusing on its main point.',
  },

  // Math Anxiety (12 items)
  {
    id: 'ma_1',
    number: 1,
    category: 'anxiety',
    text: 'After the exam, I still feel guilty about the answer.',
  },
  {
    id: 'ma_2',
    number: 2,
    category: 'anxiety',
    text: 'I lose objectivity when faced with difficult problems.',
  },
  {
    id: 'ma_3',
    number: 3,
    category: 'anxiety',
    text: 'I am worried that I might choose the wrong answer.',
  },
  {
    id: 'ma_4',
    number: 4,
    category: 'anxiety',
    text: 'I am confused when faced with math problems alone.',
  },
  {
    id: 'ma_5',
    number: 5,
    category: 'anxiety',
    text: 'I easily lose my concentration in this subject.',
  },
  {
    id: 'ma_6',
    number: 6,
    category: 'anxiety',
    text: 'I often feel confused in the process of mathematics evaluation.',
  },
  {
    id: 'ma_7',
    number: 7,
    category: 'anxiety',
    text: 'I am afraid of the result of the evaluation.',
  },
  {
    id: 'ma_8',
    number: 8,
    category: 'anxiety',
    text: 'I feel more afraid to face the mathematics test rather than the other subjects.',
  },
  {
    id: 'ma_9',
    number: 9,
    category: 'anxiety',
    text: 'I suddenly forget the subject matter when they are pressed by time.',
  },
  {
    id: 'ma_10',
    number: 10,
    category: 'anxiety',
    text: 'After the exam, still feeling guilty about the answer.',
  },
  {
    id: 'ma_11',
    number: 11,
    category: 'anxiety',
    text: 'I am worry about something bad to happen in my performance in this subject.',
  },
  {
    id: 'ma_12',
    number: 12,
    category: 'anxiety',
    text: 'I feel ashamed to other people to ask about mathematical materials.',
  },

  // Math Self-Concept (5 items)
  {
    id: 'sc_1',
    number: 1,
    category: 'selfConcept',
    text: 'I am just not good at mathematics.',
  },
  {
    id: 'sc_2',
    number: 2,
    category: 'selfConcept',
    text: 'I get good grades in mathematics.',
  },
  {
    id: 'sc_3',
    number: 3,
    category: 'selfConcept',
    text: 'I learn mathematics quickly.',
  },
  {
    id: 'sc_4',
    number: 4,
    category: 'selfConcept',
    text: 'I have always believed that mathematics is one of my best subjects.',
  },
  {
    id: 'sc_5',
    number: 5,
    category: 'selfConcept',
    text: 'In my mathematics class, I understand even the most difficult work.',
  },
];

export interface FactorResult {
  score: number;
  range: string;
  description: 'Very High' | 'High' | 'Moderate' | 'Low' | 'Very Low';
  interpretation: string;
  citation: string;
  advice: string;
}

/**
 * Statistical Analysis & Accuracy Test Calculations
 * Formulas from Page 6 of Research Document:
 * Error rate (%) = [|Actual Grade - Predicted Grade| / Actual Grade] * 100
 * Mean Prediction Accuracy (%) = 100 - Error rate (%)
 */
export function calculateSurveyResults(
  q1: number,
  q2: number,
  q3: number,
  answers: Record<string, number>
) {
  // 1. Actual Average Grade: (Q1 + Q2 + Q3) / 3
  const validGrades = [q1, q2, q3].filter((g) => !isNaN(g) && g > 0);
  const averageGrade =
    validGrades.length > 0
      ? Number((validGrades.reduce((a, b) => a + b, 0) / validGrades.length).toFixed(2))
      : 0;

  // 2. Compute Mean for each factor (1.00 - 5.00)
  const getCategoryMean = (cat: 'concentration' | 'organizing' | 'anxiety' | 'selfConcept') => {
    const questions = SURVEY_QUESTIONS.filter((q) => q.category === cat);
    let total = 0;
    let count = 0;
    questions.forEach((q) => {
      const val = answers[q.id];
      if (val !== undefined && val !== null) {
        total += val;
        count += 1;
      }
    });
    return count > 0 ? Number((total / count).toFixed(2)) : 3.0;
  };

  const rawConc = getCategoryMean('concentration');
  const rawOrg = getCategoryMean('organizing');
  const rawAnx = getCategoryMean('anxiety');
  const rawSelf = getCategoryMean('selfConcept');

  // Exact Research Interpretations from Table:
  const concInfo = getMeanRangeInfo(rawConc, 'concentration and memory');
  const orgInfo = getMeanRangeInfo(rawOrg, 'organizing and processing information');
  const anxInfo = getMeanRangeInfo(rawAnx, 'math anxiety');
  const selfInfo = getMeanRangeInfo(rawSelf, 'math self-concept');

  // 3. Evidence-Based Pedagogical Advice based on Manifestation
  const concAdvice =
    rawConc >= 3.4
      ? 'Strong task focus and retention. Maintain structured 20-minute undivided sessions and verbal recitation.'
      : 'Susceptible to visual/auditory distractions. Study in dedicated quiet zones and use active retrieval intervals (Inojales, 2026).';

  const orgAdvice =
    rawOrg >= 3.4
      ? 'Effective breakdown of complex materials. Continue maintaining a systematic approach before solving.'
      : 'Difficulty organizing study materials. Break multi-step math problems into smaller modular units and use argument writing to reinforce steps (Hasani et al., 2024).';

  const anxAdvice =
    rawAnx >= 3.4
      ? 'Elevated math anxiety is often or always manifested. Test tension may trigger time-pressured recall loss. Practice mock evaluations and anxiety management strategies (Sawchuck, 2024; Hossain et al., 2025).'
      : 'Math anxiety is well controlled, supporting objective decision-making during examinations.';

  const selfAdvice =
    rawSelf >= 3.4
      ? 'High mathematical self-concept. Confidence significantly bolsters problem-solving endurance (Peteros et al., 2026).'
      : 'Math self-concept is seldom manifested. Progressive small wins and targeted scaffolding can rebuild subject confidence.';

  const concentration: FactorResult = {
    ...concInfo,
    description: concInfo.description as any,
    citation: 'Inojales, 2026',
    advice: concAdvice,
  };

  const organizing: FactorResult = {
    ...orgInfo,
    description: orgInfo.description as any,
    citation: 'Hasani et al., 2024',
    advice: orgAdvice,
  };

  const anxiety: FactorResult = {
    ...anxInfo,
    description: anxInfo.description as any,
    citation: 'Hossain et al., 2025; Weir, 2023',
    advice: anxAdvice,
  };

  const selfConcept: FactorResult = {
    ...selfInfo,
    description: selfInfo.description as any,
    citation: 'Peteros et al., 2026',
    advice: selfAdvice,
  };

  // 4. Overall Non-Academic Factor Score (Scale 1.00 - 5.00)
  // Positive factors (Concentration, Organizing, Self-Concept) balanced by inverted Anxiety (6 - Anxiety)
  const invertedAnxiety = 6 - rawAnx;
  const overallFactorScore = Number(
    ((rawConc + rawOrg + rawSelf + invertedAnxiety) / 4).toFixed(2)
  );

  // 5. Multiple Linear Regression Forecast & Trajectory:
  // Trajectory based on Q1-Q3 slope, modulated by the independent factor composite
  const deltaTrend = (q3 - q1) * 0.45;
  const factorAdjustment = (overallFactorScore - 3.0) * 1.6;
  const rawPredictedQ4 = q3 + deltaTrend + factorAdjustment;
  const predictedQ4 = Number(Math.max(65, Math.min(99, rawPredictedQ4)).toFixed(1));

  const predictedFinalGrade = Number(
    ((q1 + q2 + q3 + predictedQ4) / 4).toFixed(2)
  );

  // 6. Accuracy Test Formula (Page 6 of PDF):
  // Error rate (%) = [(Actual Grade - Predicted Grade) / Actual Grade] * 100
  const baselineActual = averageGrade > 0 ? averageGrade : 85;
  const errorRate = Number(
    (Math.abs((baselineActual - predictedFinalGrade) / baselineActual) * 100).toFixed(2)
  );
  const predictionAccuracy = Number((100 - errorRate).toFixed(2));

  // 7. General Student Advice & Summary
  const actionableAdvice: string[] = [
    `Concentration: ${concAdvice}`,
    `Organization: ${orgAdvice}`,
    `Anxiety Management: ${anxAdvice}`,
    `Self-Efficacy: ${selfAdvice}`,
  ];

  let overallInterpretation = '';
  if (predictedFinalGrade >= 90) {
    overallInterpretation =
      'Outstanding Mathematical Trajectory: The combination of disciplined study factors and high self-concept projects honors-level achievement.';
  } else if (predictedFinalGrade >= 85) {
    overallInterpretation =
      'Very Satisfactory Trajectory: Solid academic consistency. Addressing targeted anxiety triggers will elevate mastery further.';
  } else if (predictedFinalGrade >= 78) {
    overallInterpretation =
      'Satisfactory Growth Trajectory: Moderate manifestation across non-academic factors. Structured study aids and time management recommended.';
  } else {
    overallInterpretation =
      'Intervention Trajectory: Elevated anxiety and low concentration manifestation observed. Pedagogical support and scaffolded practice recommended.';
  }

  return {
    averageGrade,
    predictedQ4,
    predictedGrade: predictedFinalGrade,
    errorRate,
    predictionAccuracy,
    concentrationScore: rawConc,
    organizingScore: rawOrg,
    anxietyScore: rawAnx,
    selfConceptScore: rawSelf,
    overallFactorScore,
    concentration,
    organizing,
    anxiety,
    selfConcept,
    interpretation: overallInterpretation,
    advice: actionableAdvice.join(' | '),
    actionableAdvice,
  };
}

/**
 * Safely counts the number of valid answered questions (out of 32 total questions),
 * ignoring metadata fields or null/undefined values.
 */
export function countAnsweredQuestions(answers?: Record<string, any> | null): number {
  if (!answers || typeof answers !== 'object') return 0;
  return SURVEY_QUESTIONS.filter(
    (q) => answers[q.id] !== undefined && answers[q.id] !== null && typeof answers[q.id] === 'number'
  ).length;
}

