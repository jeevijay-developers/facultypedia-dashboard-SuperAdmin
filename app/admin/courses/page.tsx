"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { DataTable } from "@/components/admin/data-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, RefreshCw } from "lucide-react"
import adminAPI from "@/util/server"

type TableCourse = {
  id: string
  title: string
  educatorName: string
  subject: string
  enrolled: number
  fees: number
  status: string
}
type PaginationMeta = {
  currentPage: number
  totalPages: number
  totalCourses: number
  hasNextPage?: boolean
  hasPrevPage?: boolean
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<TableCourse[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [subjectFilter, setSubjectFilter] = useState<string>("")
  const [minFeeFilter, setMinFeeFilter] = useState<string>("")
  const [minEnrolledFilter, setMinEnrolledFilter] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizeCourse = useCallback((course: any): TableCourse | null => {
    const id = course?.id ?? course?._id
    if (!id) {
      return null
    }

    const subjectList = Array.isArray(course?.subject)
      ? course.subject.filter(Boolean)
      : course?.subject
        ? [course.subject]
        : []

    const subject = subjectList.length ? subjectList.join(", ") : "—"

    const enrolledCount = Number.isFinite(Number(course?.enrolled))
      ? Number(course.enrolled)
      : Array.isArray(course?.enrolledStudents)
        ? course.enrolledStudents.length
        : 0

    const feesValue = Number.isFinite(Number(course?.fees)) ? Number(course.fees) : 0

    const status = course?.status
      ? course.status
      : course?.isActive === false
        ? "inactive"
        : "active"

    return {
      id: String(id),
      title: course?.title || "Untitled course",
      educatorName: course?.educatorName || course?.educator || course?.educatorID?.fullName || "Unknown",
      subject,
      enrolled: enrolledCount,
      fees: feesValue,
      status,
    }
  }, [])

  const loadCourses = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await adminAPI.courses.list({ limit: 100 })
      const rawCourses = response?.courses ?? response ?? []
      const mapped = Array.isArray(rawCourses)
        ? rawCourses
            .map(normalizeCourse)
            .filter((item): item is TableCourse => Boolean(item))
        : []

      setCourses(mapped)
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

      const message = err instanceof Error ? err.message : "Failed to load courses"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [normalizeCourse])

  useEffect(() => {
    void loadCourses()
  }, [loadCourses])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const subjectOptions = useMemo(() => {
    const unique = new Set<string>()
    courses.forEach((course) => {
      course.subject
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => unique.add(s))
    })
    return Array.from(unique)
  }, [courses])

  const filteredCourses = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    const minFee = minFeeFilter ? Number(minFeeFilter) : null
    const minEnrolled = minEnrolledFilter ? Number(minEnrolledFilter) : null

    return courses.filter((course) => {
      const matchesSearch = query
        ? [course.title, course.educatorName, course.subject]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(query))
        : true

      const matchesSubject = subjectFilter
        ? course.subject
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .includes(subjectFilter.toLowerCase())
        : true

      const matchesFee = minFee !== null ? course.fees >= minFee : true
      const matchesEnrolled = minEnrolled !== null ? course.enrolled >= minEnrolled : true

      return matchesSearch && matchesSubject && matchesFee && matchesEnrolled
    })
  }, [courses, debouncedSearch, subjectFilter, minFeeFilter, minEnrolledFilter])

  const columns = [
    { key: "title" as const, label: "Title", sortable: true },
    { key: "educatorName" as const, label: "Educator", sortable: true },
    { key: "subject" as const, label: "Subject", sortable: true },
    { key: "enrolled" as const, label: "Enrolled", sortable: true },
    {
      key: "fees" as const,
      label: "Fees",
      sortable: true,
      render: (value: number) => `₹${Number(value || 0).toLocaleString("en-IN")}`,
    },
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
          Courses Management
        </h1>
        <p className="text-gray-600 mt-1">Manage all courses available on the platform</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search by title, educator, or subject..."
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
            <div className="absolute right-24 top-12 z-20 w-80 rounded-md border border-gray-200 bg-white p-4 shadow-lg">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-600">Subject</p>
                  <select
                    className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm"
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    {subjectOptions.map((subj) => (
                      <option key={subj} value={subj}>
                        {subj}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Min Fee</p>
                  <select
                    className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm"
                    value={minFeeFilter}
                    onChange={(e) => setMinFeeFilter(e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="500">₹500+</option>
                    <option value="1000">₹1,000+</option>
                    <option value="5000">₹5,000+</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Min Enrolled</p>
                  <select
                    className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm"
                    value={minEnrolledFilter}
                    onChange={(e) => setMinEnrolledFilter(e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="50">50+</option>
                    <option value="100">100+</option>
                    <option value="250">250+</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSubjectFilter("")
                      setMinFeeFilter("")
                      setMinEnrolledFilter("")
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
              void loadCourses()
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : (
        <DataTable data={filteredCourses} columns={columns} isLoading={isLoading} />
      )}

      {pagination && (
        <p className="mt-3 text-sm text-gray-500">
          Showing {filteredCourses.length} of {pagination.totalCourses} courses
        </p>
      )}
    </div>
  )
}
