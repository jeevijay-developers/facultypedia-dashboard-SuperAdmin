"use client"

import { KPICard } from "@/components/admin/kpi-card"
import { DataTable } from "@/components/admin/data-table"
import { Input } from "@/components/ui/input"
import { useState } from "react"
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
} from "recharts"

interface Transaction {
  id: string
  date: string
  student: string
  product: string
  productType: string
  amount: number
  status: string
  paymentId: string
}

const revenueByMonth = [
  { month: "Jan", revenue: 45000 },
  { month: "Feb", revenue: 52000 },
  { month: "Mar", revenue: 48000 },
  { month: "Apr", revenue: 61000 },
  { month: "May", revenue: 55000 },
  { month: "Jun", revenue: 67000 },
  { month: "Jul", revenue: 72000 },
  { month: "Aug", revenue: 68000 },
]

const revenueByType = [
  { type: "Courses", revenue: 185000 },
  { type: "Tests", revenue: 95000 },
  { type: "Webinars", revenue: 72000 },
  { type: "Live Classes", revenue: 48000 },
]

const revenueBySpecialization = [
  { name: "Science", value: 45 },
  { name: "Commerce", value: 30 },
  { name: "Arts", value: 15 },
  { name: "Engineering", value: 10 },
]

const mockTransactions: Transaction[] = [
  {
    id: "1",
    date: "2024-12-08",
    student: "Arjun Malhotra",
    product: "Complete Mathematics JEE Prep",
    productType: "Course",
    amount: 4999,
    status: "completed",
    paymentId: "PAY_001",
  },
  {
    id: "2",
    date: "2024-12-08",
    student: "Priya Sharma",
    product: "Physics Advanced Concepts",
    productType: "Course",
    amount: 3999,
    status: "completed",
    paymentId: "PAY_002",
  },
  {
    id: "3",
    date: "2024-12-07",
    student: "Vikram Singh",
    product: "Chemistry Complete Guide",
    productType: "Course",
    amount: 3999,
    status: "pending",
    paymentId: "PAY_003",
  },
]

const COLORS = ["#AD49E1", "#7B2FBE", "#2E073F", "#D891F0"]

export default function RevenuePage() {
  const [transactions, setTransactions] = useState(mockTransactions)
  const [search, setSearch] = useState("")

  const filteredTransactions = transactions.filter(
    (t) =>
      t.student.toLowerCase().includes(search.toLowerCase()) || t.product.toLowerCase().includes(search.toLowerCase()),
  )

  const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0)
  const completedRevenue = transactions.filter((t) => t.status === "completed").reduce((sum, t) => sum + t.amount, 0)
  const pendingRevenue = transactions.filter((t) => t.status === "pending").reduce((sum, t) => sum + t.amount, 0)

  const columns = [
    { key: "date", label: "Date", sortable: true },
    { key: "student", label: "Student", sortable: true },
    { key: "product", label: "Product", sortable: true },
    { key: "productType", label: "Type", sortable: true },
    { key: "amount", label: "Amount", sortable: true, render: (v: number) => `₹${v}` },
    {
      key: "status",
      label: "Status",
      render: (status: string) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {status}
        </span>
      ),
    },
  ] as const

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "#2E073F" }}>
          Revenue & Payments
        </h1>
        <p className="text-gray-600 mt-1">Monitor platform revenue and transaction details</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          label="Total Revenue"
          value={`₹${(totalRevenue / 100000).toFixed(1)}L`}
          change="18% from last month"
          trend="up"
        />
        <KPICard
          label="Completed Payments"
          value={`₹${(completedRevenue / 100000).toFixed(1)}L`}
          change="24 transactions"
          trend="up"
        />
        <KPICard
          label="Pending Payments"
          value={`₹${(pendingRevenue / 1000).toFixed(0)}K`}
          change="8 pending"
          trend="down"
        />
        <KPICard
          label="Avg Transaction"
          value={`₹${(totalRevenue / transactions.length).toFixed(0)}`}
          change="5% from last month"
          trend="up"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#2E073F" }}>
            Monthly Revenue Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueByMonth}>
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
            Revenue by Product Type
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="type" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #f0f0f0",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="revenue" fill="#AD49E1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#2E073F" }}>
            Recent Transactions
          </h2>
          <div className="mb-4">
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border-gray-200"
            />
          </div>
          <div className="overflow-x-auto">
            <DataTable data={filteredTransactions} columns={columns} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#2E073F" }}>
            Revenue by Specialization
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueBySpecialization}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {revenueBySpecialization.map((entry, index) => (
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
