/**
 * `<Feature>` is entitlement sugar. Defaults to an upgrade prompt when the tier
 * is too low:
 *
 *     <Feature name="pdf-export"><Button>Export PDF</Button></Feature>
 *
 * Pass `fallback="hide"` to hide instead of upselling.
 */

import type { ReactNode } from "react";
import { feature } from "../predicates.js";
import type { FeatureName } from "../registry.js";
import type {
	PresentationMode,
	UpgradeVariant,
} from "../types/presentation.js";
import { Gate } from "./Gate.js";

export interface FeatureProps {
	/** The entitlement name. */
	name: FeatureName;
	/** Presentation mode on denial; defaults to `upgrade` for entitlements. */
	fallback?: PresentationMode | undefined;
	variant?: UpgradeVariant | undefined;
	children: ReactNode;
}

export function Feature({
	name,
	fallback,
	variant,
	children,
}: FeatureProps): ReactNode {
	return (
		<Gate
			require={[feature(name)]}
			fallback={fallback ?? "upgrade"}
			variant={variant}
		>
			{children}
		</Gate>
	);
}
