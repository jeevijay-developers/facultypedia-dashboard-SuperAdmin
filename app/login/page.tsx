"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// const FALLBACK_EMAIL = "admin@facultypedia.com";
// const FALLBACK_PASSWORD = "Admin@123";
import adminAPI from "@/util/server";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (adminAPI.auth.isAuthenticated()) {
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
      await adminAPI.auth.login({ email: email.trim(), password });
      router.replace("/admin");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Invalid credentials. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-purple-50 via-white to-purple-50 px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100">
        <div
          className="flex flex-col items-center gap-3 border-b border-purple-100 px-8 py-6 text-center"
          style={{ backgroundColor: "#f5f3ff" }}
        >
          <div className="relative h-16 w-16">
            <Image
              src="/icon-dark-32x32.png"
              alt="Facultypedia Logo"
              width={64}
              height={64}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "#2E073F" }}>
              Super Admin Portal
            </h1>
            <p className="text-sm text-gray-600">
              Sign in to administer the Facultypedia platform.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-8 py-8">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
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
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                className="h-11 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="h-11 w-full text-white"
            style={{ backgroundColor: "#AD49E1" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#7B2FBE")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#AD49E1")
            }
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>

          <p className="text-center text-xs text-gray-500">
            Having trouble? Contact the Facultypedia platform administrator.
          </p>
        </form>
      </div>
    </div>
  );
}
