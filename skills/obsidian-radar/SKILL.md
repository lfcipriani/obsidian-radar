---
name: obsidian-radar
description: Create and edit Obsidian Radar files (.radar) with priority level rings, category segments, and blips. Use when working with .radar files, placing items on a radar diagram, or when the user mentions radar, blips, rings in Obsidian.
---

# Obsidian Radar Skill

## File Structure

A radar file (`.radar`) is a UTF-8 JSON file containing the full state of a radar diagram:

```json
{
  "priorityLevels": [],
  "categories": [],
  "blipRadius": 5,
  "blipFontSize": 7,
  "blipColor": "#027aff",
  "blips": []
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `priorityLevels` | yes | Concentric rings from center outward (1–8 entries) |
| `categories` | yes | Angular segments dividing the radar (3–8 entries) |
| `blipRadius` | yes | Pixel radius for all blip circles. Range: `3`–`20`. Default: `5` |
| `blipFontSize` | yes | Pixel font size for blip labels. Range: `3`–`12`. Default: `7` |
| `blipColor` | no | Default hex color for blips; falls back to accent color if absent |
| `blips` | yes | Items placed on the radar |

## Common Workflows

### 1. Create a New Radar

1. Create a `.radar` file with the full JSON structure
2. Define 1–8 `priorityLevels` ordered innermost to outermost; the last must have `maxRadius: 1.0`
3. Define 3–8 `categories`, each with a unique `startAngle` (0–359)
4. Set `blipRadius`, `blipFontSize`, and optionally `blipColor`
5. Add blips; leave `blips: []` if starting empty
6. **Validate**: confirm JSON is valid; check that `maxRadius` values are ascending and the final is `1.0`

### 2. Add a Blip

1. Read and parse the existing `.radar` file
2. Generate a UUID for the new blip's `id`
3. Choose `type`: `"note"` (linked to a vault file) or `"text"` (standalone label)
4. For `"note"` blips, set `notePath` to the vault-relative path (e.g. `"Projects/my-note.md"`)
5. Determine `r` (ring placement) and `theta` (segment placement) — see Positioning below
6. Optionally set a per-blip `color` to override the default
7. Append the blip to the `blips` array
8. **Validate**: confirm `id` is unique, `r` ≥ 0, `theta` is 0–359

### 3. Position a Blip in a Specific Ring and Segment

To place a blip in a target ring:
- Find the ring's inner radius: `maxRadius` of the previous ring (or `0.0` for the innermost ring)
- Find the ring's outer radius: `maxRadius` of the target ring
- Pick `r` somewhere in that range; use the midpoint for a centered placement
- Add slight variation (±0.03–0.05) to avoid blips stacking exactly on top of each other

To place a blip in a target segment:
- Sort categories by `startAngle`; each segment spans from its `startAngle` to the next category's `startAngle` (wrapping at 360°)
- Pick `theta` inside that angular span; use the midpoint for a centered placement
- Add slight variation (±5–15°) when multiple blips share the same segment and ring

Example — placing in "High" ring (0.25–0.50) and "Explore" segment (90°–180°):
```
r = 0.375          // midpoint of 0.25 and 0.50
theta = 135        // midpoint of 90 and 180
```

### 4. Edit an Existing Radar

1. Read and parse the `.radar` file as JSON
2. Locate the target blip, ring, or category by `id`
3. Modify the desired attributes (`r`, `theta`, `color`, `name`, `maxRadius`, etc.)
4. Write the updated JSON back to the file
5. **Validate**: re-check ascending `maxRadius`, unique IDs, and valid angle ranges

### 5. Rename or Recolor a Ring or Segment

1. Read the file and locate the ring (`priorityLevels`) or segment (`categories`) by `id`
2. Update `name` and/or `color`
3. Write back — no blip coordinates change; blips are positioned by `r`/`theta`, not by ring/segment ID

## Priority Levels (Rings)

Each entry defines one concentric ring, ordered innermost to outermost.

```json
{ "id": "p1", "name": "Critical", "maxRadius": 0.25, "color": "#fb464c" }
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Unique identifier (UUID or short string) |
| `name` | yes | Display label; may be empty string |
| `maxRadius` | yes | Outer edge as a fraction of total radar radius (`0.0`–`1.0`). Values above `1.0` place blips outside all rings. |
| `color` | no | Background fill color (hex); no fill if absent |

