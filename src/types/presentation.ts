/**
 * Presentation types: how a decision is rendered.
 *
 * The presentation is a pure function of the decision: the `reason` selects the
 * mode, the `remedy` selects the CTA. These types describe the provider-level
 * config and the slot components consumers can override.
 */

import type { ComponentType, ReactNode } from "react";
import type { Denied } from "./decision.js";

/** Top-level presentation mode for a denial. */
export type PresentationMode = "hide" | "disable" | "upgrade" | "redirect";

/** Sub-variant of the upgrade presentation. Library fallback is `badge`. */
export type UpgradeVariant = "teaser" | "replace" | "badge" | "intercept";

/** Props passed to a Disabled slot: children plus the denial (for the tooltip reason). */
export interface DisabledSlotProps {
	children: ReactNode;
	decision: Denied;
}

/** Props passed to an Upgrade slot: children, the chosen variant, the denial, and the CTA. */
export interface UpgradeSlotProps {
	children: ReactNode;
	variant: UpgradeVariant;
	decision: Denied;
	/** Fire the upgrade CTA (already bound to the denial's reason). */
	onUpgrade: () => void;
}

/** Props passed to a Pending slot: rendered while the policy snapshot hydrates. */
export interface PendingSlotProps {
	children?: ReactNode;
}

export type DisabledSlot = ComponentType<DisabledSlotProps>;
export type UpgradeSlot = ComponentType<UpgradeSlotProps>;
export type PendingSlot = ComponentType<PendingSlotProps>;

/**
 * Public presentation config: set once on the provider, overridable per gate.
 * Omitted fields fall back to library defaults (`default: "hide"`,
 * `upgrade.mode: "badge"`).
 */
export interface PresentationConfig {
	/** Default mode for denials when a gate doesn't specify one. */
	default?: PresentationMode;
	/** Upgrade rendering options. */
	upgrade?: { mode?: UpgradeVariant };
	/** Override the upgrade renderer. */
	Upgrade?: UpgradeSlot;
	/** Override the disabled wrapper + tooltip. */
	Disabled?: DisabledSlot;
	/** Override what renders while the policy hydrates. */
	Pending?: PendingSlot;
}

/** Normalized presentation with library fallbacks applied; held in context. */
export interface ResolvedPresentation {
	default: PresentationMode;
	upgrade: { mode: UpgradeVariant };
	Upgrade?: UpgradeSlot;
	Disabled?: DisabledSlot;
	Pending?: PendingSlot;
}
