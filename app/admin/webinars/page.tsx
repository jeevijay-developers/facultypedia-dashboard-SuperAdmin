"use client"

import { useState } from "react"
import { DataTable } from "@/components/admin/data-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, MoreHorizontal } from "lucide-react"

interface Webinar {
  id: string
  title: string
  educator: string
  subject: string
  date: string
  capacity: number
  enrolled: number
  fees: number
  status: string
}

const mockWebinars: Webinar[] = [
  {
    id: "1",
    title: "Advanced Integration Techniques",
    educator: "Dr. Rajesh Kumar",
    subject: "Mathematics",
    date: "2024-12-15",
    capacity: 500,
    enrolled: 380,
    fees: 499,
    status: "active",
  },
  {
    id: "2",
    title: "Quantum Physics Simplified",
    educator: "Prof. Priya Singh",
    subject: "Physics",
    date: "2024-12-20",
    capacity: 400,
    enrolled: 250,
    fees: 599,
    status: "active",
  },
]

export default function WebinarsPage() {
  const [webinars, setWebinars] = useState(mockWebinars)
  const [search, setSearch] = useState("")

  const filteredWebinars = webinars.filter(
    (webinar) =>
      webinar.title.toLowerCase().includes(search.toLowerCase()) ||
      webinar.educator.toLowerCase().includes(search.toLowerCase()),
  )

  const columns = [
    { key: "title", label: "Title", sortable: true },
    { key: "educator", label: "Educator", sortable: true },
    { key: "subject", label: "Subject", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "capacity", label: "Capacity", sortable: true },
    { key: "enrolled", label: "Enrolled", sortable: true },
    { key: "fees", label: "Fees", sortable: true, render: (v: number) => `₹${v}` },
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
          Webinars Management
        </h1>
        <p className="text-gray-600 mt-1">Manage all live webinars</p>
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
        <Button style={{ backgroundColor: "#AD49E1", color: "white" }}>Add Webinar</Button>
      </div>

      <DataTable data={filteredWebinars} columns={columns} />
    </div>
  )
}
