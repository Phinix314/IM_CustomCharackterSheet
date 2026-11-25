# Kyra’s Sheet — 0.4.1

Optional sheet for Imperium Maledictum 4.1.0, Foundry V14, and Warhammer Library 3.5.1.

## Update

1. Stop Foundry and replace `Data/modules/kyra-sheet/` with the ZIP’s `kyra-sheet` folder.
2. Check that the manifest is directly at `Data/modules/kyra-sheet/module.json`, without another nested folder.
3. Restart Foundry, refresh the browser, and check that Manage Modules shows version 0.4.1. Keep the module enabled and Kyra’s Sheet selected.
4. Open Effects. On Unwavering Will click **Set up (off)** once. This configures the existing effect and starts it inactive. It does not spend Fate.
5. Handedness/Augmetics remain on Notes, and Prescience remains on Main. Existing token bars need no setup; the macro below is still available if needed.

No actor re-import is needed. Existing talent categories and power groups remain compatible.

### 0.4.1 display fix

Effect rows now explicitly show their icon/name, On/Off state, source, category and controls. The previous multi-line layout reused the native `row-content` class, which carries a fixed 2rem row height and competing flex rules. The new template uses a dedicated `kyra-effect-row` class with an automatic-height grid and named areas, independent of those native single-line rules. The context builder copies name, image, UUID, source name/source UUID and disabled state to plain row properties for reliable nested-template access. The original effect document is retained for native script buttons. No effect scripts, calculations, category flags or activation state are changed by this patch; an already completed Unwavering Will setup stays completed.

## Effects

The Effects tab has three collapsible groups. A dropdown on each editable effect moves it between them. Effects stay in their category when switched off; each row shows On, Off, Expired or Suppressed.

- **Temporary:** encounter abilities and other temporary effects. Ordinary effects moved here gain a token status icon while active. Changing category does not invent a duration: effects without a timer must be switched off manually. Existing finite timers and real condition statuses are preserved.
- **Passive:** ongoing effects, with ordinary on/off buttons. Existing passives remain here by default.
- **Permanent / Access:** starts collapsed. Creation-only scripts such as Psyker and Fated default here. Moving an effect here enables it, and its sheet toggle/delete control is locked. Move it to another group to unlock it. If disabled elsewhere, it shows Off and an Enable button; the sheet never silently overrides an external change.

This lock protects the controls on Kyra’s Sheet, not the native effect editor, GM tools, macros or other sheets. Effects retain their original applicability and source. Editing an item effect edits that actor’s owned item, not the compendium. Source-item links, effect editing, applicable script buttons, conditions and zone effects remain available. Creation-only item effects not normally listed by the system are shown as records; listing or enabling one does not rerun its creation script.

Psyker’s supplied effect runs the initial power-selection procedure. It does not control visibility of the Powers tab. Permanent grouping keeps that record out of the working list without deleting it or buying/granting anything again.

### Unwavering Will

The supplied stock effect is recognised by its script reference, even if renamed. It appears under Temporary with **Set up (off)** until configured. The setup button:

1. Updates the existing owned effect, without creating a duplicate.
2. Marks it Temporary, gives it an eye icon and starts it disabled.
3. Replaces only the exact stock Unwavering Will script with a standalone correction for the Sanctioned Psyker interaction; all other scripts/options are retained.

Then spend **1 Fate manually**, click **Turn on**, and click **Turn off** at the encounter’s end. The module does not decide when an encounter ends, deduct Fate, or create a timed countdown. A displayed token icon depends on Foundry’s ordinary token/status visibility; it appears while the effect is active. The sheet itself always displays the effect’s image and On/Off state.

For Kyra at Willpower 50, Sanctioned Psyker and the eagle’s +4 effect, expect WilB 5 / Warp Threshold 14 normally, and WilB 10 / Warp Threshold 24 with Unwavering Will. The stock script adds only one extra WilB to threshold, producing 19 instead of 24; the replacement adds two extra WilB when the active standard Sanctioned Psyker script is present, otherwise one. It recognises both the supplied script reference and its exact inline equivalent. Custom sanctioning implementations require separate review.

The original script reference was `[Script.jkgDCb3IS7TJOUru]`, with trigger **Compute Characteristics**. Setup is reversible by editing that script back, moving the effect out of Temporary, and removing `flags.kyra-sheet.unwaveringConfigured` if you want the setup option again. No setup mutation happens merely from opening the sheet.

