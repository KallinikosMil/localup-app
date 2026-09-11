// The reasons a person can give when reporting someone.
//
// The list is the CONTRACT with public.reports' CHECK constraint: a value
// missing from the database side is rejected as 23514, one missing here
// simply cannot be chosen. Change both together.
//
// 'underage' sits first on purpose. It is the case Google's child-safety
// policy exists for, and the one that must never be buried under "other".

export const REPORT_REASONS = [
  'underage',
  'harassment',
  'inappropriate_photos',
  'fake_profile',
  'spam',
  'other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const isReportReason = (value: string): value is ReportReason =>
  (REPORT_REASONS as readonly string[]).includes(value);

// Free text is optional for every reason but one: "other" without a word
// of explanation is a report nobody can act on.
export const needsDetails = (reason: ReportReason) => reason === 'other';

export const DETAILS_MAX = 1000;
