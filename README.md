# @ethanhann/mantine-can

[![npm version](https://img.shields.io/npm/v/@ethanhann/mantine-can.svg)](https://www.npmjs.com/package/@ethanhann/mantine-can)
[![CI](https://github.com/ethanhann/mantine-can/actions/workflows/ci.yml/badge.svg)](https://github.com/ethanhann/mantine-can/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https%3A%2F%2Fethanhann.github.io%2Fmantine-can%2Fcoverage-badge.json)](https://ethanhann.github.io/mantine-can)
[![Storybook](https://img.shields.io/badge/Storybook-deployed-ff4785?logo=storybook&logoColor=white)](https://ethanhann.github.io/mantine-can)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

The **gate layer** for the Mantine family. Where nav/dataview/detail render
content, `mantine-can` decides whether a given subject may see or do a thing,
and renders that decision as **hide**, **disable**, or an **upgrade prompt**.

Built on [Mantine](https://mantine.dev) v9.

> **A gate returns a decision, not a boolean.** `can(...)` and `feature(...)`
> don't answer `true | false`; they answer `{ allowed }` **or**
> `{ denied, reason, remedy }`. Once a denial carries why (reason) and
> what to do about it (remedy), the presentation (hide, disable, or upsell) is
> a pure function of that decision.

This lets a single library cover both **authorization** (role/permission)
and **monetization** (plan/tier): the upgrade prompt isn't a bolt-on, it's the
rendering of a denial whose remedy is `upgrade`.

See [`docs/plugins.md`](./docs/plugins.md) for nav/dataview/detail integration.

## Install

```sh
npm install @ethanhann/mantine-can
```

Peer dependencies: `react`, `react-dom`, `@mantine/core`, `@mantine/hooks`. The
decision engine is headless; Mantine is only needed for the presentation layer
(tooltips, upgrade affordances). Import the styles once:

```ts
import "@ethanhann/mantine-can/styles.css";
```

## Quick start

### 1. Provide a snapshot + interpreters

You bring the policy snapshot and two synchronous interpreters; the library
brings the engine and the presentation. `/presets` ships example interpreters.

```tsx
import {CanProvider} from "@ethanhann/mantine-can";
import {rbacAuthorize, createTierEntitle} from "@ethanhann/mantine-can/presets";

const entitle = createTierEntitle({
    tiers: ["free", "pro", "team"],
    features: {"pdf-export": "pro"},
});

<CanProvider
    subject={currentUser}                 // null when unauthenticated
    policy={policySnapshot}               // your shape, loaded by you
    status={policyStatus}                 // "loading" | "ready"
    authorize={rbacAuthorize}             // interprets role/permission/flag
    entitle={entitle}                     // interprets entitlement
    presentation={{default: "hide", upgrade: {mode: "badge"}}}
    onUpgrade={(reason) => navigate("/billing")}
>
    {children}
</CanProvider>
```

The presets expect specific snapshot shapes: `rbacAuthorize` reads
`{ roles, permissions, flags? }` and `createTierEntitle` reads `{ tier }`, where
`tier` is one of the `tiers` you configure. A combined snapshot carries both. To
read your own shape instead, write your own interpreters (see below).

### 2. Gate with components

```tsx
import {Can, Feature, Gate, RequireAuth, RequireRole} from "@ethanhann/mantine-can";
import {can, feature} from "@ethanhann/mantine-can";

// Authorization: hidden when denied (default)
<Can do="delete" on={invoice}>
    <Button color="red">Delete</Button>
</Can>

// Entitlement: upgrade prompt when the tier is too low
<Feature name="pdf-export">
    <Button>Export PDF</Button>
</Feature>

// General gate: combine requirements; the engine picks the denial (authz-first)
<Gate require={[can("export", report), feature("pdf-export")]} fallback="upgrade">
    <ExportButton/>
</Gate>

// Route guards: redirect on denial
<RequireAuth redirectTo="/login" navigate={navigate}><Dashboard/></RequireAuth>
<RequireRole anyOf={["admin"]} redirectTo="/403" navigate={navigate}><Admin/></RequireRole>
```

### 3. …or with hooks

```tsx
import {useCan, useFeature, useGate, useSubject} from "@ethanhann/mantine-can";

const decision = useCan("update", record);
if (decision.allowed) { /* … */
}
```

## Predicates and combining

Predicates are descriptors, not evaluations. Each builds a requirement that a
gate or hook resolves against the snapshot.

```ts
can("delete", invoice)   // permission, with an optional resource
feature("pdf-export")    // entitlement
role("admin", "owner")   // any one of these roles
flag("beta-dashboard")   // an authorization flag
authenticated()          // the subject is signed in
```

A `<Gate>` requirement list is AND by default: every requirement must pass. For
OR across kinds, wrap them in `anyOf`:

```tsx
<Gate require={[can("edit", doc), anyOf([role("admin"), feature("pro")])]}>
    <EditButton/>
</Gate>
```

When several requirements fail, the engine returns one denial, authorization
before entitlement. A subject missing the role is hidden; a subject with the role
but the wrong tier sees the upgrade prompt. You never upsell a feature the subject
is not authorized to use. Inside an `anyOf` that order inverts: the group fails
only when every branch fails, and the most actionable remedy wins, so an unmet
`feature` branch can still surface an upgrade prompt.

## The decision

Every hook returns a `Decision`. A denial carries why (`reason`) and what to do
about it (`remedy`), and that is what drives the presentation.

```ts
type Decision =
    | { allowed: true }
    | { allowed: false; reason: DenyReason; remedy: Remedy };

type DenyReason =
    | { kind: "unauthenticated" }
    | { kind: "role"; required: string[] }
    | { kind: "permission"; action: string; resource?: unknown }
    | { kind: "tier"; required: string; current: string }
    | { kind: "flag"; name: string }
    | { kind: "quota"; name: string; limit: number; used: number };

type Remedy =
    | { kind: "none" }                    // hard deny, hide or disable
    | { kind: "upgrade"; toTier: string } // upgrade prompt
    | { kind: "requestAccess" }           // request-access affordance
    | { kind: "signIn" };                 // redirect to sign-in
```

Branch on the reason when you render your own affordance:

```tsx
const decision = useCan("delete", record);
if (!decision.allowed && decision.reason.kind === "tier") {
    // authorized, but on too low a tier
}
```

## Bring your own interpreters

The presets cover simple RBAC and tiers. Most apps supply their own `authorize`
and `entitle`, which read your snapshot however it is shaped. Both are pure and
synchronous.

```ts
import type {Authorize, Entitle} from "@ethanhann/mantine-can";
```

`authorize` interprets role, permission, and flag requirements and returns a
boolean. When present, the resource is the already-loaded row, so ownership and
tenant checks resolve client-side:

```ts
const authorize: Authorize<MyPolicy> = (policy, req) => {
    switch (req.type) {
        case "role":
            return req.anyOf.some((r) => policy.roles.includes(r));
        case "flag":
            return policy.flags.includes(req.name);
        case "permission":
            // req.resource is the row, when the gate passed one
            if (req.action === "delete") return isOwner(policy, req.resource);
            return policy.permissions.includes(req.action);
    }
};
```

`entitle` interprets an entitlement name. It returns `{ ok: true }`, or a denial
carrying the required and current tier, which becomes an upgrade remedy:

```ts
const entitle: Entitle<MyPolicy> = (policy, name) => {
    const required = featureTiers[name];
    if (!required || rank(policy.tier) >= rank(required)) return {ok: true};
    return {ok: false, requiredTier: required, currentTier: policy.tier};
};
```

A quota denial is also possible. Set `kind: "quota"` with `limit` and `used`, and
an optional `requiredTier` to offer an upgrade:

```ts
return {ok: false, kind: "quota", name, limit, used, requiredTier: "pro"};
```

## Presentation modes

Driven by the decision; selected via the `fallback` prop or the provider default.

| Mode       | When                             | Renders                                  |
|------------|----------------------------------|------------------------------------------|
| `hide`     | default for authz denials        | nothing                                  |
| `disable`  | opt-in                           | children disabled + reason tooltip       |
| `upgrade`  | remedy is `upgrade`              | one of the upgrade sub-variants          |
| `redirect` | route guards / `unauthenticated` | navigates (consumer-supplied navigation) |

**Upgrade sub-variants** (`variant`, or `presentation.upgrade.mode`): `teaser`
(blurred behind a lock + CTA), `replace` (swapped for an upgrade card), `badge`
(disabled + a "Pro" pill + tooltip CTA, the library default), `intercept`
(clickable; the click fires `onUpgrade`). An `upgrade` mode on a hard denial
falls back to `hide`, so you never upsell something the subject isn't authorized
for.

Override any slot (`Upgrade`, `Disabled`, `Pending`) on the provider's
`presentation` config or per gate.

## Typed names (optional)

Action and feature names default to `string`. Augment the registry to narrow
them and turn typos into compile errors:

```ts
declare module "@ethanhann/mantine-can" {
    interface Register {
        actions: "view" | "edit" | "delete";
        features: "pdf-export" | "bulk-actions";
    }
}
```

## A note on security

The gate is a **UX layer, never the security boundary**. A client-side `can()`
can be stale or bypassed; every gated action must still be enforced on the
server. The gate hides and disables to keep the UI honest. It does not protect
anything.

## Scripts

| Script                  | Purpose                                      |
|-------------------------|----------------------------------------------|
| `npm run dev`           | Storybook on port 6006                       |
| `npm run build`         | Library build (ESM + `.d.ts` + CSS) via Vite |
| `npm test`              | Vitest (watch)                               |
| `npm run test:run`      | Vitest (single run)                          |
| `npm run typecheck`     | `tsc --noEmit`                               |
| `npm run lint`          | Biome check                                  |
| `npm run format`        | Biome format (write)                         |
| `npm run test:coverage` | Vitest with coverage thresholds              |
| `npm run lint:package`  | publint (validate published package)         |
| `npm run check:exports` | attw (validate `.d.ts` resolution)           |
| `npm run check:package` | exports exist + headless tree-shake probe    |

## License

MIT