### Portability and duration

Effect groups are stored on each ActiveEffect at `flags.kyra-sheet.effectGroup`. Native status marker `kyra-sheet-manual-effect` makes manually tracked temporary effects participate in Warhammer Library’s temporary-effect/icon handling; it is not a registered game condition. No actor UUID or name is stored. When moving out of Temporary, only this marker is removed and the previous icon-display setting is restored; genuine condition statuses and all duration fields remain intact. Consequently a genuinely timed effect still follows its native timer even if displayed in Passive or Permanent.

The corrected Unwavering Will script is embedded in the effect itself. Export/import transfers it, the group flag, enabled state, icon and native status marker. The script and manual temporary status continue to work with the same system/library even without this module; custom grouping requires the module. Uninstalling the module does not revert configured effect data. The eagle’s separate Wounds effect remains manual and is not linked or changed by this update.

## Prescience counter

The Main tab replaces the Augmetics box with **Prescience**. Enter a nonnegative whole number, or use **−** to spend a point and **+** to add one. Enter a new total after manifesting Prescience; a new manifestation replaces the old pool. The counter starts at zero if no value has been stored.

This is a manual counter only: it does not roll Prescience, read SL from chat, automatically spend points, reroll dice, or reset on Rest. It has no fixed maximum. Invalid entries are rejected; controls are disabled during a save and for users who cannot edit the actor.

Points are stored at `Actor.flags.kyra-sheet.prescience`, which travels with an actor JSON export. There are no actor-name checks or world-specific IDs. The official system data, XP, power items and effects are not changed by this counter.

Handedness and Augmetics appear on **Notes**, directly below the Age/Eyes/Hair/Height/Weight row. They use the original named form fields and system handling; augmetics remain calculated. XP retains its original size and contents. There is no token-configuration button or details disclosure on Main.

## Token bars

The ZIP includes `kyra-sheet/macros/Configure-Token-Bars.json`, an importable script macro. It is not installed automatically.

1. In Foundry’s Macro Directory, create a temporary macro.
2. Right-click its directory entry, choose **Import Data**, and select `Configure-Token-Bars.json` from the extracted `macros` folder.
3. Select exactly one of Kyra’s tokens on the canvas and execute the imported macro. You can delete the macro afterward; its assignments remain saved. Keep Kyra’s Sheet enabled for Warp Charge bar support.

The macro applies:

- Bar 1: `combat.wounds` — the normal system Wounds resource, with its existing semantics.
- Bar 2: `warp.charge` — current Warp Charge against the system’s current Warp Threshold.
- Visibility: owner hover. The owner or GM sees the bars when hovering the token. Change this in Token Configuration if another visibility mode is preferred.

When the selected token is linked to a world actor, this configures its prototype and every editable linked token for that actor in all scenes. Newly placed tokens inherit the prototype configuration. Unrelated actors and unlinked tokens are not changed. When selecting an unlinked token, the macro configures only that token. Any failed updates are reported, while successful ones remain applied; retrying is safe.

The module also promotes `warp.charge` into the bar choices in Token Configuration. It uses the actual `system.warp.charge` and derived `system.warp.threshold`; there is no duplicate or synchronised resource to get out of date. The threshold includes the system’s effects and characteristic calculations.

The bar fills as charge approaches the threshold. At or beyond the threshold the graphic is full, but the actual numeric charge is never capped to that threshold. Token HUD edits write directly to the charge field, permit values above the threshold, and prevent negative values. Sustained-power minimums and psychic rules continue to be handled by Imperium Maledictum.

## Existing talent and power groups

Talents have a manual category selector: Active, Passive, Background / Access, or Familiar. Categories are stored on embedded Items at `flags.kyra-sheet.talentGroup` and export with the actor. New talents without a saved category default to Active. Existing uncategorised talents, old Unsorted flags and unknown category values also appear in Active; existing valid selections are retained. Familiar is chosen manually from the category dropdown. Categorisation and collapsing sections never disable a talent or effect. Familiar is a display category: the system still counts owned talent purchases normally for XP, and item effects/scripts still target the actor owning the item. The category does not transfer those effects to the eagle or establish an actor link. Review any automation on familiar talents before adding them to Kyra. Traits and Corruption are unchanged.

Powers are automatically grouped as Minor Powers and Major Powers, with major powers grouped by discipline. Classification reads `Item.system.discipline`, not Warp Rating or `minorSpecialisation`. Missing disciplines appear in Unassigned Discipline. All original rows, controls, UUIDs and within-group ordering are preserved. Adding a new discipline automatically adds its heading.

