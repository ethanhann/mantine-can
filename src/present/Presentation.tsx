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
		case "redirect":
			// Hidden here; route guards perform navigation for redirect.
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
