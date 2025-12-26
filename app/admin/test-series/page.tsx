"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { DataTable } from "@/components/admin/data-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, RefreshCw } from "lucide-react"
import adminAPI from "@/util/server"

type TableTestSeries = {
  id: string
  title: string
  educatorName: string
  tests: number
  price: number
  validity: string
  enrolled: number
  status: string
}

type PaginationMeta = {
  currentPage: number
  totalPages: number
  totalTestSeries: number
  hasNextPage?: boolean
  hasPrevPage?: boolean
}

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "—"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString()
}

export default function TestSeriesPage() {
  const [series, setSeries] = useState<TableTestSeries[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [minPriceFilter, setMinPriceFilter] = useState<string>("")
  const [minTestsFilter, setMinTestsFilter] = useState<string>("")
  const [minEnrolledFilter, setMinEnrolledFilter] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizeSeries = useCallback((item: any): TableTestSeries | null => {
    const id = item?.id ?? item?._id
    if (!id) {
      return null
    }

    const testsCount = Number.isFinite(Number(item?.tests))
      ? Number(item.tests)
      : Array.isArray(item?.tests)
        ? item.tests.length
        : Number(item?.numberOfTests ?? item?.testCount ?? 0)

    const enrolledCount = Number.isFinite(Number(item?.enrolled))
      ? Number(item.enrolled)
      : Array.isArray(item?.enrolledStudents)
        ? item.enrolledStudents.length
        : Number(item?.enrolledCount ?? 0)

    const priceValue = Number.isFinite(Number(item?.price)) ? Number(item.price) : 0

    const status = item?.status
      ? item.status
      : item?.isActive === false
        ? "inactive"
        : "active"

    return {
      id: String(id),
      title: item?.title || "Untitled test series",
      educatorName: item?.educatorName || item?.educator || item?.educatorId?.fullName || "Unknown",
      tests: testsCount,
      price: priceValue,
      validity: item?.validity || "",
      enrolled: enrolledCount,
      status,
    }
  }, [])

  const loadSeries = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await adminAPI.testSeries.list({ limit: 100 })
      const rawSeries = response?.testSeries ?? response ?? []
      const mapped = Array.isArray(rawSeries)
        ? rawSeries
            .map(normalizeSeries)
            .filter((item): item is TableTestSeries => Boolean(item))
        : []

      setSeries(mapped)
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

      const message = err instanceof Error ? err.message : "Failed to load test series"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [normalizeSeries])

  useEffect(() => {
    void loadSeries()
  }, [loadSeries])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const filteredSeries = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    const minPrice = minPriceFilter ? Number(minPriceFilter) : null
    const minTests = minTestsFilter ? Number(minTestsFilter) : null
    const minEnrolled = minEnrolledFilter ? Number(minEnrolledFilter) : null

    return series.filter((item) => {
      const matchesSearch = query
        ? [item.title, item.educatorName]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(query))
        : true

      const matchesPrice = minPrice !== null ? item.price >= minPrice : true
      const matchesTests = minTests !== null ? item.tests >= minTests : true
      const matchesEnrolled = minEnrolled !== null ? item.enrolled >= minEnrolled : true

      return matchesSearch && matchesPrice && matchesTests && matchesEnrolled
    })
  }, [series, debouncedSearch, minPriceFilter, minTestsFilter, minEnrolledFilter])

  const columns = [
    { key: "title" as const, label: "Title", sortable: true },
    { key: "educatorName" as const, label: "Educator", sortable: true },
    { key: "tests" as const, label: "Tests", sortable: true },
    {
      key: "price" as const,
      label: "Price",
      sortable: true,
      render: (v: number) => `₹${Number(v || 0).toLocaleString("en-IN")}`,
    },
    {
      key: "validity" as const,
      label: "Validity",
      sortable: true,
      render: (v: string) => formatDate(v),
    },
    { key: "enrolled" as const, label: "Enrolled", sortable: true },
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
          Test Series Management
        </h1>
        <p className="text-gray-600 mt-1">Manage all test series available</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search by title or educator..."
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
                  <p className="text-xs font-semibold text-gray-600">Min Price</p>
                  <select
                    className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm"
                    value={minPriceFilter}
                    onChange={(e) => setMinPriceFilter(e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="500">₹500+</option>
                    <option value="1000">₹1,000+</option>
                    <option value="5000">₹5,000+</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Min Tests</p>
                  <select
                    className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm"
                    value={minTestsFilter}
                    onChange={(e) => setMinTestsFilter(e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="5">5+</option>
                    <option value="10">10+</option>
                    <option value="20">20+</option>
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
                      setMinPriceFilter("")
                      setMinTestsFilter("")
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
              void loadSeries()
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
        <DataTable data={filteredSeries} columns={columns} isLoading={isLoading} />
      )}

      {pagination && (
        <p className="mt-3 text-sm text-gray-500">
          Showing {filteredSeries.length} of {pagination.totalTestSeries} test series
        </p>
      )}
    </div>
  )
}
