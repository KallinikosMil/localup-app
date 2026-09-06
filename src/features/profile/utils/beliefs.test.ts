import { POLITICS, RELIGION, toggleBelief } from './beliefs';

// The ranking maths lives in SQL (discover_candidates) and is not
// duplicated here — an earlier copy was tested by nothing that ran in
// the app. What the client owns is the vocabulary and the toggle.

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

describe('the vocabularies match the database CHECK constraints', () => {
  // These are the exact sets profiles_politics_check and
  // profiles_religion_check accept. A value added here without the
  // migration would be refused by the server on save; one added there
  // without this would be unselectable. Both lists are in
  // scripts/db/2026-09-05_beliefs_and_matching.sql §1.
  it('politics: the five axis positions in order, then apolitical', () => {
    expect([...POLITICS]).toEqual([
      'left',
      'centre_left',
      'centre',
      'centre_right',
      'right',
      'apolitical',
    ]);
  });

  it('religion: the nine categories', () => {
    expect([...RELIGION]).toEqual([
      'agnostic',
      'atheist',
      'buddhist',
      'christian',
      'hindu',
      'jewish',
      'muslim',
      'spiritual',
      'other',
    ]);
  });

  // Deliberately absent. Choosing nothing IS the answer; a chip for it
  // would turn silence into a declaration the person has to make.
  it('has no "prefer not to say" entry', () => {
    expect([...POLITICS, ...RELIGION]).not.toContain('prefer_not_to_say');
  });
});
