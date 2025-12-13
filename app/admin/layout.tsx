"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Sidebar } from "@/components/admin/sidebar"
import { TopBar } from "@/components/admin/top-bar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("super-admin-token")
        : null

    if (!token) {
      router.replace("/login")
      return
    }

    setIsAuthorized(true)
  }, [router])

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-gray-500">
        Loading dashboard…
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto bg-white">{children}</main>
      </div>
    </div>
  )
}
