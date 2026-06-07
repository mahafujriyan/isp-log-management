"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import type { ChartType, MetricChartPoint } from "@/types/metrics.types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

interface DynamicChartProps {
  title: string;
  type: ChartType;
  data: MetricChartPoint[];
  color: string;
  unit: string;
  size?: "small" | "medium" | "large";
}

const heightMap = {
  small: 180,
  medium: 240,
  large: 320,
};

export function DynamicChart({
  title,
  type,
  data,
  color,
  unit,
  size = "medium",
}: DynamicChartProps) {
  const labels = data.map((d) => d.name);
  const values = data.map((d) => d.value);
  const height = heightMap[size];

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: type === "pie" },
    },
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#E2E8F0]/80 bg-white p-4 shadow-sm shadow-slate-200/40">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-semibold text-[#0F172A]">{title}</h3>
          <p className="text-[10px] uppercase tracking-wide text-[#94A3B8]">{unit}</p>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium capitalize text-white"
          style={{ backgroundColor: color }}
        >
          {type}
        </span>
      </div>
      <div style={{ height }} className="relative min-h-0 flex-1">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[#94A3B8]">
            No data for this range
          </div>
        ) : type === "line" ? (
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: title,
                  data: values,
                  borderColor: color,
                  backgroundColor: `${color}33`,
                  fill: true,
                  tension: 0.35,
                  pointRadius: 2,
                },
              ],
            }}
            options={{
              ...baseOptions,
              scales: {
                x: { ticks: { font: { size: 9 }, maxTicksLimit: 8 } },
                y: { ticks: { font: { size: 9 } } },
              },
            }}
          />
        ) : type === "bar" ? (
          <Bar
            data={{
              labels,
              datasets: [{ label: title, data: values, backgroundColor: color, borderRadius: 4 }],
            }}
            options={{
              ...baseOptions,
              scales: {
                x: { ticks: { font: { size: 9 }, maxRotation: 45, minRotation: 0 } },
                y: { ticks: { font: { size: 9 } } },
              },
            }}
          />
        ) : (
          <Doughnut
            data={{
              labels,
              datasets: [
                {
                  data: values,
                  backgroundColor: [
                    color,
                    "#10B981",
                    "#F59E0B",
                    "#8B5CF6",
                    "#EC4899",
                    "#EF4444",
                    "#6366F1",
                  ],
                  borderWidth: 0,
                },
              ],
            }}
            options={{ ...baseOptions, cutout: "55%" }}
          />
        )}
      </div>
    </div>
  );
}
