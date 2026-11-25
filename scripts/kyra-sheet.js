/* Kyra's Sheet: grouped lists, a manual Prescience counter, and character details on Notes. */
const MODULE_ID = "kyra-sheet";
const GROUP_FLAG = "talentGroup";
const GROUPS = Object.freeze([
  { id: "active", label: "Active", open: true,
    hint: "Abilities you deliberately use or choose to trigger." },
  { id: "passive", label: "Passive", open: true,
    hint: "Ongoing bonuses and conditional modifiers." },
  { id: "background", label: "Background / Access", open: false,
    hint: "Unlocks and foundational abilities. Their effects remain enabled." },
  { id: "familiar", label: "Familiar", open: true,
    hint: "Talents tracked for your familiar. Category only: effects still belong to the actor holding the talent." }
]);

const EFFECT_GROUPS = Object.freeze([
  {id: "temporary", label: "Temporary", open: true,
    hint: "Encounter abilities and timed effects. Off effects stay here. Manual effects must be switched off when they end."},
  {id: "passive", label: "Passive", open: true,
    hint: "Ongoing bonuses. These can still be switched on and off."},
  {id: "permanent", label: "Permanent / Access", open: false,
    hint: "Foundational and creation effects. Sheet toggles are locked; move an effect to another group to unlock it."}
]);
// An unregistered status makes this a native, manually timed temporary effect
// in Warhammer Library 3.5.1. It is not a game condition and has no mechanics.
const TEMPORARY_STATUS = "kyra-sheet-manual-effect";
const UNWAVERING_SCRIPT = "[Script.jkgDCb3IS7TJOUru]";

function isUnwaveringEffect(effect) {
  return !!effect.getFlag(MODULE_ID, "unwaveringConfigured") ||
    (effect.system?.scriptData ?? []).some(s => s.script?.trim() === UNWAVERING_SCRIPT);
}

function isAccessEffect(effect) {
  const scripts = effect.system?.scriptData ?? [];
  return scripts.length > 0 && scripts.every(s => s.trigger === "immediate") &&
    !(effect.changes?.length || effect.system?.changes?.length);
}

function effectGroup(effect) {
  const saved = effect.getFlag(MODULE_ID, "effectGroup");
  if (EFFECT_GROUPS.some(g => g.id === saved)) return saved;
  if (isUnwaveringEffect(effect)) return "temporary";
  if (isAccessEffect(effect)) return "permanent";
  return effect.isTemporary ? "temporary" : "passive";
}

// Standalone script, saved on the owned effect. It continues to work after
// actor export, even without this presentation module on the destination.
// The stock script adds only one WilB to threshold, including when sanctioned.
const UNWAVERING_FIXED_SCRIPT = `const bonus = this.actor.system.characteristics.wil.bonus;
const sanctioned = Array.from(this.actor.allApplicableEffects()).some(effect =>
  !effect.disabled && !effect.isSuppressed &&
  (effect.system.scriptData ?? []).some(script =>
    script.trigger === "prePrepareDerivedData" &&
    (script.script?.includes("[Script.wEo5SFN5Gj4tKH2w]") ||
     script.script?.trim() === "this.actor.system.warp.threshold = this.actor.system.characteristics.wil.bonus * 2;")
  )
);
this.actor.system.warp.threshold += bonus * (sanctioned ? 2 : 1);
this.actor.system.characteristics.wil.bonus *= 2;`;

function effectCategoryUpdate(effect, group) {
  const update = {[`flags.${MODULE_ID}.effectGroup`]: group};
  const statuses = Array.from(effect.statuses ?? []);
  if (group === "temporary") {
    update.statuses = [...new Set([...statuses, TEMPORARY_STATUS])];
    if (effect.getFlag(MODULE_ID, "previousShowIcon") === undefined) {
      update[`flags.${MODULE_ID}.previousShowIcon`] = effect.showIcon ?? 1;
    }
    update.showIcon = 1;
    if (isUnwaveringEffect(effect) && !effect.getFlag(MODULE_ID, "unwaveringConfigured")) {
      // Only replace the exact stock script, preserving every other script.
      update["system.scriptData"] = effect.system.scriptData.map(s => ({
        ...s, script: s.script?.trim() === UNWAVERING_SCRIPT ? UNWAVERING_FIXED_SCRIPT : s.script
      }));
      update[`flags.${MODULE_ID}.unwaveringConfigured`] = true;
      update.disabled = true;
      update.img = "icons/svg/eye.svg";
    }
  } else {
    // Never remove real condition statuses, alter timers, or overwrite scripts.
    if (statuses.includes(TEMPORARY_STATUS)) {
      update.statuses = statuses.filter(s => s !== TEMPORARY_STATUS);
      const previous = effect.getFlag(MODULE_ID, "previousShowIcon");
      if (previous !== undefined) update.showIcon = previous;
      update[`flags.${MODULE_ID}.-=previousShowIcon`] = null;
    }
    if (group === "permanent") update.disabled = false;
  }
  return update;
}

