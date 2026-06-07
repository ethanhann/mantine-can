/**
 * Engine contracts: the interpreter functions and evaluation context.
 *
 * The consumer brings the policy snapshot and two interpreters; the engine
 * brings the resolution logic.
 */

import type { PermissionRequirement } from "../types/requirement.js";

/**
 * The authorization-side requirements `authorize` is asked to interpret:
 * role, permission, or flag. (Authentication and entitlement are handled by the
 * engine and `entitle` respectively.)
 */
export type AuthorizationRequirement =
	| { type: "role"; anyOf: string[] }
	| PermissionRequirement
	| { type: "flag"; name: string };

/**
 * Interprets a role/permission/flag requirement against the snapshot.
 * Pure and synchronous; memoize per `(snapshot version, resource identity)`.
 */
export type Authorize<Policy = unknown> = (
	policy: Policy,
	requirement: AuthorizationRequirement,
) => boolean;

/**
 * The result of an entitlement check. A plain tier failure (the common case)
 * omits `kind`; a quota failure sets `kind: "quota"`.
 */
export type EntitlementResult =
	| { ok: true }
	| { ok: false; kind?: "tier"; requiredTier: string; currentTier: string }
	| {
			ok: false;
			kind: "quota";
			name: string;
			limit: number;
			used: number;
			/** When present, the quota denial offers an upgrade remedy. */
			requiredTier?: string;
	  };

/** Interprets a named entitlement against the snapshot. Pure and synchronous. */
export type Entitle<Policy = unknown> = (
	policy: Policy,
	name: string,
) => EntitlementResult;

/**
 * Everything the engine needs to resolve requirements: the current subject
 * (null when unauthenticated), the policy snapshot, and the two interpreters.
 * `snapshotVersion` is the memoization seam: bump it when the snapshot changes
 * and callers can cache decisions in between.
 */
export interface ResolveContext<Policy = unknown, Subject = unknown> {
	subject: Subject | null;
	policy: Policy;
	authorize: Authorize<Policy>;
	entitle: Entitle<Policy>;
	snapshotVersion?: string | number;
}
