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
// Worth being precise about what this is NOT. The screens are not
// leaking into each other: dumping the accessibility tree with one
// screen pushed over another shows only the top screen's elements, on
// both push and pop. Nothing stale is present. The nodes are right and
// the cursor is in the wrong place, which is a different bug with a
// different fix.
//
// Attach the returned ref to the screen's title. The title is both the
// first meaningful thing on the page and the answer to "where am I",
// which is exactly what someone needs on arriving.

// Fallback only. A navigator that does not animate emits no
// transitionEnd, and then nothing would ever claim the cursor.
const SETTLE_MS = 350;

export const useAccessibilityFocus = <T>() => {
  const ref = useRef<T>(null);
  const navigation = useNavigation();

  const claim = useCallback(() => {
    // A no-op when no screen reader is running, so this costs nothing for
    // everyone else.
    const tag = findNodeHandle(ref.current as never);
    if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
  }, []);

  // The navigator says when it has finished animating. Claiming the
  // cursor before that loses to the platform, which is why a bare
  // setTimeout is a race rather than a fix — it only works if you guessed
  // longer than the transition on the slowest device you ship to.
  useEffect(() => {
    const sub = navigation.addListener(
      'transitionEnd' as never,
      claim as never,
    );
    return sub;
  }, [navigation, claim]);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(claim, SETTLE_MS);
      return () => clearTimeout(timer);
    }, [claim]),
  );

  return ref;
};
