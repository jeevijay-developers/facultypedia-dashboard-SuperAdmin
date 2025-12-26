"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { DataTable } from "@/components/admin/data-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, RefreshCw } from "lucide-react"
import adminAPI from "@/util/server"

type TableStudent = {
  id: string
  name: string
  email: string
  class: string
  specialization: string
  specializationList: string[]
  enrolledCourses: number
  status: string
  joinedAt?: string | null
}

type PaginationMeta = {
  currentPage: number
  totalPages: number
  totalStudents: number
  hasNextPage?: boolean
  hasPrevPage?: boolean
}

export default function StudentsPage() {
  const [students, setStudents] = useState<TableStudent[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [classFilter, setClassFilter] = useState<string>("")
  const [examFilter, setExamFilter] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizeStudent = useCallback((student: any): TableStudent | null => {
    const id = student?.id ?? student?._id
    if (!id) {
      return null
    }

    const specializationList = Array.isArray(student?.specialization)
      ? student.specialization.filter(Boolean)
      : student?.specialization
        ? [student.specialization]
        : []

    const specialization = specializationList.length
      ? specializationList.join(", ")
      : "—"

    const enrolledCourses = Number.isFinite(Number(student?.enrolledCourses))
      ? Number(student.enrolledCourses)
      : Array.isArray(student?.courses)
        ? student.courses.length
        : 0

    const isActive = student?.status
      ? student.status
      : student?.isActive === false
        ? "inactive"
        : "active"

    return {
      id: String(id),
      name: student?.name || student?.fullName || "Unknown",
      email: student?.email || "—",
      class: student?.class || student?.grade || "—",
      specialization,
      specializationList,
      enrolledCourses,
      status: isActive,
      joinedAt: student?.joinedAt || student?.createdAt || null,
    }
  }, [])

  const loadStudents = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await adminAPI.students.list({ limit: 100 })
      const rawStudents = response?.students ?? response ?? []
      const mapped = Array.isArray(rawStudents)
        ? rawStudents
            .map(normalizeStudent)
            .filter((item): item is TableStudent => Boolean(item))
        : []

      setStudents(mapped)
      setPagination(response?.pagination ?? null)
    } catch (err) {
      const status = (err as { status?: number })?.status

      if (status === 401) {
        adminAPI.auth.clearSession()
        setError(
          "Automatic super-admin authentication failed. Confirm the configured credentials match your backend or run the super admin seeder.",
        )
        return
      }

      const message = err instanceof Error ? err.message : "Failed to load students"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [normalizeStudent])

  useEffect(() => {
    void loadStudents()
  }, [loadStudents])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  const classOptions = useMemo(() => {
    const unique = new Set<string>()
    students.forEach((s) => {
      if (s.class) unique.add(s.class)
    })
    return Array.from(unique)
  }, [students])

  const examOptions = useMemo(() => {
    const unique = new Set<string>()
    students.forEach((s) => {
      s.specializationList.forEach((exam) => unique.add(exam))
    })
    return Array.from(unique)
  }, [students])

  const filteredStudents = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()

    return students.filter((student) => {
      const matchesSearch = query
        ? [student.name, student.email, student.specialization]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(query))
        : true

      const matchesClass = classFilter ? student.class.toLowerCase() === classFilter.toLowerCase() : true

      const matchesExam = examFilter
        ? student.specializationList.some((exam) => exam.toLowerCase() === examFilter.toLowerCase())
        : true

      return matchesSearch && matchesClass && matchesExam
    })
  }, [students, debouncedSearch, classFilter, examFilter])

  const columns = [
    { key: "name" as const, label: "Name", sortable: true },
    { key: "email" as const, label: "Email", sortable: true },
    { key: "class" as const, label: "Class", sortable: true },
    { key: "specialization" as const, label: "Exam", sortable: true },
    { key: "enrolledCourses" as const, label: "Courses", sortable: true },
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
        <div className="flex justify-end">
          <button className="p-1 hover:bg-gray-100 rounded" aria-label="Actions">
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

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search by name, email, or Exams..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="bg-white border-gray-200"
          />
        </div>
        <div className="relative flex items-center gap-2 md:justify-end">
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setShowFilters((prev) => !prev)}
          >
            Filter
          </Button>
          {showFilters && (
            <div className="absolute right-24 top-12 z-20 w-72 rounded-md border border-gray-200 bg-white p-4 shadow-lg">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-600">Class</p>
                  <select
                    className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm"
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    {classOptions.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Exam</p>
                  <select
                    className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm"
                    value={examFilter}
                    onChange={(e) => setExamFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    {examOptions.map((exam) => (
                      <option key={exam} value={exam}>
                        {exam}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setClassFilter("")
                      setExamFilter("")
                    }}
                  >
                    Clear
                  </Button>
                  <Button type="button" size="sm" onClick={() => setShowFilters(false)}>
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => {
              void loadStudents()
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {/* <Button style={{ backgroundColor: "#AD49E1", color: "white" }}>Add Student</Button> */}
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : (
        <DataTable data={filteredStudents} columns={columns} isLoading={isLoading} />
      )}

      {pagination && (
        <p className="mt-3 text-sm text-gray-500">
          Showing {filteredStudents.length} of {pagination.totalStudents} students
        </p>
      )}
    </div>
  )
}
