"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KPICard } from "@/components/admin/kpi-card";
import { DataTable } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { Input } from "@/components/ui/input";
import adminAPI from "@/util/server";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type RevenueSummary = {
  totalRevenue: number;
  totalRefunded: number;
  totalFailed: number;
  totalTransactions: number;
};

type MonthlyPoint = {
  year: number;
  month: number;
  revenue: number;
};

type TypePoint = {
  type: string;
  revenue: number;
};

type Transaction = {
  id: string;
  date: string;
  studentName: string;
  studentEmail: string;
  productTitle: string;
  productType: string;
  amount: number;
  status: string;
  paymentId?: string;
  orderId?: string;
  receipt?: string;
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  course: "Course",
  testSeries: "Test Series",
  webinar: "Webinar",
  test: "Test",
  liveClass: "Live Class",
};

const STATUS_COLORS: Record<string, string> = {
  succeeded: "bg-green-100 text-green-800",
  refunded: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  authorized: "bg-blue-100 text-blue-800",
  created: "bg-gray-100 text-gray-800",
  cancelled: "bg-gray-200 text-gray-700",
};

const formatAmount = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const monthLabel = (m: number) =>
  [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][m - 1] || `${m}`;

export default function RevenuePage() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyPoint[]>([]);
  const [byType, setByType] = useState<TypePoint[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<{
    currentPage: number;
    totalPages: number;
  }>({
    currentPage: 1,
    totalPages: 1,
  });
  const [statusFilter, setStatusFilter] = useState<string>("succeeded");
  const [productTypeFilter, setProductTypeFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadRevenue = useCallback(
    async (targetPage = page) => {
      setIsLoading(true);
      setError(null);

      try {
        const query = {
          status: statusFilter || undefined,
          productType: productTypeFilter || undefined,
          search: debouncedSearch || undefined,
        };

        const [summaryRes, monthlyRes, typeRes, txRes] = await Promise.all([
          adminAPI.revenue.getSummary(query),
          adminAPI.revenue.getByMonth(query),
          adminAPI.revenue.getByType(query),
          adminAPI.revenue.getTransactions({
            ...query,
            page: targetPage,
            limit: 10,
          }),
        ]);

        setSummary(summaryRes?.data ?? summaryRes ?? null);
        setMonthly(monthlyRes?.data ?? monthlyRes ?? []);
        setByType(typeRes?.data ?? typeRes ?? []);

        const txData = txRes?.data ?? txRes ?? {};
        setTransactions(txData.transactions ?? []);
        setPagination({
          currentPage: txData.pagination?.currentPage || targetPage,
          totalPages: txData.pagination?.totalPages || 1,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load revenue";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch, productTypeFilter, statusFilter]
  );

  useEffect(() => {
    setPage(1);
    void loadRevenue(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, productTypeFilter, statusFilter]);

  useEffect(() => {
    void loadRevenue(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const columns = useMemo(
    () => [
      {
        key: "date" as const,
        label: "Date",
        sortable: true,
        render: (value: string) =>
          value ? new Date(value).toLocaleDateString() : "—",
      },
      { key: "studentName" as const, label: "Student", sortable: true },
      { key: "productTitle" as const, label: "Product", sortable: true },
      {
        key: "productType" as const,
        label: "Type",
        sortable: true,
        render: (v: string) => PRODUCT_TYPE_LABELS[v] || v,
      },
      {
        key: "amount" as const,
        label: "Amount",
        sortable: true,
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
      {
        key: "paymentId" as const,
        label: "Payment Id",
        render: (v: string) => v || "—",
      },
    ],
    []
  );

  const kpiData = useMemo(() => {
    if (!summary) {
      return [
        { label: "Total Revenue", value: "—" },
        { label: "Refunded", value: "—" },
        { label: "Failed", value: "—" },
        { label: "Total Transactions", value: "—" },
      ];
    }

    const avg = summary.totalTransactions
      ? summary.totalRevenue / summary.totalTransactions
      : 0;

    return [
      { label: "Total Revenue", value: formatAmount(summary.totalRevenue) },
      { label: "Refunded", value: formatAmount(summary.totalRefunded) },
      { label: "Failed", value: formatAmount(summary.totalFailed) },
      { label: "Avg Transaction", value: formatAmount(avg) },
    ];
  }, [summary]);

  const monthlyChartData = useMemo(
    () =>
      (monthly || []).map((item) => ({
        month: `${monthLabel(item.month)} ${item.year}`,
        revenue: item.revenue,
      })),
    [monthly]
  );

  const typeChartData = useMemo(
    () =>
      (byType || []).map((t) => ({
        name: PRODUCT_TYPE_LABELS[t.type] || t.type,
        value: t.revenue,
      })),
    [byType]
  );

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#2E073F" }}>
            Revenue & Payments
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor platform revenue and transaction details
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select
            className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="succeeded">Succeeded</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="authorized">Authorized</option>
            <option value="all">All statuses</option>
          </select>

          <select
            className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={productTypeFilter}
            onChange={(e) => {
              setProductTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All products</option>
            <option value="course">Course</option>
            <option value="testSeries">Test Series</option>
            <option value="webinar">Webinar</option>
            <option value="test">Test</option>
            <option value="liveClass">Live Class</option>
          </select>

          <Input
            placeholder="Search name, product, receipt..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-64 border-gray-200"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiData.map((kpi) => (
          <KPICard key={kpi.label} label={kpi.label} value={kpi.value} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: "#2E073F" }}
          >
            Monthly Revenue Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #f0f0f0",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => formatAmount(value)}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#AD49E1"
                strokeWidth={2}
                dot={{ fill: "#AD49E1" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: "#2E073F" }}
          >
            Revenue by Product Type
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={typeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #f0f0f0",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => formatAmount(value)}
              />
              <Bar dataKey="value" fill="#AD49E1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: "#2E073F" }}
          >
            Recent Transactions
          </h2>
          <div className="overflow-x-auto max-h-105">
            <DataTable
              data={transactions}
              columns={columns}
              isLoading={isLoading}
            />
          </div>
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={(next) => setPage(next)}
            isLoading={isLoading}
          />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: "#2E073F" }}
          >
            Revenue Share by Type
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={typeChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {typeChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      ["#AD49E1", "#7B2FBE", "#2E073F", "#D891F0", "#5E8BF7"][
                        index % 5
                      ]
                    }
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatAmount(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
