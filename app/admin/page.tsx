"use client"

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

const revenueData = [
  { month: "Jan", revenue: 45000 },
  { month: "Feb", revenue: 52000 },
  { month: "Mar", revenue: 48000 },
  { month: "Apr", revenue: 61000 },
  { month: "May", revenue: 55000 },
  { month: "Jun", revenue: 67000 },
]

const productData = [
  { name: "Courses", value: 45 },
  { name: "Tests", value: 25 },
  { name: "Webinars", value: 20 },
  { name: "Live Classes", value: 10 },
]

const COLORS = ["#AD49E1", "#7B2FBE", "#2E073F", "#D891F0"]

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "#2E073F" }}>
          Dashboard
        </h1>
        <p className="text-gray-600 mt-1">Welcome back to Facultypedia Admin Panel</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard label="Total Revenue" value="₹4,65,000" change="12% from last month" trend="up" />
        <KPICard label="Active Users" value="2,845" change="8% from last month" trend="up" />
        <KPICard label="Total Educators" value="342" change="2% from last month" trend="up" />
        <KPICard label="Active Courses" value="127" change="5% from last month" trend="down" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#2E073F" }}>
            Revenue Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #f0f0f0",
                  borderRadius: "8px",
                }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#AD49E1" strokeWidth={2} dot={{ fill: "#AD49E1" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#2E073F" }}>
            Revenue by Product
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={productData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {productData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
