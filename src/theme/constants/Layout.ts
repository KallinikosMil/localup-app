// Structural sizes for the redesign's floating chrome.
//
// These are NOT spacing. Spacing is the 4-pt rhythm between things; these
// are the measured heights and offsets of specific pieces of furniture
// that several files have to agree on. Discover reserves room for the tab
// bar, the tab bar draws itself that tall, and the card pads its text to
// clear both — if any of the three disagreed, the name would render
// behind a button.
//
// The OFFSET values are measured from the SAFE-AREA edge, not from the
// top of the window. The artboards are drawn on an 844pt canvas whose
// status bar is 44pt, so the design's `top: 66px` header is 22 below the
// inset and its `top: 50px` progress bars are 6 below it. Storing the raw
// 66 would put the header under the clock on any device whose status bar
// is not exactly 44pt.

// The tab bar's parts, so its total height is DERIVED rather than
// asserted twice. Writing 58 in both this file and the component is how
// they quietly drift apart the first time the pill grows.
const TAB_SEGMENT_HEIGHT = 44;
const TAB_BAR_PADDING = 7;

export const Layout = {
  TAB_SEGMENT_HEIGHT,
  TAB_BAR_PADDING,
  TAB_BAR_HEIGHT: TAB_SEGMENT_HEIGHT + TAB_BAR_PADDING * 2,
  // The circular yes button; the pass button beside it is smaller.
  ACTION_ROW_HEIGHT: 72,
  // Vertical breathing room between the stacked floating pieces.
  ACTION_GAP: 20,
  // Below the safe-area top: the screen header, and the photo pager's
  // progress bars just above it.
  HEADER_TOP_OFFSET: 22,
  PROGRESS_TOP_OFFSET: 6,
} as const;
