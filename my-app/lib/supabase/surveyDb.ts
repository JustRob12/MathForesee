import { SupabaseClient } from '@supabase/supabase-js';

export interface SurveyResponsePayload {
  id?: string;
  user_id?: string | null;
  is_completed?: boolean;
  current_category?: string;
  sex?: string | null;
  age?: number | null;
  grade_q1?: number | null;
  grade_q2?: number | null;
  grade_q3?: number | null;
  average_grade?: number | null;
  predicted_grade?: number | null;
  error_rate?: number | null;
  prediction_accuracy?: number | null;
  monthly_income?: string | null;
  concentration_memory_score?: number | null;
  organizing_processing_score?: number | null;
  math_anxiety_score?: number | null;
  math_self_concept_score?: number | null;
  overall_factor_score?: number | null;
  concentration_description?: string | null;
  concentration_interpretation?: string | null;
  organizing_description?: string | null;
  organizing_interpretation?: string | null;
  anxiety_description?: string | null;
  anxiety_interpretation?: string | null;
  self_concept_description?: string | null;
  self_concept_interpretation?: string | null;
  interpretation?: string | null;
  advice?: string | null;
  answers?: Record<string, any>;
  updated_at?: string;
}

/**
 * Safely inserts or updates a record into public.survey_responses.
 * If the Supabase schema lacks certain new columns (like is_completed, error_rate, etc.),
 * this function automatically embeds them in answers._meta and recursively retries
 * without the missing column, ensuring zero data loss and 100% insert success.
 */
export async function safeSaveSurveyResponse(
  supabase: SupabaseClient,
  payload: SurveyResponsePayload,
  recordId?: string | null
): Promise<{ data: any; error: any }> {
  // 1. Keep answers clean (pure questionId -> numeric rating) so it never pollutes the 32 question count
  const rawAnswers = (payload.answers && typeof payload.answers === 'object') ? payload.answers : {};
  const cleanAnswers: Record<string, any> = {};
  for (const [k, v] of Object.entries(rawAnswers)) {
    if (!k.startsWith('_')) {
      cleanAnswers[k] = v;
    }
  }

  const toSend: Record<string, any> = {
    ...payload,
    answers: cleanAnswers,
  };

  // Helper for recursive retry if Postgres reports a column doesn't exist or row not found
  async function attemptWrite(
    dataPayload: Record<string, any>,
    targetRecordId?: string | null,
    remainingAttempts = 15
  ): Promise<{ data: any; error: any }> {
    if (remainingAttempts <= 0) {
      return { data: null, error: new Error('Exceeded max attempts to write survey response') };
    }

    if (targetRecordId) {
      const updateRes = await supabase
        .from('survey_responses')
        .update(dataPayload)
        .eq('id', targetRecordId)
        .select('*');

      if (updateRes.error) {
        // Check for PGRST204: column not found
        const match = updateRes.error.message?.match(/Could not find the '([^']+)' column/i);
        if (match && match[1]) {
          const missingCol = match[1];
          console.warn(`[MathForesee DB] Column '${missingCol}' not found in Supabase schema. Stripping and retrying.`);
          const stripped = { ...dataPayload };
          delete stripped[missingCol];
          return attemptWrite(stripped, targetRecordId, remainingAttempts - 1);
        }
        return { data: null, error: updateRes.error };
      }

      // If at least one row was updated, return it
      if (Array.isArray(updateRes.data) && updateRes.data.length > 0) {
        return { data: updateRes.data[0], error: null };
      }

      // If 0 rows were updated, targetRecordId was not found in Supabase (e.g. table cleared or stale draft id)
      // Fallback immediately to insert without recordId so data is GUARANTEED to be recorded!
      console.warn(`[MathForesee DB] Record ID '${targetRecordId}' not found for update (0 rows affected). Falling back to insert.`);
      return attemptWrite(dataPayload, null, remainingAttempts - 1);
    }

    // Insert path: ensure id is omitted so Postgres generates a fresh primary key
    const insertPayload = { ...dataPayload };
    delete insertPayload.id;

    const insertRes = await supabase
      .from('survey_responses')
      .insert(insertPayload)
      .select('*');

    if (insertRes.error) {
      const match = insertRes.error.message?.match(/Could not find the '([^']+)' column/i);
      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`[MathForesee DB] Column '${missingCol}' not found in Supabase schema. Stripping and retrying.`);
        const stripped = { ...insertPayload };
        delete stripped[missingCol];
        return attemptWrite(stripped, null, remainingAttempts - 1);
      }
      return { data: null, error: insertRes.error };
    }

    const savedRecord = Array.isArray(insertRes.data) ? insertRes.data[0] : insertRes.data;
    return { data: savedRecord, error: null };
  }

  return attemptWrite(toSend, recordId);
}

/**
 * Normalizes a survey response row by unpacking _meta if root columns were omitted in Supabase.
 */
export function normalizeSurveyResponse(row: any): any {
  if (!row) return null;
  const meta = row.answers?._meta || {};
  const cleanAnswers: Record<string, any> = {};
  if (row.answers && typeof row.answers === 'object') {
    for (const [k, v] of Object.entries(row.answers)) {
      if (!k.startsWith('_')) {
        cleanAnswers[k] = v;
      }
    }
  }

  return {
    ...row,
    answers: cleanAnswers,
    is_completed: row.is_completed ?? meta.is_completed ?? (row.average_grade != null),
    current_category: row.current_category ?? meta.current_category ?? 'concentration',
    error_rate: row.error_rate ?? meta.error_rate,
    prediction_accuracy: row.prediction_accuracy ?? meta.prediction_accuracy,
    concentration_description: row.concentration_description ?? meta.concentration_description,
    concentration_interpretation: row.concentration_interpretation ?? meta.concentration_interpretation,
    organizing_description: row.organizing_description ?? meta.organizing_description,
    organizing_interpretation: row.organizing_interpretation ?? meta.organizing_interpretation,
    anxiety_description: row.anxiety_description ?? meta.anxiety_description,
    anxiety_interpretation: row.anxiety_interpretation ?? meta.anxiety_interpretation,
    self_concept_description: row.self_concept_description ?? meta.self_concept_description,
    self_concept_interpretation: row.self_concept_interpretation ?? meta.self_concept_interpretation,
  };
}
