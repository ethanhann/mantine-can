/**
 * Predicates: the descriptor builders consumers call inside gates and hooks.
 *
 * Each predicate returns a {@link Requirement} (a descriptor), not a decision.
 * The engine resolves them against the snapshot, authz-first. `anyOf` builds a
 * single-level OR group.
 */

import type { ActionName, FeatureName } from "./registry.js";
import type {
	AnyOfRequirement,
	PermissionRequirement,
	Requirement,
} from "./types/requirement.js";

/**
 * Authorization: the subject may perform `action`, optionally on a `resource`.
 * Generic over the resource type for typed per-row checks.
 *
 * @example can("delete", invoice)
 */
export function can<R = unknown>(
	action: ActionName,
	resource?: R,
): PermissionRequirement<R> {
	return resource === undefined
		? { type: "permission", action }
		: { type: "permission", action, resource };
}

/**
 * Entitlement: the named feature/plan must be granted.
 *
 * @example feature("pdf-export")
 */
export function feature(name: FeatureName): Requirement {
	return { type: "feature", name };
}

/**
 * Authorization: the subject must hold any one of the given roles (OR within roles).
 *
 * @example role("admin", "owner")
 */
export function role(...names: string[]): Requirement {
	return { type: "role", anyOf: names };
}

/**
 * Authorization: the named feature flag must be on.
 *
 * @example flag("beta-dashboard")
 */
export function flag(name: string): Requirement {
	return { type: "flag", name };
}

/**
 * Authorization: the subject must be signed in.
 *
 * @example authenticated()
 */
export function authenticated(): Requirement {
	return { type: "authenticated" };
}

/**
 * Combine requirements with OR: the group passes when any branch passes. Branches
 * are atomic requirements (single level, `anyOf` cannot nest). The engine surfaces
 * the most actionable remedy among failed branches.
 *
 * @example anyOf([role("admin"), feature("pro")])
 */
export function anyOf(requirements: Requirement[]): AnyOfRequirement {
	return { type: "anyOf", anyOf: requirements };
}
