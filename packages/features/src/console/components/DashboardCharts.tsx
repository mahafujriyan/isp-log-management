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
  Title,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
};

export function DiskChart({ usedGb = 0, totalGb = 0 }: { usedGb?: number; totalGb?: number }) {
  const free = Math.max(totalGb - usedGb, 0);
  const hasData = totalGb > 0;
  return (
    <Doughnut
      data={{
        labels: hasData ? ["Used", "Free"] : ["No disk metrics"],
        datasets: [
          {
            data: hasData ? [usedGb, free] : [1],
            backgroundColor: hasData ? ["#1976D2", "#E3F2FD"] : ["#E2E8F0"],
            borderWidth: 0,
          },
        ],
      }}
      options={{ ...chartOptions, cutout: "72%" }}
    />
  );
}

export function HourlyLogsChart({ data }: { data: number[] }) {
  const labels = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, "0")
  );
  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label: "Logs",
            data,
            backgroundColor: "#42A5F5",
            borderRadius: 3,
          },
        ],
      }}
      options={{
        ...chartOptions,
        scales: {
          x: { ticks: { font: { size: 9 }, maxTicksLimit: 8 } },
          y: { ticks: { font: { size: 9 } } },
        },
      }}
    />
  );
}

export function PortPieChart({
  data,
}: {
  data: { https: number; http: number; p8080: number; p9998: number; dns: number; other: number };
}) {
  return (
    <Pie
      data={{
        labels: ["443 HTTPS", "80 HTTP", "8080", "9998", "53 DNS", "Other"],
        datasets: [
          {
            data: [data.https, data.http, data.p8080, data.p9998, data.dns, data.other],
            backgroundColor: [
              "#1976D2",
              "#43A047",
              "#F57F17",
              "#8E24AA",
              "#0097A7",
              "#9E9E9E",
            ],
            borderWidth: 0,
          },
        ],
      }}
      options={chartOptions}
    />
  );
}

export function SystemChart() {
  const labels = Array.from({ length: 20 }, (_, i) => i);
  const empty = Array.from({ length: 20 }, () => 0);
  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label: "CPU %",
            data: empty,
            borderColor: "#E65100",
            borderWidth: 1.5,
            tension: 0.4,
            pointRadius: 0,
          },
          {
            label: "RAM %",
            data: empty,
            borderColor: "#1976D2",
            borderWidth: 1.5,
            tension: 0.4,
            pointRadius: 0,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { font: { size: 10 }, boxWidth: 10 } },
        },
        scales: {
          x: { display: false },
          y: { min: 0, max: 100, ticks: { font: { size: 9 } } },
        },
      }}
    />
  );
}
