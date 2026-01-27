"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, RefreshCw, X } from "lucide-react";
import adminAPI from "@/util/server";

type TableWebinar = {
  id: string;
  title: string;
  educatorName: string;
  subject: string;
  date: string | null;
  capacity: number;
  enrolled: number;
  fees: number;
  status: string;
};

type PaginationMeta = {
  currentPage: number;
  totalPages: number;
  totalWebinars: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
};

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

export default function WebinarsPage() {
  const [webinars, setWebinars] = useState<TableWebinar[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [minCapacityFilter, setMinCapacityFilter] = useState<string>("");
  const [minFeesFilter, setMinFeesFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWebinar, setSelectedWebinar] = useState<TableWebinar | null>(null);
  const PAGE_SIZE = 10;

  const normalizeWebinar = useCallback((item: any): TableWebinar | null => {
    const id = item?.id ?? item?._id;
    if (!id) {
      return null;
    }

    const subjectList = Array.isArray(item?.subject)
      ? item.subject.filter(Boolean)
      : item?.subject
      ? [item.subject]
      : [];

    const subject = subjectList.length ? subjectList.join(", ") : "—";

    const enrolledCount = Number.isFinite(Number(item?.enrolled))
      ? Number(item.enrolled)
      : Array.isArray(item?.studentEnrolled)
      ? item.studentEnrolled.length
      : Number(item?.enrolledCount ?? 0);

    const capacity = Number.isFinite(Number(item?.capacity))
      ? Number(item.capacity)
      : Number.isFinite(Number(item?.seatLimit))
      ? Number(item.seatLimit)
      : 0;

    const feesValue = Number.isFinite(Number(item?.fees))
      ? Number(item.fees)
      : 0;

    const status = item?.status
      ? item.status
      : item?.isActive === false
      ? "inactive"
      : "active";

    return {
      id: String(id),
      title: item?.title || "Untitled webinar",
      educatorName:
        item?.educatorName ||
        item?.educator ||
        item?.educatorID?.fullName ||
        "Unknown",
      subject,
      date: item?.date || item?.timing || item?.createdAt || null,
      capacity,
      enrolled: enrolledCount,
      fees: feesValue,
      status,
    };
  }, []);

  const loadWebinars = useCallback(
    async (targetPage = page) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await adminAPI.webinars.list({
          page: targetPage,
          limit: PAGE_SIZE,
        });
        const rawWebinars = response?.webinars ?? response ?? [];
        const mapped = Array.isArray(rawWebinars)
          ? rawWebinars
              .map(normalizeWebinar)
              .filter((item): item is TableWebinar => Boolean(item))
          : [];

        setWebinars(mapped);
        setPagination(response?.pagination ?? null);
      } catch (err) {
        // 401 errors are handled globally by AuthGuard
        const status = (err as { status?: number })?.status;
        if (status !== 401) {
          const message =
            err instanceof Error ? err.message : "Failed to load webinars";
          setError(message);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [normalizeWebinar, page, PAGE_SIZE]
  );

  useEffect(() => {
    void loadWebinars(page);
  }, [loadWebinars, page]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const subjectOptions = useMemo(() => {
    const unique = new Set<string>();
    webinars.forEach((webinar) => {
      webinar.subject
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => unique.add(s));
    });
    return Array.from(unique);
  }, [webinars]);

  const filteredWebinars = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const minCapacity = minCapacityFilter ? Number(minCapacityFilter) : null;
    const minFees = minFeesFilter ? Number(minFeesFilter) : null;

    return webinars.filter((webinar) => {
      const matchesSearch = query
        ? [webinar.title, webinar.educatorName, webinar.subject]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(query))
        : true;

      const matchesSubject = subjectFilter
        ? webinar.subject
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .includes(subjectFilter.toLowerCase())
        : true;

      const matchesCapacity =
        minCapacity !== null ? webinar.capacity >= minCapacity : true;
      const matchesFees = minFees !== null ? webinar.fees >= minFees : true;

      return matchesSearch && matchesSubject && matchesCapacity && matchesFees;
    });
  }, [
    webinars,
    debouncedSearch,
    subjectFilter,
    minCapacityFilter,
    minFeesFilter,
  ]);

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
    { key: "capacity" as const, label: "Capacity", sortable: true },
    { key: "enrolled" as const, label: "Enrolled", sortable: true },
    {
      key: "fees" as const,
      label: "Fee",
      sortable: true,
      render: (v: number) => `₹${Number(v || 0).toLocaleString("en-IN")}`,
    },
    {
      key: "status" as const,
      label: "Status",
      render: (status: string) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            status === "active"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {status}
        </span>
      ),
    },
    {
      key: "id" as const,
      label: "View",
      render: (_value: string, row: TableWebinar) => (
        <div className="flex justify-end">
          <button
            type="button"
            className="flex items-center gap-2 rounded border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedWebinar(row);
            }}
            aria-label="View webinar"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
        </div>
      ),
    },
  ] as const;

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "#2E073F" }}>
          Webinars Management
        </h1>
        <p className="text-gray-600 mt-1">Manage all live webinars</p>
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
                  <p className="text-xs font-semibold text-gray-600">
                    Min Capacity
                  </p>
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
                <div>
                  <p className="text-xs font-semibold text-gray-600">Min Fee</p>
                  <select
                    className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm"
                    value={minFeesFilter}
                    onChange={(e) => setMinFeesFilter(e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="500">₹500+</option>
                    <option value="1000">₹1,000+</option>
                    <option value="2500">₹2,500+</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSubjectFilter("");
                      setMinCapacityFilter("");
                      setMinFeesFilter("");
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
              void loadWebinars(page);
            }}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : (
        <DataTable
          data={filteredWebinars}
          columns={columns}
          isLoading={isLoading}
        />
      )}

      {selectedWebinar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedWebinar(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Webinar Details</h2>
              <button
                type="button"
                className="rounded-full p-1 hover:bg-gray-100"
                onClick={() => setSelectedWebinar(null)}
                aria-label="Close details"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5 text-sm text-gray-700">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Title</p>
                <p className="mt-1 text-base font-medium text-gray-900">{selectedWebinar.title}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Educator</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedWebinar.educatorName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Subject</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedWebinar.subject}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Date</p>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedWebinar.date ?? undefined)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Capacity</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedWebinar.capacity}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Enrolled</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedWebinar.enrolled}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Fee</p>
                  <p className="mt-1 text-sm text-gray-900">₹{Number(selectedWebinar.fees || 0).toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                <span
                  className={`mt-1 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${
                    selectedWebinar.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {selectedWebinar.status}
                </span>
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-200 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setSelectedWebinar(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <Pagination
        currentPage={pagination?.currentPage ?? page}
        totalPages={pagination?.totalPages ?? 1}
        onPageChange={handlePageChange}
        isLoading={isLoading}
      />

      {pagination && (
        <p className="mt-3 text-sm text-gray-500">
          Showing {filteredWebinars.length} of {pagination.totalWebinars}{" "}
          webinars
        </p>
      )}
    </div>
  );
}
