/**
 * `@ethanhann/mantine-can/presets` provides optional example interpreters you
 * can drop into `<CanProvider authorize entitle>` to get started, or copy and
 * adapt. They are deliberately simple and headless (no React/Mantine); real apps
 * usually outgrow them and supply their own.
 */

import type { Authorize, Entitle } from "../engine/types.js";

// ── RBAC authorize ──────────────────────────────────────────────────────────

/** A minimal role/permission/flag snapshot for {@link rbacAuthorize}. */
export interface RbacPolicy {
	/** Roles the subject holds. */
	roles: string[];
	/** Permission/action names the subject has. */
	permissions: string[];
	/** Enabled authorization flags. */
	flags?: string[];
}

/**
 * A straightforward RBAC interpreter: a role passes if the subject holds any of
 * the required roles, a permission passes if its action is in `permissions`, and
 * a flag passes if it's in `flags`. Resource-scoped rules (ownership, tenant)
 * belong in a custom `authorize`; this preset ignores the resource.
 */
export const rbacAuthorize: Authorize<RbacPolicy> = (policy, requirement) => {
	switch (requirement.type) {
		case "role":
			return requirement.anyOf.some((role) => policy.roles.includes(role));
		case "permission":
			return policy.permissions.includes(requirement.action);
		case "flag":
			return (policy.flags ?? []).includes(requirement.name);
	}
};

// ── Simple-tiers entitle ─────────────────────────────────────────────────────

/** A minimal entitlement snapshot for the tiers preset. */
export interface TierPolicy {
	/** The subject's current tier (must appear in the configured `tiers`). */
	tier: string;
}

export interface TierEntitleConfig {
	/** Tiers ordered from lowest to highest, e.g. `["free", "pro", "team"]`. */
	tiers: string[];
	/** Maps a feature name to the minimum tier it requires. Unlisted features are open to all. */
	features: Record<string, string>;
}

/**
 * Build an {@link Entitle} from an ordered tier list and a feature→required-tier
 * map. A feature is entitled when the subject's tier ranks at or above the
 * feature's required tier; otherwise it denies with the required/current tiers
 * (which the engine turns into an upgrade remedy). Unlisted features are open.
 */
export function createTierEntitle(
	config: TierEntitleConfig,
): Entitle<TierPolicy> {
	const rankOf = (tier: string): number => config.tiers.indexOf(tier);
	return (policy, name) => {
		const requiredTier = config.features[name];
		if (
			requiredTier === undefined ||
			rankOf(policy.tier) >= rankOf(requiredTier)
		) {
			return { ok: true };
		}
		return { ok: false, requiredTier, currentTier: policy.tier };
	};
}
