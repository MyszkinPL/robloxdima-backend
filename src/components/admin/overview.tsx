"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  revenue: {
    label: "Выручка",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function Overview({ data }: { data: { month: string; revenue: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full sm:h-[260px] lg:h-[280px]">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={8} />
      </BarChart>
    </ChartContainer>
  )
}
