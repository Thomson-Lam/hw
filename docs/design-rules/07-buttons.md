# Buttons

## Three weights
| Weight | Style | Use |
|---|---|---|
| Primary | Solid brand fill, white text, rounded corners | The single most important action |
| Secondary | Unfilled, brand border and text, same shape | Less important or equal-weight alternatives |
| Tertiary | Transparent, brand-coloured underlined text | Least important actions, destructive actions |

## Rules
- Hierarchy must not rely on colour alone. Button shape contrast at least 3:1; button text at least 4.5:1.
- One primary button per screen. If nothing is clearly most important, use secondary/tertiary. Repeated actions in lists (e.g. Follow) are secondary.
- Same function = same shape. No inconsistent shapes.
- Do not use light grey for secondary buttons (looks disabled).
- Equal-importance actions get equal prominence (no biased styling).
- Target size at least 48x48pt; at least 8pt apart (16pt safer). Extend hit area beyond small visuals.
- Left-align buttons, ordered most to least important. On mobile, stack full-width, primary on top.
- Multi-step forms: primary button left-aligned; Back is a tertiary button at the top left.
- Exception: a single field + button (search, subscribe) puts the button attached on the right.
- Label = verb + noun ("Save post", "Discard message"). Never "OK" or "Yes".
- Disabled buttons are allowed. Style them clearly inactive (muted fill and text, no hover), keep them in place, and explain what is needed to enable them with a nearby message or keyboard-accessible tooltip. Disabled controls are exempt from contrast ratios, but keep the label readable.
- Icon + text pairs: match weight and size, or reduce icon contrast to balance.

## Destructive actions
Add friction proportional to severity:
1. Initial: make it less prominent (tertiary, further away). Do not colour it red by default.
2. Light: confirmation dialog.
3. Moderate: red-highlighted confirmation with consequences stated.
4. Heavy: red button plus a checkbox that must be ticked first.
5. Always offer undo where feasible.
