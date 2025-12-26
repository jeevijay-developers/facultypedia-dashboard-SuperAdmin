"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { DataTable } from "@/components/admin/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, MoreHorizontal, RefreshCw, X } from "lucide-react"
import adminAPI from "@/util/server"

type TableEducator = {
  id: string
  name: string
  username: string
  email: string
  specialization: string
  specializationList: string[]
  rating: number
  status: string
  totalCourses: number
  totalStudents: number
  followersCount: number
}

type PaginationMeta = {
  currentPage: number
  totalPages: number
  totalEducators: number
  hasNextPage?: boolean
  hasPrevPage?: boolean
}

export default function EducatorsPage() {
  const [educators, setEducators] = useState<TableEducator[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [search, setSearch] = useState("")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [selectedEducator, setSelectedEducator] = useState<TableEducator | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [specializationFilter, setSpecializationFilter] = useState<string>("")
  const [ratingFilter, setRatingFilter] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizeEducator = useCallback((educator: any): TableEducator | null => {
    const id = educator?.id ?? educator?._id
    if (!id) {
      return null
    }

    const specializationList = Array.isArray(educator?.specialization)
      ? educator.specialization.filter(Boolean)
      : []

    const specialization = specializationList.length
      ? specializationList.join(", ")
      : "—"

    const ratingValue = typeof educator?.rating === "number" ? educator.rating : educator?.rating ?? 0
    const ratingAverage =
      typeof ratingValue === "number"
        ? Math.round(ratingValue * 100) / 100
        : typeof ratingValue?.average === "number"
          ? Math.round(ratingValue.average * 100) / 100
          : 0

    const totalCourses = Number.isFinite(Number(educator?.totalCourses))
      ? Number(educator.totalCourses)
      : Array.isArray(educator?.courses)
        ? educator.courses.length
        : 0

    const totalStudents = Number.isFinite(Number(educator?.totalStudents))
      ? Number(educator.totalStudents)
      : Array.isArray(educator?.followers)
        ? educator.followers.length
        : Number(educator?.followersCount ?? 0)

    return {
      id: String(id),
      name: educator?.fullName || educator?.name || "Unknown",
      username: educator?.username || "—",
      email: educator?.email || "—",
      specialization,
      specializationList,
      rating: ratingAverage,
      status: educator?.status || "inactive",
      totalCourses,
      totalStudents,
      followersCount: Number(educator?.followersCount ?? 0),
    }
  }, [])

  const loadEducators = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await adminAPI.educators.list({ limit: 100 })
      const rawEducators = response?.educators ?? response ?? []
      const mapped = Array.isArray(rawEducators)
        ? rawEducators
            .map(normalizeEducator)
            .filter((item): item is TableEducator => Boolean(item))
        : []

      setEducators(mapped)
      setPagination(response?.pagination ?? null)
    } catch (err) {
      const status = (err as { status?: number })?.status

      if (status === 401) {
        adminAPI.auth.clearSession()
        setError(
          "Automatic super-admin authentication failed. Confirm the configured credentials match your backend or run the super admin seeder."
        )
        return
      }

      const message = err instanceof Error ? err.message : "Failed to load educators"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [normalizeEducator])

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-educator-menu="actions"]')) {
        return
      }
      setOpenMenuId(null)
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenuId(null)
        setSelectedEducator(null)
      }
    }

    document.addEventListener("click", handleDocumentClick)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("click", handleDocumentClick)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  useEffect(() => {
    void loadEducators()
  }, [loadEducators])

  const specializationOptions = useMemo(() => {
    const unique = new Set<string>()
    educators.forEach((edu) => edu.specializationList.forEach((spec) => unique.add(spec)))
    return Array.from(unique)
  }, [educators])

  const filteredEducators = useMemo(() => {
    const query = search.trim().toLowerCase()

    return educators.filter((edu) => {
      const matchesSearch = query
        ? [edu.name, edu.email, edu.username, edu.specialization]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(query))
        : true

      const matchesSpecialization = specializationFilter
        ? edu.specializationList.some((s) => s.toLowerCase() === specializationFilter.toLowerCase())
        : true

      const minRating = ratingFilter ? Number(ratingFilter) : null
      const matchesRating = minRating !== null ? edu.rating >= minRating : true

      return matchesSearch && matchesSpecialization && matchesRating
    })
  }, [educators, search, specializationFilter, ratingFilter])

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
      render: (_value: string, row: Educator) => (
        <div
          className="relative flex justify-end"
          onClick={(event) => event.stopPropagation()}
          data-educator-menu="actions"
        >
          <button
            type="button"
            className="p-1 hover:bg-gray-100 rounded"
            onClick={(event) => {
              event.stopPropagation()
              setOpenMenuId((prev) => (prev === row.id ? null : row.id))
            }}
            aria-haspopup="menu"
            aria-expanded={openMenuId === row.id}
          >
            <MoreHorizontal className="w-4 h-4 text-gray-600" />
          </button>
          {openMenuId === row.id && (
            <div
              className="absolute right-0 mt-2 w-32 rounded-md border border-gray-200 bg-white py-1 shadow-lg z-10"
              role="menu"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  setOpenMenuId(null)
                  setSelectedEducator(row)
                }}
              >
                <Eye className="w-4 h-4 text-gray-600" />
                View
              </button>
            </div>
          )}
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
            placeholder="Search by name, email, or specialization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border-gray-200"
          />
        </div>
        <div className="relative flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setShowFilters((prev) => !prev)}
          >
            Filter
          </Button>
          {showFilters && (
            <div className="absolute right-28 top-12 z-20 w-72 rounded-md border border-gray-200 bg-white p-4 shadow-lg">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-600">Specialization</p>
                  <select
                    className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm"
                    value={specializationFilter}
                    onChange={(e) => setSpecializationFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    {specializationOptions.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Min Rating</p>
                  <select
                    className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm"
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="4.5">4.5+</option>
                    <option value="4">4.0+</option>
                    <option value="3.5">3.5+</option>
                    <option value="3">3.0+</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSpecializationFilter("")
                      setRatingFilter("")
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowFilters(false)}
                  >
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
              void loadEducators()
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {/* <Button style={{ backgroundColor: "#AD49E1", color: "white" }}>Add Educator</Button> */}
        </div>
      </div>

      {pagination && (
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredEducators.length} of {pagination.totalEducators} educators
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <DataTable data={filteredEducators} columns={columns as any} />

      {!isLoading && !error && filteredEducators.length === 0 && (
        <div className="mt-4 text-sm text-gray-500">No educators match the current filters.</div>
      )}

      {isLoading && (
        <div className="mt-4 text-sm text-gray-500">Loading educators…</div>
      )}

      {selectedEducator && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedEducator(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Educator Details</h2>
              <button
                type="button"
                className="rounded-full p-1 hover:bg-gray-100"
                onClick={() => setSelectedEducator(null)}
                aria-label="Close details"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5 text-sm text-gray-700">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Name</p>
                <p className="mt-1 text-base font-medium text-gray-900">{selectedEducator.name}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Email</p>
                  <p className="mt-1 break-all text-sm text-gray-900">{selectedEducator.email}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Username</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedEducator.username}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Specialization</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedEducator.specialization}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                  <span
                    className={`mt-1 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${
                      selectedEducator.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {selectedEducator.status}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total Courses</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedEducator.totalCourses}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total Students</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedEducator.totalStudents}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Rating</p>
                <p className="mt-1 text-sm text-gray-900">{selectedEducator.rating}</p>
                {selectedEducator.followersCount > selectedEducator.totalStudents && (
                  <p className="mt-1 text-xs text-gray-500">
                    Followers: {selectedEducator.followersCount}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-200 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setSelectedEducator(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