Rules:
- Array must be sorted ascending by `maxRadius`
- The outermost ring should have `maxRadius: 1.0`
- Between 1 and 8 rings total

## Categories (Segments)

Each entry defines one angular segment. Categories are sorted by `startAngle` when loaded.

```json
{ "id": "c1", "name": "Explore", "startAngle": 90, "color": "#44cf6e" }
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Unique identifier |
| `name` | yes | Display label; may be empty string |
| `startAngle` | yes | Counter-clockwise angle in degrees from 3 o'clock (positive x-axis). Range: `0`–`359`. |
| `color` | no | Background fill color (hex); no fill if absent |

A segment spans from its own `startAngle` to the `startAngle` of the next category (sorted). The last category wraps around to the first. Between 3 and 8 segments total.

**Angle orientation:**
- `0°` → 3 o'clock (right)
- `90°` → 12 o'clock (top)
- `180°` → 9 o'clock (left)
- `270°` → 6 o'clock (bottom)

## Blips

Each blip represents one item placed on the radar.

```json
{
  "id": "b1a2c3d4-e5f6-7890-abcd-ef1234567890",
  "type": "note",
  "title": "My Project Note",
  "notePath": "Projects/my-project.md",
  "r": 0.3,
  "theta": 135,
  "color": "#a882ff"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | UUID (or any unique string) |
| `type` | yes | `"note"` or `"text"` |
| `title` | yes | Display label shown on the radar |
| `notePath` | no | Vault-relative path to the linked note. Present only when `type` is `"note"`. |
| `r` | yes | Radial distance from center. `0.0` = center, `1.0` = outer edge. Values above `1.0` are valid (outside all rings). |
| `theta` | yes | Angle in degrees, counter-clockwise from 3 o'clock. Range: `0`–`359`. |
| `color` | no | Per-blip color override (hex); takes precedence over top-level `blipColor` |

**Blip types:**
- `"note"` — linked to a vault file via `notePath`; clicking opens the note
- `"text"` — standalone label with no file link; `notePath` must be absent

## Colors

Colors are stored as hex strings (`#rrggbb`). Available presets:

| Name | Hex |
|------|-----|
| Red | `#fb464c` |
| Orange | `#e9973f` |
| Yellow | `#e0ac00` |
| Green | `#44cf6e` |
| Cyan | `#53dfdd` |
| Blue | `#027aff` |
| Purple | `#a882ff` |

Any valid hex color may be used. Color fields are optional throughout — the renderer applies its own fallback (accent color for blips, no fill for rings/segments) when absent.

## ID Generation

Blip `id` values should be UUIDs (version 4):

```
"b1a2c3d4-e5f6-7890-abcd-ef1234567890"
"11111111-1111-1111-1111-111111111111"
```

Ring and category `id` values may be short strings (`"p1"`, `"c2"`) or UUIDs — consistency within a file is preferred.

## Validation Checklist

After creating or editing a radar file, verify:

1. JSON is valid and parseable
2. All `id` values are unique within each array (`priorityLevels`, `categories`, `blips`)
3. `priorityLevels` is sorted ascending by `maxRadius`; the last entry has `maxRadius: 1.0`
4. `priorityLevels` has between 1 and 8 entries; `categories` has between 3 and 8 entries
5. Every `startAngle` is in range `0`–`359`
6. Every blip `r` is ≥ 0 and every blip `theta` is in range `0`–`359`
7. Every `"note"` blip has a `notePath`; every `"text"` blip does not
8. `blipRadius` is in range `3`–`20`; `blipFontSize` is in range `3`–`12`
9. All color values are valid hex strings (`#rrggbb`)

## Complete Example

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

