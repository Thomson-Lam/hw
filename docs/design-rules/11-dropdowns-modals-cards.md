# Dropdowns, modals and cards

Paraphrased from *How to Design Better UI* 3.0 (Kuleszo).

## Dropdowns, accordions, tooltips
- Dropdown for more than 5 predictable options; fewer: prefer radios.
- Long lists: scrollable container; show part of the last item as a scroll hint.
- Multi-select: clear selected feedback, easy clear-all, keyboard navigable.
- States: default, hover, open, selected, disabled, focus; distinguish with more than colour.
- Subtle stroke or raised shadow so the menu separates from light backgrounds.
- Long lists on mobile: open a modal sheet with a search field.
- Nested menus: arrow or indentation for deeper levels.
- Accordions (FAQ): descriptive question as label.
- Tooltips: open on hover, keyboard focus and tap; short, pointing at the exact element. Never put essential information only in a tooltip.
- Chips/tags: filters or attributes; pair colour with text/icon.
- FAB: only for the single most frequent action.

## Modals
- Reserve for critical interactions.
- Always give escape routes: visible close (X), clear CTAs, click-outside to dismiss.
- Responsive on every screen size.
- Progress indicator for long operations.
- Not every error needs a modal; prefer inline. Use for irreversible or high-impact actions.
- Positive phrasing, verb + noun buttons ("Cancel" / "Deactivate"), never Yes/No; avoid double negatives.
- Multi-step modals: show steps and an explicit confirm step. If it adds many steps, keep the task in the main flow.
- Toasts/snackbars: confirm or offer undo; not colour alone.

## Cards
- Anatomy: header, content, footer action.
- Concise content, short headlines; fewer words in multi-column grids.
- Consistent heights: truncate with ellipsis (tooltip for full text), fill height, or min/max heights.
- Images share one aspect ratio and style.
- Hierarchy: headline > description > CTA at the bottom.
- Padding 16-24px inside; 16-40px between cards; 64-96px above/below card sections (token XXL = 80).
- Border, radius or shadow in moderation. Whole card is already interactive.
