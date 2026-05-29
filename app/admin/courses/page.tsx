"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2, RefreshCw, X, Loader2, AlertTriangle } from "lucide-react";
import adminAPI from "@/util/server";

type TableCourse = {
  id: string;
  title: string;
  educatorName: string;
  subject: string;
  enrolled: number;
  fees: number;
  status: string;
};

type PaginationMeta = {
  currentPage: number;
  totalPages: number;
  totalCourses: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<TableCourse[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [minFeeFilter, setMinFeeFilter] = useState<string>("");
  const [minEnrolledFilter, setMinEnrolledFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<TableCourse | null>(null);
  const [editingCourse, setEditingCourse] = useState<TableCourse | null>(null);
  const [editForm, setEditForm] = useState<Partial<TableCourse & { subjectList: string[] }>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState<TableCourse | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<Record<string, boolean>>({});
  const PAGE_SIZE = 10;

  const normalizeCourse = useCallback((course: any): TableCourse | null => {
    const id = course?.id ?? course?._id;
    if (!id) return null;

    const subjectList = Array.isArray(course?.subject)
      ? course.subject.filter(Boolean)
      : course?.subject ? [course.subject] : [];

    return {
      id: String(id),
      title: course?.title || "Untitled course",
      educatorName: course?.educatorName || course?.educator || course?.educatorID?.fullName || "Unknown",
      subject: subjectList.length ? subjectList.join(", ") : "—",
      enrolled: Number.isFinite(Number(course?.enrolled)) ? Number(course.enrolled) : Array.isArray(course?.enrolledStudents) ? course.enrolledStudents.length : 0,
      fees: Number.isFinite(Number(course?.fees)) ? Number(course.fees) : 0,
      status: course?.status ? course.status : course?.isActive === false ? "inactive" : "active",
    };
  }, []);

  const loadCourses = useCallback(async (targetPage = page) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminAPI.courses.list({ page: targetPage, limit: PAGE_SIZE });
      const rawCourses = response?.courses ?? response ?? [];
      const mapped = Array.isArray(rawCourses)
        ? rawCourses.map(normalizeCourse).filter((item): item is TableCourse => Boolean(item))
        : [];
      setCourses(mapped);
      setPagination(response?.pagination ?? null);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status !== 401) setError(err instanceof Error ? err.message : "Failed to load courses");
    } finally {
      setIsLoading(false);
    }
  }, [normalizeCourse, page, PAGE_SIZE]);

  useEffect(() => { void loadCourses(page); }, [loadCourses, page]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleCourseStatus = useCallback(async (row: TableCourse) => {
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setStatusUpdating((prev) => ({ ...prev, [row.id]: true }));
    setCourses((prev) => prev.map((c) => c.id === row.id ? { ...c, status: nextStatus } : c));
    try {
      await adminAPI.courses.updateStatus(row.id, nextStatus);
    } catch (err) {
      setCourses((prev) => prev.map((c) => c.id === row.id ? { ...c, status: row.status } : c));
      setError(err instanceof Error ? err.message : "Failed to update course status");
    } finally {
      setStatusUpdating((prev) => ({ ...prev, [row.id]: false }));
    }
  }, []);

  const openEditModal = (row: TableCourse) => {
    setEditingCourse(row);
    setEditForm({ ...row, subjectList: row.subject.split(", ").filter(Boolean) });
  };

  const handleEditSave = async () => {
    if (!editingCourse) return;
    setEditSaving(true);
    try {
      await adminAPI.courses.update(editingCourse.id, {
        title: editForm.title,
        fees: editForm.fees,
        subject: editForm.subjectList,
      });
      setCourses((prev) =>
        prev.map((c) =>
          c.id === editingCourse.id
            ? {
                ...c,
                title: editForm.title ?? c.title,
                fees: editForm.fees ?? c.fees,
                subject: (editForm.subjectList ?? []).join(", ") || c.subject,
              }
            : c
        )
      );
      setEditingCourse(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update course");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCourse) return;
    setDeleteConfirming(true);
    try {
      await adminAPI.courses.remove(deletingCourse.id);
      setCourses((prev) => prev.filter((c) => c.id !== deletingCourse.id));
      setDeletingCourse(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete course");
    } finally {
      setDeleteConfirming(false);
    }
  };

  const subjectOptions = useMemo(() => {
    const unique = new Set<string>();
    courses.forEach((c) => c.subject.split(",").map((s) => s.trim()).filter(Boolean).forEach((s) => unique.add(s)));
    return Array.from(unique);
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const minFee = minFeeFilter ? Number(minFeeFilter) : null;
    const minEnrolled = minEnrolledFilter ? Number(minEnrolledFilter) : null;
    return courses.filter((course) => {
      const matchesSearch = query
        ? [course.title, course.educatorName, course.subject].filter(Boolean).some((v) => v.toLowerCase().includes(query))
        : true;
      const matchesSubject = subjectFilter
        ? course.subject.split(",").map((s) => s.trim().toLowerCase()).includes(subjectFilter.toLowerCase())
        : true;
      const matchesFee = minFee !== null ? course.fees >= minFee : true;
      const matchesEnrolled = minEnrolled !== null ? course.enrolled >= minEnrolled : true;
      return matchesSearch && matchesSubject && matchesFee && matchesEnrolled;
    });
  }, [courses, debouncedSearch, subjectFilter, minFeeFilter, minEnrolledFilter]);

  const columns = [
    { key: "title" as const, label: "Title", sortable: true },
    { key: "educatorName" as const, label: "Educator", sortable: true },
    { key: "subject" as const, label: "Subject", sortable: true },
    { key: "enrolled" as const, label: "Enrolled", sortable: true },
    { key: "fees" as const, label: "Fees", sortable: true, render: (v: number) => `₹${Number(v || 0).toLocaleString("en-IN")}` },
    {
      key: "status" as const,
      label: "Status",
      render: (status: string, row: TableCourse) => (
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {status}
          </span>
          <button
            type="button"
            className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            onClick={(e) => { e.stopPropagation(); void toggleCourseStatus(row); }}
            disabled={Boolean(statusUpdating[row.id])}
          >
            {row.status === "active" ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
    {
      key: "id" as const,
      label: "Actions",
      render: (_value: string, row: TableCourse) => (
        <div className="flex items-center justify-end gap-2">
          <button type="button" className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50" onClick={(e) => { e.stopPropagation(); setSelectedCourse(row); }}>
            <Eye className="w-3.5 h-3.5" /> View
          </button>
          <button type="button" className="flex items-center gap-1 rounded border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); openEditModal(row); }}>
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button type="button" className="flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setDeletingCourse(row); }}>
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      ),
    },
  ] as const;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "#2E073F" }}>Courses Management</h1>
        <p className="text-gray-600 mt-1">Manage all courses available on the platform</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex-1 w-full">
          <Input placeholder="Search by title, educator, or subject..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="bg-white border-gray-200" />
        </div>
        <div className="relative flex items-center gap-2 md:justify-end">
          <Button type="button" variant="outline" onClick={() => setShowFilters((prev) => !prev)}>Filter</Button>
          {showFilters && (
            <div className="absolute right-24 top-12 z-20 w-80 rounded-md border border-gray-200 bg-white p-4 shadow-lg">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-600">Subject</p>
                  <select className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                    <option value="">All</option>
                    {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Min Fee</p>
                  <select className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm" value={minFeeFilter} onChange={(e) => setMinFeeFilter(e.target.value)}>
                    <option value="">Any</option>
                    <option value="500">₹500+</option>
                    <option value="1000">₹1,000+</option>
                    <option value="5000">₹5,000+</option>
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
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setSubjectFilter(""); setMinFeeFilter(""); setMinEnrolledFilter(""); }}>Clear</Button>
                  <Button type="button" size="sm" onClick={() => setShowFilters(false)}>Apply</Button>
                </div>
              </div>
            </div>
          )}
          <Button type="button" variant="outline" className="flex items-center gap-2" onClick={() => void loadCourses(page)} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <DataTable data={filteredCourses} columns={columns as any} isLoading={isLoading} />

      <Pagination currentPage={pagination?.currentPage ?? page} totalPages={pagination?.totalPages ?? 1} onPageChange={(p) => setPage(p)} isLoading={isLoading} />

      {pagination && <p className="mt-3 text-sm text-gray-500">Showing {filteredCourses.length} of {pagination.totalCourses} courses</p>}

      {/* View Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={() => setSelectedCourse(null)}>
          <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Course Details</h2>
              <button type="button" className="rounded-full p-1 hover:bg-gray-100" onClick={() => setSelectedCourse(null)}><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4 px-6 py-5 text-sm text-gray-700">
              <div><p className="text-xs uppercase tracking-wide text-gray-500">Title</p><p className="mt-1 text-base font-medium text-gray-900">{selectedCourse.title}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Educator</p><p className="mt-1 text-sm text-gray-900">{selectedCourse.educatorName}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Subject</p><p className="mt-1 text-sm text-gray-900">{selectedCourse.subject}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Enrolled</p><p className="mt-1 text-sm text-gray-900">{selectedCourse.enrolled}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Fees</p><p className="mt-1 text-sm text-gray-900">₹{Number(selectedCourse.fees || 0).toLocaleString("en-IN")}</p></div>
              </div>
              <div><p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                <span className={`mt-1 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${selectedCourse.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{selectedCourse.status}</span>
              </div>
            </div>
            <div className="flex justify-end border-t border-gray-200 px-6 py-4"><Button type="button" variant="outline" onClick={() => setSelectedCourse(null)}>Close</Button></div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={() => !editSaving && setEditingCourse(null)}>
          <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Course</h2>
              <button type="button" className="rounded-full p-1 hover:bg-gray-100" onClick={() => !editSaving && setEditingCourse(null)}><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Title</label>
                <Input className="mt-1" value={editForm.title ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} disabled={editSaving} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fees (₹)</label>
                  <Input className="mt-1" type="number" value={editForm.fees ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, fees: Number(e.target.value) }))} disabled={editSaving} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subject (comma-separated)</label>
                  <Input className="mt-1" value={(editForm.subjectList ?? []).join(", ")} onChange={(e) => setEditForm((f) => ({ ...f, subjectList: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))} disabled={editSaving} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setEditingCourse(null)} disabled={editSaving}>Cancel</Button>
              <Button type="button" className="bg-[#AD49E1] text-white hover:bg-[#932ccc]" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={() => !deleteConfirming && setDeletingCourse(null)}>
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900">Delete Course</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700">Are you sure you want to permanently delete <strong>{deletingCourse.title}</strong>? This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setDeletingCourse(null)} disabled={deleteConfirming}>Cancel</Button>
              <Button type="button" className="bg-red-600 text-white hover:bg-red-700" onClick={handleDeleteConfirm} disabled={deleteConfirming}>
                {deleteConfirming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : "Delete Course"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
