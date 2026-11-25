# Validation — 0.4.2

## 0.4.2 checks

- Effect context tests verify duplicate source suppression, initially collapsed entries, and remembered per-effect disclosure state across sheet instances.
- Template/style checks verify compact summary markup, controls inside the expandable body, retained Edit effect action and removal of the quick-delete control.
- Category-cycle tests verify that leaving Temporary restores the icon setting and sets its snapshot to null; subsequent cycles capture the latest setting. No update contains the legacy `. -=` deletion-key syntax (without the space), and the effect remains in its parent collection.
- Existing effect, talent/power and resource tests pass. No visual/live Foundry verification is claimed.

## 0.4.1 checks

- Reproduced the conflicting rule in the supplied Warhammer Library CSS: `.sheet-list .list-content .row-content` fixes row height at 2rem, with additional single-line flex/overflow rules. The new effect row no longer matches these selectors.
- Added regression checks that effect display context contains name, icon, UUID, source and disabled state, including both item-owned and actor-owned effects from the supplied export.
- Added template/style checks for explicit display bindings, removal of the native row-content class and automatic-height named grid areas. Existing effect, talent/power and resource contract suites pass.
- No browser rendering or live Foundry visual verification is claimed. The screenshot supplied by the user established the symptom; source and regression checks verify the isolated styling and display-data changes.

## 0.4.0 checks

- Existing talent/power and resource/macro contract suites pass.
- New effect tests use the latest supplied Kyra export, plus the actual bundled Sanctioned Psyker script. Verified default grouping, inclusion of creation-only records, no writes during context preparation, initial inactive setup, repeat toggles, temporary-status eligibility, Permanent lock/unlock, saved disclosure state, ownership guards, rejection of computed/foreign targets, expired-effect protection, failed and overlapping writes, preservation of genuine conditions and timers, icon-setting restoration and changed-ID export/import.
- Unwavering preparation checked with normal and doubled WilB, sanctioned and unsanctioned thresholds, and the eagle's separate +4 script. Kyra's expected threshold is 14 inactive / 24 active. Repeated preparations do not accumulate bonuses. The update does not change Fate, source characteristics, skills, talents, power purchases or XP.
- Classification and native icon behavior were checked against the uploaded Warhammer Library's isTemporary, isExpiryExempt and actor.temporaryEffects implementations. Icon eligibility is tested; actual canvas drawing remains a live Foundry check.

## 0.3.2 checks

- Syntax and existing category/grouping contracts passed.
- Category lookup verified: missing/unknown/legacy Unsorted → Active; Familiar and all other valid categories are retained. No writes are performed by default classification.
- Only category configuration/defaults and documentation/version changed from 0.3.1. Prescience, templates, token support and macro are unchanged.

## Completed (including prior versions)

- JavaScript syntax checks for both shipped scripts; manifest JSON parsing and referenced-file checks.
- Existing contract suite: actual uploaded CharacterSheet inheritance, optional registration, talent categories, permissions, failed saves, export/import with new IDs, power classification and ordering, disclosure preferences, and untouched rule data.
- Resource contract suite: live charge/threshold reads, alternative attribute lookup, missing Warp data fallback, unmodified native attribute lists, over-threshold values, absolute/delta HUD edits, lower bound, invalid-number rejection and hook cancellation.
- Prescience: default, edits, zero/negative/fraction/overflow validation, permissions, failed and overlapping saves, actor-system data unchanged, and JSON/new-ID portability.
- Macro selection validation: zero/multiple selections, non-owner selection and disabled module cause no writes.
- Token configuration: prototype and linked tokens across scenes, unrelated/unowned/unlinked exclusions, synthetic token scope, and partial failures with successful updates retained.
- Template field comparison: every original Main/Notes form field is preserved exactly once; Handedness/Augmetics occur only in Notes.
- Source inspected against uploaded impmal 4.1.0, Warhammer Library 3.5.1 and Foundry V14 API documentation.

## Not completed here

A browser rendering attempt failed because the installed Chromium launcher has no browser executable. Consequently no rendered-layout, real Token HUD, canvas bar refresh, or live Foundry lifecycle/module-interaction verification is claimed. Contract tests use document/runtime doubles for Foundry APIs.

## Short live check

0. Effects: Unwavering Will appears in Temporary. Click Set up (off), verify Off / WilB 5 / threshold 14, then test Turn on: expect On / WilB 10 / threshold 24 and an eye status icon on a placed linked token. Turn off again: the icon disappears and values return to normal. Fate must remain unchanged during this UI test. During play, spend the Fate point manually. Move a spare effect between groups; Permanent must enable it and lock the sheet toggle, while moving back unlocks it. Expand/collapse Permanent and reopen the sheet to check the saved preference. Source-item editing, condition pips and native effect creation should still work.
1. Main: Prescience appears and XP is unchanged. Notes: Handedness/Augmetics appear below the first description row. No token setup button remains on Main. Set 5, spend one, reopen: expect 4. A negative or fractional entry must not save. Existing talent/power groups still work.
2. Import macros/Configure-Token-Bars.json, select exactly one linked Kyra token, and run the macro. Hover a linked token as its owner: bar 1 is Wounds; bar 2 is Warp Charge. Inspect prototype and token configuration to confirm the assignments.
3. Change Warp Charge on Powers, then in the token HUD: both should reflect the same value. Test a value above the threshold without making a roll/end-of-turn action, then restore the original value. The stored charge must not be capped at the threshold. The graphic is full at/above threshold.
4. Place a new token from the actor directory: it should inherit both bars. Changes to derived Warp Threshold should change bar 2’s maximum.
5. Export/import a temporary actor copy: Prescience points and prototype bar assignments should survive with new IDs. Use the configuration macro for already-placed destination tokens if needed.

Prescience casting and reroll automation are intentionally not implemented; the user edits remaining points manually.
