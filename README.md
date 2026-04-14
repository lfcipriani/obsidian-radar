# Obsidian Radar

*This plugin answers the question: "What's on your radar?"*

Visualize your notes and ideas on a radar. Group them by topic, prioritize by proximity to the center, and keep focus when juggling multiple areas at once. Do not lose sight of items that might be hiding good opportunities.

__Screenshot__

## Features

- **Radar visualization** — items (blips) are placed on a circular radar divided into concentric priority rings and category segments; pan and zoom freely
- **Two blip types** — link a blip to a vault note, or create a standalone text blip
- **Priority rings** — 1–8 configurable rings; the closer to the center, the higher the priority
- **Category segments** — 3–8 configurable segments to group blips by topic or area
- **Convert text blip to note** — promote any text blip to a linked vault note in one click
- **Easy to use** — drag notes from the file explorer directly onto the radar, or right-click a folder to create a new radar inside it
- **Customizable** — set colors per priority level, per category, and per blip; adjust blip size and label font size. Add new categories and priority levels without changing blip prioritization. Support multiple visualization modes.
- **Command palette** — all major actions are available as commands so you can setup global keyboard shortcuts
- **Mobile app supported**

## Installing

### From the Obsidian community plugins browser

1. Open **Settings → Community plugins** and disable Safe mode if prompted
2. Click **Browse** and search for *Obsidian Radar*
3. Click **Install**, then **Enable**

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](../../releases/latest)
2. Create a folder at `<your vault>/.obsidian/plugins/obsidian-radar/`
3. Copy the three files into that folder
4. Open **Settings → Community plugins**, find *Obsidian Radar* in the list, and enable it

## Contributing

Contributions are welcome. Here is how to get started:

**Prerequisites:** Node.js 18+ and npm

```bash
# 1. Fork this repository, then clone your fork
git clone https://github.com/<your-username>/obsidian-radar.git
cd obsidian-radar

# 2. Install dependencies
npm install

# 3. Start the development build in watch mode
npm run dev
```

To test the plugin live, symlink (or copy) the repo folder into your test vault:

```
<your vault>/.obsidian/plugins/obsidian-radar -> /path/to/obsidian-radar
```

Then enable the plugin in **Settings → Community plugins**. After each change, run **Reload app without saving** in Obsidian (or use the [Hot Reload](https://github.com/pjeby/hot-reload) community plugin).

**Other useful commands:**

```bash
npm run build   # production build
npm run lint    # run ESLint on src/
```

Please open an issue before starting work on a large change so we can discuss the approach first.

--- 

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/lfcipriani)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/lfcipriani?style=social)](https://github.com/sponsors/lfcipriani)
