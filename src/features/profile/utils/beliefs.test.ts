import {
  POLITICS_AXIS,
  UNANSWERED,
  politicsAffinity,
  religionAffinity,
  toggleBelief,
} from './beliefs';

describe('politics is a spectrum, not a verdict', () => {
  it('scores an identical position highest', () => {
    expect(politicsAffinity('left', 'left')).toBe(1);
  });

  // The whole reason the axis is ordered.
  it('scores neighbours higher than distant positions', () => {
    const oneStep = politicsAffinity('left', 'centre_left');
    const twoSteps = politicsAffinity('left', 'centre');
    const opposite = politicsAffinity('left', 'right');
    expect(oneStep).toBeGreaterThan(twoSteps);
    expect(twoSteps).toBeGreaterThan(opposite);
    expect(opposite).toBe(0);
  });

  it('is symmetric', () => {
    expect(politicsAffinity('left', 'centre_right')).toBe(
      politicsAffinity('centre_right', 'left'),
    );
  });

  // 'apolitical' is not a point on the axis — it declines the question
  // rather than answering it at one end.
  it('treats apolitical as off the axis, not as an extreme', () => {
    const offAxis = politicsAffinity('left', 'apolitical');
    expect(offAxis).toBeGreaterThan(politicsAffinity('left', 'right'));
    expect(offAxis).toBeLessThan(politicsAffinity('left', 'centre'));
    expect(politicsAffinity('right', 'apolitical')).toBe(offAxis);
  });

  it('matches two apolitical people with each other', () => {
    expect(politicsAffinity('apolitical', 'apolitical')).toBe(1);
  });
});

// This is the GDPR-shaped requirement, not a preference: scoring a
// non-answer at zero would rank everyone who declines level with everyone
// who disagrees, which is a standing penalty for withholding Article 9
// data — pressure to disclose it.
describe('declining to answer is never punished', () => {
  it('scores a missing answer in the middle of the field', () => {
    expect(politicsAffinity(null, 'right')).toBe(UNANSWERED);
    expect(politicsAffinity('left', null)).toBe(UNANSWERED);
    expect(politicsAffinity(null, null)).toBe(UNANSWERED);
    expect(religionAffinity(null, 'christian')).toBe(UNANSWERED);
    expect(religionAffinity('atheist', null)).toBe(UNANSWERED);
  });

  it('puts a non-answer above the worst possible match', () => {
    expect(politicsAffinity(null, 'right')).toBeGreaterThan(
      politicsAffinity('left', 'right'),
    );
    expect(religionAffinity(null, 'muslim')).toBeGreaterThan(
      religionAffinity('atheist', 'muslim'),
    );
  });

  it('and below an actual agreement, so answering still means something', () => {
    expect(politicsAffinity(null, 'left')).toBeLessThan(
      politicsAffinity('left', 'left'),
    );
  });
});

describe('religion is categorical', () => {
  it('scores the same faith highest', () => {
    expect(religionAffinity('christian', 'christian')).toBe(1);
  });

  // No order exists in which hindu sits between jewish and muslim, so
  // every difference is the same size.
  it('treats every difference as equal', () => {
    const a = religionAffinity('christian', 'muslim');
    const b = religionAffinity('buddhist', 'atheist');
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(1);
  });
});

describe('an answer can always be taken back', () => {
  it('clears the choice when the chosen one is tapped again', () => {
    expect(toggleBelief('left', 'left')).toBeNull();
  });

  it('replaces it when a different one is tapped', () => {
    expect(toggleBelief('left', 'right')).toBe('right');
  });

  it('sets it from nothing', () => {
    expect(toggleBelief(null, 'centre')).toBe('centre');
  });
});

describe('the axis matches the one the server ranks with', () => {
  // discover_candidates hardcodes this order in v_politics_axis and
  // measures distance along it. If the two ever disagree, the app would
  // explain an ordering the database is not producing.
  it('is the five on-axis positions, in order', () => {
    expect([...POLITICS_AXIS]).toEqual([
      'left',
      'centre_left',
      'centre',
      'centre_right',
      'right',
    ]);
  });
});
