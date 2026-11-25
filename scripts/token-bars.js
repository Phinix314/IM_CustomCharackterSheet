/* Adapt the system's charge/threshold pair to Foundry's resource-bar API.
 * No duplicate resource or actor schema changes are introduced. */
const WARP_BAR_ATTRIBUTE = "warp.charge";

function warpBarData(actor) {
  const warp = actor?.system?.warp;
  if (!warp || !Number.isFinite(warp.charge) || !Number.isFinite(warp.threshold)) return null;
  return {
    type: "bar", attribute: WARP_BAR_ATTRIBUTE,
    value: warp.charge, max: Math.max(0, warp.threshold), editable: true
  };
}

Hooks.once("setup", () => {
  if (game.system.id !== "impmal") return;
  const TokenClass = CONFIG.Token.documentClass;
  const ActorClass = CONFIG.Actor.documentClass;
  const originalBar = TokenClass.prototype.getBarAttribute;
  const originalTracked = TokenClass.getTrackedAttributes;
  const originalModify = ActorClass.prototype.modifyTokenAttribute;

  TokenClass.prototype.getBarAttribute = function (barName, options = {}) {
    const attribute = options.alternative ?? this[barName]?.attribute;
    if (attribute === WARP_BAR_ATTRIBUTE) {
      const data = warpBarData(this.actor);
      if (data) return data;
    }
    return originalBar.call(this, barName, options);
  };

  TokenClass.getTrackedAttributes = function (...args) {
    const attributes = originalTracked.apply(this, args);
    // Keep the original choices, including those supplied by other modules.
    // Only promote the existing scalar if the system exposes it at this level.
    const isWarp = path => path.join(".") === WARP_BAR_ATTRIBUTE;
    if (!attributes?.value?.some(isWarp) && !attributes?.bar?.some(isWarp)) return attributes;
    return {
      ...attributes,
      value: attributes.value.filter(path => !isWarp(path)),
      bar: [...attributes.bar.filter(path => !isWarp(path)), ["warp", "charge"]]
    };
  };

  ActorClass.prototype.modifyTokenAttribute = async function (attribute, value, isDelta = false, isBar = true) {
    if (attribute !== WARP_BAR_ATTRIBUTE || !warpBarData(this)) {
      return originalModify.call(this, attribute, value, isDelta, isBar);
    }
    const next = (isDelta ? this.system.warp.charge : 0) + Number(value);
    if (!Number.isFinite(next)) throw new Error("Warp Charge must be a finite number.");
    // The threshold is not a cap: exceeding it is part of the psychic rules.
    const updates = { "system.warp.charge": Math.max(0, next) };
    if (Hooks.call("modifyTokenAttribute", {attribute, value, isDelta, isBar}, updates) === false) return this;
    return this.update(updates);
  };
});
