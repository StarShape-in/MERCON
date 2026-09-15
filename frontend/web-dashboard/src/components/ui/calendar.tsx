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
      className={cn("p-1 select-none w-fit mx-auto", className)}
      classNames={{
        months: "flex flex-col space-y-3 w-full",
        month: "space-y-3 relative w-full",
        month_caption: "flex justify-center items-center h-8 relative px-8 mb-2 w-full",
        caption_label: "text-xs font-bold text-foreground tracking-wide hidden",
        dropdowns: "flex items-center gap-1.5 justify-center z-10",
        dropdown: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 focus:ring-2 focus:ring-[#FA634E]/30 focus:outline-none shadow-2xs cursor-pointer hover:border-[#FA634E]/50 transition-all",
        dropdown_root: "relative flex items-center",
        nav: "flex items-center justify-between w-full absolute top-0.5 left-0 right-0 px-1 pointer-events-none z-20",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-white dark:bg-slate-800 p-0 text-slate-600 dark:text-slate-300 hover:text-[#FA634E] hover:bg-orange-50 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs pointer-events-auto transition-all flex items-center justify-center"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-white dark:bg-slate-800 p-0 text-slate-600 dark:text-slate-300 hover:text-[#FA634E] hover:bg-orange-50 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs pointer-events-auto transition-all flex items-center justify-center"
        ),
        month_grid: "w-full border-collapse space-y-1 mx-auto",
        weekdays: "flex justify-between w-full border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-1",
        weekday: "text-slate-400 dark:text-slate-500 rounded-md w-9 font-bold text-[11px] text-center uppercase tracking-wider",
        week: "flex w-full justify-between mt-1",
        day: "h-9 w-9 text-center text-xs p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-lg [&:has([aria-selected].day-outside)]:bg-orange-50/50 [&:has([aria-selected])]:bg-orange-50 dark:[&:has([aria-selected])]:bg-orange-950/40 first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-medium aria-selected:opacity-100 hover:bg-[#FA634E]/15 hover:text-[#FA634E] rounded-lg transition-all text-xs flex items-center justify-center"
        ),
        range_end: "day-range-end",
        selected:
          "!bg-[#FA634E] !text-white hover:!bg-[#e5533e] hover:!text-white focus:!bg-[#FA634E] focus:!text-white font-black shadow-xs",
        today: "bg-slate-100 dark:bg-slate-800 text-[#FA634E] font-black border border-[#FA634E]/40",
        outside:
          "day-outside text-slate-300 dark:text-slate-600 opacity-40 aria-selected:bg-orange-50/30 aria-selected:text-slate-400 aria-selected:opacity-30",
        disabled: "text-slate-300 dark:text-slate-700 opacity-30 cursor-not-allowed hover:bg-transparent",
        range_middle:
          "aria-selected:!bg-orange-100/70 dark:aria-selected:!bg-orange-950/60 aria-selected:!text-[#FA634E] font-bold rounded-none",
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
