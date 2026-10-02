First release of Codex Meter: a desktop companion for your Codex 5-hour and weekly usage limits.

- Detailed view with remaining percentages, reset times, quota selection, and refresh settings.
- Draggable, always-on-top mini view with two needle gauges.
- Green at 51–100% remaining, yellow at 20–50%, red at 0–19%.
- Menu bar/system tray controls, saved preferences, and optional launch at login.
- Uses your local Codex session through `codex app-server`. No API key or separate account needed.

### Downloads

| Computer | File |
| --- | --- |
| Intel Mac | `Codex-Meter-0.1.0-mac-x64.zip` |
| Apple Silicon Mac (M series) | `Codex-Meter-0.1.0-mac-arm64.zip` |
| Windows 64-bit | `Codex-Meter-0.1.0-win-x64.exe` |

On macOS, unzip and move **Codex Meter.app** to Applications. On Windows, run the installer. Install/sign in to Codex first; see the [setup guide](https://github.com/dedsec1911/codex-meter#setup).

These builds are unsigned and the Mac builds are not notarized. macOS Gatekeeper or Windows SmartScreen may show a warning. Only proceed if you trust this repository; do not disable operating-system security globally. `SHA256SUMS.txt` provides download integrity checks.

Unit tests and desktop smoke tests run on each target OS. CI desktop tests use sample quotas, not a real Codex account. Real-account integration has been checked on Intel macOS; Windows and Apple Silicon account reuse can vary with the installed Codex credential configuration.
