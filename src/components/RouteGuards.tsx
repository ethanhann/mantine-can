"use client";

/**
 * Route guards that redirect on denial:
 *
 *     <RequireAuth redirectTo="/login"><Dashboard /></RequireAuth>
 *     <RequireRole anyOf={["admin"]} redirectTo="/403"><Admin /></RequireRole>
 *
 * Navigation is consumer-supplied: pass `navigate` (e.g. your router's navigate),
 * or fall back to a full-page `window.location` redirect. While the snapshot is
 * still hydrating, the guard waits and renders `fallback` rather than redirecting.
 */

import { type ReactNode, useEffect, useRef } from "react";
import { useGate, useSubject } from "../hooks.js";
import { authenticated, role } from "../predicates.js";
import type { GateRequirement } from "../types/requirement.js";

function defaultNavigate(to: string): void {
	if (typeof window !== "undefined") {
		window.location.assign(to);
	}
}

interface GuardProps {
	/** Where to send a denied subject. */
	redirectTo: string;
	/** Navigation function; defaults to a `window.location` redirect. */
	navigate?: ((to: string) => void) | undefined;
	/** Rendered while hydrating or after a denial (before navigation completes). */
	fallback?: ReactNode;
	children: ReactNode;
}

type GuardState = "loading" | "allowed" | "denied";

function useRedirectGuard(
	requirements: GateRequirement[],
	redirectTo: string,
	navigate: ((to: string) => void) | undefined,
): GuardState {
	const decision = useGate(requirements);
	const { status } = useSubject();
	const denied = status === "ready" && !decision.allowed;

	// Keep the latest navigate/redirectTo in a ref so the redirect effect depends
	// only on `denied`. Otherwise an inline `navigate` (a fresh identity each
	// render, the common case) would re-fire navigation on every render while
	// denied stays true.
	const target = useRef({ navigate, redirectTo });
	target.current = { navigate, redirectTo };

	useEffect(() => {
		if (denied) {
			const { navigate: nav, redirectTo: to } = target.current;
			(nav ?? defaultNavigate)(to);
		}
	}, [denied]);

	if (status === "loading") {
		return "loading";
	}
	return decision.allowed ? "allowed" : "denied";
}

export type RequireAuthProps = GuardProps;

export function RequireAuth({
	redirectTo,
	navigate,
	fallback,
	children,
}: RequireAuthProps): ReactNode {
	const state = useRedirectGuard([authenticated()], redirectTo, navigate);
	return state === "allowed" ? children : (fallback ?? null);
}

RequireAuth.displayName = "RequireAuth";

export interface RequireRoleProps extends GuardProps {
	/** The subject must hold any one of these roles. */
	anyOf: string[];
}

export function RequireRole({
	anyOf,
	redirectTo,
	navigate,
	fallback,
	children,
}: RequireRoleProps): ReactNode {
	const state = useRedirectGuard([role(...anyOf)], redirectTo, navigate);
	return state === "allowed" ? children : (fallback ?? null);
}

RequireRole.displayName = "RequireRole";
