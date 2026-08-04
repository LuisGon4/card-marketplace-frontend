// Field-control styling and the hint-id convention shared by every labelled
// control in the app. Lives outside FormField.jsx because reactRefresh's
// allowConstantExport permits a const export like FIELD_CONTROL_CLASS
// alongside a component, but not a function declaration like hintIdFor —
// src/lib/listings.js's header gives the same reason for living outside a
// component file.

export const FIELD_CONTROL_CLASS =
  'w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'

export function hintIdFor(id) {
  return `${id}-hint`
}
