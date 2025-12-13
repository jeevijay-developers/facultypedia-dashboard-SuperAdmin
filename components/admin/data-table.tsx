"use client"

import type React from "react"

import { useState } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"

interface Column<T> {
  key: keyof T
  label: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (row: T) => void
}

export function DataTable<T extends { id: string | number }>({ data, columns, onRowClick }: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T
    direction: "asc" | "desc"
  } | null>(null)

  const sortedData = sortConfig
    ? [...data].sort((a, b) => {
        const aVal = a[sortConfig.key]
        const bVal = b[sortConfig.key]
        const comp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return sortConfig.direction === "asc" ? comp : -comp
      })
    : data

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <th key={String(col.key)} className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                <button
                  onClick={() =>
                    setSortConfig({
                      key: col.key,
                      direction: sortConfig?.key === col.key && sortConfig.direction === "asc" ? "desc" : "asc",
                    })
                  }
                  className="flex items-center gap-2 hover:opacity-70"
                  disabled={!col.sortable}
                >
                  {col.label}
                  {col.sortable &&
                    sortConfig?.key === col.key &&
                    (sortConfig.direction === "asc" ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    ))}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, idx) => (
            <tr
              key={row.id}
              className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className="px-6 py-4 text-sm text-gray-900">
                  {col.render ? col.render(row[col.key], row) : String(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
