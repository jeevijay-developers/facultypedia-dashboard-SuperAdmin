"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FALLBACK_EMAIL = "admin@facultypedia.com";
const FALLBACK_PASSWORD = "Admin@123";

const ALLOWED_EMAIL =
  process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL?.trim() || FALLBACK_EMAIL;
const ALLOWED_PASSWORD =
  process.env.NEXT_PUBLIC_SUPERADMIN_PASSWORD ?? FALLBACK_PASSWORD;

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("super-admin-token") : null;
    if (token) {
      router.replace("/admin");
    }
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const expectedEmail = ALLOWED_EMAIL.toLowerCase();

      if (normalizedEmail !== expectedEmail || password !== ALLOWED_PASSWORD) {
        setError("Invalid email or password. Please try again.");
        return;
      }

      const demoToken = `demo-${Date.now()}`;
      localStorage.setItem("super-admin-token", demoToken);
      router.replace("/admin");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to login. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col items-center gap-3 border-b border-slate-100 bg-slate-50 px-8 py-6 text-center">
          <div className="relative h-12 w-12">
           
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Super Admin Portal</h1>
            <p className="text-sm text-slate-600">Sign in to administer the Facultypedia platform.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-8 py-8">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@facultypedia.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              className="h-11"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="h-11 w-full bg-slate-900 text-white hover:bg-slate-800"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>

          <p className="text-center text-xs text-slate-500">
            Having trouble? Contact the Facultypedia platform administrator.
          </p>
        </form>
      </div>
    </div>
  );
}
