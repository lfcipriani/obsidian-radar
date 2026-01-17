# Radar

Radar is an obsidian plugin that allow users to add their notes or items as blips on a radar interface, allowing them to define importance or priority of the blips based on how close they are to the center of the radar.

## Important definitions

- Blip: an item in the radar. It can be an obsidian note or a text. 
- Priority: set of concentric circles that indicate the priority based on how close to center the blips are. User defined, can range from 1 to 7 priority levels, to avoid having too many circles in the radar.
- Category: segments of the radar circle that can be used to group notes under a same category. User defined, can range from 0 (no categories) to 8, to avoid having sections that are too thin to have blips on it.
- Blip positiong is done with polar coordinates: (r) radial distance in pixels, (theta) angle measured in degress, counterclockwise from the positive x-axis

## User experience

- View is rendered using SVG + DOM
- Initial radar has 4 unnamed categories and 4 priorities: Critical, High, Medium, Low
- Priority is rendered as a dashed circle and are linearly distributed from center to edge.
- Categories are divided by a thin line, they have the same size
- Blips are represented by a small circle (dot) in the radar with the title of the note or text hovering on top of it.

## User cases

- User create a new Radar by calling a command
- User click a button to add a note
- User click another button to add a text
- User can drag and drop the blip everywhere in the radar
- User can zoom in and out in the radar
