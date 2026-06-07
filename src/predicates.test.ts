import { describe, expect, it } from "vitest";
import { anyOf, authenticated, can, feature, flag, role } from "./predicates";

describe("can", () => {
	it("builds a permission requirement without a resource", () => {
		expect(can("export")).toEqual({ type: "permission", action: "export" });
	});

	it("omits the resource key when none is given (exact-optional friendly)", () => {
		expect("resource" in can("export")).toBe(false);
	});

	it("carries the resource when given", () => {
		const invoice = { id: 7 };
		expect(can("delete", invoice)).toEqual({
			type: "permission",
			action: "delete",
			resource: invoice,
		});
	});

	it("preserves the resource type generically", () => {
		const req = can("update", { id: 1, total: 100 });
		// typed access compiles because resource is inferred, not `unknown`
		expect(req.resource?.total).toBe(100);
	});
});

describe("feature", () => {
	it("builds a feature requirement", () => {
		expect(feature("pdf-export")).toEqual({
			type: "feature",
			name: "pdf-export",
		});
	});
});

describe("role", () => {
	it("collects role names into anyOf (OR within roles)", () => {
		expect(role("admin", "owner")).toEqual({
			type: "role",
			anyOf: ["admin", "owner"],
		});
	});

	it("supports a single role", () => {
		expect(role("admin")).toEqual({ type: "role", anyOf: ["admin"] });
	});
});

describe("flag", () => {
	it("builds a flag requirement", () => {
		expect(flag("beta")).toEqual({ type: "flag", name: "beta" });
	});
});

describe("authenticated", () => {
	it("builds an authenticated requirement", () => {
		expect(authenticated()).toEqual({ type: "authenticated" });
	});
});

describe("anyOf", () => {
	it("wraps branches into a single-level OR group", () => {
		expect(anyOf([role("admin"), feature("pro")])).toEqual({
			type: "anyOf",
			anyOf: [
				{ type: "role", anyOf: ["admin"] },
				{ type: "feature", name: "pro" },
			],
		});
	});

	it("accepts an empty branch list", () => {
		expect(anyOf([])).toEqual({ type: "anyOf", anyOf: [] });
	});
});
