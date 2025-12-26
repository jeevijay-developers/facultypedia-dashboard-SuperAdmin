"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { DataTable } from "@/components/admin/data-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, RefreshCw } from "lucide-react"
import adminAPI from "@/util/server"

type TableLiveClass = {
  id: string
  title: string
  educatorName: string
  subject: string
  date: string | null
  duration: number
  capacity: number
  enrolled: number
  status: string
}

type PaginationMeta = {
  currentPage: number
  totalPages: number
  totalLiveClasses: number
  hasNextPage?: boolean
  hasPrevPage?: boolean
}

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "—"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString()
}

export default function LiveClassesPage() {
  const [classes, setClasses] = useState<TableLiveClass[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [subjectFilter, setSubjectFilter] = useState<string>("")
  const [minDurationFilter, setMinDurationFilter] = useState<string>("")
  const [minCapacityFilter, setMinCapacityFilter] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizeLiveClass = useCallback((item: any): TableLiveClass | null => {
    const id = item?.id ?? item?._id
    if (!id) return null

    const subjectList = Array.isArray(item?.subject)
      ? item.subject.filter(Boolean)
      : item?.subject
        ? [item.subject]
        : []

    const educatorName =
      item?.educatorName ||
      item?.educator ||
      item?.educatorID?.name ||
      item?.educatorID?.fullName ||
      item?.educatorID?.username ||
      "Unknown"

    const enrolledCount = Array.isArray(item?.enrolledStudents)
      ? item.enrolledStudents.length
      : Number.isFinite(Number(item?.enrolled))
        ? Number(item.enrolled)
        : 0

    const capacity = Number.isFinite(Number(item?.maxStudents))
      ? Number(item.maxStudents)
      : Number.isFinite(Number(item?.capacity))
        ? Number(item.capacity)
        : 0

    const classDate = item?.classTiming || item?.createdAt || null
    const classDateObj = classDate ? new Date(classDate) : null
    const isPast = classDateObj && !Number.isNaN(classDateObj.getTime()) && classDateObj < new Date()

    const status = item?.isCompleted
      ? "completed"
      : isPast
        ? "completed"
        : item?.isActive === false
          ? "inactive"
          : "upcoming"

    return {
      id: String(id),
      title: item?.liveClassTitle || item?.title || "Untitled class",
      educatorName,
      subject: subjectList.length ? subjectList.join(", ") : "—",
      date: item?.classTiming || item?.createdAt || null,
      duration: Number.isFinite(Number(item?.classDuration)) ? Number(item.classDuration) : 0,
      capacity,
      enrolled: enrolledCount,
      status,
    }
  }, [])

  const loadLiveClasses = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await adminAPI.liveClasses.list({ limit: 100 })
      const raw = response?.liveClasses ?? response?.data?.liveClasses ?? response ?? []

      const mapped = Array.isArray(raw)
        ? raw.map(normalizeLiveClass).filter((item): item is TableLiveClass => Boolean(item))
        : []

      setClasses(mapped)
      setPagination(response?.pagination ?? response?.data?.pagination ?? null)
    } catch (err) {
      const status = (err as { status?: number })?.status

      if (status === 401) {
        adminAPI.auth.clearSession()
        setError(
          "Automatic super-admin authentication failed. Confirm the configured credentials or run the super admin seeder.",
        )
        return
      }

      const message = err instanceof Error ? err.message : "Failed to load live classes"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [normalizeLiveClass])

  useEffect(() => {
    void loadLiveClasses()
  }, [loadLiveClasses])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const subjectOptions = useMemo(() => {
    const unique = new Set<string>()
    classes.forEach((c) => {
      c.subject
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => unique.add(s))
    })
    return Array.from(unique)
  }, [classes])

  const filteredClasses = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    const minDuration = minDurationFilter ? Number(minDurationFilter) : null
    const minCapacity = minCapacityFilter ? Number(minCapacityFilter) : null

    return classes.filter((liveClass) => {
      const matchesSearch = query
        ? [liveClass.title, liveClass.educatorName, liveClass.subject]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(query))
        : true

      const matchesSubject = subjectFilter
        ? liveClass.subject
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .includes(subjectFilter.toLowerCase())
        : true

      const matchesDuration = minDuration !== null ? liveClass.duration >= minDuration : true
      const matchesCapacity = minCapacity !== null ? liveClass.capacity >= minCapacity : true

      return matchesSearch && matchesSubject && matchesDuration && matchesCapacity
    })
  }, [classes, debouncedSearch, subjectFilter, minDurationFilter, minCapacityFilter])

  const columns = [
    { key: "title" as const, label: "Title", sortable: true },
    { key: "educatorName" as const, label: "Educator", sortable: true },
    { key: "subject" as const, label: "Subject", sortable: true },
    {
      key: "date" as const,
      label: "Date",
      sortable: true,
      render: (v: string | null) => formatDate(v ?? undefined),
    },
    { key: "duration" as const, label: "Duration (min)", sortable: true },
    { key: "capacity" as const, label: "Capacity", sortable: true },
    { key: "enrolled" as const, label: "Enrolled", sortable: true },
    {
      key: "status" as const,
      label: "Status",
      render: (status: string) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            status === "completed"
              ? "bg-gray-100 text-gray-800"
              : status === "inactive"
                ? "bg-red-100 text-red-800"
                : "bg-blue-100 text-blue-800"
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
          Live Classes Management
        </h1>
        <p className="text-gray-600 mt-1">Manage all live classes</p>
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
                  <p className="text-xs font-semibold text-gray-600">Min Duration (min)</p>
                  <select
                    className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm"
                    value={minDurationFilter}
                    onChange={(e) => setMinDurationFilter(e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="45">45+</option>
                    <option value="60">60+</option>
                    <option value="90">90+</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Min Capacity</p>
                  <select
                    className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm"
                    value={minCapacityFilter}
                    onChange={(e) => setMinCapacityFilter(e.target.value)}
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
                      setMinDurationFilter("")
                      setMinCapacityFilter("")
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
              void loadLiveClasses()
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
        <DataTable data={filteredClasses} columns={columns} isLoading={isLoading} />
      )}

      {pagination && (
        <p className="mt-3 text-sm text-gray-500">
          Showing {filteredClasses.length} of {pagination.totalLiveClasses} live classes
        </p>
      )}
    </div>
  )
}
