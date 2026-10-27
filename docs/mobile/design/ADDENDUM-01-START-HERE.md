# START HERE: NQLAH Update 01

This package **extends** the original handoff (`HANDOFF.md` / `README.md`) you already have and have started building from.
Do **not** rebuild existing screens. Do **not** replace the original handoff.

## What to read
1. **`01_instructions/HANDOFF-ADDENDUM-01.md`**: the full change spec. Read all of it before writing any code.
2. `03_screenshots/`: the visual reference for every new or changed screen (light + dark, 2x PNG; the screen area is 390×844dp at offset 10,10 inside a 10dp bezel).
3. `02_design_files/`: the HTML design references. Open them in a browser with `support.js` next to them. They are references only: rebuild them in the app's own stack, not by copying the HTML.

## Order of work
1. Commit the current state of the codebase.
2. List the exact files you plan to change and wait for confirmation.
3. **§0:** customer bottom bar change + wallet button in the Home header + finance (4h) becomes a pushed screen.
4. **§3:** new screens 6a (Trucks tab) and 6b (truck detail + direct request).
5. **§4:** screens 7a (load detail), 7b (bid sheet) and 7c (publish availability), built from existing components.
6. **§5:** small changes to existing screens (table).
7. **§2 and §8:** data model + server rules.
8. After each step, compare against `03_screenshots/` before moving on.

## Rules
- Reuse the existing tokens and components. Introduce no new colors or fonts.
- Change only what the addendum names. Leave everything else exactly as built.
- Disclosure rules are unchanged: the customer never sees driver data, and phones stay masked until acceptance.

## Files in this package
```
START-HERE.md
01_instructions/HANDOFF-ADDENDUM-01.md
02_design_files/NQLAH Available Trucks.dc.html   (new: 6a, 6b)
02_design_files/NQLAH Customer.dc.html           (changed: 1a, 1e header wallet + tab bar)
02_design_files/NQLAH Customer Flows.dc.html     (changed: 4f, 4g tab bar; 4h pushed)
02_design_files/NQLAH App Shell.dc.html          (changed: 2a customer tab set)
02_design_files/support.js
03_screenshots/*.png
```
