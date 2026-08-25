import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "dropdown",
  startMonth = new Date(1970, 0),
  endMonth = new Date(2050, 11),
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      startMonth={startMonth}
      endMonth={endMonth}
      className={cn("p-3 select-none", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 relative",
        month_caption: "flex justify-center pt-1 relative items-center mb-1 h-9 px-8",
        caption_label: "text-xs font-bold text-foreground tracking-wide hidden",
        dropdowns: "flex items-center gap-1.5 justify-center z-10",
        dropdown: "bg-background text-foreground text-xs font-extrabold rounded-lg border border-border/80 px-2 py-1 focus:ring-1 focus:ring-primary focus:outline-none shadow-2xs cursor-pointer hover:border-primary/50 transition-all",
        dropdown_root: "relative flex items-center",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-muted absolute left-0 top-0 rounded-lg border-border z-10"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-muted absolute right-0 top-0 rounded-lg border-border z-10"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-8 font-medium text-[0.75rem] text-center",
        week: "flex w-full mt-1.5",
        day: "h-8 w-8 text-center text-xs p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-primary/15 hover:text-primary rounded-lg transition-all text-xs"
        ),
        range_end: "day-range-end",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-semibold shadow-xs",
        today: "bg-muted text-foreground font-bold border border-primary/30",
        outside:
          "day-outside text-muted-foreground opacity-40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-30 cursor-not-allowed hover:bg-transparent",
        range_middle:
          "aria-selected:bg-primary/10 aria-selected:text-primary rounded-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass, ...chevronProps }) => {
          if (orientation === "left") {
            return <ChevronLeft className={cn("h-4 w-4", chevronClass)} {...chevronProps} />
          }
          return <ChevronRight className={cn("h-4 w-4", chevronClass)} {...chevronProps} />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
