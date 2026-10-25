import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { safeSaveSurveyResponse, SurveyResponsePayload } from '@/lib/supabase/surveyDb';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vmekbymwpzuljzkzlnnz.supabase.co';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_xi0qA5OQXbMfo2OXzQVPjg_wvO86G-h';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    if (!bodyText) {
      return NextResponse.json({ success: false, error: 'Empty payload' }, { status: 400 });
    }

    const payload = JSON.parse(bodyText);
    const {
      userId,
      sex,
      age,
      gradeQ1,
      gradeQ2,
      gradeQ3,
      monthlyIncome,
      answers,
      currentCategory,
      draftId,
    } = payload;

    const recordData: SurveyResponsePayload = {
      user_id: userId || null,
      is_completed: false,
      current_category: currentCategory || 'concentration',
      sex: sex || null,
      age: age ? parseInt(String(age), 10) : null,
      grade_q1: gradeQ1 ? parseFloat(String(gradeQ1)) : null,
      grade_q2: gradeQ2 ? parseFloat(String(gradeQ2)) : null,
      grade_q3: gradeQ3 ? parseFloat(String(gradeQ3)) : null,
      monthly_income: monthlyIncome || null,
      answers: answers || {},
      updated_at: new Date().toISOString(),
    };

    let targetId = draftId;

    // If no draftId provided but user is logged in, check if they have an active draft
    if (!targetId && userId) {
      const { data: existing } = await supabase
        .from('survey_responses')
        .select('id, average_grade')
        .eq('user_id', userId)
        .is('average_grade', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        targetId = existing.id;
      }
    }

    const { data: saved, error } = await safeSaveSurveyResponse(supabase, recordData, targetId);

    if (error) {
      console.error('[Survey Draft API Error]', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Database write error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, draftId: saved?.id || targetId });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[Survey Draft Fatal Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Auto-save failed' },
      { status: 500 }
    );
  }
}
