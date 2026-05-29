"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2, RefreshCw, X, Loader2, AlertTriangle } from "lucide-react";
import adminAPI from "@/util/server";

type TableTestSeries = {
  id: string;
  title: string;
  educatorName: string;
  tests: number;
  price: number;
  validity: string;
  enrolled: number;
  status: string;
};

type PaginationMeta = {
  currentPage: number;
  totalPages: number;
  totalTestSeries: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
};

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

export default function TestSeriesPage() {
  const [series, setSeries] = useState<TableTestSeries[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [minPriceFilter, setMinPriceFilter] = useState<string>("");
  const [minTestsFilter, setMinTestsFilter] = useState<string>("");
  const [minEnrolledFilter, setMinEnrolledFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<TableTestSeries | null>(null);
  const [editingSeries, setEditingSeries] = useState<TableTestSeries | null>(null);
  const [editForm, setEditForm] = useState<Partial<TableTestSeries>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [deletingSeries, setDeletingSeries] = useState<TableTestSeries | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<Record<string, boolean>>({});
  const PAGE_SIZE = 10;

  const normalizeSeries = useCallback((item: any): TableTestSeries | null => {
    const id = item?.id ?? item?._id;
    if (!id) return null;

    const testsCount = Number.isFinite(Number(item?.tests)) ? Number(item.tests) : Array.isArray(item?.tests) ? item.tests.length : Number(item?.numberOfTests ?? item?.testCount ?? 0);
    const enrolledCount = Number.isFinite(Number(item?.enrolled)) ? Number(item.enrolled) : Array.isArray(item?.enrolledStudents) ? item.enrolledStudents.length : Number(item?.enrolledCount ?? 0);

    return {
      id: String(id),
      title: item?.title || "Untitled test series",
      educatorName: item?.educatorName || item?.educator || item?.educatorId?.fullName || "Unknown",
      tests: testsCount,
      price: Number.isFinite(Number(item?.price)) ? Number(item.price) : 0,
      validity: item?.validity || "",
      enrolled: enrolledCount,
      status: item?.status ? item.status : item?.isActive === false ? "inactive" : "active",
    };
  }, []);

  const loadSeries = useCallback(async (targetPage = page) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminAPI.testSeries.list({ page: targetPage, limit: PAGE_SIZE });
      const rawSeries = response?.testSeries ?? response ?? [];
      const mapped = Array.isArray(rawSeries)
        ? rawSeries.map(normalizeSeries).filter((item): item is TableTestSeries => Boolean(item))
        : [];
      setSeries(mapped);
      setPagination(response?.pagination ?? null);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status !== 401) setError(err instanceof Error ? err.message : "Failed to load test series");
    } finally {
      setIsLoading(false);
    }
  }, [normalizeSeries, page, PAGE_SIZE]);

  useEffect(() => { void loadSeries(page); }, [loadSeries, page]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleSeriesStatus = useCallback(async (row: TableTestSeries) => {
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setStatusUpdating((prev) => ({ ...prev, [row.id]: true }));
    setSeries((prev) => prev.map((s) => s.id === row.id ? { ...s, status: nextStatus } : s));
    try {
      await adminAPI.testSeries.updateStatus(row.id, nextStatus);
    } catch (err) {
      setSeries((prev) => prev.map((s) => s.id === row.id ? { ...s, status: row.status } : s));
      setError(err instanceof Error ? err.message : "Failed to update test series status");
    } finally {
      setStatusUpdating((prev) => ({ ...prev, [row.id]: false }));
    }
  }, []);

  const openEditModal = (row: TableTestSeries) => { setEditingSeries(row); setEditForm({ ...row }); };

  const handleEditSave = async () => {
    if (!editingSeries) return;
    setEditSaving(true);
    try {
      await adminAPI.testSeries.update(editingSeries.id, {
        title: editForm.title,
        price: editForm.price,
        validity: editForm.validity,
      });
      setSeries((prev) =>
        prev.map((s) =>
          s.id === editingSeries.id
            ? { ...s, title: editForm.title ?? s.title, price: editForm.price ?? s.price, validity: editForm.validity ?? s.validity }
            : s
        )
      );
      setEditingSeries(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update test series");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSeries) return;
    setDeleteConfirming(true);
    try {
      await adminAPI.testSeries.remove(deletingSeries.id);
      setSeries((prev) => prev.filter((s) => s.id !== deletingSeries.id));
      setDeletingSeries(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete test series");
    } finally {
      setDeleteConfirming(false);
    }
  };

  const filteredSeries = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const minPrice = minPriceFilter ? Number(minPriceFilter) : null;
    const minTests = minTestsFilter ? Number(minTestsFilter) : null;
    const minEnrolled = minEnrolledFilter ? Number(minEnrolledFilter) : null;
    return series.filter((item) => {
      const matchesSearch = query ? [item.title, item.educatorName].filter(Boolean).some((v) => v.toLowerCase().includes(query)) : true;
      const matchesPrice = minPrice !== null ? item.price >= minPrice : true;
      const matchesTests = minTests !== null ? item.tests >= minTests : true;
      const matchesEnrolled = minEnrolled !== null ? item.enrolled >= minEnrolled : true;
      return matchesSearch && matchesPrice && matchesTests && matchesEnrolled;
    });
  }, [series, debouncedSearch, minPriceFilter, minTestsFilter, minEnrolledFilter]);

  const columns = [
    { key: "title" as const, label: "Title", sortable: true },
    { key: "educatorName" as const, label: "Educator", sortable: true },
    { key: "tests" as const, label: "Tests", sortable: true },
    { key: "price" as const, label: "Price", sortable: true, render: (v: number) => `₹${Number(v || 0).toLocaleString("en-IN")}` },
    { key: "validity" as const, label: "Validity", sortable: true, render: (v: string) => formatDate(v) },
    { key: "enrolled" as const, label: "Enrolled", sortable: true },
    {
      key: "status" as const,
      label: "Status",
      render: (status: string, row: TableTestSeries) => (
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{status}</span>
          <button type="button" className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60" onClick={(e) => { e.stopPropagation(); void toggleSeriesStatus(row); }} disabled={Boolean(statusUpdating[row.id])}>
            {row.status === "active" ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
    {
      key: "id" as const,
      label: "Actions",
      render: (_value: string, row: TableTestSeries) => (
        <div className="flex items-center justify-end gap-2">
          <button type="button" className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50" onClick={(e) => { e.stopPropagation(); setSelectedSeries(row); }}><Eye className="w-3.5 h-3.5" /> View</button>
          <button type="button" className="flex items-center gap-1 rounded border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); openEditModal(row); }}><Pencil className="w-3.5 h-3.5" /> Edit</button>
          <button type="button" className="flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setDeletingSeries(row); }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
        </div>
      ),
    },
  ] as const;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "#2E073F" }}>Test Series Management</h1>
        <p className="text-gray-600 mt-1">Manage all test series available</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex-1 w-full">
          <Input placeholder="Search by title or educator..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="bg-white border-gray-200" />
        </div>
        <div className="relative flex items-center gap-2 md:justify-end">
          <Button type="button" variant="outline" onClick={() => setShowFilters((p) => !p)}>Filter</Button>
          {showFilters && (
            <div className="absolute right-24 top-12 z-20 w-80 rounded-md border border-gray-200 bg-white p-4 shadow-lg">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-600">Min Price</p>
                  <select className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm" value={minPriceFilter} onChange={(e) => setMinPriceFilter(e.target.value)}>
                    <option value="">Any</option>
                    <option value="500">₹500+</option>
                    <option value="1000">₹1,000+</option>
                    <option value="5000">₹5,000+</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Min Tests</p>
                  <select className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm" value={minTestsFilter} onChange={(e) => setMinTestsFilter(e.target.value)}>
                    <option value="">Any</option>
                    <option value="5">5+</option>
                    <option value="10">10+</option>
                    <option value="20">20+</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Min Enrolled</p>
                  <select className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm" value={minEnrolledFilter} onChange={(e) => setMinEnrolledFilter(e.target.value)}>
                    <option value="">Any</option>
                    <option value="50">50+</option>
                    <option value="100">100+</option>
                    <option value="250">250+</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setMinPriceFilter(""); setMinTestsFilter(""); setMinEnrolledFilter(""); }}>Clear</Button>
                  <Button type="button" size="sm" onClick={() => setShowFilters(false)}>Apply</Button>
                </div>
              </div>
            </div>
          )}
          <Button type="button" variant="outline" className="flex items-center gap-2" onClick={() => void loadSeries(page)} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      <DataTable data={filteredSeries} columns={columns as any} isLoading={isLoading} />
      <Pagination currentPage={pagination?.currentPage ?? page} totalPages={pagination?.totalPages ?? 1} onPageChange={(p) => setPage(p)} isLoading={isLoading} />
      {pagination && <p className="mt-3 text-sm text-gray-500">Showing {filteredSeries.length} of {pagination.totalTestSeries} test series</p>}

      {/* View Modal */}
      {selectedSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={() => setSelectedSeries(null)}>
          <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Test Series Details</h2>
              <button type="button" className="rounded-full p-1 hover:bg-gray-100" onClick={() => setSelectedSeries(null)}><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4 px-6 py-5 text-sm text-gray-700">
              <div><p className="text-xs uppercase tracking-wide text-gray-500">Title</p><p className="mt-1 text-base font-medium text-gray-900">{selectedSeries.title}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Educator</p><p className="mt-1 text-sm text-gray-900">{selectedSeries.educatorName}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Tests</p><p className="mt-1 text-sm text-gray-900">{selectedSeries.tests}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Price</p><p className="mt-1 text-sm text-gray-900">₹{Number(selectedSeries.price || 0).toLocaleString("en-IN")}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Validity</p><p className="mt-1 text-sm text-gray-900">{formatDate(selectedSeries.validity)}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Enrolled</p><p className="mt-1 text-sm text-gray-900">{selectedSeries.enrolled}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                  <span className={`mt-1 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${selectedSeries.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{selectedSeries.status}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-gray-200 px-6 py-4"><Button type="button" variant="outline" onClick={() => setSelectedSeries(null)}>Close</Button></div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={() => !editSaving && setEditingSeries(null)}>
          <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Test Series</h2>
              <button type="button" className="rounded-full p-1 hover:bg-gray-100" onClick={() => !editSaving && setEditingSeries(null)}><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Title</label>
                <Input className="mt-1" value={editForm.title ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} disabled={editSaving} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Price (₹)</label>
                  <Input className="mt-1" type="number" value={editForm.price ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, price: Number(e.target.value) }))} disabled={editSaving} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Validity Date</label>
                  <Input className="mt-1" type="date" value={editForm.validity ? new Date(editForm.validity).toISOString().split("T")[0] : ""} onChange={(e) => setEditForm((f) => ({ ...f, validity: e.target.value }))} disabled={editSaving} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setEditingSeries(null)} disabled={editSaving}>Cancel</Button>
              <Button type="button" className="bg-[#AD49E1] text-white hover:bg-[#932ccc]" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={() => !deleteConfirming && setDeletingSeries(null)}>
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900">Delete Test Series</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700">Are you sure you want to permanently delete <strong>{deletingSeries.title}</strong>? This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setDeletingSeries(null)} disabled={deleteConfirming}>Cancel</Button>
              <Button type="button" className="bg-red-600 text-white hover:bg-red-700" onClick={handleDeleteConfirm} disabled={deleteConfirming}>
                {deleteConfirming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : "Delete Test Series"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
