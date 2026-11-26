# Design system

## Direction

Operate. The student is in a task: read the problem, answer, get corrected, practice, remember. Conversation is the canvas; cards are deliberate teaching surfaces, not decoration.

## Visual world

The incumbent V4 student world is retained: `#f8fafc` ground, white surfaces, slate ink, indigo `#4f46e5` primary, violet `#7c3aed` support, cyan `#06b6d4` information, soft 1px borders, and restrained elevation. The signature gradient is indigo → violet → cyan, used for the brand mark and primary momentum, never as text fill on body copy.

## Layout grammar

- App shell: 60px top bar, 240px collapsible left navigation, centered conversation column.
- Conversation reading width ≈ 720–860px; composer sticky and aligned to the column.
- Assistant turns are open prose inside a white bordered bubble; student turns are compact, right-aligned, tinted.
- Teaching cards span the reading column and use a 12–16px radius, 1px border, no heavy shadow.
- Guided solving is a vertical sequence of semantic blocks, each with a colored header strip or tinted surface, never nested cards.

## Semantic color roles

- Decompose / step: violet `--purple`, `--purple-soft`, `--purple-border`.
- Error analysis: `--err`, `--err-bg`, `--err-border`.
- Knowledge remediation: `--warn`, `--warn-bg`, `--warn-border`.
- Success / verified: `--ok`, `--ok-bg`, `--ok-border`.
- Primary action and current selection: `--brand` / `--brand-deep` / `--brand-soft`.
- Information and graph accents: `--cyan` / `--cyan-soft`.
- Neutral text: `--ink`, `--ink2`, `--ink3`; body text never below `--ink2` on tinted surfaces.

## Typography

Chinese-first system stack: `"PingFang SC", "Microsoft YaHei", "Inter", -apple-system, sans-serif`. Body 14–15px, line-height 1.6–1.75; headings 18/22/28/36 with weight contrast; labels 11–12.5px. Math uses KaTeX/MathLive; no raw LaTeX in rendered surfaces. Numerals use the `--font-num` stack.

## Components

- Buttons: 8–10px radius, 1px border or solid brand, 150–200ms state transitions, visible focus, disabled state distinct.
- Cards: white surface, 1px `--line`, 12–16px radius, shadow ≤ 8px blur or none.
- Choice rows: full-width, 36–44px height, letter chip + text, hover/selected/correct/wrong states.
- Fill-in: MathField or token chips; never show `$...$` or `\frac` as text.
- Progress: thin 4–6px track with semantic fill; step dots; no fake percentages.
- Replay: segmented timeline with per-step state, play/pause, reduced-motion fallback.

## Motion

150–250ms for state transitions; ease-out-quart/quint. Streaming cursor for AI text. Knowledge-trace replay reveals steps sequentially with a moving highlight; `prefers-reduced-motion` replaces it with an instant stepped state. No page-load choreography.

## Accessibility

AA contrast, 44px touch targets where possible, keyboard-operable choices, `aria-live` for streaming and feedback, no color-only status, reduced-motion support, readable math at 200% zoom.

## Evidence rules

The real frontend at `D:\zxsy-math-arena\frontend` is the visual authority. New surfaces must cite the component/file they mirror. Offline fixtures may replace data, never the interaction grammar.
