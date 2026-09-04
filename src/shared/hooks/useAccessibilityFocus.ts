import { useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

// Put the screen reader at the top of a screen when it appears.
//
// Without this the cursor stays where it was, and after a push that means
// it reads whatever now occupies the old position — press Next on step 1
// and the reader lands on step 2's Next button, at the bottom, having
// skipped the entire screen. Going back is worse: the cursor sat where a
// back button had been, so a step that has none still announced one.
//
// Attach the returned ref to the FIRST thing on the screen — the back
// button, not the heading. The heading sits below the header row, so
// landing there leaves the way out already behind the cursor.
//
// Worth being precise about what this is NOT. The screens do not leak
// into each other: dumping the accessibility tree with one screen pushed
// over another shows only the top screen's elements, on both push and
// pop. The nodes are right; the cursor was in the wrong place.
//
// TWO THINGS THIS GETS WRONG IF WRITTEN THE OBVIOUS WAY, both observed on
// device rather than reasoned about:
//
// 1. `transitionEnd` is the NAVIGATOR's event, not the screen's. Every
//    mounted screen's listener answers it, so four shells in the stack
//    all claimed the cursor on one navigation and the last to fire won —
//    frequently a screen that was not even visible. It has to be gated on
//    the screen actually being focused.
//
// 2. Claiming twice is worse than claiming late. The transition event and
//    the fallback timer both fired, so the cursor was set, the user began
//    swiping, and the second claim yanked them back to the top. One claim
//    per appearance, whichever trigger gets there first.

// Fallback only, for a navigator that does not animate and therefore
// never emits transitionEnd.
const SETTLE_MS = 350;

export const useAccessibilityFocus = <T>() => {
  const ref = useRef<T>(null);
  const navigation = useNavigation();
  // Reset every time the screen is focused, so each appearance gets
  // exactly one claim and a return visit gets a fresh one.
  const claimed = useRef(false);

  const claim = useCallback(() => {
    if (claimed.current) return;
    // Another screen's listener answering the navigator's event. Ignoring
    // it here is what stops a background screen stealing the cursor.
    if (!navigation.isFocused()) return;

    const tag = findNodeHandle(ref.current as never);
    if (!tag) return;

    claimed.current = true;
    // A no-op when no screen reader is running, so this costs nothing for
    // everyone else.
    AccessibilityInfo.setAccessibilityFocus(tag);
  }, [navigation]);

  useEffect(() => {
    const sub = navigation.addListener('transitionEnd' as never, claim);
    return sub;
  }, [navigation, claim]);

  useFocusEffect(
    useCallback(() => {
      claimed.current = false;
      const timer = setTimeout(claim, SETTLE_MS);
      return () => {
        clearTimeout(timer);
        // Leaving the screen ends this appearance; the next one starts
        // over rather than inheriting a spent flag.
        claimed.current = false;
      };
    }, [claim]),
  );

  return ref;
};
