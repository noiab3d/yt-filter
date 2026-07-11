# YT Filter

Browser extension (Firefox, with Chrome support) that filters the YouTube
homepage recommendations feed — hides videos that don't match the criteria
you choose (age, duration, views, Shorts, Mixes/playlists, live streams),
directly in the browser, without interfering with YouTube's recommendation
algorithm.

Not an ad blocker — the extension never touches ads, never detects or hides
them.

![YT Filter screenshot](docs/screenshot_live.png)

## Features

- **Video age** — presets (`< 1 day`, `< 5 days`, `> 10 days`) or a custom
  date (before/after).
- **Video duration** — less than or more than N minutes.
- **Views** — min/max range, with a slider from `0` to `10M+`.
- **Hide Shorts** — removes the Shorts shelf entirely.
- **Hide Mixes and playlists**.
- **Hide live streams.**
- All filters are combinable, and off by default — the extension never
  hides anything until you turn something on.
- A floating "Filters" button sits on top of the page, with the full filter
  panel. It's draggable — grab it by the small side tab (appears when you
  move the mouse close) and drop it anywhere; it snaps to whichever side of
  the video grid is closer.

## Known issues

- **Gaps in the grid after filtering**: when a lot of videos get hidden,
  you may briefly see empty space in the grid before YouTube loads more
  content to fill it in. This isn't a bug in the extension — it's how
  YouTube's own infinite-scroll loading behaves; hiding videos doesn't
  always reliably trigger it. The extension nudges the page with a small
  scroll to help YouTube notice it needs to load more, but this isn't
  instant or perfect.

## Privacy

Zero data collection, zero telemetry. See [docs/PRIVACY.md](docs/PRIVACY.md)
for full details.

## Installation

The extension isn't published on [addons.mozilla.org](https://addons.mozilla.org)
or the Chrome Web Store yet. Coming soon.

## Contributing

Issues and pull requests are welcome. Before proposing a large change, open
an issue describing what you have in mind — YouTube changes its DOM
frequently, so any change to the selectors in `src/content/selectors.js`
should come with real HTML confirming the current structure.

## License

[MIT](LICENSE)
