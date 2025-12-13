"use client"

import { useState } from "react"
import { DataTable } from "@/components/admin/data-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, MoreHorizontal } from "lucide-react"

interface Course {
  id: string
  title: string
  educator: string
  subject: string
  enrolled: number
  fees: number
  rating: number
  status: string
}

const mockCourses: Course[] = [
  {
    id: "1",
    title: "Complete Mathematics JEE Prep",
    educator: "Dr. Rajesh Kumar",
    subject: "Mathematics",
    enrolled: 450,
    fees: 4999,
    rating: 4.8,
    status: "active",
  },
  {
    id: "2",
    title: "Physics Advanced Concepts",
    educator: "Prof. Priya Singh",
    subject: "Physics",
    enrolled: 320,
    fees: 3999,
    rating: 4.6,
    status: "active",
  },
  {
    id: "3",
    title: "Chemistry Complete Guide",
    educator: "Dr. Amit Patel",
    subject: "Chemistry",
    enrolled: 280,
    fees: 3999,
    rating: 4.5,
    status: "inactive",
  },
]

export default function CoursesPage() {
  const [courses, setCourses] = useState(mockCourses)
  const [search, setSearch] = useState("")

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(search.toLowerCase()) ||
      course.educator.toLowerCase().includes(search.toLowerCase()),
  )

  const columns = [
    { key: "title", label: "Title", sortable: true },
    { key: "educator", label: "Educator", sortable: true },
    { key: "subject", label: "Subject", sortable: true },
    { key: "enrolled", label: "Enrolled", sortable: true },
    { key: "fees", label: "Fees", sortable: true, render: (v: number) => `₹${v}` },
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
          Courses Management
        </h1>
        <p className="text-gray-600 mt-1">Manage all courses available on the platform</p>
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
        <Button style={{ backgroundColor: "#AD49E1", color: "white" }}>Add Course</Button>
      </div>

      <DataTable data={filteredCourses} columns={columns} />
    </div>
  )
}