Disclosure preferences for talent, power and effect groups are saved per user, browser, world and actor. These display preferences do not need to transfer to the GM’s world.

## Transfer to your GM

Install and enable this module on both instances, using matching system/module versions. Export Kyra normally and import her JSON on the destination. Select Kyra’s Sheet if necessary. Prescience points, talent/effect categories, configured effect scripts and prototype bar assignments travel in the actor data. Existing destination tokens may need the configuration macro once. No compendium is required for these additions.

Disabling the module restores the original sheet presentation and removes the Warp Charge adapter; the saved flags remain in the actor. Wounds still uses the ordinary system resource. Warp Charge will no longer function as a two-value bar without the module; choose another native bar attribute if removing it permanently.

## Complete code overview

### module.json

Keeps the existing `kyra-sheet` module and sheet identifiers, updates the version, and loads `scripts/token-bars.js`, `scripts/kyra-sheet.js`, and `styles/kyra-sheet.css`. It requires the impmal system and warhammer-lib. It registers an optional sheet, not a new default for all actors.

### scripts/kyra-sheet.js

- `GROUPS`, `talentGroup`: define Active, Passive, Background / Access and Familiar. Missing, invalid and legacy Unsorted flags resolve to Active without modifying item data. The same fallback is used for unmatched rows. Saving a category writes its valid identifier, including `familiar`; old browser preferences for Unsorted are ignored. Familiar starts expanded.
- `powerGroups`: read-only classification of existing power rows by their owned items’ discipline. It preserves row identity/order and handles missing items, missing disciplines and custom disciplines.
- The `init` callback resolves the actual system CharacterSheet (with registry fallback), subclasses it, and registers KyraCharacterSheet. Its PARTS override supplies Main, Notes and Effects templates; other native parts remain inherited. Missing compatibility produces a notification instead of a broken registration.
- `_kyraStorageKey`, `_kyraLoadGroupState`, `_kyraRememberGroup`: load/store validated disclosure preferences in localStorage, with an in-memory fallback when storage is blocked.
- `_onRender`: lets the parent render first, then arranges talents, powers and the Main tab and binds the effect controls.
- `_kyraGroupTalents`: moves native talent rows into collapsible sections. `_kyraAddCategory` creates/reuses a nameless selector; `_kyraSaveCategory` validates ownership/category and saves only that embedded Item’s category flag, reporting failures.
- `_kyraGroupPowers`: moves native power rows into top-level minor/major sections and discipline subsections. `_kyraPowerSection` creates each disclosure and count; `_kyraPowerEmpty` supplies empty-state text. Sustained-power and Warp controls are untouched.
- `_kyraPrescienceValue`: reads the actor flag, defaulting to zero for absent or invalid values.
- `_kyraMainResources`: creates/reuses the counter in the Main template’s placeholder. Counter controls have no form-field names and stop their change events from submitting the system form. Subsequent renders refresh values and permission/busy states rather than duplicating controls.
- `_kyraSavePrescience`: rejects invalid/non-integer/negative totals, prevents overlapping writes from the same sheet, saves the actor flag, handles failures and refreshes the controls. There is no maximum-points rule beyond JavaScript’s safe integer range.

### Effect code in scripts/kyra-sheet.js

- `EFFECT_GROUPS` defines category labels, hints and initial open state. `TEMPORARY_STATUS` is the custom status marker. `UNWAVERING_SCRIPT` identifies the supplied stock script, not an actor or a world document.
- `isUnwaveringEffect` recognises the stock script or the saved setup flag. `isAccessEffect` recognises creation-only scripts without attribute changes. `effectGroup` uses a valid saved group first, then these defaults, then native temporary/passive classification. It never modifies data.
- `UNWAVERING_FIXED_SCRIPT` is the standalone replacement described above: read the current prepared WilB, find an active standard sanctioning effect, add the matching extra threshold, then double WilB. It modifies prepared values only; the next preparation starts from source values.
- `effectCategoryUpdate` builds one document update. Temporary adds the module status marker, remembers the old icon-display setting and enables icon display. First-time stock Unwavering setup also replaces only its stock script, marks setup complete, uses the eye icon and starts disabled. Moving out removes only the module marker and restores the saved icon setting. Permanent also sets disabled=false. Timers, actual conditions and unrelated scripts are preserved.
- `_kyraEffects` collects the system’s applicable effects plus visible creation-only item effects, deduplicated by UUID. It does not duplicate documents or attach a new actor effect.
- `_prepareEffectsContext` keeps the native context, then provides groups, per-effect state, permission-aware controls, category choices and setup hints. Only effects actually stored in their parent collection may be changed; computed effects remain read-only.
- `_kyraEffectsUI` binds native details disclosure persistence and the nameless category controls/buttons once per rendered Effects tab. It stops these events from submitting the Actor form. Ordinary edit/create/delete buttons use the system’s existing actions.
- `_kyraChangeEffect` resolves the target only within the current actor’s displayed effects; checks actor/sheet/effect ownership and persistence; rejects invalid actions/categories, locked toggles and concurrent writes from the same sheet; prevents turning on an expired effect without editing its timer; writes the update to the original effect; then rerenders Effects. It reports write failures and always clears the busy state. It never changes Fate, XP or item advances.

