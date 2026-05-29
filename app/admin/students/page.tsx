"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { DataTable } from "@/components/admin/data-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, Pencil, Trash2, RefreshCw, X, Loader2, AlertTriangle } from "lucide-react"
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
  const [selectedStudent, setSelectedStudent] = useState<TableStudent | null>(null)
  const [editingStudent, setEditingStudent] = useState<TableStudent | null>(null)
  const [editForm, setEditForm] = useState<Partial<TableStudent>>({})
  const [editSaving, setEditSaving] = useState(false)
  const [deletingStudent, setDeletingStudent] = useState<TableStudent | null>(null)
  const [deleteConfirming, setDeleteConfirming] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState<Record<string, boolean>>({})

  const normalizeStudent = useCallback((student: any): TableStudent | null => {
    const id = student?.id ?? student?._id
    if (!id) return null

    const specializationList = Array.isArray(student?.specialization)
      ? student.specialization.filter(Boolean)
      : student?.specialization
        ? [student.specialization]
        : []

    const specialization = specializationList.length ? specializationList.join(", ") : "—"

    const enrolledCourses = Number.isFinite(Number(student?.enrolledCourses))
      ? Number(student.enrolledCourses)
      : Array.isArray(student?.courses)
        ? student.courses.length
        : 0

    const isActive = student?.status
      ? student.status
      : student?.isActive === false ? "inactive" : "active"

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
        ? rawStudents.map(normalizeStudent).filter((item): item is TableStudent => Boolean(item))
        : []
      setStudents(mapped)
      setPagination(response?.pagination ?? null)
    } catch (err) {
      const status = (err as { status?: number })?.status
      if (status !== 401) {
        setError(err instanceof Error ? err.message : "Failed to load students")
      }
    } finally {
      setIsLoading(false)
    }
  }, [normalizeStudent])

  useEffect(() => { void loadStudents() }, [loadStudents])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const toggleStudentStatus = useCallback(async (row: TableStudent) => {
    const nextStatus = row.status === "active" ? "inactive" : "active"
    setStatusUpdating((prev) => ({ ...prev, [row.id]: true }))
    setStudents((prev) => prev.map((s) => s.id === row.id ? { ...s, status: nextStatus } : s))
    try {
      await adminAPI.students.updateStatus(row.id, nextStatus === "active")
    } catch (err) {
      setStudents((prev) => prev.map((s) => s.id === row.id ? { ...s, status: row.status } : s))
      setError(err instanceof Error ? err.message : "Failed to update student status")
    } finally {
      setStatusUpdating((prev) => ({ ...prev, [row.id]: false }))
    }
  }, [])

  const openEditModal = (row: TableStudent) => {
    setEditingStudent(row)
    setEditForm({ ...row })
  }

  const handleEditSave = async () => {
    if (!editingStudent) return
    setEditSaving(true)
    try {
      await adminAPI.students.update(editingStudent.id, {
        name: editForm.name,
        email: editForm.email,
        class: editForm.class,
        specialization: editForm.specializationList,
      })
      setStudents((prev) =>
        prev.map((s) =>
          s.id === editingStudent.id
            ? {
                ...s,
                name: editForm.name ?? s.name,
                email: editForm.email ?? s.email,
                class: editForm.class ?? s.class,
                specializationList: editForm.specializationList ?? s.specializationList,
                specialization: (editForm.specializationList ?? s.specializationList).join(", ") || "—",
              }
            : s
        )
      )
      setEditingStudent(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update student")
    } finally {
      setEditSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingStudent) return
    setDeleteConfirming(true)
    try {
      await adminAPI.students.remove(deletingStudent.id)
      setStudents((prev) => prev.filter((s) => s.id !== deletingStudent.id))
      setDeletingStudent(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete student")
    } finally {
      setDeleteConfirming(false)
    }
  }

  const classOptions = useMemo(() => {
    const unique = new Set<string>()
    students.forEach((s) => { if (s.class) unique.add(s.class) })
    return Array.from(unique)
  }, [students])

  const examOptions = useMemo(() => {
    const unique = new Set<string>()
    students.forEach((s) => s.specializationList.forEach((exam) => unique.add(exam)))
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
      render: (status: string, row: TableStudent) => (
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {status}
          </span>
          <button
            type="button"
            className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            onClick={(e) => { e.stopPropagation(); void toggleStudentStatus(row) }}
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
      render: (_value: string, row: TableStudent) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
            onClick={(e) => { e.stopPropagation(); setSelectedStudent(row) }}
          >
            <Eye className="w-3.5 h-3.5" /> View
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
            onClick={(e) => { e.stopPropagation(); openEditModal(row) }}
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
            onClick={(e) => { e.stopPropagation(); setDeletingStudent(row) }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      ),
    },
  ] as const

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "#2E073F" }}>Students Management</h1>
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
          <Button type="button" variant="outline" onClick={() => setShowFilters((prev) => !prev)}>
            Filter
          </Button>
          {showFilters && (
            <div className="absolute right-24 top-12 z-20 w-72 rounded-md border border-gray-200 bg-white p-4 shadow-lg">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-600">Class</p>
                  <select className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                    <option value="">All</option>
                    {classOptions.map((cls) => <option key={cls} value={cls}>{cls}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Exam</p>
                  <select className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm" value={examFilter} onChange={(e) => setExamFilter(e.target.value)}>
                    <option value="">All</option>
                    {examOptions.map((exam) => <option key={exam} value={exam}>{exam}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setClassFilter(""); setExamFilter("") }}>Clear</Button>
                  <Button type="button" size="sm" onClick={() => setShowFilters(false)}>Apply</Button>
                </div>
              </div>
            </div>
          )}
          <Button type="button" variant="outline" className="flex items-center gap-2" onClick={() => void loadStudents()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      <DataTable data={filteredStudents} columns={columns as any} isLoading={isLoading} />

      {pagination && (
        <p className="mt-3 text-sm text-gray-500">
          Showing {filteredStudents.length} of {pagination.totalStudents} students
        </p>
      )}

      {/* ── View Modal ─────────────────────────────────────────────────────── */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={() => setSelectedStudent(null)}>
          <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Student Details</h2>
              <button type="button" className="rounded-full p-1 hover:bg-gray-100" onClick={() => setSelectedStudent(null)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5 text-sm text-gray-700">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Name</p>
                <p className="mt-1 text-base font-medium text-gray-900">{selectedStudent.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Email</p>
                  <p className="mt-1 break-all text-sm text-gray-900">{selectedStudent.email}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Class</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedStudent.class}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Exam</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedStudent.specialization}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                  <span className={`mt-1 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${selectedStudent.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {selectedStudent.status}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Courses</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedStudent.enrolledCourses}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Joined</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedStudent.joinedAt || "—"}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-gray-200 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setSelectedStudent(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={() => !editSaving && setEditingStudent(null)}>
          <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Student</h2>
              <button type="button" className="rounded-full p-1 hover:bg-gray-100" onClick={() => !editSaving && setEditingStudent(null)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Full Name</label>
                <Input className="mt-1" value={editForm.name ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} disabled={editSaving} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</label>
                  <Input className="mt-1" value={editForm.email ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} disabled={editSaving} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Class</label>
                  <Input className="mt-1" value={editForm.class ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, class: e.target.value }))} disabled={editSaving} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Exams/Specialization (comma-separated)</label>
                <Input
                  className="mt-1"
                  value={(editForm.specializationList ?? []).join(", ")}
                  onChange={(e) => setEditForm((f) => ({ ...f, specializationList: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                  disabled={editSaving}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setEditingStudent(null)} disabled={editSaving}>Cancel</Button>
              <Button type="button" className="bg-[#AD49E1] text-white hover:bg-[#932ccc]" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ───────────────────────────────────────── */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={() => !deleteConfirming && setDeletingStudent(null)}>
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900">Delete Student</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700">
                Are you sure you want to permanently delete <strong>{deletingStudent.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setDeletingStudent(null)} disabled={deleteConfirming}>Cancel</Button>
              <Button type="button" className="bg-red-600 text-white hover:bg-red-700" onClick={handleDeleteConfirm} disabled={deleteConfirming}>
                {deleteConfirming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : "Delete Student"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
