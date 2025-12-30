"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  BookOpen,
  TestTube,
  Zap,
  Video,
  BarChart3,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import adminAPI from "@/util/server"

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
  // { href: "/admin/settings", icon: Settings, label: "Settings" },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await adminAPI.auth.logout();
    } catch (error) {
      console.error("Failed to logout admin:", error);
      adminAPI.auth.clearSession();
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("super-admin-token");
      }
      router.replace("/login");
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Image
            src="/icon-dark-32x32.png"
            alt="Facultypedia Logo"
            width={40}
            height={40}
          />
          <div>
            <h1 className="font-bold text-lg" style={{ color: "#2E073F" }}>
              Faculty Pedia
            </h1>
            <p className="text-xs text-gray-500">Super Admin</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-[#AD49E1] text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="space-y-3">
          <div className="px-4 py-3 rounded-lg" style={{ backgroundColor: "#F5F0FA" }}>
            <p className="text-xs font-medium" style={{ color: "#2E073F" }}>
              Need help?
            </p>
            <p className="text-xs text-gray-600 mt-1">Contact support for assistance</p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-900"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </aside>
  )
}
