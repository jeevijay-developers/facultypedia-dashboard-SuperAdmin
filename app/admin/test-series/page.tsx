"use client"

import { useState } from "react"
import { DataTable } from "@/components/admin/data-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, MoreHorizontal } from "lucide-react"

interface TestSeries {
  id: string
  title: string
  educator: string
  tests: number
  price: number
  validity: string
  enrolled: number
  rating: number
  status: string
}

const mockTestSeries: TestSeries[] = [
  {
    id: "1",
    title: "Complete JEE Main Series",
    educator: "Dr. Rajesh Kumar",
    tests: 15,
    price: 2999,
    validity: "180 days",
    enrolled: 2100,
    rating: 4.7,
    status: "active",
  },
  {
    id: "2",
    title: "Physics Master Series",
    educator: "Prof. Priya Singh",
    tests: 12,
    price: 1999,
    validity: "120 days",
    enrolled: 1250,
    rating: 4.6,
    status: "active",
  },
]

export default function TestSeriesPage() {
  const [series, setSeries] = useState(mockTestSeries)
  const [search, setSearch] = useState("")

  const filteredSeries = series.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.educator.toLowerCase().includes(search.toLowerCase()),
  )

  const columns = [
    { key: "title", label: "Title", sortable: true },
    { key: "educator", label: "Educator", sortable: true },
    { key: "tests", label: "Tests", sortable: true },
    { key: "price", label: "Price", sortable: true, render: (v: number) => `₹${v}` },
    { key: "validity", label: "Validity", sortable: true },
    { key: "enrolled", label: "Enrolled", sortable: true },
    { key: "rating", label: "Rating", sortable: true },
    {
      key: "status",
      label: "Status",
      render: (status: string) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {status}
        </span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      render: () => (
        <div className="flex gap-2">
          <button className="p-1 hover:bg-gray-100 rounded">
            <Eye className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded">
            <MoreHorizontal className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      ),
    },
  ] as const

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "#2E073F" }}>
          Test Series Management
        </h1>
        <p className="text-gray-600 mt-1">Manage all test series available</p>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by title or educator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border-gray-200"
          />
        </div>
        <Button style={{ backgroundColor: "#AD49E1", color: "white" }}>Add Test Series</Button>
      </div>

      <DataTable data={filteredSeries} columns={columns} />
    </div>
  )
}
