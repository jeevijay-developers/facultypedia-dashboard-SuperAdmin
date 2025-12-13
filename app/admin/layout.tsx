"use client"

import type React from "react"

import { Sidebar } from "@/components/admin/sidebar"
import { TopBar } from "@/components/admin/top-bar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
