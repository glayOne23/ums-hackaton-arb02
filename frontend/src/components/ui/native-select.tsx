import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Native <select> styled like Input. Used for lists longer than 5 options
 * (UI guide §7.5); shorter lists use buttons instead. Native keeps the phone's
 * own picker, which is easier for non-technical users than a custom popover.
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative w-full">
      <select
        data-slot="native-select"
        className={cn(
          "h-12 w-full min-w-0 appearance-none rounded-md border border-input bg-card py-1 pr-10 pl-3 text-base sm:h-10 shadow-xs transition-[color,box-shadow] outline-none hover:border-leaf-600 disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-dashed disabled:border-earth-300 disabled:bg-muted disabled:text-muted-foreground",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-leaf-700" aria-hidden />
    </div>
  )
}

export { NativeSelect }
