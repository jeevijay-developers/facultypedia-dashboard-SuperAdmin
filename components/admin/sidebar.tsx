"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  TestTube,
  Zap,
  Video,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import adminAPI from "@/util/server";

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
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

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
          <div
            className="w-10 h-10 rounded-lg"
            style={{ backgroundColor: "#AD49E1" }}
          />
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
          const Icon = item.icon;
          const isActive = pathname === item.href;
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
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-900"
            onClick={() => setShowLogoutDialog(true)}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You will need to login again to
              access the admin panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void handleLogout();
              }}
              className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
