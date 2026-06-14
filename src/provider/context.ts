"use client";

/**
 * The CanProvider context that gates and hooks read.
 *
 * React context can't be generic, so the stored value is type-erased over the
 * policy/subject (resolution is synchronous and doesn't need them typed here).
 * Typed resources live on the `can`/`useCan` generics instead.
 */

import { createContext, useContext } from "react";
import type { Authorize, Entitle } from "../engine/types.js";
import type { Decision, DenyReason } from "../types/decision.js";
import type { ResolvedPresentation } from "../types/presentation.js";
import type { GateRequirement } from "../types/requirement.js";

/** Whether the policy snapshot is still hydrating. Gates show Pending while loading. */
export type PolicyStatus = "loading" | "ready";

/** The value held in context and consumed by every gate/hook. */
export interface CanContextValue {
	subject: unknown;
	policy: unknown;
	status: PolicyStatus;
	authorize: Authorize;
	entitle: Entitle;
	presentation: ResolvedPresentation;
	onUpgrade: (reason: DenyReason) => void;
	/** Resolve a requirement list against the current snapshot (bound by the provider). */
	resolve: (requirements: GateRequirement[]) => Decision;
	/** Bump this when the snapshot changes; hooks key memoized decisions on it. */
	snapshotVersion: string | number;
}

export const CanContext = createContext<CanContextValue | null>(null);

CanContext.displayName = "CanContext";

/**
 * Read the CanProvider context. Throws a clear error when used outside a
 * `<CanProvider>`, rather than silently returning a null decision.
 */
export function useCanContext(): CanContextValue {
	const value = useContext(CanContext);
	if (value === null) {
		throw new Error(
			"mantine-can: gates and hooks must be used inside a <CanProvider>.",
		);
	}
	return value;
}
