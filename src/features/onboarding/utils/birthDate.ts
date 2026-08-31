// The rules behind the typed date-of-birth field.
//
// Three boxes — DD / MM / YYYY — rather than a picker. A drill-down sheet
// was built first and withdrawn: it was a shape nobody had met, and a
// bespoke grid is worse for a screen reader than a text input, not
// better. A text input is a role every assistive technology already
// drives. Redesign §12.1.
//
// Typing cannot make an illegal date unreachable, so the 18+ rule is
// enforced by CHECKING rather than by hiding, the moment the year is
// complete — and the answer names the date the person becomes eligible
// instead of just refusing.

export const MIN_AGE = 18;
// Below this a birth year is a typo, not a person.
export const MIN_YEAR = 1900;

export type DobInput = { day: string; month: string; year: string };

export type DobResult =
  // Not enough typed yet to judge. Nothing is shown; a half-typed year is
  // not a wrong answer.
  | { kind: 'incomplete' }
  // The parts are numbers but not a real date: 31 February, month 13,
  // a year before 1900.
  | { kind: 'invalid' }
  // A real date, but not old enough. Carries WHEN they qualify, because
  // that is more use than a refusal.
  | { kind: 'tooYoung'; eligibleOn: Date }
  | { kind: 'ok'; date: Date; age: number };

const digits = (s: string) => /^\d+$/.test(s);

export const daysInMonth = (year: number, month: number) =>
  // Day 0 of the NEXT month is the last day of this one, and it handles
  // leap years without a rule of its own.
  new Date(year, month + 1, 0).getDate();

export const ageOn = (birth: Date, on: Date) => {
  let age = on.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    on.getMonth() < birth.getMonth() ||
    (on.getMonth() === birth.getMonth() && on.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
};

// The day the person turns MIN_AGE. Named rather than derived at the call
// site so the copy and the check can never disagree about it.
export const eligibleOn = (birth: Date) =>
  new Date(birth.getFullYear() + MIN_AGE, birth.getMonth(), birth.getDate());

export const evaluateDob = (input: DobInput, today: Date): DobResult => {
  const { day, month, year } = input;

  // A year is only judged once all four digits are there. Checking at
  // three would call 199 too young and then flip, which is worse than
  // saying nothing.
  if (day.length === 0 || month.length === 0 || year.length < 4) {
    return { kind: 'incomplete' };
  }
  if (!digits(day) || !digits(month) || !digits(year)) {
    return { kind: 'invalid' };
  }

  const d = Number(day);
  const m = Number(month);
  const y = Number(year);

  if (y < MIN_YEAR || y > today.getFullYear()) return { kind: 'invalid' };
  if (m < 1 || m > 12) return { kind: 'invalid' };
  // The month's real length, so 31 April and 29 February in a common year
  // are both caught here rather than silently rolling into the next month
  // the way `new Date` would.
  if (d < 1 || d > daysInMonth(y, m - 1)) return { kind: 'invalid' };

  const date = new Date(y, m - 1, d);
  const age = ageOn(date, today);

  if (age < MIN_AGE) return { kind: 'tooYoung', eligibleOn: eligibleOn(date) };

  return { kind: 'ok', date, age };
};

// Typing into a fixed-width box should move on by itself; deleting out of
// an empty one should step back. Both are pure decisions about where the
// cursor belongs next, so they are testable without a component.
export const MAX_LEN = { day: 2, month: 2, year: 4 } as const;

export type DobBox = keyof typeof MAX_LEN;

export const nextBoxAfterTyping = (
  box: DobBox,
  value: string,
): DobBox | null => {
  if (value.length < MAX_LEN[box]) return null;
  if (box === 'day') return 'month';
  if (box === 'month') return 'year';
  return null;
};

export const previousBoxOnBackspace = (
  box: DobBox,
  value: string,
): DobBox | null => {
  if (value.length > 0) return null;
  if (box === 'year') return 'month';
  if (box === 'month') return 'day';
  return null;
};
