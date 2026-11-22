# Foundations

## Principles
- Minimise usability risk: if something could be missed, misread or mistaken (light grey text, unlabelled icons, coloured non-link headings), fix it.
- Minimise interaction cost (clicks, scrolls, typing, searching, remembering). Keep related actions close to what they affect.
- Minimise cognitive load: remove the unnecessary, group related items, use familiar patterns, stay consistent, show clear hierarchy.
- Use common patterns (Jakob's Law). Innovate only on the product's unique selling point.
- Prioritise with the 80/20 rule: optimise for the common tasks, not edge cases.
- Be consistent inside the product and with platform conventions (iOS, Android, web).

## Design system = tokens + modules + usage rules
Define once, reuse everywhere.

### Spacing tokens
| Name | Value |
|---|---|
| XS | 8pt |
| S | 16pt |
| M | 24pt |
| L | 32pt |
| XL | 48pt |
| XXL | 80pt |

### Type tokens (1.2 scale, base 16px)
| Style | Size | Line height |
|---|---|---|
| Heading 1 | 40px | 48px |
| Heading 2 | 32px | 40px |
| Heading 3 | 24px | 32px |
| Heading 4 | 20px | 28px |
| Small | 16px | 24px |
| Tiny | 14px | 20px |

Long body text: 18px minimum (see typography rules).

### Other tokens
- Radius: 8pt (small elements), 16pt (medium), 32pt (large).
- Shadows: exactly two - raised and overlay.
- Colours: see `03-colour.md`.

### Modules
Build smallest components first (button, avatar, input), combine into larger components, arrange into templates. Keep a component library.

## Accessibility
- Target WCAG 2.1 AA minimum.
- Design for low vision, colour blindness, motor impairment, screen readers and screen magnifiers.
- Magnifier users see a small area: keep related items close, left-align actions, avoid far-right placement.
- Descriptive headings, links and buttons so they make sense out of context for screen readers.
- Accessibility improvements generally improve usability for everyone.

## Interaction states
Every interactive element needs five states: default, hover, press (active), focus (keyboard), disabled. Focus must be visible.

## Icons
Use one style (outlined), consistent stroke thickness. Filled icons usually signal "selected".
