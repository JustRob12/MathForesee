import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { safeSaveSurveyResponse } from '@/lib/supabase/surveyDb';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vmekbymwpzuljzkzlnnz.supabase.co';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_xi0qA5OQXbMfo2OXzQVPjg_wvO86G-h';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recordData, draftId } = body;

    if (!recordData) {
      return NextResponse.json({ success: false, error: 'No recordData provided' }, { status: 400 });
    }

    const { data, error } = await safeSaveSurveyResponse(supabase, recordData, draftId);

    if (error) {
      console.error('[Survey Submit API Error]', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[Survey Submit API Fatal]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
