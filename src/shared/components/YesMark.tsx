import React from 'react';
import Svg, { Path } from 'react-native-svg';

// The "yes" mark: LocalUp's own pin, not a heart. This is a travel social
// app, and a heart would say something about the product that the product
// does not mean.
//
// ONE component on purpose. The choice of mark is explicitly reversible,
// and it is only reversible cheaply while there is a single source —
// pasted into six screens it stops being a decision and becomes six.
// Swapping the mark later means replacing the paths below; nothing else
// moves.
//
// The rule that keeps the pin readable, because the same shape also means
// "distance" and "home city" in the meta rows:
//   solid, 30-40px, inside the violet button  = ACTION
//   outline, 13-14px, next to text            = LABEL
// An outline pin in a button, or a solid one beside a label, collapses the
// distinction and the mark stops meaning anything.

type YesMarkProps = {
  size?: number;
  // Unmatch — the same pin with a line through it. Outlined rather than
  // filled, because it is undoing an action, not offering one.
  struck?: boolean;
  // Required, not defaulted. react-native-svg only resolves
  // 'currentColor' when the Svg root carries a color prop, so a default
  // would quietly render a black pin on a violet button the first time
  // someone forgot it. Six call sites, each already knows its
  // foreground.
  color: string;
};

const YesMark = ({ size = 34, struck = false, color }: YesMarkProps) => {
  if (struck) {
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
        <Path
          d="M12 22s7.6-7.1 7.6-12.2A7.6 7.6 0 0 0 4.4 9.8C4.4 14.9 12 22 12 22Z"
          stroke={color}
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="m3.6 3.6 16.8 16.8"
          stroke={color}
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      {/* The inner circle is a real hole via fillRule="evenodd", so the
          button's gradient shows through it. Drawing a coloured dot there
          instead would only match on one background — and this mark sits
          on violet, on a photo, and on a surface. */}
      <Path
        d="M12 22.4s7.7-7.2 7.7-12.4A7.7 7.7 0 0 0 4.3 10c0 5.2 7.7 12.4 7.7 12.4Zm0-9.6a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z"
        fill={color}
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  );
};

export default YesMark;
