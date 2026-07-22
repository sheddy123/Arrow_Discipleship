"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ReadonlyArray<string | ComboboxOption>
  value: string
  onValueChange: (value: string) => void
  id?: string
  placeholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
}

function normalize(o: string | ComboboxOption): ComboboxOption {
  return typeof o === "string" ? { value: o, label: o } : o
}

/**
 * A single-select dropdown with type-to-filter search, built on Base UI's
 * Combobox. Drop-in replacement for a native <select>. Accepts plain string
 * options or `{ value, label }` objects (e.g. an id with a display name).
 */
export function Combobox({
  options,
  value,
  onValueChange,
  id,
  placeholder = "Select…",
  emptyText = "No matches found.",
  className,
  disabled,
}: ComboboxProps) {
  const items = React.useMemo(() => options.map(normalize), [options])
  const selected = items.find((i) => i.value === value) ?? null

  return (
    <ComboboxPrimitive.Root
      items={items}
      value={selected as unknown as ComboboxOption}
      onValueChange={(v) => onValueChange((v as ComboboxOption | null)?.value ?? "")}
      isItemEqualToValue={(a: ComboboxOption, b: ComboboxOption) => a?.value === b?.value}
      disabled={disabled}
    >
      <div className={cn("relative", className)}>
        <ComboboxPrimitive.Input
          id={id}
          placeholder={placeholder}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
        />
        <ComboboxPrimitive.Trigger
          aria-label="Toggle options"
          className="absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground outline-none disabled:opacity-50"
        >
          <ComboboxPrimitive.Icon render={<ChevronsUpDown className="size-4" />} />
        </ComboboxPrimitive.Trigger>
      </div>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner sideOffset={4} className="isolate z-50">
          <ComboboxPrimitive.Popup data-slot="combobox-content" className="max-h-[min(24rem,var(--available-height))] w-(--anchor-width) origin-(--transform-origin) overflow-y-auto overflow-x-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <ComboboxPrimitive.Empty className="px-2.5 py-2 text-sm text-muted-foreground">
              {emptyText}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List>
              {(item: ComboboxOption) => (
                <ComboboxPrimitive.Item
                  key={item.value}
                  value={item}
                  className="relative flex cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <ComboboxPrimitive.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                    <Check className="size-4" />
                  </ComboboxPrimitive.ItemIndicator>
                  {item.label}
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  )
}
