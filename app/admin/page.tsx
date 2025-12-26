"use client"

import { useEffect, useMemo, useState } from "react"
import { KPICard } from "@/components/admin/kpi-card"
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
} from "recharts"
import adminAPI from "@/util/server"

type DistributionEntry = { _id?: string; count?: number }

type AnalyticsResponse = {
  totals?: {
    revenue?: number
    educators?: number
    students?: number
    courses?: number
    webinars?: number
    tests?: number
    testSeries?: number
  }
  distributions?: {
    educatorsBySpecialization?: DistributionEntry[]
    studentsBySpecialization?: DistributionEntry[]
    studentsByClass?: DistributionEntry[]
  }
  recentActivity?: {
    educators?: number
    students?: number
    courses?: number
  }
}

const COLORS = ["#AD49E1", "#7B2FBE", "#2E073F", "#D891F0", "#5E8BF7", "#F6B73C"]

const formatNumber = (value?: number) => {
  if (value === undefined || value === null) return "—"
  return value.toLocaleString("en-IN")
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await adminAPI.analytics.getPlatformAnalytics()
        setAnalytics(data)
      } catch (err) {
        const status = (err as { status?: number })?.status

        if (status === 401) {
          adminAPI.auth.clearSession()
          setError("Automatic super-admin authentication failed. Verify credentials or run the super-admin seeder.")
        } else {
          const message = err instanceof Error ? err.message : "Failed to load analytics"
          setError(message)
        }
      } finally {
        setIsLoading(false)
      }
    }

    void loadAnalytics()
  }, [])

  const totals = analytics?.totals || {}

  const activityData = useMemo(
    () => [
      { name: "Educators", count: analytics?.recentActivity?.educators ?? 0 },
      { name: "Students", count: analytics?.recentActivity?.students ?? 0 },
      { name: "Courses", count: analytics?.recentActivity?.courses ?? 0 },
    ],
    [analytics?.recentActivity],
  )

  const pieData = useMemo(() => {
    const source = analytics?.distributions?.studentsByClass?.length
      ? analytics.distributions.studentsByClass
      : analytics?.distributions?.educatorsBySpecialization || []

    return source.map((item) => ({
      name: item._id || "Unknown",
      value: item.count ?? 0,
    }))
  }, [analytics?.distributions])

  const revenueValue = totals.revenue !== undefined ? `₹${formatNumber(totals.revenue)}` : "₹0"

  const kpis = [
    { label: "Revenue", value: revenueValue },
    { label: "Educators", value: formatNumber(totals.educators) },
    { label: "Students", value: formatNumber(totals.students) },
    { label: "Courses", value: formatNumber(totals.courses) },
    { label: "Webinars", value: formatNumber(totals.webinars) },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "#2E073F" }}>
          Dashboard
        </h1>
        <p className="text-gray-600 mt-1">Welcome back to Facultypedia Admin Panel</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} label={kpi.label} value={kpi.value} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#2E073F" }}>
            Recent activity (last 7 days)
          </h2>
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
                <Line type="monotone" dataKey="count" stroke="#AD49E1" strokeWidth={2} dot={{ fill: "#AD49E1" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#2E073F" }}>
            Distribution
          </h2>
          {isLoading ? (
            <p className="text-sm text-gray-600">Loading distribution...</p>
          ) : pieData.length === 0 ? (
            <p className="text-sm text-gray-600">No distribution data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" labelLine={false} outerRadius={80} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