function talentGroup(item) {
  const value = item.getFlag(MODULE_ID, GROUP_FLAG);
  // New/unclassified talents and old Unsorted entries start in Active.
  return GROUPS.some(group => group.id === value) ? value : "active";
}

// Read only the system's actual discipline field. Warp Rating, item names,
// and a Minor Power's optional specialisation do not determine its group.
function powerGroups(rows, itemsByUuid, disciplineLabel) {
  const minor = [];
  const unassigned = [];
  const disciplines = new Map();
  for (const row of rows) {
    const item = itemsByUuid.get(row.dataset.uuid);
    const discipline = typeof item?.system?.discipline === "string"
      ? item.system.discipline.trim() : "";
    if (item?.type !== "power" || !discipline) {
      unassigned.push(row);
    } else if (discipline === "minor") {
      minor.push(row);
    } else {
      if (!disciplines.has(discipline)) {
        disciplines.set(discipline, { id: discipline, label: disciplineLabel(discipline), rows: [] });
      }
      disciplines.get(discipline).rows.push(row);
    }
  }
  const major = [...disciplines.values()].sort((a, b) => a.label.localeCompare(b.label));
  return { minor, major, unassigned };
}

Hooks.once("init", () => {
  if (game.system.id !== "impmal") return;

  // impmal 4.1.0 exposes CharacterSheet as a global lexical class. Its own
  // Mechanicus module subclasses it too. The registry is a defensive fallback.
  const BaseSheet = typeof CharacterSheet === "function"
    ? CharacterSheet
    : CONFIG.Actor.sheetClasses?.character?.["impmal.CharacterSheet"]?.cls;

  if (!BaseSheet) {
    console.error("Kyra's Sheet: the Imperium Maledictum character sheet was not found.");
    Hooks.once("ready", () => ui.notifications.error(
      "Kyra's Sheet could not load. Check the Imperium Maledictum system version."
    ));
    return;
  }

  class KyraCharacterSheet extends BaseSheet {
    static DEFAULT_OPTIONS = { classes: ["kyra-sheet"] };
    // Native fields live in their destination templates, so either tab can be
    // rerendered independently without losing or duplicating form controls.
    static PARTS = {
      ...BaseSheet.PARTS,
      main: {...BaseSheet.PARTS.main, template: "modules/kyra-sheet/templates/character-main.hbs"},
      notes: {...BaseSheet.PARTS.notes, template: "modules/kyra-sheet/templates/character-notes.hbs"},
      effects: {...BaseSheet.PARTS.effects, template: "modules/kyra-sheet/templates/character-effects.hbs"}
    };

    _kyraGroupState = null;
    _kyraLayoutWarning = false;
    _kyraPowerLayoutWarning = false;
    _kyraPrescienceBusy = false;
    _kyraEffectsBusy = new Set();

    _kyraStorageKey() {
      // UI preferences belong to this user/browser, not the exported actor.
      return `${MODULE_ID}.groups.${game.world.id}.${game.user.id}.${this.actor.uuid}`;
    }

    _kyraLoadGroupState() {
      if (this._kyraGroupState) return this._kyraGroupState;
      this._kyraGroupState = Object.fromEntries(GROUPS.map(g => [g.id, g.open]));
      try {
        const saved = JSON.parse(localStorage.getItem(this._kyraStorageKey()) || "null");
        for (const group of GROUPS) {
          if (typeof saved?.[group.id] === "boolean") {
            this._kyraGroupState[group.id] = saved[group.id];
          }
        }
        for (const [key, value] of Object.entries(saved ?? {})) {
          if ((key.startsWith("powers:") || key.startsWith("effects:")) && typeof value === "boolean") {
            this._kyraGroupState[key] = value;
          }
        }
      } catch (error) {
        // Blocked storage or an old preference must never prevent sheet use.
        console.debug("Kyra's Sheet: using default group visibility.", error);
      }
      return this._kyraGroupState;
    }

    _kyraRememberGroup(id, open) {
      this._kyraLoadGroupState()[id] = open;
      try {
        localStorage.setItem(this._kyraStorageKey(), JSON.stringify(this._kyraGroupState));
      } catch (_) {
        // The in-memory preference still works until the browser refreshes.
      }
    }

    async _onRender(options) {
      await super._onRender(options);
      this._kyraGroupTalents();
      this._kyraGroupPowers();
      this._kyraMainResources();
      this._kyraEffectsUI();
    }

    _kyraEffects() {
      const effects = new Map(Array.from(this.actor.allApplicableEffects(true))
        .filter(e => e.show).map(e => [e.uuid, e]));
      // Creation-only item effects (for example Fated) are not necessarily
      // applicable after creation, but are useful records in Permanent / Access.
      for (const item of this.actor.items) {
        for (const effect of item.effects ?? []) {
          if (effect.show && isAccessEffect(effect)) effects.set(effect.uuid, effect);
        }
      }
      return [...effects.values()];
    }

    _prepareEffectsContext(context) {
      super._prepareEffectsContext(context);
      const effects = this._kyraEffects();
      context.kyraCanEditEffects = this.isEditable && this.actor.isOwner;
      context.kyraEffectGroups = EFFECT_GROUPS.map(group => ({
        ...group, open: this._kyraLoadGroupState()[`effects:${group.id}`] ?? group.open,
        rows: effects.filter(e => effectGroup(e) === group.id).map(effect => {
          const persisted = effect.parent?.effects?.get(effect.id) === effect;
          const editable = context.kyraCanEditEffects && effect.isOwner && persisted &&
            !this._kyraEffectsBusy.has(effect.uuid);
          const setup = group.id === "temporary" && isUnwaveringEffect(effect) &&
            !effect.getFlag(MODULE_ID, "unwaveringConfigured");
          return {
            effect, editable, setup, permanent: group.id === "permanent",
            // Plain display values avoid relying on Document prototype getters
            // in a nested template context. Keep the document for native scripts.
            uuid: effect.uuid,
            name: effect.name || "Unnamed effect",
            img: effect.img || "icons/svg/aura.svg",
            sourceName: effect.source || effect.item?.name || "Actor",
            sourceUuid: effect.item?.uuid || "",
            disabled: !!effect.disabled,
            locked: group.id === "permanent" || !editable,
            deletable: editable && !effect.item && group.id !== "permanent",
            canEnablePermanent: editable && group.id === "permanent" && effect.disabled,
            expired: !!effect.duration?.expired,
            suppressed: !!effect.isSuppressed,
            toggleLabel: setup ? "Set up (off)" : effect.disabled ? "Turn on" : "Turn off",
            toggleHint: isUnwaveringEffect(effect)
              ? "Spend 1 Fate manually before switching on; switch off at encounter end. Setup starts inactive."
              : "Enable or disable this effect. Existing duration rules still apply.",
            categories: EFFECT_GROUPS.map(g => ({...g, selected: group.id === g.id}))
          };
        })
      }));
    }

    _kyraEffectsUI() {
      const tab = this.element?.querySelector('[data-tab="effects"].tab');
      if (!tab || tab.dataset.kyraEffectsBound) return;
      tab.dataset.kyraEffectsBound = "true";
      for (const details of tab.querySelectorAll("[data-kyra-effect-group]")) {
        details.addEventListener("toggle", () => {
          if (this.element.contains(details)) {
            this._kyraRememberGroup(`effects:${details.dataset.kyraEffectGroup}`, details.open);
          }
        });
      }
      for (const select of tab.querySelectorAll(".kyra-effect-category")) {
        select.addEventListener("change", event => {
          event.stopPropagation();
          void this._kyraChangeEffect(select.closest(".list-row").dataset.uuid, "category", select.value);
        });
        select.addEventListener("click", event => event.stopPropagation());
      }
      for (const button of tab.querySelectorAll("[data-kyra-effect-action]")) {
        button.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          void this._kyraChangeEffect(button.closest(".list-row").dataset.uuid, button.dataset.kyraEffectAction);
        });
      }
    }

    async _kyraChangeEffect(uuid, action, value) {
      const effect = this._kyraEffects().find(e => e.uuid === uuid);
      if (!effect || !this.isEditable || !this.actor.isOwner || !effect.isOwner ||
          effect.parent?.effects?.get(effect.id) !== effect || this._kyraEffectsBusy.has(uuid)) return;
      const group = effectGroup(effect);
      let update;
      if (action === "category") {
        if (!EFFECT_GROUPS.some(g => g.id === value)) return;
        update = effectCategoryUpdate(effect, value);
      } else if (action === "enablePermanent" && group === "permanent") {
        update = {disabled: false};
      } else if (action === "toggle" && group !== "permanent") {
        const setup = group === "temporary" && isUnwaveringEffect(effect) &&
          !effect.getFlag(MODULE_ID, "unwaveringConfigured");
        update = effectCategoryUpdate(effect, group);
        update.disabled = setup ? true : !effect.disabled;
        if (!update.disabled && effect.duration?.expired) {
          ui.notifications.warn("This effect has expired. Edit its duration before reactivating it.");
          return;
        }
      } else return;
      this._kyraEffectsBusy.add(uuid);
      this.render({parts: ["effects"]});
      try {
        await effect.update(update);
      } catch (error) {
        console.error("Kyra's Sheet: could not update effect.", error);
        ui.notifications.error("Could not update the effect. No further changes were attempted.");
      } finally {
        this._kyraEffectsBusy.delete(uuid);
        this.render({parts: ["effects"]});
      }
    }

    _kyraPrescienceValue() {
      const value = Number(this.actor.getFlag(MODULE_ID, "prescience") ?? 0);
      return Number.isSafeInteger(value) && value >= 0 ? value : 0;
    }

    _kyraMainResources() {
      const tab = this.element.querySelector('[data-tab="main"].tab');
      if (!tab) return;
      const doc = this.element.ownerDocument;
      let counter = tab.querySelector(".kyra-prescience");
      if (!counter) {
        const slot = tab.querySelector(".kyra-prescience-slot");
        if (!slot) return;
        counter = doc.createElement("div");
        counter.className = "attribute-box top-label kyra-prescience";
        counter.innerHTML = '<div class="label"><label class="centered">Prescience</label></div>' +
          '<div class="field kyra-prescience-controls"><button type="button" data-kyra-step="-1" aria-label="Spend one Prescience point">−</button>' +
          '<input type="number" min="0" step="1" aria-label="Remaining Prescience points">' +
          '<button type="button" data-kyra-step="1" aria-label="Add one Prescience point">+</button></div>';
        counter.title = "Manual remaining points. After manifesting Prescience, replace this total with the points gained. Spending here does not reroll dice.";
        slot.replaceWith(counter);
        counter.addEventListener("click", event => event.stopPropagation());
        for (const button of counter.querySelectorAll("button")) {
          button.addEventListener("click", () => {
            void this._kyraSavePrescience(this._kyraPrescienceValue() + Number(button.dataset.kyraStep));
          });
        }
        const input = counter.querySelector("input");
        // No name: this flag is saved separately, never as a system form field.
        input.addEventListener("change", event => {
          event.stopPropagation();
          void this._kyraSavePrescience(input.value === "" ? NaN : Number(input.value));
        });
        input.addEventListener("keydown", event => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            input.blur();
          }
        });
      }
      counter.querySelector("input").value = String(this._kyraPrescienceValue());
      const editable = this.isEditable && this.actor.isOwner;
      for (const control of counter.querySelectorAll("button, input")) {
        control.disabled = !editable || this._kyraPrescienceBusy;
      }
      counter.querySelector('[data-kyra-step="-1"]').disabled ||= this._kyraPrescienceValue() === 0;
    }

    async _kyraSavePrescience(value) {
      if (!this.isEditable || !this.actor.isOwner || this._kyraPrescienceBusy) return;
      if (!Number.isSafeInteger(value) || value < 0) {
        ui.notifications.warn("Prescience points must be a whole number of zero or more.");
        this._kyraMainResources();
        return;
      }
      this._kyraPrescienceBusy = true;
      this._kyraMainResources();
      try {
        await this.actor.setFlag(MODULE_ID, "prescience", value);
      } catch (error) {
        console.error("Kyra's Sheet: could not save Prescience points.", error);
        ui.notifications.error("Could not save Prescience points.");
      } finally {
        this._kyraPrescienceBusy = false;
        this._kyraMainResources();
      }
    }

    _kyraGroupPowers() {
      const tab = this.element.querySelector('[data-tab="powers"].tab');
      if (!tab) return;
      const control = tab.querySelector('[data-action="createItem"][data-type="power"]');
      const section = control?.closest(".sheet-list");
      const list = section?.querySelector(":scope > .list-content");
      if (!list) {
        if (!this._kyraPowerLayoutWarning) {
          console.warn("Kyra's Sheet: power layout changed; leaving the standard list intact.");
          this._kyraPowerLayoutWarning = true;
        }
        return;
      }
      const rows = [...list.querySelectorAll([
        ":scope > .list-row",
        ":scope > .kyra-power-group > .list-content > .list-row",
        ":scope > .kyra-power-group > .list-content > .kyra-power-group > .list-content > .list-row"
      ].join(", "))];
      const itemsByUuid = new Map(this.actor.items.map(item => [item.uuid, item]));
      const grouped = powerGroups(rows, itemsByUuid, discipline => {
        const key = game.impmal.config.disciplines[discipline];
        return key ? game.i18n.localize(key) : discipline;
      });
      const minor = this._kyraPowerSection("powers:minor", "Minor Powers", grouped.minor.length);
      minor.content.append(...grouped.minor);
      this._kyraPowerEmpty(minor.content);

      const major = this._kyraPowerSection(
        "powers:major", "Major Powers", grouped.major.reduce((sum, group) => sum + group.rows.length, 0)
      );
      major.content.classList.add("kyra-major-content");
      for (const group of grouped.major) {
        const discipline = this._kyraPowerSection(
          `powers:discipline:${group.id}`, group.label, group.rows.length
        );
        discipline.details.classList.add("kyra-discipline-group");
        discipline.content.append(...group.rows);
        major.content.append(discipline.details);
      }
      this._kyraPowerEmpty(major.content);
      const sections = [minor.details, major.details];
      if (grouped.unassigned.length) {
        const unassigned = this._kyraPowerSection(
          "powers:unassigned", "Unassigned Discipline", grouped.unassigned.length
        );
        unassigned.content.append(...grouped.unassigned);
        sections.push(unassigned.details);
      }
      section.classList.add("kyra-grouped-powers");
      // Reuse the original rows and their controls; do not touch Sustained
      // Powers, Warp Charge, thresholds, power data, effects, or XP.
      list.replaceChildren(...sections);
    }

    _kyraPowerSection(key, title, count) {
      const doc = this.element.ownerDocument;
      const details = doc.createElement("details");
      details.className = "kyra-power-group";
      details.dataset.kyraPowerGroup = key;
      details.open = this._kyraLoadGroupState()[key] ?? true;
      const summary = doc.createElement("summary");
      summary.className = "kyra-group-heading";
      const label = doc.createElement("span");
      label.textContent = title;
      const badge = doc.createElement("span");
      badge.className = "kyra-group-count";
      badge.textContent = String(count);
      summary.append(label, badge);
      const content = doc.createElement("div");
      content.className = "list-content kyra-group-content kyra-power-content";
      details.append(summary, content);
      details.addEventListener("toggle", () => {
        if (this.element.contains(details)) this._kyraRememberGroup(key, details.open);
      });
      return { details, content };
    }

    _kyraPowerEmpty(content) {
      if (content.childElementCount) return;
      const empty = this.element.ownerDocument.createElement("p");
      empty.className = "kyra-group-empty";
      empty.textContent = "No powers in this group.";
      content.append(empty);
    }

    _kyraGroupTalents() {
      const tab = this.element.querySelector('[data-tab="talents"].tab');
      if (!tab) return; // A partial render may not include this tab.

      // Identify the talent list by its existing creation control. Traits and
      // Corruption also use sheet-list markup and must not be regrouped.
      const control = tab.querySelector('[data-action="createItem"][data-type="talent"]');
      const section = control?.closest(".sheet-list");
      const list = section?.querySelector(":scope > .list-content");
      if (!list) {
        if (!this._kyraLayoutWarning) {
          console.warn("Kyra's Sheet: talent layout changed; leaving the standard list intact.");
          this._kyraLayoutWarning = true;
        }
        return;
      }

      const rows = [...list.querySelectorAll(
        ":scope > .list-row, :scope > .kyra-talent-group > .list-content > .list-row"
      )];
      const itemsByUuid = new Map(this.actor.items.map(item => [item.uuid, item]));
      const grouped = new Map(GROUPS.map(group => [group.id, []]));
      for (const row of rows) {
        const item = itemsByUuid.get(row.dataset.uuid);
        const group = item?.type === "talent" ? talentGroup(item) : "active";
        if (item?.type === "talent") this._kyraAddCategory(row, item);
        grouped.get(group).push(row);
      }

      const state = this._kyraLoadGroupState();
      const ownerDocument = this.element.ownerDocument;
      const sections = GROUPS.map(group => {
        const details = ownerDocument.createElement("details");
        details.className = "kyra-talent-group";
        details.dataset.kyraGroup = group.id;
        details.open = state[group.id];

        const summary = ownerDocument.createElement("summary");
        summary.className = "kyra-group-heading";
        summary.title = group.hint;
        const label = ownerDocument.createElement("span");
        label.textContent = group.label;
        const count = ownerDocument.createElement("span");
        count.className = "kyra-group-count";
        count.textContent = String(grouped.get(group.id).length);
        summary.append(label, count);

        const content = ownerDocument.createElement("div");
        content.className = "list-content kyra-group-content";
        // Move the original nodes so the system's event listeners, UUIDs,
        // effect buttons, context menus and drag handles survive unchanged.
        content.append(...grouped.get(group.id));
        if (!content.childElementCount) {
          const empty = ownerDocument.createElement("p");
          empty.className = "kyra-group-empty";
          empty.textContent = "No talents in this group.";
          content.append(empty);
        }
        details.append(summary, content);
        details.addEventListener("toggle", () => {
          // Ignore toggle events queued for sections removed by a rerender.
          if (this.element.contains(details)) this._kyraRememberGroup(group.id, details.open);
        });
        return details;
      });

      section.classList.add("kyra-grouped-talents");
      list.replaceChildren(...sections);
    }

    _kyraAddCategory(row, item) {
      const content = row.querySelector(":scope > .row-content");
      if (!content) return;
      let select = content.querySelector(".kyra-talent-category");
      if (!select) {
        select = this.element.ownerDocument.createElement("select");
        select.className = "kyra-talent-category";
        // No name attribute: this is an embedded Item flag, not an Actor form field.
        for (const group of GROUPS) {
          const option = this.element.ownerDocument.createElement("option");
          option.value = group.id;
          option.textContent = group.label;
          select.append(option);
        }
        content.insertBefore(select, content.querySelector(":scope > .list-controls"));
        select.addEventListener("change", event => {
          event.stopPropagation(); // Do not submit the Actor's normal form.
          void this._kyraSaveCategory(row.dataset.uuid, select);
        });
        select.addEventListener("click", event => event.stopPropagation());
        select.addEventListener("dragstart", event => {
          event.preventDefault();
          event.stopPropagation();
        });
      }
      select.setAttribute("aria-label", `Category for ${item.name}`);
      select.title = "Display category only; this does not enable or disable the talent.";
      select.value = talentGroup(item);
      select.disabled = !this.isEditable || !item.isOwner;
    }

    async _kyraSaveCategory(uuid, select) {
      // Resolve against this actor each time; no development-world UUID is saved.
      const item = this.actor.items.find(candidate => candidate.uuid === uuid);
      if (!item || item.type !== "talent") return;
      const value = select.value;
      if (!this.isEditable || !item.isOwner || !GROUPS.some(g => g.id === value)) {
        select.value = talentGroup(item);
        return;
      }
      select.disabled = true;
      try {
        await item.setFlag(MODULE_ID, GROUP_FLAG, value);
        // Foundry normally rerenders from the Item update. Also regroup now to
        // cover configurations that suppress that automatic render.
        this._kyraGroupTalents();
      } catch (error) {
        console.error("Kyra's Sheet: could not save talent category.", error);
        select.value = talentGroup(item);
        ui.notifications.error("Could not save the talent category. Please try again.");
      } finally {
        select.disabled = !this.isEditable || !item.isOwner;
      }
    }
  }

  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    Actor, MODULE_ID, KyraCharacterSheet,
    { types: ["character"], makeDefault: false, label: "Kyra's Sheet" }
  );
});
