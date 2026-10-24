# Documentation Guide — Naqla Logistics

This document defines **how we document the Naqla Logistics platform**. It is the
agreed working standard; follow it for every change.

> Status: adopted 2026-10-24. Applies to all contributors (humans and AI agents).

---

## 1. Principles

1. **English only.** All documentation is written in English, to professional
   standards: clear structure, concise prose, correct terminology.
2. **Document decisions, not keystrokes.** Capture *what* changed and *why*, and
   point to the code (`path/to/file.ts`) rather than duplicating it.
3. **Keep docs close to the code they describe** and update them in the same
   change that alters behaviour, at the cadence defined below.
4. **Docs must match the code.** A doc that contradicts the implementation is a
   bug. The final polish pass (§4) verifies this.

---

## 2. Cadence — lightweight while building

We do **not** rewrite deep docs on every step (it wastes effort and goes stale
while the design is still moving). Instead:

| When | Action | File(s) |
| --- | --- | --- |
| After each **approved feature** | Add a short entry | `CHANGELOG.md` (`[Unreleased]`) |
| When scope/next-steps change | Update the backlog | `PENDING_WORK.md` |
| When a **system stabilizes** | Write/refresh its reference | `docs/ARCHITECTURE.md` or a dedicated `docs/<SYSTEM>.md` |
| At **project completion** | Full cleanup & verification pass (§4) | all docs |

A changelog entry is cheap and preserves the decision; deep system docs wait
until the API stops changing.

---

## 3. What each file is for

- **`CHANGELOG.md`** — chronological record of substantive changes, following
  [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [SemVer](https://semver.org/).
  Group by feature; lead with the user-facing effect.
- **`PENDING_WORK.md`** — the live backlog: what is next, known gaps, deferred items.
- **`docs/ARCHITECTURE.md`** — system-wide design: modules, data flow, lifecycles.
- **`docs/<SYSTEM>.md`** — focused reference for a major subsystem once stable
  (e.g. `docs/FLEET.md` for truck/driver management, `docs/ORDERS.md` for the
  order lifecycle and order types).
- **`docs/API.md`**, **`DEPLOYMENT.md`**, **`SECURITY.md`**, **`MONITORING.md`**,
  **`KPIs.md`** — their respective domains.
- **`GETTING_STARTED.md`** / **`README.md`** — onboarding and project overview.

---

## 4. Final polish pass (end of project)

Before release, do one thorough pass to make the docs production-grade:

- Standardize **language to English** across every doc. *(Note: `CHANGELOG.md`
  and `CLAUDE_CODE_INSTRUCTIONS.md` are currently in Arabic and must be
  converted during this pass.)*
- Verify every doc against the current code; fix drift.
- Add or refresh **Mermaid diagrams** for key flows (order lifecycle, escrow,
  fleet assignment, consolidated-order distribution).
- Unify structure, headings, terminology, and version numbers.
- Ensure every major subsystem has a reference doc and is linked from
  `docs/ARCHITECTURE.md`.

---

## 5. Style quick reference

- Headings in sentence case; short paragraphs; tables for structured facts.
- Reference code as `path/to/file.ts` (and a symbol/line when helpful).
- Use fenced code blocks with a language tag.
- Prefer present tense ("The store syncs the driver status") and active voice.
- Numbers in examples use Western digits (consistent with the product rule).
