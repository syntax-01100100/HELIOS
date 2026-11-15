# Project memory

## Product intent & audience

- Project: **Run Helios**, created by Syntax 01100100 on StackBlitz
- Multi-page web app with at least a **main page** and a **health page**
- Bilingual support intended: **English ↔ Arabic** (Arabic requires RTL layout)

## Brand personality & voice

- Not yet inferred beyond bilingual/multilingual intent

## Visual design & UX direction

- Main page has: header, hero, navigation dots, theme toggle, form fields, multiple sections
- RTL layout is applied when Arabic is selected on the main page
- Theme system exists with a toggle button
- Navigation uses dot indicators
- Form fields use placeholder text

## Decisions, constraints & rationale

- Two parallel i18n systems exist:
  - **Shared i18n module**: dictionary-based (English + Arabic), used by the **health page** — works correctly
  - **Inline language script**: on the **main page**, only updates nav dots, theme button label, and form placeholders
- Main page's Arabic button switches layout to RTL but most page text has no Arabic translations, so it cannot fully translate
- Full main-page Arabic translation requires writing Arabic copies for all text and connecting to the shared i18n system — pending user approval
- User was asked whether to start with header/hero/navigation only or do the full page; no decision yet

## Open questions & assumptions

- Should the main page be migrated to the shared i18n system (consistency) vs. expanding its inline system?
- Scope of first Arabic translation pass: full page vs. header/hero/nav only — awaiting user direction
- Framework is listed as DEFAULT_TO_DEV; actual framework/runtime not yet confirmed from code
- No `.bolt/prompt` file exists, so no global authoritative instructions to reference