import type React from "react"
interface KPICardProps {
  label: string
  value: string | number
  change?: string
  trend?: "up" | "down"
  icon?: React.ReactNode
}

export function KPICard({ label, value, change, trend, icon }: KPICardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 font-medium">{label}</p>
          <p className="text-2xl font-bold mt-2" style={{ color: "#2E073F" }}>
            {value}
          </p>
          {change && (
            <p className={`text-xs mt-2 ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
              {trend === "up" ? "↑" : "↓"} {change}
            </p>
          )}
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
    </div>
  )
}
