"use client"

import { useState } from "react"
import { DataTable } from "@/components/admin/data-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, MoreHorizontal } from "lucide-react"

interface Student {
  id: string
  name: string
  email: string
  class: string
  specialization: string
  enrolledCourses: number
  avgTestScore: number
  status: string
  joinedAt: string
}

const mockStudents: Student[] = [
  {
    id: "1",
    name: "Arjun Malhotra",
    email: "arjun@example.com",
    class: "12th",
    specialization: "Science",
    enrolledCourses: 5,
    avgTestScore: 85,
    status: "active",
    joinedAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Priya Sharma",
    email: "priya@example.com",
    class: "11th",
    specialization: "Commerce",
    enrolledCourses: 3,
    avgTestScore: 78,
    status: "active",
    joinedAt: "2024-02-20",
  },
  {
    id: "3",
    name: "Vikram Singh",
    email: "vikram@example.com",
    class: "12th",
    specialization: "Science",
    enrolledCourses: 4,
    avgTestScore: 92,
    status: "inactive",
    joinedAt: "2024-01-10",
  },
]

export default function StudentsPage() {
  const [students, setStudents] = useState(mockStudents)
  const [search, setSearch] = useState("")

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.email.toLowerCase().includes(search.toLowerCase()),
  )

  const columns = [
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "class", label: "Class", sortable: true },
    { key: "specialization", label: "Specialization", sortable: true },
    { key: "enrolledCourses", label: "Courses", sortable: true },
    { key: "avgTestScore", label: "Avg Score", sortable: true },
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
          Students Management
        </h1>
        <p className="text-gray-600 mt-1">View and manage all student accounts</p>
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
        <Button style={{ backgroundColor: "#AD49E1", color: "white" }}>Add Student</Button>
      </div>

      <DataTable data={filteredStudents} columns={columns} />
    </div>
  )
}
