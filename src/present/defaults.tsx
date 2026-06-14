"use client";

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
	// The outer span is the tooltip anchor (stays interactive so hover works);
	// the inner span is `inert`, so the disabled control leaves the tab order and
	// can't be activated by mouse OR keyboard, not merely dimmed via CSS.
	return (
		<Tooltip label={reasonText(decision.reason)} withArrow>
			<span className="mc-disabled" aria-disabled="true">
				<span className="mc-disabled__content" inert>
					{children}
				</span>
			</span>
		</Tooltip>
	);
}

DefaultDisabled.displayName = "DefaultDisabled";

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
			// Assumes the children are natively clickable (a button/link, as a gated
			// CTA normally is) — a non-interactive child won't emit a click to catch.
			// The wrapper is `inline-block`; for block-level children, override this
			// slot (or pass a `replace`/`teaser` variant) to control layout.
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
			// "badge": children disabled, with a Pro pill and tooltip CTA. The
			// children wrapper is `inert` so the gated control can't be activated by
			// mouse or keyboard; the Pro badge is the only interactive element.
			return (
				<span className="mc-badge">
					<span className="mc-disabled" inert>
						{children}
					</span>
					<Tooltip label={`${reason} ${label}.`} withArrow>
						<Badge
							color="yellow"
							variant="filled"
							style={{ cursor: "pointer" }}
							role="button"
							tabIndex={0}
							onClick={onUpgrade}
							onKeyDown={(event) => {
								// role="button" semantics: activate on Enter/Space too.
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									onUpgrade();
								}
							}}
						>
							Pro
						</Badge>
					</Tooltip>
				</span>
			);
	}
}

DefaultUpgrade.displayName = "DefaultUpgrade";

/** Rendered while the policy snapshot hydrates. Defaults to nothing, avoiding a flash. */
export function DefaultPending(_props: PendingSlotProps) {
	return null;
}

DefaultPending.displayName = "DefaultPending";
