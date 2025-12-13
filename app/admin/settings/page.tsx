"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "#2E073F" }}>
          Settings
        </h1>
        <p className="text-gray-600 mt-1">Manage platform configuration and preferences</p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Platform Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#2E073F" }}>
            Platform Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Platform Name</label>
              <Input defaultValue="Facultypedia" className="bg-white border-gray-200" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Support Email</label>
              <Input defaultValue="support@facultypedia.com" className="bg-white border-gray-200" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Commission Rate (%)</label>
              <Input defaultValue="20" type="number" className="bg-white border-gray-200" />
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#2E073F" }}>
            Global Controls
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Allow New Educators</label>
              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Allow New Courses</label>
              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Allow Payments</label>
              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <Button style={{ backgroundColor: "#AD49E1", color: "white" }}>Save Changes</Button>
          <Button variant="outline">Cancel</Button>
        </div>
      </div>
    </div>
  )
}
