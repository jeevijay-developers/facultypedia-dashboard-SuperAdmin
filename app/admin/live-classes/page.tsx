"use client"

import { useState } from "react"
import { DataTable } from "@/components/admin/data-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, MoreHorizontal } from "lucide-react"

interface LiveClass {
  id: string
  title: string
  educator: string
  subject: string
  date: string
  maxStudents: number
  enrolled: number
  duration: number
  status: string
}

const mockLiveClasses: LiveClass[] = [
  {
    id: "1",
    title: "Derivatives & Integration",
    educator: "Dr. Rajesh Kumar",
    subject: "Mathematics",
    date: "2024-12-10",
    maxStudents: 100,
    enrolled: 85,
    duration: 90,
    status: "completed",
  },
  {
    id: "2",
    title: "Motion & Forces",
    educator: "Prof. Priya Singh",
    subject: "Physics",
    date: "2024-12-18",
    maxStudents: 120,
    enrolled: 102,
    duration: 75,
    status: "upcoming",
  },
]

export default function LiveClassesPage() {
  const [classes, setClasses] = useState(mockLiveClasses)
  const [search, setSearch] = useState("")

  const filteredClasses = classes.filter(
    (liveClass) =>
      liveClass.title.toLowerCase().includes(search.toLowerCase()) ||
      liveClass.educator.toLowerCase().includes(search.toLowerCase()),
  )

  const columns = [
    { key: "title", label: "Title", sortable: true },
    { key: "educator", label: "Educator", sortable: true },
    { key: "subject", label: "Subject", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "duration", label: "Duration (min)", sortable: true },
    { key: "maxStudents", label: "Capacity", sortable: true },
    { key: "enrolled", label: "Enrolled", sortable: true },
    {
      key: "status",
      label: "Status",
      render: (status: string) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            status === "upcoming"
              ? "bg-blue-100 text-blue-800"
              : status === "completed"
                ? "bg-gray-100 text-gray-800"
                : "bg-green-100 text-green-800"
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
          Live Classes Management
        </h1>
        <p className="text-gray-600 mt-1">Manage all live classes</p>
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
        <Button style={{ backgroundColor: "#AD49E1", color: "white" }}>Add Live Class</Button>
      </div>

      <DataTable data={filteredClasses} columns={columns} />
    </div>
  )
}
