# Contributing

For a bug report, include your OS and architecture, Codex version (`codex --version`), installation method, and the widget's error message. Do not attach auth files, tokens, or unredacted account logs.

For code changes:

```sh
npm ci
npm test
npm run test:desktop
```

The desktop test uses sample data and does not need a Codex account. `npm run check:live` is an optional account integration check. Keep UI changes small enough to review and include a screenshot when the layout changes.

Release tags must match `package.json` (for example, `v0.1.0`). The release workflow tests and packages Intel macOS, Apple Silicon macOS, and Windows before publishing any downloads. Update `docs/release-notes.md` with each release.
