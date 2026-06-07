import { Paper, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, waitFor } from "storybook/test";
import {
	RequireAuth,
	type RequireAuthProps,
	RequireRole,
} from "../components/RouteGuards";
import { adminPolicy, Demo, memberPolicy } from "./demo";

type GuardArgs = RequireAuthProps & { navigate: (to: string) => void };

const meta = {
	title: "Components/RouteGuards",
	component: RequireAuth,
	tags: ["autodocs"],
	parameters: { layout: "centered" },
	args: { navigate: fn() },
	argTypes: { navigate: { control: false } },
} satisfies Meta<GuardArgs>;

export default meta;
type Story = StoryObj<GuardArgs>;

const Protected = ({ label }: { label: string }) => (
	<Paper withBorder p="md">
		<Text>{label}</Text>
	</Paper>
);

/** Authenticated subject: the guarded content renders and `navigate` is never called. */
export const AuthAllowed: Story = {
	args: { navigate: fn() },
	render: ({ navigate }) => (
		<Demo policy={memberPolicy}>
			<RequireAuth redirectTo="/login" navigate={navigate}>
				<Protected label="Dashboard" />
			</RequireAuth>
		</Demo>
	),
	play: async ({ args }) => {
		await expect(args.navigate).not.toHaveBeenCalled();
	},
};

/** Unauthenticated: the guard calls `navigate(redirectTo)` and shows the fallback. */
export const AuthRedirects: Story = {
	args: { navigate: fn() },
	render: ({ navigate }) => (
		<Demo subject={null} policy={memberPolicy}>
			<RequireAuth
				redirectTo="/login"
				navigate={navigate}
				fallback={<Text c="dimmed">Redirecting to /login</Text>}
			>
				<Protected label="Dashboard" />
			</RequireAuth>
		</Demo>
	),
	play: async ({ args }) => {
		await waitFor(() => expect(args.navigate).toHaveBeenCalledWith("/login"));
	},
};

/** Subject holds the role: admin content renders and `navigate` is never called. */
export const RoleAllowed: Story = {
	args: { navigate: fn() },
	render: ({ navigate }) => (
		<Demo policy={adminPolicy}>
			<RequireRole anyOf={["admin"]} redirectTo="/403" navigate={navigate}>
				<Protected label="Admin panel" />
			</RequireRole>
		</Demo>
	),
	play: async ({ args }) => {
		await expect(args.navigate).not.toHaveBeenCalled();
	},
};

/** Subject lacks the role: the guard calls `navigate("/403")` and shows the fallback. */
export const RoleRedirects: Story = {
	args: { navigate: fn() },
	render: ({ navigate }) => (
		<Demo policy={memberPolicy}>
			<RequireRole
				anyOf={["admin"]}
				redirectTo="/403"
				navigate={navigate}
				fallback={<Text c="dimmed">Redirecting to /403</Text>}
			>
				<Protected label="Admin panel" />
			</RequireRole>
		</Demo>
	),
	play: async ({ args }) => {
		await waitFor(() => expect(args.navigate).toHaveBeenCalledWith("/403"));
	},
};
