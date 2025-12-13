"use client"

import { useState } from "react"
import { DataTable } from "@/components/admin/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, MoreHorizontal } from "lucide-react"

interface Educator {
  id: string
  name: string
  username: string
  email: string
  specialization: string
  rating: number
  status: string
  totalCourses: number
  totalStudents: number
}

const mockEducators: Educator[] = [
  {
    id: "1",
    name: "Dr. Rajesh Kumar",
    username: "dr_rajesh",
    email: "rajesh@facultypedia.com",
    specialization: "Mathematics",
    rating: 4.8,
    status: "active",
    totalCourses: 12,
    totalStudents: 2450,
  },
  {
    id: "2",
    name: "Prof. Priya Singh",
    username: "prof_priya",
    email: "priya@facultypedia.com",
    specialization: "Physics",
    rating: 4.6,
    status: "active",
    totalCourses: 8,
    totalStudents: 1820,
  },
  {
    id: "3",
    name: "Dr. Amit Patel",
    username: "dr_amit",
    email: "amit@facultypedia.com",
    specialization: "Chemistry",
    rating: 4.5,
    status: "inactive",
    totalCourses: 5,
    totalStudents: 980,
  },
]

export default function EducatorsPage() {
  const [educators, setEducators] = useState<Educator[]>(mockEducators)
  const [search, setSearch] = useState("")

  const filteredEducators = educators.filter(
    (edu) =>
      edu.name.toLowerCase().includes(search.toLowerCase()) || edu.email.toLowerCase().includes(search.toLowerCase()),
  )

  const columns = [
    { key: "name" as const, label: "Name", sortable: true },
    { key: "email" as const, label: "Email", sortable: true },
    { key: "specialization" as const, label: "Specialization", sortable: true },
    { key: "rating" as const, label: "Rating", sortable: true },
    { key: "totalCourses" as const, label: "Courses", sortable: true },
    { key: "totalStudents" as const, label: "Students", sortable: true },
    {
      key: "status" as const,
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
      key: "id" as const,
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
          Educators Management
        </h1>
        <p className="text-gray-600 mt-1">Manage and monitor all educators on the platform</p>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border-gray-200"
          />
        </div>
        <Button style={{ backgroundColor: "#AD49E1", color: "white" }}>Add Educator</Button>
      </div>

      <DataTable data={filteredEducators} columns={columns as any} />
    </div>
  )
}
