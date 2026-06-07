/**
 * Requirements: descriptors, not evaluations.
 *
 * Predicates (`can`, `feature`, `role`, `flag`, `authenticated`) build
 * {@link Requirement} values that a gate or hook resolves against the policy
 * snapshot. A gate may combine several; the engine resolves them authz-first
 * and returns the first failure.
 */

/**
 * A permission requirement. The subject may perform `action` on an optional
 * `resource`. Generic over the resource type so consumers can gate on typed rows
 * (`can<Invoice>("delete", invoice)`); defaults to `unknown`.
 */
export interface PermissionRequirement<R = unknown> {
	type: "permission";
	action: string;
	resource?: R;
}

/**
 * A single requirement to evaluate against the snapshot.
 *
 * - `authenticated`: the subject must be signed in.
 * - `role`: the subject must hold any one of `anyOf` (OR within roles).
 * - `permission`: the subject may perform `action` on an optional `resource`.
 * - `flag`: the named feature flag must be on (authorization-side flag).
 * - `feature`: the named entitlement must be granted (plan/tier).
 */
export type Requirement =
	| { type: "authenticated" }
	| { type: "role"; anyOf: string[] }
	| PermissionRequirement
	| { type: "flag"; name: string }
	| { type: "feature"; name: string };

/**
 * An OR group of atomic requirements. The group passes when any branch passes;
 * it fails only when every branch fails. Branches are atomic {@link Requirement}s,
 * not nested groups: composition is kept to a single level. For deeper logic,
 * collapse it into one named permission resolved by `authorize`.
 */
export type AnyOfRequirement = { type: "anyOf"; anyOf: Requirement[] };

/**
 * What a gate's `require` list accepts: atomic {@link Requirement}s (AND-ed) and
 * single-level {@link AnyOfRequirement} OR groups.
 */
export type GateRequirement = Requirement | AnyOfRequirement;
