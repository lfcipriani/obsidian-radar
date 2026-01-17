# Radar Plugin Architecture

This document describes the architecture of the Obsidian Radar plugin.

## Overview

The Radar plugin allows users to visualize notes and text items as "blips" on a radar interface. Items closer to the center have higher priority. The radar is divided into concentric rings (priority levels) and segments (categories).

## File Structure

```
src/
├── main.ts                    # Plugin entry point (lifecycle only)
├── settings.ts                # Plugin settings and settings tab
├── types.ts                   # TypeScript interfaces and types
├── constants.ts               # Default values and configuration
│
├── commands/
│   ├── index.ts               # Command registration
│   └── createRadar.ts         # Create new radar command
│
├── data/
│   └── RadarStore.ts          # Data persistence layer
│
├── ui/
│   ├── RadarView.ts           # Main view (extends TextFileView)
│   ├── RadarRenderer.ts       # SVG rendering engine
│   ├── RadarInteractions.ts   # Drag-and-drop, zoom handling
│   ├── RadarToolbar.ts        # Toolbar with action buttons
│   ├── AddBlipModal.ts        # Modal for adding note blips
│   └── AddTextModal.ts        # Modal for adding text blips
│
└── utils/
    ├── idGenerator.ts         # UUID generation
    ├── polarCoordinates.ts    # Polar ↔ Cartesian math
    └── svgHelpers.ts          # SVG element creation
```

## Data Model

### Core Types (`src/types.ts`)

```
RadarData
├── id: string                 # Unique identifier
├── name: string               # Display name
├── priorityLevels[]           # Concentric rings (1-7)
│   ├── id: string
│   ├── name: string           # e.g., "Critical", "High"
│   └── maxRadius: number      # 0-1 normalized
├── categories[]               # Segment dividers (0-8)
│   ├── id: string
│   ├── name: string
│   └── startAngle: number     # Degrees
├── blips[]                    # Items on the radar
│   ├── id: string
│   ├── type: "note" | "text"
│   ├── title: string
│   ├── notePath?: string      # For note blips
│   ├── r: number              # Radial position (0-1)
│   ├── theta: number          # Angle in degrees
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

Minimal entry point handling:
- Settings loading/saving
- View registration with `registerView()`
- File extension registration with `registerExtensions()`
- Command registration
- Ribbon icon

```
RadarPlugin
├── onload()
│   ├── Initialize RadarStore
│   ├── Register RadarView for "radar-view" type
│   ├── Register ".radar" extension
│   ├── Register commands
│   └── Add ribbon icon
└── onunload()
    └── Detach radar views
```

### 2. View Layer (`ui/RadarView.ts`)

Extends `TextFileView` for automatic file handling:

```
RadarView extends TextFileView
├── getViewData()      → Returns JSON for saving
├── setViewData()      → Receives JSON, parses, renders
├── clear()            → Cleanup on file switch
├── onOpen()           → Create DOM structure
├── renderRadar()      → Initialize renderer & interactions
└── Event handlers
    ├── onBlipClick()  → Context menu
    ├── onBlipMove()   → Update position, save
    └── onZoomChange() → Update zoom, save
```

### 3. Rendering (`ui/RadarRenderer.ts`)

Pure SVG rendering, no interaction logic:

```
RadarRenderer
├── Constructor
│   └── Creates SVG structure
├── render()
│   ├── renderPriorityRings()  → Dashed circles
│   ├── renderCategoryDividers() → Lines from center
│   └── renderBlips()          → Positioned circles + titles
├── updateBlipPosition()       → Move single blip
├── addBlip() / removeBlip()   → Dynamic updates
└── setZoom()                  → Apply zoom transform
```

**SVG Structure:**
```svg
<svg viewBox="0 0 600 600">
  <g class="radar-background">
    <!-- Priority rings (dashed circles) -->
  </g>
  <g class="radar-categories">
    <!-- Category divider lines -->
  </g>
  <g class="radar-blips" transform="translate(300,300)">
    <!-- Blip groups with circle + text -->
  </g>
</svg>
```

### 4. Interactions (`ui/RadarInteractions.ts`)

Handles user input separately from rendering:

```
RadarInteractions
├── Mouse events
│   ├── mousedown → Start drag
│   ├── mousemove → Update position
│   └── mouseup   → End drag, emit move
├── Touch events
│   ├── touchstart → Start drag
│   ├── touchmove  → Update position
│   └── touchend   → End drag, emit move
├── Wheel event
│   └── wheel → Zoom in/out
└── Callbacks
    ├── onBlipMove(blipId, r, theta)
    └── onZoomChange(zoom)
```

### 5. Data Layer (`data/RadarStore.ts`)

Handles all data operations:

```
RadarStore
├── createNewRadarData()  → Generate default radar
├── createRadar()         → Create file in vault
├── loadRadar()           → Read and parse file
├── saveRadar()           → Write JSON to file
├── Blip operations
│   ├── addBlip()
│   ├── updateBlipPosition()
│   ├── updateBlip()
│   └── removeBlip()
└── listRadarFiles()      → Find all .radar files
```

## Coordinate System

### Polar Coordinates
- **r**: Radial distance, normalized 0-1 (0 = center, 1 = edge)
- **theta**: Angle in degrees, counterclockwise from positive x-axis (3 o'clock = 0°)

### SVG Coordinates
- ViewBox: 600×600
- Center: (300, 300)
- Max radius: 280px (leaves margin)
- Y-axis inverted (positive = downward)

### Conversion (`utils/polarCoordinates.ts`)
```
polarToCartesian(r, theta, maxRadius) → {x, y}
cartesianToPolar(x, y, maxRadius) → {r, theta}
```

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
            setViewData() → parse JSON
                    ↓
            renderRadar() → SVG displayed
```

### Moving a Blip
```
User drags blip → RadarInteractions.onMouseMove()
                          ↓
                  Update visual position
                          ↓
                  onMouseUp() → cartesianToPolar()
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
                         AddBlipModal (file picker)
                              ↓
                         User selects note
                              ↓
                         RadarStore.addBlip()
                              ↓
                         RadarRenderer.addBlip()
                              ↓
                         requestSave()
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

- **Obsidian API**: Plugin, TextFileView, Modal, Menu, etc.
- **No external dependencies**: Pure TypeScript/SVG implementation
- **Mobile compatible**: Touch events supported, no desktop-only APIs
