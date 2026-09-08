// Whether a match needs the user's attention: the tint on the row and the
// number on the tab badge.
//
// Pure, and out of the hook on purpose. The rule reads as one line and was
// wrong for months in a way nothing could catch from inside a component.

type UnreadInput = {
  created_at: string;
  last_message_at: string | null;
  last_read_at: string | null;
  // Computed server-side by get_matches_overview, which counts only
  // messages whose sender is not the caller. That "not me" clause is the
  // whole reason this field is trusted here.
  unread_count: number | null;
};

// The instant a match last had activity of its own: for a match nobody has
// written in yet, when the match was made.
export const activityAt = (m: UnreadInput) =>
  new Date(m.last_message_at ?? m.created_at).getTime();

// No row means never opened, which must read as older than everything.
export const readAt = (m: UnreadInput) =>
  m.last_read_at ? new Date(m.last_read_at).getTime() : 0;

// Unread means THE OTHER PERSON did something I have not seen.
//
// This used to be `activityAt(m) > readAt(m)` for every match, and
// last_message_at moves for MY messages too. So the moment you replied in
// a thread you had already opened, your own message pushed the activity
// past your read watermark and the app lit the row and the tab badge —
// telling you that you had not read what you had just written.
//
// The message case is answered by unread_count instead, because that is
// computed from sender_id server-side and is the only value here that
// knows who wrote what. The timestamp comparison survives for exactly one
// case it is still right for: a brand-new match with no messages at all,
// which is unread until it has been opened.
export const isUnread = (m: UnreadInput) =>
  (m.unread_count ?? 0) > 0 ||
  (m.last_message_at == null && activityAt(m) > readAt(m));
