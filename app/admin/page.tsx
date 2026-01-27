"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KPICard } from "@/components/admin/kpi-card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import adminAPI from "@/util/server";
import { DataTable } from "@/components/admin/data-table";

type DistributionEntry = { _id?: string; count?: number };

type Transaction = {
  id: string;
  date: string;
  studentName: string;
  productTitle: string;
  amount: number;
  status: string;
};

type AnalyticsResponse = {
  totals?: {
    revenue?: number;
    educators?: number;
    students?: number;
    courses?: number;
    webinars?: number;
    tests?: number;
    testSeries?: number;
  };
  distributions?: {
    educatorsBySpecialization?: DistributionEntry[];
    studentsBySpecialization?: DistributionEntry[];
    studentsByClass?: DistributionEntry[];
  };
  recentActivity?: {
    educators?: number;
    students?: number;
    courses?: number;
    range?: string;
  };
};

const COLORS = [
  "#AD49E1",
  "#7B2FBE",
  "#2E073F",
  "#D891F0",
  "#5E8BF7",
  "#F6B73C",
];

const formatNumber = (value?: number) => {
  if (value === undefined || value === null) return "—";
  return value.toLocaleString("en-IN");
};

const formatAmount = (value?: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const STATUS_COLORS: Record<string, string> = {
  succeeded: "bg-green-100 text-green-800",
  refunded: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  authorized: "bg-blue-100 text-blue-800",
  created: "bg-gray-100 text-gray-800",
  cancelled: "bg-gray-200 text-gray-700",
};

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityRange, setActivityRange] = useState<"7d" | "30d" | "1y">("7d");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isTxLoading, setIsTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await adminAPI.analytics.getPlatformAnalytics({
        range: activityRange,
      });
      setAnalytics(data);
    } catch (err) {
      // 401 errors are handled globally by AuthGuard
      const status = (err as { status?: number })?.status;
      if (status !== 401) {
        const message =
          err instanceof Error ? err.message : "Failed to load analytics";
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [activityRange]);

  const loadRecentTransactions = useCallback(async () => {
    setIsTxLoading(true);
    setTxError(null);

    try {
      const response = await adminAPI.revenue.getTransactions({
        status: "succeeded",
        limit: 5,
        page: 1,
      });
      const txData = response?.data ?? response ?? {};
      setTransactions(txData.transactions ?? []);
    } catch (err) {
      // 401 errors are handled globally by AuthGuard
      const status = (err as { status?: number })?.status;
      if (status !== 401) {
        const message =
          err instanceof Error ? err.message : "Failed to load transactions";
        setTxError(message);
      }
    } finally {
      setIsTxLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    void loadRecentTransactions();
  }, [loadRecentTransactions]);

  const totals = analytics?.totals || {};

  const activityData = useMemo(
    () => [
      { name: "Educators", count: analytics?.recentActivity?.educators ?? 0 },
      { name: "Students", count: analytics?.recentActivity?.students ?? 0 },
      { name: "Courses", count: analytics?.recentActivity?.courses ?? 0 },
    ],
    [analytics?.recentActivity]
  );

  const pieData = useMemo(() => {
    const source = analytics?.distributions?.studentsByClass?.length
      ? analytics.distributions.studentsByClass
      : analytics?.distributions?.educatorsBySpecialization || [];

    return source.map((item) => ({
      name: item._id || "Unknown",
      value: item.count ?? 0,
    }));
  }, [analytics?.distributions]);

  const revenueValue =
    totals.revenue !== undefined ? `₹${formatNumber(totals.revenue)}` : "₹0";

  const activityLabel = useMemo(() => {
    if (activityRange === "30d") return "last 30 days";
    if (activityRange === "1y") return "last 1 year";
    return "last 7 days";
  }, [activityRange]);

  const kpis = [
    { label: "Revenue", value: revenueValue },
    { label: "Educators", value: formatNumber(totals.educators) },
    { label: "Students", value: formatNumber(totals.students) },
    { label: "Courses", value: formatNumber(totals.courses) },
    { label: "Webinars", value: formatNumber(totals.webinars) },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "#2E073F" }}>
          Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Welcome back to Facultypedia Admin Panel
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} label={kpi.label} value={kpi.value} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: "#2E073F" }}
          >
            Recent activity ({activityLabel})
          </h2>
          <div className="mb-4 flex flex-wrap gap-2 text-sm text-gray-600">
            <label className="font-medium text-gray-700">Range:</label>
            <div className="flex gap-2">
              {[
                { label: "7d", value: "7d" },
                { label: "30d", value: "30d" },
                { label: "1y", value: "1y" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    activityRange === option.value
                      ? "border-[#AD49E1] bg-[#AD49E1]/10 text-[#2E073F]"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                  onClick={() =>
                    setActivityRange(option.value as typeof activityRange)
                  }
                  disabled={isLoading}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {isLoading ? (
            <p className="text-sm text-gray-600">Loading activity...</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#999" />
                <YAxis stroke="#999" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #f0f0f0",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#AD49E1"
                  strokeWidth={2}
                  dot={{ fill: "#AD49E1" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: "#2E073F" }}
          >
            Distribution
          </h2>
          {isLoading ? (
            <p className="text-sm text-gray-600">Loading distribution...</p>
          ) : pieData.length === 0 ? (
            <p className="text-sm text-gray-600">
              No distribution data available yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h2 className="text-lg font-semibold" style={{ color: "#2E073F" }}>
              Recent Transactions
            </h2>
            <span className="text-sm text-gray-500">
              Showing latest 5 succeeded payments
            </span>
          </div>

          {txError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
              {txError}
            </div>
          )}

          <div className="overflow-x-auto">
            <DataTable
              data={transactions}
              isLoading={isTxLoading}
              columns={[
                {
                  key: "date" as const,
                  label: "Date",
                  render: (value: string) =>
                    value ? new Date(value).toLocaleDateString() : "—",
                },
                { key: "studentName" as const, label: "Student" },
                { key: "productTitle" as const, label: "Product" },
                {
                  key: "amount" as const,
                  label: "Amount",
                  render: (v: number) => formatAmount(v),
                },
                {
                  key: "status" as const,
                  label: "Status",
                  render: (status: string) => (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLORS[status] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {status}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
