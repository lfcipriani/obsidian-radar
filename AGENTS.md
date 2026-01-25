# Obsidian Radar Plugin

## Project overview

Obsidian Radar is a plugin that allows users to visualize notes and text items as "blips" on a radar interface. Items closer to the center have higher priority. The radar is divided into concentric rings (priority levels) and segments (categories).

- **Target**: Obsidian Community Plugin (TypeScript → bundled JavaScript)
- **Entry point**: `src/main.ts` compiled to `main.js`
- **File format**: Custom `.radar` files (JSON internally)
- **Release artifacts**: `main.js`, `manifest.json`, `styles.css`

## Documentation

- **[agent/SPEC.md](agent/SPEC.md)**: Feature specification, user experience, and use cases
- **[agent/ARCHITECTURE.md](agent/ARCHITECTURE.md)**: Detailed architecture, data model, component structure, and data flow

## Commands

```bash
npm install      # Install dependencies
npm run dev      # Development (watch mode)
npm run build    # Production build
npm run lint     # Run ESLint on src/
```

## Project structure

```
src/
├── main.ts                    # Plugin entry point (lifecycle only)
├── settings.ts                # Plugin settings and settings tab
├── types.ts                   # TypeScript interfaces and types
├── constants.ts               # Default values and SVG configuration
├── commands/
│   ├── index.ts               # Command registration
│   └── createRadar.ts         # Create new radar command
├── data/
│   └── RadarStore.ts          # Data persistence layer
├── ui/
│   ├── RadarView.ts           # Main view (extends TextFileView)
│   ├── RadarRenderer.ts       # SVG rendering engine
│   ├── RadarInteractions.ts   # Drag-and-drop, zoom handling
│   ├── RadarToolbar.ts        # Toolbar with action buttons
│   ├── AddBlipModal.ts        # Modal for adding note blips
│   └── AddTextModal.ts        # Modal for adding text blips
└── utils/
    ├── idGenerator.ts         # UUID generation
    ├── polarCoordinates.ts    # Polar ↔ Cartesian math
    └── svgHelpers.ts          # SVG element creation
```

## Key concepts

- **Blip**: An item on the radar (note or text) with polar coordinates
- **Priority levels**: Concentric rings (1-7) indicating importance
- **Categories**: Segments (0-8) for grouping blips
- **Polar coordinates**: `r` (0-1 normalized radius), `theta` (degrees counterclockwise from 3 o'clock)

## Coding conventions

- TypeScript with `"strict": true`
- Keep `main.ts` minimal (lifecycle only). Delegate logic to modules.
- Split files exceeding ~200-300 lines into smaller modules.
- Bundle everything into `main.js` (no external runtime dependencies).
- Prefer `async/await` over promise chains.
- Use `this.register*` helpers for all event listeners.

## Agent guidelines

**Do**
- Follow the architecture in `agent/ARCHITECTURE.md`
- Add commands with stable IDs (don't rename once released)
- Write idempotent code paths so reload/unload doesn't leak listeners
- Test both mouse and touch interactions for blip dragging

**Don't**
- Introduce network calls (this is a local-only plugin)
- Commit build artifacts (`node_modules/`, `main.js`)
- Add large dependencies (keep the plugin lightweight)

## Testing

Copy `main.js`, `manifest.json`, `styles.css` to:
```
<Vault>/.obsidian/plugins/obsidian-radar/
```
Reload Obsidian and enable in **Settings → Community plugins**.

## References

- Obsidian API: https://docs.obsidian.md
- Developer policies: https://docs.obsidian.md/Developer+policies
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
