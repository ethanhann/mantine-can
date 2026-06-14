/**
 * Exhaustiveness guard for discriminated `switch` blocks. Used in the `default`
 * branch: it only typechecks when every variant is already handled (so adding a
 * new variant without a case becomes a compile error), and at runtime it throws a
 * clear error rather than letting an unhandled value fall through to `undefined`
 * (which would otherwise surface as an opaque crash downstream, e.g. for a JS
 * consumer passing a malformed requirement).
 *
 * Internal: not part of the public API.
 */
export function assertNever(value: never): never {
	throw new Error(`mantine-can: unexpected variant: ${JSON.stringify(value)}`);
}
