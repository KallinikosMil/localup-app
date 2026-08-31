import {
  ageOn,
  daysInMonth,
  eligibleOn,
  evaluateDob,
  nextBoxAfterTyping,
  previousBoxOnBackspace,
} from './birthDate';

// Every test pins "today" rather than reading the clock, so none of this
// starts failing on somebody's birthday.
const TODAY = new Date(2026, 7, 31); // 31 August 2026

const at = (day: string, month: string, year: string) =>
  evaluateDob({ day, month, year }, TODAY);

describe('daysInMonth', () => {
  it('knows the short months and the leap years', () => {
    expect(daysInMonth(2008, 0)).toBe(31);
    expect(daysInMonth(2008, 3)).toBe(30);
    expect(daysInMonth(2008, 1)).toBe(29);
    expect(daysInMonth(2007, 1)).toBe(28);
    expect(daysInMonth(1900, 1)).toBe(28);
    expect(daysInMonth(2000, 1)).toBe(29);
  });
});

describe('ageOn', () => {
  it('does not count a birthday that has not happened yet', () => {
    expect(ageOn(new Date(1994, 2, 14), TODAY)).toBe(32);
    // December birthday, so still 31 in August.
    expect(ageOn(new Date(1994, 11, 14), TODAY)).toBe(31);
  });

  it('counts the birthday itself', () => {
    expect(ageOn(new Date(1994, 7, 31), TODAY)).toBe(32);
    // One day later and they are still 31.
    expect(ageOn(new Date(1994, 8, 1), TODAY)).toBe(31);
  });
});

describe('says nothing until there is something to judge', () => {
  it('waits for all four digits of the year', () => {
    expect(at('14', '3', '').kind).toBe('incomplete');
    expect(at('14', '3', '1').kind).toBe('incomplete');
    expect(at('14', '3', '199').kind).toBe('incomplete');
    // Judging at three digits would call 199 too young and then flip.
    expect(at('14', '3', '1994').kind).toBe('ok');
  });

  it('waits for the other two boxes as well', () => {
    expect(at('', '3', '1994').kind).toBe('incomplete');
    expect(at('14', '', '1994').kind).toBe('incomplete');
  });
});

describe('the ordinary mistakes, caught in the same place', () => {
  it('rejects a day the month does not have', () => {
    expect(at('31', '2', '1994').kind).toBe('invalid');
    expect(at('31', '4', '1994').kind).toBe('invalid');
    expect(at('29', '2', '1995').kind).toBe('invalid');
    // …and accepts it in a leap year.
    expect(at('29', '2', '1996').kind).toBe('ok');
  });

  it('rejects an impossible month or day', () => {
    expect(at('14', '13', '1994').kind).toBe('invalid');
    expect(at('0', '3', '1994').kind).toBe('invalid');
    expect(at('14', '0', '1994').kind).toBe('invalid');
  });

  it('rejects a year that is a typo rather than a person', () => {
    expect(at('14', '3', '1899').kind).toBe('invalid');
    expect(at('14', '3', '2030').kind).toBe('invalid');
    expect(at('14', '3', '1900').kind).toBe('ok');
  });

  it('rejects anything that is not digits', () => {
    expect(at('1a', '3', '1994').kind).toBe('invalid');
  });
});

describe('the 18 rule names the day they qualify', () => {
  it('accepts someone exactly 18 today', () => {
    const r = at('31', '8', '2008');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.age).toBe(18);
  });

  it('refuses someone one day short, and says when', () => {
    const r = at('1', '9', '2008');
    expect(r.kind).toBe('tooYoung');
    if (r.kind === 'tooYoung') {
      expect(r.eligibleOn.getFullYear()).toBe(2026);
      expect(r.eligibleOn.getMonth()).toBe(8); // September
      expect(r.eligibleOn.getDate()).toBe(1);
    }
  });

  it('gives a far-off date for someone much younger', () => {
    const r = at('14', '3', '2010');
    expect(r.kind).toBe('tooYoung');
    if (r.kind === 'tooYoung') {
      expect(r.eligibleOn.getFullYear()).toBe(2028);
      expect(r.eligibleOn.getMonth()).toBe(2); // March
    }
  });

  it('reports the age the profile will show', () => {
    const r = at('14', '3', '1994');
    if (r.kind === 'ok') expect(r.age).toBe(32);
  });
});

describe('moving between the boxes', () => {
  it('advances only when the box is full', () => {
    expect(nextBoxAfterTyping('day', '1')).toBeNull();
    expect(nextBoxAfterTyping('day', '14')).toBe('month');
    expect(nextBoxAfterTyping('month', '03')).toBe('year');
    // Nothing after the year.
    expect(nextBoxAfterTyping('year', '1994')).toBeNull();
  });

  it('steps back only out of an empty box', () => {
    expect(previousBoxOnBackspace('year', '19')).toBeNull();
    expect(previousBoxOnBackspace('year', '')).toBe('month');
    expect(previousBoxOnBackspace('month', '')).toBe('day');
    // Nothing before the day.
    expect(previousBoxOnBackspace('day', '')).toBeNull();
  });
});

describe('eligibleOn', () => {
  it('is the eighteenth birthday', () => {
    const d = eligibleOn(new Date(2010, 2, 14));
    expect(d.getFullYear()).toBe(2028);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(14);
  });
});
