"use client";

/**
 * `<Gate>` is the general gate component. It combines requirements (authz-first
 * via the engine), then renders the decision through the shared presentation
 * core. `<Can>` and `<Feature>` are sugar over it.
 */

import type { ReactNode } from "react";
import { useGate } from "../hooks.js";
import { Presentation } from "../present/Presentation.js";
import { useCanContext } from "../provider/context.js";
import type {
	PresentationMode,
	UpgradeVariant,
} from "../types/presentation.js";
import type { GateRequirement } from "../types/requirement.js";

export interface GateProps {
	/** Requirements to satisfy (AND); use `anyOf([...])` for OR groups. */
	require: GateRequirement[];
	/** Presentation mode on denial; defaults to the provider's `presentation.default`. */
	fallback?: PresentationMode | undefined;
	/** Upgrade variant override for this gate. */
	variant?: UpgradeVariant | undefined;
	children: ReactNode;
}

export function Gate({
	require,
	fallback,
	variant,
	children,
}: GateProps): ReactNode {
	const { presentation } = useCanContext();
	const decision = useGate(require);
	return (
		<Presentation
			decision={decision}
			mode={fallback ?? presentation.default}
			variant={variant}
		>
			{children}
		</Presentation>
	);
}

Gate.displayName = "Gate";
