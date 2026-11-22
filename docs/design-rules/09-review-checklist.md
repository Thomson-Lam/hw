# Review checklist

Run before delivering any design. Fail any item -> fix and recheck.

**Accessibility**
- [ ] Text 4.5:1, large text and UI parts 3:1
- [ ] No meaning conveyed by colour alone
- [ ] Targets 48x48pt, 8pt+ apart
- [ ] All 5 states defined, focus visible
- [ ] Headings, links, buttons make sense out of context

**System**
- [ ] Only spacing, type, radius, shadow and colour tokens used
- [ ] One typeface, regular and bold only
- [ ] Brand colour only on interactive elements
- [ ] Icons one consistent outline style

**Hierarchy and layout**
- [ ] Squint test passes
- [ ] Inner spacing smaller than outer spacing
- [ ] Left-aligned text and buttons, no mixed alignment
- [ ] One primary button per screen

**Content**
- [ ] Sentence case, concise, plain language, front-loaded
- [ ] Button labels are verb + noun
- [ ] Links descriptive
- [ ] Errors say what, why, fix

**Forms**
- [ ] Single column, visible labels, hints above, required and optional marked
- [ ] Disabled buttons look inactive and say how to enable them; inline validation

**Simplicity**
- [ ] Every element earns its place
- [ ] Important actions visible, labelled
- [ ] Choices reduced, grouped or stepped
- [ ] No gradients anywhere

**Components**
- [ ] Nav: logo links home, hover and active states, CTA distinct
- [ ] Modals: close control, verb+noun buttons, only for critical actions
- [ ] Cards: consistent heights, one CTA, token padding
- [ ] Hero/pricing: one primary CTA, recommended plan highlighted, social proof
- [ ] Nothing important is hover-only (tooltips, row actions)

**Perception, icons, motion, tables**
- [ ] Group gaps larger than inner gaps at every breakpoint
- [ ] No dark patterns or pre-ticked consent
- [ ] One icon style, consistent container, tested at size
- [ ] Motion purposeful, short, reduced-motion fallback
- [ ] Tables: alignment by data type, sticky header, sort affordance
