"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, BookOpen, TestTube, Zap, Video, BarChart3, Settings } from "lucide-react"

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/educators", icon: Users, label: "Educators" },
  { href: "/admin/students", icon: Users, label: "Students" },
  { href: "/admin/courses", icon: BookOpen, label: "Courses" },
  { href: "/admin/tests", icon: TestTube, label: "Tests" },
  { href: "/admin/test-series", icon: Zap, label: "Test Series" },
  { href: "/admin/webinars", icon: Video, label: "Webinars" },
  { href: "/admin/live-classes", icon: Video, label: "Live Classes" },
  { href: "/admin/revenue", icon: BarChart3, label: "Revenue & Payments" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: "#AD49E1" }} />
          <div>
            <h1 className="font-bold text-lg" style={{ color: "#2E073F" }}>
              Facultypedia
            </h1>
            <p className="text-xs text-gray-500">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive ? "text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
              style={{
                backgroundColor: isActive ? "#AD49E1" : "transparent",
              }}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="px-4 py-3 rounded-lg" style={{ backgroundColor: "#F5F0FA" }}>
          <p className="text-xs font-medium" style={{ color: "#2E073F" }}>
            Need help?
          </p>
          <p className="text-xs text-gray-600 mt-1">Contact support for assistance</p>
        </div>
      </div>
    </aside>
  )
}
