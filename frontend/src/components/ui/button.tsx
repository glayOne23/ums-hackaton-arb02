import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  // UI guide §7.1: every enabled button carries the brand colour; GREY MEANS DISABLED, nothing else.
  // Disabled = flat grey, no shadow (not a faded green), so it never looks like a normal button.
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:border-earth-300 disabled:bg-earth-200 disabled:text-earth-600 disabled:shadow-none aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(21_128_61/0.35)] hover:bg-leaf-700 active:bg-leaf-800",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        // UI guide §7.1: opens the confirmation dialog of a delete/void action
        "danger-outline":
          "border border-danger bg-card text-danger-text shadow-xs hover:bg-danger-soft",
        // Secondary action: green outline + green text on white (9:1), clearly clickable
        outline:
          "border border-leaf-600 bg-card text-leaf-800 shadow-xs hover:bg-leaf-50 active:bg-leaf-100",
        // Tonal: soft green fill for frequent, low-risk actions (row actions, filters)
        secondary: "bg-leaf-100 text-leaf-800 hover:bg-leaf-200 active:bg-leaf-200",
        // Text button: brand-coloured text (white inside the brand header via --link)
        ghost: "text-link hover:bg-accent active:bg-accent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // UI guide §7.1: 48 px on phones, 40 px on desktop
        default: "h-12 px-5 text-base has-[>svg]:px-4 sm:h-10 sm:px-4 sm:text-sm",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-md px-6 text-base has-[>svg]:px-4",
        // Row actions in office tables (tablet/desktop only; phones use cards)
        row: "h-10 gap-1.5 px-3 text-sm",
        // Full-width call-to-action pinned to the bottom of phone screens (56 px)
        cta: "h-14 w-full rounded-md px-6 text-base font-semibold",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
