# Plugging into the family

`mantine-can` is the shared gate the rest of the family consults. nav's `visible`
predicate, dataview's column/row/bulk actions, and detail's Save/Delete all ask
the same question, may this subject do this, and this library answers it.
`mantine-can` depends on none of them; they optionally depend on it.

All three integrations read decisions through the hooks (`useCan` / `useGate` /
`useFeature`) or the components, so there's nothing gate-specific to learn per
library. Wrap your app once in `<CanProvider>` and the trio shares the snapshot.

## nav: `item.visible`

nav already exposes a `visible` predicate per item; that's the seam. Drive it
from `useCan`:

```tsx
const can = useCan("view", item);
const navItem = { ...item, visible: () => can.allowed };
```

nav's `PlanBadge` `showUpgrade` / `onUpgrade` becomes a consumer of the same
entitlement source. Point its upgrade affordance at `useFeature(name)` and the
provider's `onUpgrade`.

## dataview: columns, rows, bulk actions

Gate **column visibility** and **row / bulk actions** on `can(...)`:

```tsx
// hide a column unless the subject may see it
const columns = allColumns.filter((col) => useCan("view", col.field).allowed);

// gate a row action
<Can do="delete" on={row} fallback="disable">
  <DeleteButton row={row} />
</Can>
```

Because decisions are memoized per `(snapshotVersion, resource identity)`, an
N-rows × M-actions grid re-renders without re-running `authorize`. Keep
your `authorize` pure and let row identity stay stable.

## detail: Save / Delete and gated surfaces

Gate the record lifecycle actions on `can("update", record)` /
`can("delete", record)`, and put an entire edit surface behind a `feature(...)`:

```tsx
<Can do="update" on={record} fallback="disable">
  <SaveButton />
</Can>

<Can do="delete" on={record}>
  <DeleteButton />
</Can>

// gate a whole premium editor behind an entitlement
<Feature name="advanced-editor" fallback="upgrade">
  <AdvancedEditor record={record} />
</Feature>
```

## The discipline

The gate is a **UX layer, never the security boundary**. Every gated
action must still be enforced on the server; a client-side `can()` can be stale
or bypassed. The gate hides and disables to keep the UI honest; it does not
protect anything.
