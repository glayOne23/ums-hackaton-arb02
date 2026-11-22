import type { ReactNode } from 'react'

/**
 * Row actions in office tables (UI guide §7.4): Detail · Ubah · Hapus, always visible
 * so nobody has to guess that a name is clickable.
 *
 * Wide screens (≥ 1536 px) show icon + label. Narrower laptops and tablets show
 * square icon buttons (40 px) with a tooltip and an aria-label, so the table keeps
 * room for the data. Phones never see this: tables become cards there.
 */
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-2 whitespace-nowrap">{children}</div>
}

/** Classes for a Button with size="row" inside RowActions: square below 2xl. */
export const ROW_ACTION = 'max-2xl:w-10 max-2xl:px-0'

/** The text of a row action: hidden below 2xl (the button keeps its aria-label and title). */
export function RowActionLabel({ children }: { children: ReactNode }) {
  return <span className="hidden 2xl:inline">{children}</span>
}

/** Header cell content of the actions column. */
export function RowActionsHeader() {
  return <span className="block text-right">Aksi</span>
}
