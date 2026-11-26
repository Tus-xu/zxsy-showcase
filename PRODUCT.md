# Product

## Register

product

## Users

Chinese-speaking high-school students using the demo on a laptop in a classroom or at home, and teachers / product reviewers who host the offline single-file demo. The student is mid-task: they have a photo of a problem and want to understand it, practice it, and remember the mistake. Reviewers need to see the real teaching loop without a network or a running backend.

## Product Purpose

This repository is the offline showcase of 智学数研's student experience: one real problem photo flows into knowledge Q&A, guided solving, error review, variant practice, and a dual-teacher classroom. Success means a reviewer can click through the whole loop in one file, offline, and every step shows believable AI streaming, real scoring, and real state changes rather than a recorded slideshow.

## Positioning

A faithful, reusable demonstration of the product's teaching model, built from the real frontend components and tokens. It is not a production service, not a generic chatbot skin, and not an invented prototype with its own visual language.

## Operating Context

Windows Chrome/Edge, `file://` single HTML, 0 network requests, demo student account, 1440×900 and 1920×1080. Data is local and resettable. The original project at `D:\zxsy-math-arena` is read-only evidence; the demo must never start or write it.

## Capabilities and Constraints

- All content, images, audio, and fixtures are bundled; no external CDN, font, API, or model call.
- The three real problem images (`题1.png`–`题3.png`) anchor the content. No self-drawn problem images.
- Reuse the existing Vue components and V4 design tokens; new UI must match the real product's grammar.
- Demo conversations are authored, but the interaction is real: streaming text, fill-in checks, scoring, error-book writes, replay state.
- Missing capability must render an honest boundary, never a dead button or a fake success.
- Sessions reset on reopen so the demo can be run repeatedly.

## Brand Commitments

The student surface is the incumbent V4 language: cool off-white ground, white working cards, indigo/violet primary, cyan support, slate text, soft elevation, Chinese-first system typography. Guided solving uses a deliberate semantic palette: violet for decomposition, red for error analysis, amber for knowledge remediation, green for verified success. No generic purple-gradient AI theme, neon, glassmorphism, or decorative glow.

## Product Principles

1. Show the teaching loop, not a feature menu.
2. Every click produces a real state change; never strand the learner.
3. Anchor every conversation to the three real problems.
4. State boundaries honestly; the offline demo must not imply a backend it does not have.
5. Calm, legible, classroom-ready; motion explains state, never decorates it.

## Accessibility & Inclusion

WCAG AA contrast for body and placeholder text, keyboard reachability for choices and actions, visible focus, non-color status cues, reduced-motion fallbacks, and readable Chinese/math content at common Windows scaling.
