"use client";

/**
 * `<Can>` is authorization sugar. Hidden when denied by default:
 *
 *     <Can do="delete" on={invoice}><Button color="red">Delete</Button></Can>
 */

import type { ReactNode } from "react";
import { can } from "../predicates.js";
import type { ActionName } from "../registry.js";
import type {
	PresentationMode,
	UpgradeVariant,
} from "../types/presentation.js";
import { Gate } from "./Gate.js";

export interface CanProps<R = unknown> {
	/** The action to authorize. */
	do: ActionName;
	/** The optional resource the action targets. */
	on?: R;
	/** Presentation mode on denial; defaults to the provider's `presentation.default` (hide). */
	fallback?: PresentationMode | undefined;
	variant?: UpgradeVariant | undefined;
	children: ReactNode;
}

export function Can<R = unknown>({
	do: action,
	on,
	fallback,
	variant,
	children,
}: CanProps<R>): ReactNode {
	return (
		<Gate require={[can(action, on)]} fallback={fallback} variant={variant}>
			{children}
		</Gate>
	);
}

Can.displayName = "Can";
