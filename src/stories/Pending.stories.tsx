import { Button, Skeleton } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { Can } from "../components/Can";
import type { PolicyStatus } from "../provider/context";
import type { PendingSlotProps } from "../types/presentation";
import { Demo, memberPolicy } from "./demo";

type PendingArgs = { status: PolicyStatus };

function SkeletonPending(_props: PendingSlotProps) {
	return <Skeleton height={36} width={120} radius="sm" />;
}

const meta = {
	title: "States/Pending",
	tags: ["autodocs"],
	parameters: { layout: "centered" },
	argTypes: {
		status: {
			control: "inline-radio",
			options: ["loading", "ready"],
			description: "Policy snapshot status.",
		},
	},
	render: ({ status }) => (
		<Demo
			policy={memberPolicy}
			status={status}
			presentation={{ Pending: SkeletonPending }}
		>
			<Can do="export">
				<Button>Export</Button>
			</Can>
		</Demo>
	),
} satisfies Meta<PendingArgs>;

export default meta;
type Story = StoryObj<PendingArgs>;

/**
 * While `status="loading"`, gates render the Pending slot instead of evaluating,
 * so a denial computed against an empty policy never flashes. This custom Pending
 * slot shows a skeleton.
 */
export const Hydrating: Story = {
	args: { status: "loading" },
};

/** Once ready, the same gate resolves and renders its decision. */
export const Ready: Story = {
	args: { status: "ready" },
};
