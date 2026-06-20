# Contributing to Parchmint

Thanks for your interest in improving Parchmint! Contributions of all kinds are welcome —
bug reports, fixes, features, and docs.

## Development setup

Requires [Node.js](https://nodejs.org), [Rust](https://rustup.rs), and the
[Tauri prerequisites](https://tauri.app/start/prerequisites/) for your platform.

```bash
npm install
npm run tauri dev      # run the app in development
npm run tauri build    # produce a release build
```

The frontend lives in `src/` (React + TypeScript); the native shell lives in `src-tauri/` (Rust).

## Pull requests

1. Fork the repo and create a topic branch.
2. Keep changes focused — one logical change per PR.
3. Make sure `npm run build` and `npm run tauri build` succeed before opening the PR.
4. Describe what changed and why.

## License of contributions

By submitting a contribution, you agree that your contribution is licensed under the
project's [MIT License](LICENSE). There is no separate CLA — opening a pull request is your
agreement that the work may be distributed under MIT.

## Reporting bugs

Use the [bug report issue template](.github/ISSUE_TEMPLATE/bug_report.yml). For security
issues, **do not** open a public issue — see [SECURITY.md](SECURITY.md).
