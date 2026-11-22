# Colour

## Contrast (WCAG 2.1 AA)
- Small text (18px or less): 4.5:1.
- Large text (over 24px regular, or over 18px bold) and UI components (input borders, radio, checkbox, icons): 3:1.
- Decorative elements are exempt.
- Placeholder text, secondary text, links and button text on brand fill must still pass 4.5:1.
- Also check APCA where possible (especially dark UIs). Guide values: 90 preferred body, 75 minimum body, 60 other text, 45 large text and UI, 30 absolute minimum (placeholder, disabled), 15 non-text. Use WCAG 2 as the compliance baseline for commercial work; aim to pass both.
- Text on photos: add a flat semi-transparent (optionally blurred) overlay or a solid text background (no gradients), plus optional text shadow. Must meet the same ratios.

## No gradients
Use flat fills only. Create depth with the two shadow tokens and hierarchy with solid colour steps.

## Never colour alone
- Errors: colour + icon + thicker border + background shade.
- Links: colour + underline.
- Status colours always paired with an icon or text.

## System colours
- Red = error/urgent, amber = warning, green = success.
- Text in system colours 4.5:1; icons/elements 3:1.
- Do not use these meanings for the brand colour on interactive elements.

## Brand colour
- Use one brand colour plus black and white.
- Apply it to interactive elements only (buttons, text links). Do not colour non-interactive headings.
- Brand colour needs 4.5:1 against its background.
- If brand colour is very light (e.g. yellow): use text colour for button text/links, add a border giving 3:1, or darken slightly. If it carries meaning (e.g. red), do not use it for actions.
- Multiple brand colours: highest-contrast one for interactive elements, others for decoration only.
- Design in black and white first. Avoid pure black on pure white for long text; use dark grey (about #1A1A1A).

## Palette (HSB, 1 brand + 5 variations)
Example for hue 230. Adjust hue, keep the saturation/brightness pattern.
| Role | HSB | Use |
|---|---|---|
| Brand | 230, 65, 85 | Buttons, text links |
| Text strong | 230, 57, 24 | Headings, body, labels |
| Text weak | 230, 27, 48 | Supporting text |
| Stroke strong | 230, 23, 65 | Input borders, icons |
| Stroke weak | 230, 5, 94 | Dividers (decorative) |
| Fill | 230, 2, 98 | Secondary background, tags |
| Background | 0, 0, 100 | Main background |

Verify each text/stroke colour against the fill it sits on (4.5:1 text, 3:1 strokes). Name colours by role, not by appearance.

## Hierarchy with colour
More important = more saturated, more contrast, more prominent hue. Headings darker than body text.

## Dark mode
Build a separate dark palette; check contrast with APCA; avoid pure white on pure black glare for long text.

## Photos
Match photo colour temperature to the palette.
