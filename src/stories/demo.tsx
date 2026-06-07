/**
 * Shared scaffolding for the stories: a demo provider wired to the `/presets`
 * interpreters, plus a few sample policies to switch between.
 */

import type { ReactNode } from "react";
import { createTierEntitle, type RbacPolicy, rbacAuthorize } from "../presets";
import { CanProvider } from "../provider/CanProvider";
import type { PolicyStatus } from "../provider/context";
import type { PresentationConfig } from "../types/presentation";

/** The demo snapshot combines the RBAC and tier preset shapes. */
export interface DemoPolicy extends RbacPolicy {
	tier: string;
}

const entitle = createTierEntitle({
	tiers: ["free", "pro", "team"],
	features: { "pdf-export": "pro", "bulk-actions": "team" },
});

/** A free-tier member: can view/export, no admin role, low tier. */
export const memberPolicy: DemoPolicy = {
	roles: ["member"],
	permissions: ["view", "export"],
	flags: [],
	tier: "free",
};

/** A pro-tier member: same roles, entitled to pro features. */
export const proPolicy: DemoPolicy = {
	roles: ["member"],
	permissions: ["view", "export"],
	flags: [],
	tier: "pro",
};

/** An admin on the top tier: everything. */
export const adminPolicy: DemoPolicy = {
	roles: ["member", "admin"],
	permissions: ["view", "export", "publish", "delete"],
	flags: ["beta"],
	tier: "team",
};

/** Sample policies keyed by name, for Storybook policy-selector controls. */
export const policies = {
	member: memberPolicy,
	pro: proPolicy,
	admin: adminPolicy,
} satisfies Record<string, DemoPolicy>;

/** Names of the sample policies. */
export type PolicyName = keyof typeof policies;

const noop = (): void => {};

export interface DemoProps {
	policy?: DemoPolicy;
	status?: PolicyStatus;
	subject?: { id: string } | null;
	presentation?: PresentationConfig;
	onUpgrade?: () => void;
	children: ReactNode;
}

export function Demo({
	policy = memberPolicy,
	status = "ready",
	subject = { id: "u1" },
	presentation,
	onUpgrade = noop,
	children,
}: DemoProps) {
	const extra: { presentation?: PresentationConfig } = {};
	if (presentation) {
		extra.presentation = presentation;
	}
	return (
		<CanProvider
			subject={subject}
			policy={policy}
			status={status}
			authorize={rbacAuthorize}
			entitle={entitle}
			onUpgrade={onUpgrade}
			{...extra}
		>
			{children}
		</CanProvider>
	);
}
