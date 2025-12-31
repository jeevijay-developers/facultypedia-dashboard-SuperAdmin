"use client";

export default function ChatPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "#2E073F" }}>
          Chat
        </h1>
        <p className="text-gray-600 mt-1">Manage educator conversations</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-8">
        <div className="text-center text-gray-500">
          <p className="mb-2">
            Chat functionality is available in the Educators page.
          </p>
          <p className="text-sm">
            Navigate to Educators to view and manage conversations.
          </p>
        </div>
      </div>
    </div>
  );
}
