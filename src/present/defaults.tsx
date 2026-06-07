/**
 * Default presentation slots, built on Mantine. Each is overridable via the
 * provider's `presentation` config or per-gate. The decision engine is headless;
 * these are the only place Mantine is required.
 */

import { Badge, Button, Card, Stack, Text, Tooltip } from "@mantine/core";
import type { MouseEvent } from "react";
import type {
	DisabledSlotProps,
	PendingSlotProps,
	UpgradeSlotProps,
} from "../types/presentation.js";
import { ctaLabel, reasonText } from "./text.js";
import "./styles.css";

/** Small dependency-free lock glyph (avoids pulling an icon set into peers). */
function LockIcon() {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			aria-hidden="true"
		>
			<title>Locked</title>
			<rect x="5" y="11" width="14" height="9" rx="2" />
			<path d="M8 11V8a4 4 0 0 1 8 0v3" />
		</svg>
	);
}

/** Children rendered visually disabled, with a tooltip explaining the denial. */
export function DefaultDisabled({ children, decision }: DisabledSlotProps) {
	return (
		<Tooltip label={reasonText(decision.reason)} withArrow>
			<span className="mc-disabled" aria-disabled="true">
				{children}
			</span>
		</Tooltip>
	);
}

/** The upgrade renderer, switching on the sub-variant (teaser/replace/badge/intercept). */
export function DefaultUpgrade({
	children,
	variant,
	decision,
	onUpgrade,
}: UpgradeSlotProps) {
	const label = ctaLabel(decision.remedy) ?? "Upgrade";
	const reason = reasonText(decision.reason);

	switch (variant) {
		case "teaser":
			return (
				<div className="mc-teaser">
					{/* `inert` removes the blurred preview from tab order and the
					   accessibility tree, so the CTA is the only focusable element. */}
					<div className="mc-teaser__content" inert>
						{children}
					</div>
					<div className="mc-teaser__overlay">
						<LockIcon />
						<Button size="xs" onClick={onUpgrade}>
							{label}
						</Button>
					</div>
				</div>
			);

		case "replace":
			return (
				<Card withBorder padding="md" radius="md">
					<Stack gap="xs" align="center">
						<LockIcon />
						<Text size="sm" ta="center">
							{reason}
						</Text>
						<Button size="xs" onClick={onUpgrade}>
							{label}
						</Button>
					</Stack>
				</Card>
			);

		case "intercept": {
			// Children stay interactive; their click is caught in the capture phase
			// and the CTA fires instead. Keyboard activation of a child control also
			// dispatches a click, so it is intercepted too, with no extra role needed.
			const intercept = (event: MouseEvent) => {
				event.preventDefault();
				event.stopPropagation();
				onUpgrade();
			};
			return (
				<span
					style={{ display: "inline-block", cursor: "pointer" }}
					onClickCapture={intercept}
				>
					{children}
				</span>
			);
		}

		default:
			// "badge": children disabled, with a Pro pill and tooltip CTA.
			return (
				<span className="mc-badge">
					<span className="mc-disabled">{children}</span>
					<Tooltip label={`${reason} ${label}.`} withArrow>
						<Badge
							color="yellow"
							variant="filled"
							style={{ cursor: "pointer" }}
							role="button"
							onClick={onUpgrade}
						>
							Pro
						</Badge>
					</Tooltip>
				</span>
			);
	}
}

/** Rendered while the policy snapshot hydrates. Defaults to nothing, avoiding a flash. */
export function DefaultPending(_props: PendingSlotProps) {
	return null;
}
