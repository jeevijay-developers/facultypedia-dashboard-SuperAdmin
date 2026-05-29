"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2, RefreshCw, X, Loader2, AlertTriangle } from "lucide-react";
import adminAPI from "@/util/server";

type TableTest = {
  id: string;
  title: string;
  educatorName: string;
  subject: string;
  duration: number;
  marks: number;
  questions: number;
  enrolled: number;
  status: string;
};

type PaginationMeta = {
  currentPage: number;
  totalPages: number;
  totalTests: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
};

export default function TestsPage() {
  const [tests, setTests] = useState<TableTest[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [minMarksFilter, setMinMarksFilter] = useState<string>("");
  const [minQuestionsFilter, setMinQuestionsFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<TableTest | null>(null);
  const [editingTest, setEditingTest] = useState<TableTest | null>(null);
  const [editForm, setEditForm] = useState<Partial<TableTest & { subjectList: string[] }>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [deletingTest, setDeletingTest] = useState<TableTest | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<Record<string, boolean>>({});
  const PAGE_SIZE = 10;

  const normalizeTest = useCallback((test: any): TableTest | null => {
    const id = test?.id ?? test?._id;
    if (!id) return null;

    const subjectList = Array.isArray(test?.subject)
      ? test.subject.filter(Boolean)
      : Array.isArray(test?.subjects)
      ? test.subjects.filter(Boolean)
      : test?.subject ? [test.subject] : test?.subjects ? [test.subjects] : [];

    const marks = Number.isFinite(Number(test?.marks)) ? Number(test.marks) : Number.isFinite(Number(test?.overallMarks)) ? Number(test.overallMarks) : 0;
    const questionsCount = Number.isFinite(Number(test?.questions)) ? Number(test.questions) : Array.isArray(test?.questions) ? test.questions.length : 0;

    return {
      id: String(id),
      title: test?.title || "Untitled test",
      educatorName: test?.educatorName || "—",
      subject: subjectList.length ? subjectList.join(", ") : "—",
      duration: Number.isFinite(Number(test?.duration)) ? Number(test.duration) : 0,
      marks,
      questions: questionsCount,
      enrolled: Number.isFinite(Number(test?.enrolled)) ? Number(test.enrolled) : Array.isArray(test?.enrolledStudents) ? test.enrolledStudents.length : Array.isArray(test?.attempts) ? test.attempts.length : 0,
      status: test?.status ? test.status : test?.isActive === false ? "inactive" : "active",
    };
  }, []);

  const loadTests = useCallback(async (targetPage = page) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminAPI.tests.list({ page: targetPage, limit: PAGE_SIZE });
      const rawTests = response?.tests ?? response ?? [];
      const mapped = Array.isArray(rawTests)
        ? rawTests.map(normalizeTest).filter((item): item is TableTest => Boolean(item))
        : [];
      setTests(mapped);
      setPagination(response?.pagination ?? null);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status !== 401) setError(err instanceof Error ? err.message : "Failed to load tests");
    } finally {
      setIsLoading(false);
    }
  }, [normalizeTest, page, PAGE_SIZE]);

  useEffect(() => { void loadTests(page); }, [loadTests, page]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleTestStatus = useCallback(async (row: TableTest) => {
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setStatusUpdating((prev) => ({ ...prev, [row.id]: true }));
    setTests((prev) => prev.map((t) => t.id === row.id ? { ...t, status: nextStatus } : t));
    try {
      await adminAPI.tests.updateStatus(row.id, nextStatus);
    } catch (err) {
      setTests((prev) => prev.map((t) => t.id === row.id ? { ...t, status: row.status } : t));
      setError(err instanceof Error ? err.message : "Failed to update test status");
    } finally {
      setStatusUpdating((prev) => ({ ...prev, [row.id]: false }));
    }
  }, []);

  const openEditModal = (row: TableTest) => {
    setEditingTest(row);
    setEditForm({ ...row, subjectList: row.subject.split(", ").filter(Boolean) });
  };

  const handleEditSave = async () => {
    if (!editingTest) return;
    setEditSaving(true);
    try {
      await adminAPI.tests.update(editingTest.id, {
        title: editForm.title,
        duration: editForm.duration,
        marks: editForm.marks,
        subject: editForm.subjectList,
      });
      setTests((prev) =>
        prev.map((t) =>
          t.id === editingTest.id
            ? {
                ...t,
                title: editForm.title ?? t.title,
                duration: editForm.duration ?? t.duration,
                marks: editForm.marks ?? t.marks,
                subject: (editForm.subjectList ?? []).join(", ") || t.subject,
              }
            : t
        )
      );
      setEditingTest(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update test");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTest) return;
    setDeleteConfirming(true);
    try {
      await adminAPI.tests.remove(deletingTest.id);
      setTests((prev) => prev.filter((t) => t.id !== deletingTest.id));
      setDeletingTest(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete test");
    } finally {
      setDeleteConfirming(false);
    }
  };

  const subjectOptions = useMemo(() => {
    const unique = new Set<string>();
    tests.forEach((t) => t.subject.split(",").map((s) => s.trim()).filter(Boolean).forEach((s) => unique.add(s)));
    return Array.from(unique);
  }, [tests]);

  const filteredTests = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const minMarks = minMarksFilter ? Number(minMarksFilter) : null;
    const minQuestions = minQuestionsFilter ? Number(minQuestionsFilter) : null;
    return tests.filter((test) => {
      const matchesSearch = query ? [test.title, test.subject, test.educatorName].filter(Boolean).some((v) => v.toLowerCase().includes(query)) : true;
      const matchesSubject = subjectFilter ? test.subject.split(",").map((s) => s.trim().toLowerCase()).includes(subjectFilter.toLowerCase()) : true;
      const matchesMarks = minMarks !== null ? test.marks >= minMarks : true;
      const matchesQuestions = minQuestions !== null ? test.questions >= minQuestions : true;
      return matchesSearch && matchesSubject && matchesMarks && matchesQuestions;
    });
  }, [tests, debouncedSearch, subjectFilter, minMarksFilter, minQuestionsFilter]);

  const columns = [
    { key: "title" as const, label: "Title", sortable: true },
    { key: "educatorName" as const, label: "Educator", sortable: true },
    { key: "subject" as const, label: "Subject", sortable: true },
    { key: "duration" as const, label: "Duration (min)", sortable: true },
    { key: "marks" as const, label: "Marks", sortable: true },
    { key: "questions" as const, label: "Questions", sortable: true },
    {
      key: "status" as const,
      label: "Status",
      render: (status: string, row: TableTest) => (
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{status}</span>
          <button type="button" className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60" onClick={(e) => { e.stopPropagation(); void toggleTestStatus(row); }} disabled={Boolean(statusUpdating[row.id])}>
            {row.status === "active" ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
    {
      key: "id" as const,
      label: "Actions",
      render: (_value: string, row: TableTest) => (
        <div className="flex items-center justify-end gap-2">
          <button type="button" className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50" onClick={(e) => { e.stopPropagation(); setSelectedTest(row); }}><Eye className="w-3.5 h-3.5" /> View</button>
          <button type="button" className="flex items-center gap-1 rounded border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); openEditModal(row); }}><Pencil className="w-3.5 h-3.5" /> Edit</button>
          <button type="button" className="flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setDeletingTest(row); }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
        </div>
      ),
    },
  ] as const;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "#2E073F" }}>Tests Management</h1>
        <p className="text-gray-600 mt-1">Manage all tests and mock exams</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex-1 w-full">
          <Input placeholder="Search by title or subject..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="bg-white border-gray-200" />
        </div>
        <div className="relative flex items-center gap-2 md:justify-end">
          <Button type="button" variant="outline" onClick={() => setShowFilters((p) => !p)}>Filter</Button>
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
                  <p className="text-xs font-semibold text-gray-600">Min Marks</p>
                  <select className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm" value={minMarksFilter} onChange={(e) => setMinMarksFilter(e.target.value)}>
                    <option value="">Any</option>
                    <option value="50">50+</option>
                    <option value="100">100+</option>
                    <option value="200">200+</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Min Questions</p>
                  <select className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm" value={minQuestionsFilter} onChange={(e) => setMinQuestionsFilter(e.target.value)}>
                    <option value="">Any</option>
                    <option value="50">50+</option>
                    <option value="100">100+</option>
                    <option value="150">150+</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setSubjectFilter(""); setMinMarksFilter(""); setMinQuestionsFilter(""); }}>Clear</Button>
                  <Button type="button" size="sm" onClick={() => setShowFilters(false)}>Apply</Button>
                </div>
              </div>
            </div>
          )}
          <Button type="button" variant="outline" className="flex items-center gap-2" onClick={() => void loadTests(page)} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      <DataTable data={filteredTests} columns={columns as any} isLoading={isLoading} />
      <Pagination currentPage={pagination?.currentPage ?? page} totalPages={pagination?.totalPages ?? 1} onPageChange={(p) => setPage(p)} isLoading={isLoading} />
      {pagination && <p className="mt-3 text-sm text-gray-500">Showing {filteredTests.length} of {pagination.totalTests} tests</p>}

      {/* View Modal */}
      {selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={() => setSelectedTest(null)}>
          <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Test Details</h2>
              <button type="button" className="rounded-full p-1 hover:bg-gray-100" onClick={() => setSelectedTest(null)}><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4 px-6 py-5 text-sm text-gray-700">
              <div><p className="text-xs uppercase tracking-wide text-gray-500">Title</p><p className="mt-1 text-base font-medium text-gray-900">{selectedTest.title}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-gray-500">Educator</p><p className="mt-1 text-sm text-gray-900">{selectedTest.educatorName}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Subject</p><p className="mt-1 text-sm text-gray-900">{selectedTest.subject}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Duration (min)</p><p className="mt-1 text-sm text-gray-900">{selectedTest.duration}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Marks</p><p className="mt-1 text-sm text-gray-900">{selectedTest.marks}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Questions</p><p className="mt-1 text-sm text-gray-900">{selectedTest.questions}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Enrolled</p><p className="mt-1 text-sm text-gray-900">{selectedTest.enrolled}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                  <span className={`mt-1 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${selectedTest.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{selectedTest.status}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-gray-200 px-6 py-4"><Button type="button" variant="outline" onClick={() => setSelectedTest(null)}>Close</Button></div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={() => !editSaving && setEditingTest(null)}>
          <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Test</h2>
              <button type="button" className="rounded-full p-1 hover:bg-gray-100" onClick={() => !editSaving && setEditingTest(null)}><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Title</label>
                <Input className="mt-1" value={editForm.title ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} disabled={editSaving} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Duration (min)</label>
                  <Input className="mt-1" type="number" value={editForm.duration ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, duration: Number(e.target.value) }))} disabled={editSaving} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Marks</label>
                  <Input className="mt-1" type="number" value={editForm.marks ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, marks: Number(e.target.value) }))} disabled={editSaving} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subject (comma-separated)</label>
                <Input className="mt-1" value={(editForm.subjectList ?? []).join(", ")} onChange={(e) => setEditForm((f) => ({ ...f, subjectList: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))} disabled={editSaving} />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setEditingTest(null)} disabled={editSaving}>Cancel</Button>
              <Button type="button" className="bg-[#AD49E1] text-white hover:bg-[#932ccc]" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={() => !deleteConfirming && setDeletingTest(null)}>
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900">Delete Test</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700">Are you sure you want to permanently delete <strong>{deletingTest.title}</strong>? This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setDeletingTest(null)} disabled={deleteConfirming}>Cancel</Button>
              <Button type="button" className="bg-red-600 text-white hover:bg-red-700" onClick={handleDeleteConfirm} disabled={deleteConfirming}>
                {deleteConfirming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : "Delete Test"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
