# Radar Plugin Architecture

This document describes the architecture of the Obsidian Radar plugin.

## Overview

The Radar plugin allows users to visualize notes and text items as "blips" on a radar interface. Items closer to the center have higher priority. The radar is divided into concentric rings (priority levels) and segments (categories).

## File Structure

```
src/
├── main.ts                    # Plugin entry point (lifecycle + vault events)
├── settings.ts                # Plugin settings and settings tab
├── types.ts                   # TypeScript interfaces and types
├── constants.ts               # Default values and configuration
│
├── commands/
│   ├── index.ts               # Command registration (9 commands)
│   └── createRadar.ts         # Create new radar command
│
├── data/
│   └── RadarStore.ts          # Data persistence layer
│
├── ui/
│   ├── RadarView.ts           # Main view (extends TextFileView)
│   ├── RadarRenderer.ts       # SVG rendering engine
│   ├── RadarInteractions.ts   # Drag-and-drop, pan, zoom handling
│   ├── RadarToolbar.ts        # Floating toolbar with action buttons
│   ├── AddBlipModal.ts        # Modal for adding note blips
│   ├── AddTextModal.ts        # Modal for adding text blips
│   ├── CustomizeRadarModal.ts # Modal for priorities, categories, colors, blip size
│   ├── EditBlipColorModal.ts  # Modal for per-blip color override
│   └── HelpModal.ts           # Quick-reference help modal
│
└── utils/
    ├── idGenerator.ts         # UUID generation
    ├── polarCoordinates.ts    # Polar ↔ Cartesian math + blip repositioning
    └── svgHelpers.ts          # SVG element creation helpers
```

## Data Model

### Core Types (`src/types.ts`)

```
RadarData
├── id: string                 # Unique identifier
├── name: string               # Display name
├── blipRadius: number         # Blip dot size in px (3–20, default 5)
├── blipColor?: string         # Radar-wide default blip color (hex)
├── priorityLevels[]           # Concentric rings (1–7)
│   ├── id: string
│   ├── name: string           # e.g., "Critical", "High"
│   ├── maxRadius: number      # 0–1 normalized outer edge
│   └── color?: string         # Ring fill color (hex, shown at 0.12 opacity)
├── categories[]               # Segment dividers (0–8)
│   ├── id: string
│   ├── name: string
│   ├── startAngle: number     # Degrees
│   └── color?: string         # Segment fill color (hex, shown at 0.12 opacity)
├── blips[]                    # Items on the radar
│   ├── id: string
│   ├── type: "note" | "text"
│   ├── title: string
│   ├── notePath?: string      # For note blips
│   ├── r: number              # Radial position (0–1)
│   ├── theta: number          # Angle in degrees
│   ├── color?: string         # Per-blip color override (hex)
│   └── timestamps
└── viewState
    ├── zoom: number
    ├── panX: number
    └── panY: number
```

### File Format

Radars are stored as `.radar` files in the vault. The file content is JSON matching the `RadarData` interface.

```
my-project.radar
├── Stored in vault like any other note
├── JSON format internally
└── Opens with RadarView automatically
```

## Component Architecture

### 1. Plugin Entry (`main.ts`)

Handles lifecycle, registration, and vault-level event sync:

```
RadarPlugin
├── onload()
│   ├── Initialize RadarStore
│   ├── Register RadarView for "radar-view" type
│   ├── Register ".radar" extension
│   ├── Register commands
│   ├── Add settings tab
│   ├── Add ribbon icon
│   ├── vault.on("rename") → handleFileRename()  # Updates blip paths
│   └── vault.on("delete") → handleFileDelete()  # Reverts note blips to text
└── onunload()
    └── Detach radar views
```

`handleFileRename` and `handleFileDelete` update blip references in all open and closed radars in the vault, ensuring note blips stay linked after file moves or deletions.

### 2. Settings (`settings.ts`)

