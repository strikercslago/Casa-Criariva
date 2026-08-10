# Design System

The product should feel professional, clean and warm without looking childish.

## Direction

- Neutral surfaces with strong legibility.
- Teal as the primary action color.
- Coral, amber and green as restrained accents.
- Border radius capped at 8px for app controls and cards.
- Subtle borders and shadows.
- Clear focus states for keyboard users.

## Tokens

Design tokens are CSS variables in `src/index.css` and are exposed to Tailwind through `tailwind.config.ts`.

## Base Components

Implemented in the foundation:

- `Button`
- `IconButton`
- `Input`
- `Textarea`
- `Select`
- `Checkbox`
- `Switch`
- `Card`
- `Badge`
- `Table`
- `EmptyState`
- `Skeleton`
- `Toast`
- `Overlay` for dialog and drawer foundations
- `Tooltip`
- `Tabs`
- `Pagination`
- `SearchInput`
- `PageHeader`

## Responsiveness

- Desktop uses a persistent sidebar.
- Mobile uses a drawer sidebar.
- Tables include responsive containment, but important mobile workflows should later receive card/list alternatives instead of relying only on horizontal scroll.
