import { describe, expect, it } from "vitest";
import type { Requirement } from "./requirement";

function assertNever(x: never): never {
	throw new Error(`unexpected variant: ${JSON.stringify(x)}`);
}

/** Exhaustive over every Requirement type. Adding a type without a case fails to compile. */
function describeRequirement(req: Requirement): string {
	switch (req.type) {
		case "authenticated":
			return "authenticated";
		case "role":
			return `role:${req.anyOf.join("|")}`;
		case "permission":
			return `permission:${req.action}`;
		case "flag":
			return `flag:${req.name}`;
		case "feature":
			return `feature:${req.name}`;
		default:
			return assertNever(req);
	}
}

describe("Requirement exhaustiveness", () => {
	it("describes every requirement type", () => {
		const reqs: Requirement[] = [
			{ type: "authenticated" },
			{ type: "role", anyOf: ["admin", "owner"] },
			{ type: "permission", action: "export", resource: { id: 7 } },
			{ type: "flag", name: "beta" },
			{ type: "feature", name: "pdf-export" },
		];
		expect(reqs.map(describeRequirement)).toEqual([
			"authenticated",
			"role:admin|owner",
			"permission:export",
			"flag:beta",
			"feature:pdf-export",
		]);
	});
});