`RadarSettingTab` exposes two sliders:
- **Default priority count**: 1–8 (default 4)
- **Default category count**: 3–8 (default 4)

### 3. View Layer (`ui/RadarView.ts`)

Extends `TextFileView` for automatic file handling. Orchestrates all other UI components.

```
RadarView extends TextFileView
├── getViewData()        → Returns JSON for saving
├── setViewData()        → Receives JSON, parses, renders
├── clear()              → Cleanup on file switch
├── onOpen()             → Creates DOM structure
│                           radar-view-container
│                           └── radar-main
│                               ├── radar-svg-container  (SVG here)
│                               └── radar-controls       (toolbar here)
├── renderRadar()        → Initializes RadarRenderer, RadarInteractions, RadarToolbar
└── Event handlers
    ├── onBlipMove()           → Update position, save
    ├── onBlipClick()          → Context menu / Cmd+click opens note
    ├── onRadarContextMenu()   → Background menu (add, customize, zoom)
    ├── onFileDrop()           → Drop notes from sidebar to add as blips
    ├── onZoomChange()         → Update viewState, renderer
    ├── onPanChange()          → Update viewState, renderer
    ├── toggleTitles()         → Show/hide blip labels
    ├── toggleGlow()           → Show/hide glow halos
    ├── togglePriorityLabels() → Show/hide ring labels
    ├── zoomIn/zoomOut/resetZoom()
    └── createNoteFromBlip()   → Converts text blip to note blip
```

### 4. Rendering (`ui/RadarRenderer.ts`)

Pure SVG rendering, no interaction logic:

```
RadarRenderer
├── Constructor
│   └── Creates SVG structure
├── render()
│   ├── renderPriorityRings()       → Dashed circles with curved textPath labels
│   ├── renderPrioritySegments()    → Colored annulus fills (opacity 0.12)
│   ├── renderCategorySegments()    → Colored wedge fills (opacity 0.12)
│   ├── renderCategoryDividers()    → Lines from center + curved arc labels
│   └── renderBlips()              → Positioned blips with glow halos + titles
├── updateBlipPosition()            → Move single blip
├── addBlip() / removeBlip()        → Dynamic updates
├── setTransform() / setZoom() / setPan()  → View transforms
├── setTitlesVisible()              → Toggle .titles-hidden class
├── setGlowVisible()                → Toggle .glow-hidden class
├── setPriorityLabelsVisible()      → Toggle .priority-labels-hidden class
└── destroy()                       → Cleanup
```

**Blip appearance:**
- Note blips: solid filled circles
- Text blips: hollow rings (stroke only, no fill)
- Color priority: per-blip `color` → radar `blipColor` → CSS `--color-accent`
- Glow halos: low-opacity circle at 2× radius behind each blip
- Titles: truncated to 15 chars with ellipsis; full title revealed on hover via CSS

**SVG Structure:**
```svg
<svg viewBox="0 0 1200 1200" preserveAspectRatio="xMidYMid meet">
  <g class="radar-background">
    <!-- Priority rings (dashed circles) + curved labels -->
  </g>
  <g class="radar-priority-segments">
    <!-- Colored annulus fills per priority level -->
  </g>
  <g class="radar-category-segments">
    <!-- Colored wedge fills per category -->
  </g>
  <g class="radar-categories">
    <!-- Category divider lines + curved arc labels -->
  </g>
  <g class="radar-blips" transform="translate(600,600) scale(zoom) translate(-panX,-panY)">
    <!-- Blip groups: glow halo + circle + short/full title -->
  </g>
</svg>
```

### 5. Interactions (`ui/RadarInteractions.ts`)

Handles all user input separately from rendering:

