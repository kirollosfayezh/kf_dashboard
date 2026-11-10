/**
 * Chart primitives for the Analytics and Overview screens. Import from
 * `@/components/charts`; see `scale.ts` for the colour and number rules.
 */
export { VIZ_1, VIZ_2, VIZ_3, VIZ_4, compact, shortDay } from "./scale";
export { ChartCard } from "./ChartCard";
export { TrendChart, TrendTable, MiniColumns, type TrendPoint } from "./trend";
export { RankedBars, RankTable, type RankRow } from "./ranked";
export { ScrollTable } from "./ScrollTable";
export { SourceShareBars, SourceShareTable, type SourceRow } from "./sources";
export { LineChart, Sparkline, type LineSeries, type LineRow } from "./lines";
export { WeekHeatmap, WeekHeatmapTable, busiestWindow, describeWindow, type HeatCell } from "./heatmap";
export { FunnelChart, FunnelTable, funnelRates, type FunnelStep } from "./funnel";
export { StackedColumns, bucketRows, type StackSeries, type StackRow } from "./stacked";
