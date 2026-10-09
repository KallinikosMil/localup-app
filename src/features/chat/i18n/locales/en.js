export default {
  chatDayToday: 'Today',
  chatDayYesterday: 'Yesterday',
  chatTitleFallback: 'Chat',
  chatWaking: 'Waking the server…',
  chatError: "Couldn't load this conversation.",
  chatRetry: 'Retry',
  chatInputPlaceholder: 'Type a message...',
  chatEmpty: 'No messages yet.\nSay hello!',
  // V10: was "— check your connection". That is the OFFLINE message
  // (commonErrorOffline) and it is chosen on structured evidence now;
  // this is what we say when the request reached the server and failed.
  chatSendError: "Message didn't send. Please try again.",
  // Who said it is carried by the bubble's colour and the side it sits on,
  // and by nothing else. A screen reader reads a flat run of texts with no
  // way to tell a reply from an answer, so the bubble says it instead.
  chatA11yMessageMine: 'You: {{body}}',
  chatA11yMessageTheirs: '{{name}}: {{body}}',
};