```
RadarInteractions
├── Drag (blips)
│   ├── mousedown / touchstart → Start drag (threshold 5px)
│   ├── mousemove / touchmove  → Update blip position
│   └── mouseup / touchend    → End drag, emit onBlipMove(id, r, theta)
├── Pan (background)
│   ├── Left-click + drag empty space
│   └── Two-finger trackpad scroll → emit onPanChange(panX, panY)
├── Zoom
│   ├── Mouse wheel → fixed steps
│   ├── Trackpad scroll (Ctrl+wheel) → proportional
│   ├── Touch pinch (two-finger) → proportional
│   └── emit onZoomChange(zoom)
├── Context menu
│   └── Right-click → emit onBlipClick or onRadarContextMenu
├── File drop
│   └── Obsidian DragManager or text/plain fallback → emit onFileDrop(notePath, r, theta)
└── Helpers
    ├── getSvgCoordinates()  → Maps DOM coords to SVG space (handles zoom, pan, letterboxing)
    ├── getViewCenter()      → Returns SVG center in polar coords
    └── getRadarPosition()   → Returns polar coords for a DOM event
```

### 6. Toolbar (`ui/RadarToolbar.ts`)

Floating icon-only control panel rendered into `radar-controls`:

```
RadarToolbar
├── Actions group:  Add note blip, Add text blip
├── Zoom group:     Zoom in, Reset zoom, Zoom out
├── Design group:   Toggle titles, Toggle glow, Toggle priority labels
└── Settings group: Customize radar, Help
```

Callbacks defined via `RadarToolbarOptions` (10 handlers). Icon and tooltip update when a toggle state changes via `setTitlesVisible()`, `setGlowVisible()`, `setPriorityLabelsVisible()`.

### 7. Data Layer (`data/RadarStore.ts`)

Handles all data operations and file I/O:

```
RadarStore
├── createNewRadarData()     → Generate default radar with settings defaults
├── createRadar(name, folder?) → Create file in vault
├── loadRadar(file)          → Read, parse, and normalize JSON
├── saveRadar(file, data)    → Write JSON to file
├── normalizeRadarData()     → Migrate/fix: CSS vars → hex, sort categories, clamp blipRadius
├── Blip operations
│   ├── addBlip()
│   ├── updateBlipPosition()
│   ├── updateBlip()
│   └── removeBlip()
├── Structure updates
│   ├── setPriorityLevels()
│   ├── setCategories()
│   ├── setBlipRadius()
│   └── setBlipColor()
└── listRadarFiles() / isRadarFile()  → Vault utilities
```

`normalizeRadarData()` runs on every load to handle legacy data (e.g. Obsidian CSS variable strings converted to hex) and enforce invariants.

### 8. Modals

| Modal | Purpose |
|---|---|
| `AddBlipModal` | `FuzzySuggestModal` — pick a markdown file to add as a note blip |
| `AddTextModal` | Text input — create a free-text blip (Enter to submit) |
| `CustomizeRadarModal` | Drag-and-drop reorder priorities/categories; add/remove; color swatches (7 presets + custom picker); blip size slider; default blip color picker |
| `EditBlipColorModal` | Per-blip color picker with Save / Clear / Cancel |
| `HelpModal` | Quick-reference cheat sheet (platform-aware: shows Cmd on macOS, Ctrl elsewhere) |

`CustomizeRadarModal` redistributes `maxRadius` values and `startAngle` values automatically when priorities/categories are reordered, added, or removed. Changes propagate via callbacks: `onPrioritiesChanged`, `onCategoriesChanged`, `onBlipRadiusChanged`, `onBlipColorChanged`.

### 9. Commands (`commands/index.ts`)

Nine commands registered, all prefixed with `radar-`:

| Scope | Command |
|---|---|
| Global | Create new radar |
| View-scoped | Add note blip |
| View-scoped | Add text blip |
| View-scoped | Zoom in |
| View-scoped | Zoom out |
| View-scoped | Reset zoom |
| View-scoped | Toggle blip titles |
| View-scoped | Toggle glow |
| View-scoped | Toggle priority labels |

View-scoped commands use `checkCallback` and are only active when a RadarView is focused.

## Coordinate System

