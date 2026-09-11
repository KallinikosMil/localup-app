import { useMutation } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { supabase } from '@config/supabase';
import { RootState } from '@store';
import type { ReportReason } from '@features/profile/utils/reportReasons';

type ReportInput = {
  userId: string;
  // The match it was reported from, if any. Lets a reviewer open the
  // right conversation instead of guessing.
  matchId?: string | null;
  reason: ReportReason;
  details?: string;
};

// Files a report. A plain insert, not an RPC: unlike block_user there is
// no second table to touch in the same transaction, and RLS on `reports`
// already says everything that needs saying — you may write a row with
// your own id on it and never read any row back.
//
// Nothing in the cache changes. Reporting is a message to us, not an
// action on the list: they stay matched, stay in the deck, stay
// everything, until a human decides otherwise or the reporter blocks
// them — which is a separate, deliberate choice right next to this one.
export const useReportUser = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);

  return useMutation({
    mutationFn: async ({ userId, matchId, reason, details }: ReportInput) => {
      if (!uid) throw new Error('report: not signed in');
      const { error } = await supabase.from('reports').insert({
        reporter_id: uid,
        reported_id: userId,
        match_id: matchId ?? null,
        reason,
        // Empty stays null rather than '': the column is nullable, and a
        // reviewer filtering on "has details" should not see blanks.
        details: details?.trim() ? details.trim() : null,
      });
      if (error) throw error;
    },
  });
};
