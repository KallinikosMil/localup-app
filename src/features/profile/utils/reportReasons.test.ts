import {
  REPORT_REASONS,
  isReportReason,
  needsDetails,
  DETAILS_MAX,
} from './reportReasons';

describe('report reasons', () => {
  // The child-safety case must be the first thing a reporter sees, not
  // something found under "other". Pinned so a reorder cannot bury it.
  it('offers underage first', () => {
    expect(REPORT_REASONS[0]).toBe('underage');
  });

  // This list IS the CHECK constraint on public.reports. If someone adds a
  // reason here without the migration, the insert fails with 23514 at
  // runtime; this at least keeps the app side honest about what it sends.
  it('matches the values the database accepts', () => {
    expect([...REPORT_REASONS]).toEqual([
      'underage',
      'harassment',
      'inappropriate_photos',
      'fake_profile',
      'spam',
      'other',
    ]);
  });

  it('recognises its own values and nothing else', () => {
    expect(isReportReason('spam')).toBe(true);
    expect(isReportReason('Spam')).toBe(false);
    expect(isReportReason('')).toBe(false);
  });

  it('only insists on details for "other"', () => {
    expect(needsDetails('other')).toBe(true);
    for (const r of REPORT_REASONS.filter(r => r !== 'other')) {
      expect(needsDetails(r)).toBe(false);
    }
  });

  it('caps details where the column does', () => {
    expect(DETAILS_MAX).toBe(1000);
  });
});