### Polar Coordinates
- **r**: Radial distance, normalized 0–1 (0 = center, 1 = edge)
- **theta**: Angle in degrees, counterclockwise from positive x-axis (3 o'clock = 0°)

### SVG Coordinates
- ViewBox: 1200×1200
- Center: (600, 600)
- Max radius: 280px (leaves margin)
- Y-axis inverted (positive = downward in SVG)
- `preserveAspectRatio="xMidYMid meet"` — letterboxed, centered

### Conversion (`utils/polarCoordinates.ts`)
```
polarToCartesian(r, theta, maxRadius) → {x, y}
cartesianToPolar(x, y, maxRadius)     → {r, theta}
getPriorityFromRadius(r, priorities)  → PriorityLevel | undefined
getCategoryFromAngle(theta, categories) → Category | undefined
repositionBlipsWithPriorities(blips, oldPriorities, newPriorities) → Blip[]
rotateBlipsWithCategories(blips, oldCategories, newCategories)     → Blip[]
```

`repositionBlipsWithPriorities` and `rotateBlipsWithCategories` preserve each blip's relative position within its ring/segment when the user reorders or resizes priority levels or categories in `CustomizeRadarModal`.

## Data Flow

### Creating a Radar
```
User action → createRadarCommand
                    ↓
            RadarStore.createRadar()
                    ↓
            vault.create() → .radar file
                    ↓
            leaf.openFile()
                    ↓
            TextFileView loads content
                    ↓
            setViewData() → parse + normalize JSON
                    ↓
            renderRadar() → SVG displayed
```

### Moving a Blip
```
User drags blip → RadarInteractions (mousedown/mousemove)
                          ↓
                  Update visual position (transform)
                          ↓
                  mouseup → cartesianToPolar()
                          ↓
                  callback: onBlipMove(id, r, theta)
                          ↓
                  RadarView.onBlipMove()
                          ↓
                  RadarStore.updateBlipPosition()
                          ↓
                  requestSave() → file updated
```

### Adding a Blip
```
User clicks "Add note" → openAddNoteModal()
                              ↓
                         AddBlipModal (fuzzy file picker)
                              ↓
                         User selects note
                              ↓
                         RadarStore.addBlip()
                              ↓
                         RadarRenderer.addBlip()
                              ↓
                         requestSave()
```

### Customizing Priorities/Categories
```
User opens Customize → CustomizeRadarModal
                              ↓
                    User reorders / adds / removes / recolors
                              ↓
                    repositionBlipsWithPriorities()
                    rotateBlipsWithCategories()
                              ↓
                    callbacks: onPrioritiesChanged / onCategoriesChanged
                              ↓
                    RadarView → RadarStore.setPriorityLevels/setCategories()
                              ↓
                    RadarRenderer.render()  (full re-render)
                              ↓
                    requestSave()
```

### Vault File Sync (rename / delete)
```
vault.on("rename") → RadarPlugin.handleFileRename()
                              ↓
                    Update notePath in all open RadarViews
                              ↓
                    For each closed .radar file: load → update → save
```

## Extension Points

### Adding New Blip Types
1. Add type to `BlipType` in `types.ts`
2. Create new modal in `ui/`
3. Add button to `RadarToolbar`
4. Handle rendering in `RadarRenderer.renderBlip()`

### Customizing Appearance
1. Priority ring styles: `.radar-priority-ring` in `styles.css`
2. Category dividers: `.radar-category-divider`
3. Blip appearance: `.radar-blip-circle`, `.radar-blip-title`
4. SVG dimensions: `SVG_CONFIG` in `constants.ts`

### Adding New Interactions
1. Add event listeners in `RadarInteractions`
2. Define callback in constructor options
3. Wire up in `RadarView.renderRadar()`

## Dependencies

- **Obsidian API**: Plugin, TextFileView, Modal, Menu, FuzzySuggestModal, etc.
- **No external dependencies**: Pure TypeScript/SVG implementation
- **Mobile compatible**: Touch events, pinch-to-zoom, no desktop-only APIs
