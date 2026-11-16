# JSON Radar Spec 1.0

This document describes the JSON format used to store `.radar` files.

## Overview

A `.radar` file is a UTF-8 JSON file that describes the full state of a radar diagram: its rings, segments, blips, and display settings. The format is self-contained — all data needed to render the radar is stored in the file.

Files use the `.radar` extension and are stored in the Obsidian vault like any other note.

## Top-level structure

```json
{
  "priorityLevels": [...],
  "categories": [...],
  "blipRadius": 5,
  "blipFontSize": 7,
  "blipColor": "#027aff",
  "settings": {...},
  "blips": [...]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `priorityLevels` | array | yes | Concentric rings defining priority zones |
| `categories` | array | yes | Angular segments dividing the radar |
| `blipRadius` | number | yes | Radius of all blip circles in pixels |
| `blipFontSize` | number | yes | Font size for blip labels in pixels |
| `blipColor` | string | no | Default blip color (hex). Should fall back to a default color if absent. |
| `settings` | object | no | Key-value display/client settings. See [Settings](#settings). |
| `blips` | array | yes | Items placed on the radar |

## Priority levels

Each entry in `priorityLevels` defines one concentric ring, from center outward. The array must contain between 1 and 8 entries.

```json
{
  "id": "p1",
  "name": "Critical",
  "maxRadius": 0.25,
  "color": "#fb464c"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Unique identifier (UUID or short string) |
| `name` | string | yes | Display label for the ring. May be empty. |
| `maxRadius` | number | yes | Outer edge of the ring as a fraction of the total radar radius. Range: `0.0`–`1.0`. A number greater than `1.0` is possible, it's when the blip falls outside of the radar. |
| `color` | string | no | Background fill color for the ring (hex). |

Priority levels must be ordered from innermost to outermost (ascending `maxRadius`). The outermost level should have `maxRadius: 1.0`. Blips positioned beyond all rings are still valid.

## Categories

Each entry in `categories` defines one angular segment. The array must contain between 3 and 8 entries (use an empty-named set of 4 segments at 90° intervals as a default). Categories are sorted by `startAngle` when loaded.

```json
{
  "id": "c1",
  "name": "Explore",
  "startAngle": 90,
  "color": "#44cf6e"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Unique identifier |
| `name` | string | yes | Display label for the segment. May be empty. |
| `startAngle` | number | yes | Counter-clockwise angle in degrees from the positive x-axis (3 o'clock = 0°) where the segment begins. Range: `0`–`359`. |
| `color` | string | no | Background fill color for the segment (hex). |

A segment spans from its own `startAngle` to the `startAngle` of the next category (sorted order). The last category wraps around to the first.

## Blips

Each entry in `blips` represents one item placed on the radar.

```json
{
  "id": "b1a2c3d4-...",
  "type": "note",
  "title": "My Project Note",
  "notePath": "Projects/my-project.md",
  "r": 0.3,
  "theta": 45,
  "color": "#a882ff"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Unique identifier (UUID) or any other identifier |
| `type` | string | yes | `"note"` or `"text"` |
| `title` | string | yes | Display label shown on the radar |
| `notePath` | string | no | Vault path of the linked note. Only present when `type` is `"note"`. |
| `r` | number | yes | Radial distance from center. Range: `0.0` (center) to `1.0` (edge). Values above `1.0` are valid (blip outside all rings). |
| `theta` | number | yes | Angle in degrees, counter-clockwise from the positive x-axis (3 o'clock = 0°). Range: `0`–`359`. |
| `color` | string | no | Per-blip color override (hex). Takes precedence over `blipColor`. |

**Blip types:**
- `"note"` — linked to a file note at `notePath`.
- `"text"` — standalone label with no file link.

## Colors

Colors are stored as hex strings (`#rrggbb`). The following preset colors are available in the UI:

| Name | Hex |
|---|---|
| Red | `#fb464c` |
| Orange | `#e9973f` |
| Yellow | `#e0ac00` |
| Green | `#44cf6e` |
| Cyan | `#53dfdd` |
| Blue | `#027aff` |
| Purple | `#a882ff` |

Any valid hex color may be stored. Color fields are optional throughout; when absent the renderer applies its own fallback (accent color for blips, no fill for rings/segments).

## Blip radius

`blipRadius` is an integer (or float) number of pixels applied to all blip circles. Valid range: `3`–`20`. Default: `5`.

## Blip font size

`blipFontSize` is an integer (or float) number of pixels applied to all blip labels. Valid range: `3`–`12`. Default: `7`.

## Settings

`settings` is an optional flat key-value object. Values must be a string, boolean or number; nested objects, arrays and `null` are not allowed.

The format itself does not validate setting values — each client validates the keys it understands. A client must ignore (not fail on) a setting whose value it doesn't recognize, and apply its own default instead. Clients should preserve keys they don't understand when saving, so settings written by other clients aren't lost.

The following settings are defined. They mirror the radar toolbar toggles:

| Key | Type | Valid values | Default | Description |
|---|---|---|---|---|
| `showBlipName` | string | `"hide"`, `"full"`, `"crop"` | `"crop"` | How blip labels are displayed: hidden, full text, or cropped. |
| `showGlow` | boolean | `true`, `false` | `true` | Show the glow halo around blips. |
| `showPriorityLevelLabels` | boolean | `true`, `false` | `true` | Show the priority level labels on the rings. |
| `showBacklinks` | boolean | `true`, `false` | `true` | Show lines between note blips that link to each other. |

Example: `{ "showBlipName": "show" }` is not a valid value, so the client ignores it and uses `"crop"`.

### Dynamic blip color settings

These settings are specific to the Obsidian client. They color note blips from metadata in the linked note:

| Key | Type | Valid values | Default | Description |
|---|---|---|---|---|
| `blipColorByProperty` | boolean | `true`, `false` | `false` | Color note blips from a frontmatter property of the linked note. |
| `blipColorByPropertyName` | string | any property name | `"color"` | Name of the frontmatter property to read the color from. Only used when `blipColorByProperty` is `true`. |
| `blipColorByTag` | boolean | `true`, `false` | `false` | Color note blips from a tag of the linked note (e.g. `#fb464c`, `#red`). |

A property or tag value is a hex code (`#rrggbb` or `#rgb`; the `#` is optional) or one of these Obsidian color names, case-insensitive:

| Name | Hex |
|---|---|
| `red` | `#fb464c` |
| `orange` | `#e9973f` |
| `yellow` | `#e0ac00` |
| `green` | `#44cf6e` |
| `cyan` | `#53dfdd` |
| `blue` | `#027aff` |
| `purple` | `#a882ff` |
| `pink` | `#fa99cd` |

Color precedence for a note blip: frontmatter property → tag → the blip's `color` → `blipColor` → client default. If a note has several valid color tags, the first one wins.

The resolved color is written into the blip's `color` field as `#rrggbb`. Clients that don't support these settings therefore render the last resolved color as a regular per-blip color. A client that supports them re-resolves colors from the notes when the file is loaded. Note blips whose notes have no matching property or tag keep their current `color`.

## Complete example

```json
{
  "priorityLevels": [
    { "id": "p1", "name": "Critical", "maxRadius": 0.25, "color": "#fb464c" },
    { "id": "p2", "name": "High",     "maxRadius": 0.50, "color": "#e9973f" },
    { "id": "p3", "name": "Medium",   "maxRadius": 0.75, "color": "#e0ac00" },
    { "id": "p4", "name": "Low",      "maxRadius": 1.0  }
  ],
  "categories": [
    { "id": "c1", "name": "Explore", "startAngle": 90,  "color": "#44cf6e" },
    { "id": "c2", "name": "Adopt",   "startAngle": 180, "color": "#027aff" },
    { "id": "c3", "name": "Hold",    "startAngle": 270  },
    { "id": "c4", "name": "Retire",  "startAngle": 0    }
  ],
  "blipRadius": 6,
  "blipFontSize": 7,
  "blipColor": "#53dfdd",
  "settings": {
    "showBlipName": "full",
    "showGlow": false,
    "showPriorityLevelLabels": true,
    "showBacklinks": true,
    "blipColorByTag": true,
    "blipColorByProperty": true,
    "blipColorByPropertyName": "color"
  },
  "blips": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "type": "note",
      "title": "Obsidian Radar",
      "notePath": "Projects/obsidian-radar.md",
      "r": 0.15,
      "theta": 120
    },
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "type": "text",
      "title": "Future idea",
      "r": 0.85,
      "theta": 300,
      "color": "#a882ff"
    }
  ]
}
```
