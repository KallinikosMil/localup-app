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

  // ---- forms ----
  FIELD_HEIGHT: 56,
  FIELD_RADIUS: 16,
  FIELD_ICON: 19,
  FIELD_PADDING_H: 16,
  // Between a field's icon and its text, and between the icon and the
  // reveal button on the other side.
  FIELD_INNER_GAP: 11,
  FIELD_LABEL_GAP: 7,
  // The alert glyph that sits before a validation message, and the gap
  // between it and the words. Smaller than FIELD_ICON: it annotates the
  // message, it is not a control.
  FIELD_ERROR_ICON: 14,
  FIELD_ERROR_GAP: 6,
  FIELD_BORDER: 1,
  // Light only. #B3261E on white is a dark line on a bright ground and
  // reads thinner than it is; dark uses a muted tint that does not need
  // the extra weight. The artboards differ here on purpose.
  FIELD_BORDER_ERROR_LIGHT: 1.5,

  // Onboarding step 3. The large card is the avatar — the photo the
  // deck leads with — and the row under it holds the optional five.
  PHOTO_SLOT_LG_W: 238,
  PHOTO_SLOT_LG_H: 302,
  // 42 while these were decoration. They take taps now, so they take
  // the 44pt floor with them; below it they are a target people miss.
  PHOTO_SLOT_SM: 52,
  PHOTO_SLOT_GAP: 9,

  // Added to controls the design draws smaller than the 44pt minimum.
  // hitSlop rather than a bigger box: the drawn size is what the artboard
  // asked for, and growing it would push the layout around — what has to
  // reach 44 is the area that responds to a finger, not the ink.
  HIT_SLOP: 8,

  // Filter sliders. The handle is the touch target as well as the mark, so
  // it is drawn at the 26 the artboards ask for rather than a hairline.
  SLIDER_HANDLE: 26,
  SLIDER_RAIL: 6,
  // Vertical slop for a link whose box is the TYPE itself. HIT_SLOP was
  // enough for controls with a drawn box (38, 34 and 40 became 54, 50 and
  // 56) and nowhere near it for these: labelStrong is 18pt tall, so 8 a
  // side gives 34. 13 a side gives exactly 44, and 46 for body at 20.
  HIT_SLOP_TEXT: 13,
  // The floor itself, for controls that can simply be given the height.
  TOUCH_MIN: 44,
  // The tall pill actions on auth screens — taller and rounder than the
  // 52px buttons inside the app, because an auth screen has one thing to
  // do and the button should look like it.
  BUTTON_XL: 56,
  BUTTON_XL_RADIUS: 28,
  // The app mark above an auth title.
  LOGO_MARK: 52,
  LOGO_RADIUS: 17,

  // ---- chat ----
  CHAT_HEADER_HEIGHT: 62,
  CHAT_AVATAR: 38,
  CHAT_AVATAR_RING: 1.5,
  // A bubble never spans the full width, so the reader can always tell
  // which side it came from at a glance.
  BUBBLE_MAX_WIDTH: '78%',
  BUBBLE_RADIUS: 20,
  // The corner nearest the sender stays small — that notch is what says
  // who is speaking, and it is the only asymmetry in the shape.
  BUBBLE_TAIL_RADIUS: 6,
  BUBBLE_PADDING_V: 12,
  BUBBLE_PADDING_H: 15,
  BUBBLE_GAP: 9,
  COMPOSER_HEIGHT: 50,
  COMPOSER_RADIUS: 26,
  COMPOSER_PADDING_H: 18,
  STATUS_DOT: 6,

  // ---- date picker ----
  // A row is a tap target, so it clears 44. The list shows five of them,
  // which is enough to read as a list rather than a peephole without the
  // sheet outgrowing a small screen.
  DOB_BOX_GAP: 10,
  DOB_YEAR_CELL: 56,
  DOB_MONTH_CELL: 46,
  // Exactly the 44 minimum, in a 7-wide grid — the tightest thing in
  // the sheet. Do not shrink the gap to fit a wider frame.
  DOB_DAY_CELL: 44,
  SHEET_RADIUS: 28,
  SHEET_GRABBER_W: 40,
  SHEET_GRABBER_H: 4,
  PICKER_ROW_HEIGHT: 44,
  PICKER_HEIGHT: 220,

  // ---- settings ----
  // A settings row is taller than a list row on purpose: it is a single
  // tap target with one line in it, and 60 keeps the whole card well
  // clear of the 44 minimum without needing hitSlop to rescue it.
  SETTINGS_ROW_HEIGHT: 60,
  // Beside a segment label, not on its own — so it stays smaller than
  // the 20 the row icons use.
  SEGMENT_ICON: 16,

  // ---- ambient ----
  // The violet blob behind the top-left corner (§3.3).
  // SVG stop-color does NOT carry alpha — an rgba() there is read as
  // opaque and the blob comes out a solid violet disc. The opacity has
  // to travel separately, so it lives here as a number and the colour
  // itself is just the brand violet.
  GLOW_OPACITY_DARK: 0.42,
  GLOW_OPACITY_LIGHT: 0.12,
  GLOW_SIZE: 340,
  // Chat runs a slightly smaller blob, from the opposite corner.
  GLOW_SIZE_SM: 320,
  // Auth screens carry two blobs, a bigger one from the top-left and a
  // paler one from the bottom-right, so an empty form still has depth.
  GLOW_SIZE_LG: 380,
  GLOW_OPACITY_DARK_LG: 0.5,
  GLOW_OPACITY_LIGHT_LG: 0.16,
  GLOW_OPACITY_DARK_SM: 0.34,
  GLOW_OFFSET_X: -80,
  GLOW_OFFSET_Y: -120,
} as const;
