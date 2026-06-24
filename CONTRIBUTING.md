# Contributing to Parchmint

Thanks for your interest in Parchmint! Contributions are genuinely welcome — and so are bug
reports, ideas, and questions.

A note on how this project is run: **Parchmint is solo-led.** I (Abu Mazher Uddin) maintain it
and make the final call on what gets merged and where it's headed, to keep a focused vision.
That's not meant to discourage you — it just means I may decline changes that don't fit the
direction, and it's nothing personal.

## What's especially welcome

- **Bug reports** — ideally with steps to reproduce and your OS + app version.
- **Bug fixes.**
- **Platform/compatibility fixes** — macOS and Linux edge cases especially. I can't test every
  environment, so these are hugely valuable.
- **Docs, typos, and examples.**

## Please open an issue first for…

…anything larger, so we can align before you invest time (and so I'm not in the awkward spot of
declining a big surprise PR):

- New features beyond small, self-contained ones.
- Refactors or architectural changes.
- New dependencies — I inherit their maintenance and security burden long-term.
- Changes to the core experience: the honest-preview model and the Insights panel are the heart
  of the project and stay closely guarded.

## Scope — what Parchmint is (and isn't)

Parchmint is a **Markdown editor for documents read by AI** — its job is to show you, honestly,
what a model ingests (raw text, structure, tokens, warnings). It is **not** trying to be a
general note-taking app, a wiki, a WYSIWYG editor, or a knowledge base. Changes that sharpen the
"honest preview for AI-consumed documents" mission are in scope; changes that turn it into a
different kind of app generally aren't.

## Development setup

Requires [Node.js](https://nodejs.org), [Rust](https://rustup.rs), and the
[Tauri prerequisites](https://tauri.app/start/prerequisites/) for your platform.

```bash
npm install
npm run tauri dev      # run in development
npm run tauri build    # produce a release build
```

The frontend lives in `src/` (React + TypeScript); the native shell in `src-tauri/` (Rust).

## Licensing of contributions

By submitting a contribution, you agree it is licensed under the project's
[MIT License](LICENSE) (inbound = outbound). There is no separate CLA — opening a pull request
is your agreement that the work may be distributed under MIT.

## Response times

I maintain Parchmint alongside other work, so I review issues and PRs as time allows — there's
no guaranteed turnaround. I'd rather give something thoughtful attention when I can than promise
a schedule I can't keep. Thanks for your patience.

## Security

Found a vulnerability? Please **don't** open a public issue — see [SECURITY.md](SECURITY.md).
