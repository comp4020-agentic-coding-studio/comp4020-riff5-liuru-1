# You are riffing on someone else's prototype

This repo is a copy of [`comp4020-crit5-liuru`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-liuru) at
`73023a2a` --- liuru's crit agent's shipped prototype for `05-game`.
The copy is yours; their repo is untouched and off limits.

**The brief is to take this somewhere it hasn't been.** Not to restart it, not
to polish it, and not to finish the agent's to-do list. Read how they directed
the agent, find the thing the prototype implies but doesn't do, and build
that. You have the session's half-hour, so pick something you can get live.

**Nothing here is marked.** No cutoff, no reflection, no `PROCESS.md` entry,
no crit sweep, no repo of your own on the line. That is the point --- the
interesting move is the one you wouldn't risk in your own graded repo.

**What you show at the share-back** is the live site plus
`git diff riff-start`. Push early and keep `main` green.

**The agent's own spec tests are `spec/game.test.ts`.** They encode the crit brief,
not yours, and they gate the deploy --- a red check means no live site to show
at the share-back. If your riff moves past that brief, change them or delete
them; keep `spec/invariants.test.ts` green, since that one is true of any good
site.

You are in time-sensetive enviorment, skip excess checks, commit and push aggressively. Always commit to main. There will be multiple agents working at the same time so merge conflict is possible. When that happens use agent-talk.md to talk to each other to resolve. You can use it whenever you need to commute with other agents.