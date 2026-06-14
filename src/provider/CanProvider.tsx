"use client";

/**
 * `<CanProvider>` holds the policy snapshot and interpreters for the current
 * subject, and binds the engine so gates/hooks resolve synchronously.
 */

import { type ReactNode, useMemo, useRef } from "react";
import { createGate } from "../engine/resolve.js";
import type { Authorize, Entitle } from "../engine/types.js";
import type { DenyReason } from "../types/decision.js";
import type {
	PresentationConfig,
	ResolvedPresentation,
} from "../types/presentation.js";
import {
	CanContext,
	type CanContextValue,
	type PolicyStatus,
} from "./context.js";

export interface CanProviderProps<Policy, Subject> {
	/** The current subject, or `null` when unauthenticated. */
	subject: Subject | null;
	/** The policy snapshot for the subject; your shape, loaded by you. */
	policy: Policy;
	/** Snapshot hydration status; gates show Pending while `"loading"`. Default `"ready"`. */
	status?: PolicyStatus;
	/** Interprets role/permission/flag against the snapshot. */
	authorize: Authorize<NoInfer<Policy>>;
	/** Interprets entitlement against the snapshot. */
	entitle: Entitle<NoInfer<Policy>>;
	/** Presentation defaults and slot overrides. */
	presentation?: PresentationConfig;
	/** Fired by every upgrade CTA; the library never owns checkout. */
	onUpgrade?: (reason: DenyReason) => void;
	/**
	 * Optional explicit snapshot version. When omitted, the provider derives one
	 * that bumps whenever `policy` or `subject` identity changes.
	 */
	snapshotVersion?: string | number;
	children: ReactNode;
}

const noop = (): void => {};

/** Apply default fallbacks to the public presentation config. */
function resolvePresentation(
	config: PresentationConfig | undefined,
): ResolvedPresentation {
	const resolved: ResolvedPresentation = {
		default: config?.default ?? "hide",
		upgrade: { mode: config?.upgrade?.mode ?? "badge" },
	};
	if (config?.Upgrade) {
		resolved.Upgrade = config.Upgrade;
	}
	if (config?.Disabled) {
		resolved.Disabled = config.Disabled;
	}
	if (config?.Pending) {
		resolved.Pending = config.Pending;
	}
	return resolved;
}

export function CanProvider<Policy, Subject>(
	props: CanProviderProps<Policy, Subject>,
) {
	const {
		subject,
		policy,
		status = "ready",
		authorize,
		entitle,
		presentation,
		onUpgrade,
		snapshotVersion: snapshotVersionProp,
		children,
	} = props;

	// Derive a snapshot version that bumps once per subject/policy change, so the
	// engine re-binds exactly once on re-hydration and stays stable in between.
	//
	// The refs are mutated during render, which is safe here because the result is
	// a pure function of the current props: the bump is guarded by a prev-vs-current
	// identity check, so re-running render (StrictMode's double-invoke, or a
	// discarded concurrent render) recomputes the same version rather than drifting.
	const versionRef = useRef(0);
	const depsRef = useRef<{ policy: unknown; subject: unknown } | null>(null);
	if (snapshotVersionProp === undefined) {
		const deps = depsRef.current;
		if (deps === null || deps.policy !== policy || deps.subject !== subject) {
			versionRef.current += 1;
			depsRef.current = { policy, subject };
		}
	}
	const snapshotVersion = snapshotVersionProp ?? versionRef.current;

	// Bind the engine on its own, keyed only on what resolution actually depends
	// on. This keeps `resolve` referentially stable across presentation/onUpgrade/
	// status changes, so hooks keep their memoized decisions (and an N×M grid does
	// not re-run authorize/entitle) even when those purely-presentational props are
	// passed inline.
	const gate = useMemo(
		() => createGate<Policy, Subject>({ subject, policy, authorize, entitle }),
		[subject, policy, authorize, entitle],
	);

	const value = useMemo<CanContextValue>(() => {
		return {
			subject,
			policy,
			status,
			authorize: authorize as Authorize,
			entitle: entitle as Entitle,
			presentation: resolvePresentation(presentation),
			onUpgrade: onUpgrade ?? noop,
			resolve: gate.resolve,
			snapshotVersion,
		};
	}, [
		gate,
		subject,
		policy,
		status,
		authorize,
		entitle,
		presentation,
		onUpgrade,
		snapshotVersion,
	]);

	return <CanContext.Provider value={value}>{children}</CanContext.Provider>;
}

CanProvider.displayName = "CanProvider";