### templates/character-effects.hbs and styles/kyra-sheet.css

The Effects template retains the native condition pips and zone-effect selector. It renders the three disclosure groups, effect names/icons, source links, state labels, category selectors, buttons and setup guidance. Source names and labels use normal escaped Handlebars expressions and plain row properties. Original effect-script buttons are retained for enabled effects. CSS uses a two-column, three-row grid: name/state, source, then category/controls. Explicit icon size, flexible name wrapping and automatic row height prevent the native fixed-height row styling from hiding the content. The effect row deliberately has no native `row-content` class. All selectors are scoped to this optional sheet. Main and Notes templates continue to contain their original native form fields.

### scripts/token-bars.js

- `warpBarData`: reads charge and threshold from the current prepared actor and returns Foundry’s bar descriptor. Invalid/missing Warp data falls back to native handling.
- The `setup` callback runs only in impmal. It wraps the currently configured TokenDocument and Actor methods, preserving the previous methods for all unrelated resources.
- `getBarAttribute` wrapper: provides a bar descriptor for `warp.charge`, including Token Configuration’s alternative-path lookup. Uses the live threshold on every read.
- `getTrackedAttributes` wrapper: promotes the existing scalar charge choice to a bar choice without mutating cached/native lists or dropping other options. Recursively enumerated unrelated paths are returned unchanged.
- `modifyTokenAttribute` wrapper: directs HUD edits of this bar to the scalar `system.warp.charge` field. Supports absolute and relative changes, rejects non-finite input, enforces only a zero minimum, and honours the normal modifyTokenAttribute hook’s cancellation. Other attributes use the original implementation.

No actor schemas, compendium entries, core system files or canvas drawing functions are modified. These runtime wrappers require the module to be enabled. Other modules that completely replace the same methods after setup could interfere; live integration remains to be checked.

### styles/kyra-sheet.css

Scopes all styles to the optional sheet. Styles the counter and +/- controls, talent category controls, nested power groups, headings, counts and empty states. Existing system colors and resource-box styling are retained.

### templates/character-main.hbs and templates/character-notes.hbs

These are copies of the uploaded impmal 4.1.0 templates with narrow edits: Main replaces the Augmetics box with the Prescience placeholder and removes Handedness; Notes inserts both original boxes immediately after the first description row. Every original form field exists exactly once across the two templates. Notes continues to include features, divination, goals, GM notes and biography without changes. Using templates rather than moving controls between rendered tabs keeps independent partial renders safe. Future system updates to these two templates may require updating the module copies.

### macros/Configure-Token-Bars.json

A standard Foundry script-macro import, not a compendium or auto-run script. Its command first requires impmal, the enabled module, exactly one selected token, and ownership of that character. It then writes only bar attributes and owner-hover visibility: the selected unlinked token alone, or the linked actor’s prototype and its editable linked tokens across scenes. It reports successful and failed updates separately and continues past individual failures. No character resource values are modified. There are no saved actor names, IDs or UUIDs. Re-running is safe; no persistent macro hook or sheet button is added.

## Verification

See VALIDATION.md for completed checks and the short live test. The browser/Foundry visual integration has not been verified in this environment.

API references: [TokenDocument](https://foundryvtt.com/api/v14/classes/foundry.documents.TokenDocument.html), [Actor.modifyTokenAttribute](https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html#modifyTokenAttribute), [Token resource conventions](https://foundryvtt.com/article/system-data-models/#token-resources).
