"use client";

/**
 * `<Presentation>` renders a decision. It is the shared rendering core that the
 * `<Can>`, `<Feature>`, and `<Gate>` components delegate to.
 *
 * Order of concerns: while the snapshot is hydrating, show Pending so a denial
 * computed against an empty policy never flashes. Otherwise render per the
 * selected mode, pulling slot overrides from the provider and falling back to
 * the Mantine defaults. Redirect is left to the route guards.
 */

import type { ReactNode } from "react";
import { useCanContext } from "../provider/context.js";
import type { Decision } from "../types/decision.js";
import type {
	PresentationMode,
	UpgradeVariant,
} from "../types/presentation.js";
import { DefaultDisabled, DefaultPending, DefaultUpgrade } from "./defaults.js";
import { selectPresentation } from "./select.js";

/**
 * `redirect` only works through the route guards (`<RequireAuth>`/`<RequireRole>`),
 * which navigate via an effect and never render through `<Presentation>`. A gate's
 * `fallback="redirect"` (or `presentation.default: "redirect"`) therefore has no
 * navigate function and renders nothing. Warn in dev so that's not silent.
 */
function warnRedirectUnsupported(): void {
	if (process.env.NODE_ENV !== "production") {
		console.warn(
			"mantine-can: `redirect` is not supported as a gate `fallback` / `presentation.default` — gates cannot navigate, so nothing is rendered. Use <RequireAuth>/<RequireRole> (or a custom guard) to redirect on denial.",
		);
	}
}

export interface PresentationProps {
	decision: Decision;
	mode: PresentationMode;
	/** Per-gate upgrade variant override; explicit `undefined` falls back to the provider default. */
	variant?: UpgradeVariant | undefined;
	children: ReactNode;
}

export function Presentation({
	decision,
	mode,
	variant,
	children,
}: PresentationProps): ReactNode {
	const { status, presentation, onUpgrade } = useCanContext();

	if (status === "loading") {
		const Pending = presentation.Pending ?? DefaultPending;
		return <Pending>{children}</Pending>;
	}

	const effective = selectPresentation(decision, mode, presentation, variant);

	switch (effective.kind) {
		case "allow":
			return children;

		case "hide":
			return null;

		case "redirect":
			// Gates can't navigate; only the route guards redirect (and they don't
			// render through Presentation). Treat as hide, but warn in dev.
			warnRedirectUnsupported();
			return null;

		case "disable": {
			const Disabled = presentation.Disabled ?? DefaultDisabled;
			return <Disabled decision={effective.decision}>{children}</Disabled>;
		}

		case "upgrade": {
			const Upgrade = presentation.Upgrade ?? DefaultUpgrade;
			return (
				<Upgrade
					decision={effective.decision}
					variant={effective.variant}
					onUpgrade={() => onUpgrade(effective.decision.reason)}
				>
					{children}
				</Upgrade>
			);
		}
	}
}

Presentation.displayName = "Presentation";
