# Privacy Policy — YT Filter

**Summary: YT Filter does not collect, remotely store, or transmit any data
about you or your YouTube usage. Zero telemetry, zero network requests
beyond the ones YouTube itself already makes.**

## What the extension does

YT Filter runs entirely inside your browser. When you're on the YouTube
homepage, it reads the videos that are **already loaded on the page**
(title, duration, views, relative age, card type) and, based on the
filters you've turned on, hides (`display: none`) the ones that don't
match. It doesn't interact with YouTube's recommendation algorithm,
doesn't block ads, and doesn't modify any other behavior of the page.

## What data is collected

None. Specifically:

- **No telemetry.** The extension doesn't contact any server, first-party
  or third-party.
- **No analytics or tracking** of any kind (Google Analytics, Sentry,
  etc.).
- **No accounts or login.** Nothing is tied to your identity.
- **Nothing is sent outside your browser.** The only network requests that
  happen are the ones YouTube itself normally makes to load the page — the
  extension doesn't add any.

## What data is stored locally

Your filters (age, duration, views, Shorts, etc.) and the floating
button's position are stored only on your computer, through the browser's
own `browser.storage.local` API — the equivalent of a local preference,
like a page's zoom level. This data:

- Never leaves your device.
- Is never synced to any server.
- Is automatically deleted if you uninstall the extension.

## Permissions requested, and why

- **`storage`** — to store your filters and the button's position locally,
  as described above.
- **Access to `www.youtube.com`** — so the content script can read the
  homepage's videos and hide the ones that don't match your filters. The
  extension doesn't request access to any other site.

No network, browsing history, cookies, or other-tabs permissions are
requested.

## Open source

The full source code is available at
[github.com/noiab3d/yt-filter](https://github.com/noiab3d/yt-filter) under
the MIT license — anyone can inspect exactly what the extension does.

## Contact

Privacy questions or concerns can be raised as an
[issue on GitHub](https://github.com/noiab3d/yt-filter/issues).
