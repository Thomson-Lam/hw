# Additions and conflicts from *How to Design Better UI* 3.0

Where sources disagree, follow Practical UI and the project decisions below.

## Project decisions (override all books)
- No gradients. Flat fills only.
- Disabled buttons are allowed (see 07-buttons.md).

## Extra rules
- Web grid: 12 columns, 20px gutters. Mobile: 4 columns, 16px margins, 8px gutters.
- Set a max content width for very large screens.
- Build layouts as nested containers so developers can implement them.
- Vertical rhythm: title to description 8-20px; text groups to buttons 20-40px.
- Button anatomy: label 14-20px; horizontal padding about 2x vertical; height 32-60px; round values so text centres.
- Lead with the icon when it explains the action; trailing icons for direction only.
- Wrap small links/list items in boxes at least 48pt.
- Button states: normal, hover, active, disabled, loading, focus.
- Use correct input types (email, phone, file).
- Multi-step forms: progress tracker, inline validation, clear success state.
- Stack radios and checkboxes vertically.
- Document everything in a style guide; name styles by role; build atomic component libraries.

## Conflicts (book says X; we follow Y)
| Book says | We follow |
|---|---|
| 40-44px targets; desktop buttons 32-40px | 48x48pt minimum |
| Floating labels | Labels always visible above field |
| Gradients, inner shadows on buttons | Flat fills, two shadow tokens |
| Placeholder as guidance | Never as the label; 4.5:1 |
| Centre-aligned heroes | Left-align by default |
| Colour-coded chips | Pair colour with text/icon |
