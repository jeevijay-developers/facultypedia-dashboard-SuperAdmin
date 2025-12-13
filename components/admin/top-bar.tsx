"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Bell, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export function TopBar() {
  const router = useRouter()

  const handleLogout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("super-admin-token")
    }
    router.replace("/login")
  }, [router])

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-gray-300"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
        <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-gray-300 font-semibold text-gray-600 sm:flex">
          SA
        </div>
      </div>
    </header>
  )
}
