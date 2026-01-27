"use client"

import type React from "react"

import { Sidebar } from "@/components/admin/sidebar"
import { AuthGuard } from "@/components/auth-guard"


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-white">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          
          <main className="flex-1 overflow-auto bg-white">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}
