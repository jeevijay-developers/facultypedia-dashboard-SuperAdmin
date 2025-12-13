"use client"

import { useState } from "react"
import { DataTable } from "@/components/admin/data-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, MoreHorizontal } from "lucide-react"

interface Test {
  id: string
  title: string
  subject: string
  duration: number
  totalMarks: number
  questions: number
  enrolled: number
  status: string
}

const mockTests: Test[] = [
  {
    id: "1",
    title: "Mathematics Mock Test 1",
    subject: "Mathematics",
    duration: 180,
    totalMarks: 100,
    questions: 30,
    enrolled: 1200,
    status: "active",
  },
  {
    id: "2",
    title: "Physics Pre-Board Exam",
    subject: "Physics",
    duration: 150,
    totalMarks: 80,
    questions: 25,
    enrolled: 850,
    status: "active",
  },
  {
    id: "3",
    title: "Chemistry Advanced Test",
    subject: "Chemistry",
    duration: 120,
    totalMarks: 60,
    questions: 20,
    enrolled: 450,
    status: "inactive",
  },
]

export default function TestsPage() {
  const [tests, setTests] = useState(mockTests)
  const [search, setSearch] = useState("")

  const filteredTests = tests.filter(
    (test) =>
      test.title.toLowerCase().includes(search.toLowerCase()) ||
      test.subject.toLowerCase().includes(search.toLowerCase()),
  )

  const columns = [
    { key: "title", label: "Title", sortable: true },
    { key: "subject", label: "Subject", sortable: true },
    { key: "duration", label: "Duration (min)", sortable: true },
    { key: "totalMarks", label: "Marks", sortable: true },
    { key: "questions", label: "Questions", sortable: true },
    { key: "enrolled", label: "Enrolled", sortable: true },
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
          Tests Management
        </h1>
        <p className="text-gray-600 mt-1">Manage all tests and mock exams</p>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by title or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border-gray-200"
          />
        </div>
        <Button style={{ backgroundColor: "#AD49E1", color: "white" }}>Add Test</Button>
      </div>

      <DataTable data={filteredTests} columns={columns} />
    </div>
  )
}
