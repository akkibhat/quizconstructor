# Future Work

Ideas that are deliberately out of scope for now, kept here so they don't get lost.

## Remote / online quiz support

Right now every view except Display and Leaderboard requires the host's login - team
registration is host-operated (you type in team names yourself), and there's no way for
players to interact with the quiz from their own device.

If there's ever a want to run a quiz remotely (players not all in the same room, or just
wanting a lighter-touch in-room experience), the natural extensions are:

- **Self-service team registration**: loosen `/team-setup/[code]` from "host login + code"
  to "code only" (like Display/Leaderboard), so a team can open the link on their own
  phone/laptop and add themselves without needing the shared host login. Needs a matching
  change to the Firestore security rules for `teams/{teamId}` (currently gated on
  `isHostOfQuiz`).
- **Phone-based answering** (the original idea this whole project started from): let each
  team log in on their own phone and submit answers to the currently-live question, rather
  than everything happening on paper. The data model was deliberately kept compatible with
  this - see `liveState/current` in the plan doc, which any future client can subscribe to
  read-only to know "what's live right now" - but the actual answer-submission flow,
  validation (e.g. only accepting a write that matches the current `slideIndex`), and UI
  don't exist yet.

Both of these are meaningful security-model changes (introducing a second class of
non-host-authenticated write access), not just UI work - worth designing deliberately
rather than bolting on.
