// Structural sizes for the redesign.
//
// These are NOT spacing. Spacing is the 4-pt rhythm BETWEEN things; these
// are the measured sizes of specific pieces of furniture, several of
// which more than one file has to agree on. Discover reserves room for
// the tab bar, the bar draws itself that tall, and the card pads its text
// to clear both — if any of the three disagreed, a name would render
// behind a button.
//
// Everything here appears at least twice in the artboards. A number used
// once still gets a name in its own file rather than being written bare
// at the point of use.
//
// Note the design does NOT sit on the 4-pt grid everywhere: 20, 18, 13,
// 10, 7 and 5 are all real values in the artboards. Rounding them to the
// grid was explicitly ruled out, so they live here instead of being
// approximated with Spacing.

// The tab bar's parts, so its total height is DERIVED rather than
// asserted twice. Writing 58 in both this file and the component is how
// they quietly drift apart the first time the pill grows.
const TAB_SEGMENT_HEIGHT = 44;
const TAB_BAR_PADDING = 7;

export const Layout = {
  // ---- screen frame ----
  // The gutter every redesigned screen uses. Wider than Spacing.lg
  // because the content is edge-to-edge and needs more air at the sides.
  SCREEN_PADDING: 20,
  // Below the safe-area top: the screen header, and the photo pager's
  // progress bars just above it. Measured from the SAFE-AREA edge, not
  // the window — the artboards are drawn on an 844pt canvas whose status
  // bar is 44pt, so the design's `top: 66px` header is 22 below the inset.
  // Storing the raw 66 would put the header under the clock on any device
  // whose status bar is not exactly that.
  HEADER_TOP_OFFSET: 22,
  PROGRESS_TOP_OFFSET: 6,

  // ---- floating chrome ----
  TAB_SEGMENT_HEIGHT,
  TAB_BAR_PADDING,
  TAB_BAR_HEIGHT: TAB_SEGMENT_HEIGHT + TAB_BAR_PADDING * 2,
  TAB_BAR_RADIUS: 32,
  TAB_BAR_GAP: 6,
  TAB_SEGMENT_PADDING_H: 18,
  // The circular yes button; the pass button beside it is smaller.
  ACTION_ROW_HEIGHT: 72,
  ACTION_YES_SIZE: 72,
  ACTION_PASS_SIZE: 60,
  // Vertical breathing room between the stacked floating pieces.
  ACTION_GAP: 20,

  // ---- hero ----
  // How much of the screen the profile hero takes. The artboards draw it
  // at 452/844 in dark and 430/844 in light — dark is taller only because
  // its scrim needs the extra room to finish dissolving into the page.
  // One ratio for both; the 22px difference is not perceptible and two
  // would be one more thing to keep in step.
  HERO_HEIGHT_RATIO: 0.52,
  // Light mode ends the hero on a hard edge instead of a fade (§3.2).
  HERO_EDGE_RADIUS: 28,
  // How far the name block sits above the bottom of the hero.
  HERO_INFO_BOTTOM: 80,
  // Pulls the content up over the tail of the hero so the first button
  // overlaps the fade rather than starting after a gap.
  HERO_CONTENT_OVERLAP: -16,
  PROGRESS_BAR_HEIGHT: 3,
  PROGRESS_BAR_RADIUS: 2,
  PROGRESS_BAR_GAP: 5,

  // ---- pills and chips ----
  PILL_HEIGHT: 34,
  PILL_HEIGHT_SM: 32,
  PILL_PADDING_H: 12,
  CHIP_PADDING_H: 12,
  CHIP_PADDING_V: 6,
  CHIP_GAP: 7,
  // The mode chip on a list row, smaller again than a normal chip.
  TINY_CHIP_PADDING_H: 7,
  TINY_CHIP_PADDING_V: 2,

  // ---- list rows ----
  CARD_RADIUS: 18,
  CARD_PADDING: 12,
  // Between the avatar, the text block and the meta column inside a row.
  CARD_INNER_GAP: 13,
  // Between rows.
  LIST_GAP: 10,
  // Between a section label and the block under it.
  SECTION_GAP: 22,

  // ---- avatars ----
  AVATAR_ROW: 52,
  AVATAR_STRIP: 64,
  // The gradient ring drawn around an unseen new match.
  AVATAR_RING_WIDTH: 2.5,
  // The cut-out between that ring and the photo, painted in the page
  // background so the ring reads as a ring and not a border.
  AVATAR_RING_GAP: 2,
  STRIP_GAP: 14,

  // ---- badges ----
  // Unread count on a list row.
  BADGE_SM: 22,
  // Count beside a screen title.
  BADGE_MD: 26,
  // Overlay badge on a tab icon.
  BADGE_TAB: 20,
  BADGE_BORDER: 2,
  // Horizontal padding, so a two-digit count still fits inside a pill
  // that is otherwise a circle. Three sizes because the badges are.
  BADGE_PADDING_SM: 7,
  BADGE_PADDING_MD: 9,
  BADGE_PADDING_TAB: 6,
  // The dot on an unseen new-match avatar.
  DOT_SIZE: 16,

  // ---- buttons ----
  // The full-width primary action on Profile, and its square sibling.
  BUTTON_LG: 52,
  BUTTON_LG_RADIUS: 26,
  ICON_BUTTON: 36,
  ICON_BUTTON_SM: 34,

  // ---- ambient ----
  // The violet blob behind the top-left corner (§3.3).
  // SVG stop-color does NOT carry alpha — an rgba() there is read as
  // opaque and the blob comes out a solid violet disc. The opacity has
  // to travel separately, so it lives here as a number and the colour
  // itself is just the brand violet.
  GLOW_OPACITY_DARK: 0.42,
  GLOW_OPACITY_LIGHT: 0.12,
  GLOW_SIZE: 340,
  GLOW_OFFSET_X: -80,
  GLOW_OFFSET_Y: -120,
} as const;
