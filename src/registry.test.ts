import { describe, expectTypeOf, it } from "vitest";
import type { ActionName, FeatureName, ResolveName } from "./registry";

describe("ResolveName", () => {
	it("narrows to the registry union when the key is present", () => {
		expectTypeOf<
			ResolveName<{ actions: "view" | "edit" }, "actions">
		>().toEqualTypeOf<"view" | "edit">();
	});

	it("falls back to string when the key is missing", () => {
		expectTypeOf<
			ResolveName<{ features: "pdf" }, "actions">
		>().toEqualTypeOf<string>();
	});

	it("falls back to string when the value isn't a string union", () => {
		expectTypeOf<
			ResolveName<{ actions: 123 }, "actions">
		>().toEqualTypeOf<string>();
	});
});

describe("default (un-augmented) registry", () => {
	it("leaves action and feature names as string", () => {
		expectTypeOf<ActionName>().toEqualTypeOf<string>();
		expectTypeOf<FeatureName>().toEqualTypeOf<string>();
	});
});
