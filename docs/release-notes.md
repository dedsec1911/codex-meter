Codex Meter v0.2.0 adds native MacBook Touch Bar controls.

- Shows 5-hour and weekly quota remaining, using the same green/yellow/red thresholds as the widget.
- Includes Refresh and Mini/Details buttons in both window modes.
- Shares the selected quota bucket and refresh interval; displays stale or unavailable status when a read fails.
- Adds a saved Show on Touch Bar setting in the detailed window and tray menu. Enabled by default on macOS.

**Visibility:** these are native app controls. They appear when Codex Meter is focused on a Mac with Touch Bar hardware. Switching apps hands the Touch Bar back to that app. This release does not replace the system Control Strip.

### Downloads

| Computer                     | File                              |
| ---------------------------- | --------------------------------- |
| Intel Mac                    | `Codex-Meter-0.2.0-mac-x64.zip`   |
| Apple Silicon Mac (M series) | `Codex-Meter-0.2.0-mac-arm64.zip` |
| Windows 64-bit               | `Codex-Meter-0.2.0-win-x64.exe`   |

The Apple Silicon and Windows packages retain the desktop and mini widgets. Touch Bar controls apply only to macOS machines with Touch Bar hardware.

On macOS, unzip and move **Codex Meter.app** to Applications. On Windows, run the installer. See the [setup guide](https://github.com/dedsec1911/codex-meter#setup).

Packages are unsigned and Mac builds are not notarized. Your operating system may show a warning. Releases include SHA-256 checksums.

All three platforms run unit and desktop smoke tests before publication. Touch Bar output has also been captured on an Intel Mac using sample quotas; physical touch interactions and other MacBook models still need validation. Real-account usage retrieval has been checked on Intel macOS.
