"use client";

const DEFAULT_TIMEOUT = 30_000;
const ACCESS_TOKEN_KEY = "super-admin-access-token";
const REFRESH_TOKEN_KEY = "super-admin-refresh-token";
const PROFILE_KEY = "super-admin-profile";

const ensureTrailingSlash = (value = "") =>
  value.endsWith("/") ? value : `${value}/`;

const resolveBaseURL = () => {
  const envUrl =
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BASE_URL;
  return ensureTrailingSlash(envUrl || "http://localhost:5000");
};

const API_BASE_URL = resolveBaseURL();

const isFormData = (value) =>
  typeof FormData !== "undefined" && value instanceof FormData;

const storage = {
  getItem(key) {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.warn("Unable to read from localStorage:", error);
      return null;
    }
  },
  setItem(key, value) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.warn("Unable to write to localStorage:", error);
    }
  },
  removeItem(key) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn("Unable to remove localStorage key:", error);
    }
  },
};

const safeToString = (value) =>
  value === undefined || value === null ? "" : String(value);

const safeJSONParse = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn("Failed to parse JSON from storage:", error);
    return null;
  }
};

class APIError extends Error {
  constructor(message, { status = 0, payload = null } = {}) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.payload = payload;
  }
}

const buildURL = (path, params) => {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(normalizedPath, API_BASE_URL);

  if (params && typeof params === "object") {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      if (Array.isArray(value)) {
        value
          .filter((entry) => entry !== undefined && entry !== null)
          .forEach((entry) =>
            url.searchParams.append(key, safeToString(entry))
          );
        return;
      }

      url.searchParams.append(key, safeToString(value));
    });
  }

  return url;
};

const getAccessToken = () => storage.getItem(ACCESS_TOKEN_KEY);
const getRefreshToken = () => storage.getItem(REFRESH_TOKEN_KEY);

export const getAdminAccessToken = () => getAccessToken();

export const getCachedAdminProfile = () =>
  safeJSONParse(storage.getItem(PROFILE_KEY));

const persistAdminSession = ({ accessToken, refreshToken, admin } = {}) => {
  if (accessToken) {
    storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  if (refreshToken) {
    storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  if (admin) {
    storage.setItem(PROFILE_KEY, JSON.stringify(admin));
  }
};

export const clearAdminSession = () => {
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
  storage.removeItem(PROFILE_KEY);
};

const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
};

const request = async (path, options = {}) => {
  const {
    method = "GET",
    params,
    body,
    headers = {},
    auth = true,
    timeout = DEFAULT_TIMEOUT,
  } = options;

  const url = buildURL(path, params);
  const fetchOptions = {
    method,
    headers: new Headers(headers),
    credentials: "include",
    cache: "no-store",
  };

  if (auth) {
    const token = getAccessToken();
    if (token) {
      fetchOptions.headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (body !== undefined && body !== null) {
    if (isFormData(body)) {
      fetchOptions.body = body;
    } else if (body instanceof URLSearchParams) {
      fetchOptions.headers.set(
        "Content-Type",
        "application/x-www-form-urlencoded;charset=UTF-8"
      );
      fetchOptions.body = body.toString();
    } else if (
      typeof body === "string" ||
      (typeof Blob !== "undefined" && body instanceof Blob)
    ) {
      fetchOptions.body = body;
    } else {
      fetchOptions.headers.set("Content-Type", "application/json");
      fetchOptions.body = JSON.stringify(body);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  fetchOptions.signal = controller.signal;

  try {
    const response = await fetch(url.toString(), fetchOptions);
    clearTimeout(timeoutId);

    const payload = await parseResponse(response);

    if (!response.ok) {
      const message =
        (payload && typeof payload === "object" && payload.message) ||
        `Request failed with status ${response.status}`;

      if (response.status === 401) {
        clearAdminSession();
      }

      throw new APIError(message, { status: response.status, payload });
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new APIError("Request timed out", { status: 408 });
    }

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(error?.message || "Network request failed", {
      status: 0,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

export const isAdminAuthenticated = () => Boolean(getAccessToken());
const FALLBACK_SUPERADMIN_EMAIL = "admin@facultypedia.com";
const FALLBACK_SUPERADMIN_PASSWORD = "Admin@123";
const FALLBACK_SUPERADMIN_USERNAME = "superadmin";
const FALLBACK_SUPERADMIN_FULLNAME = "Super Admin";

const configuredAdminEmail =
  (process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL || "").trim() ||
  FALLBACK_SUPERADMIN_EMAIL;
const configuredAdminPassword =
  process.env.NEXT_PUBLIC_SUPERADMIN_PASSWORD ?? FALLBACK_SUPERADMIN_PASSWORD;
const configuredAdminUsername =
  (process.env.NEXT_PUBLIC_SUPERADMIN_USERNAME || "").trim() ||
  FALLBACK_SUPERADMIN_USERNAME;
const configuredAdminFullName =
  (process.env.NEXT_PUBLIC_SUPERADMIN_FULLNAME || "").trim() ||
  FALLBACK_SUPERADMIN_FULLNAME;

const hasAutoAuthCredentials =
  Boolean(configuredAdminEmail) && Boolean(configuredAdminPassword);

let pendingAdminLoginPromise = null;

const autoProvisionSuperAdmin = async () => {
  if (!hasAutoAuthCredentials) {
    return false;
  }

  try {
    const response = await request("/api/auth/admin-signup", {
      method: "POST",
      body: {
        username: configuredAdminUsername,
        email: configuredAdminEmail,
        password: configuredAdminPassword,
        fullName: configuredAdminFullName,
      },
      auth: false,
    });

    const data = response?.data;

    if (data?.accessToken) {
      persistAdminSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        admin: data.admin,
      });
      return true;
    }

    return false;
  } catch (error) {
    if (error instanceof APIError) {
      if (error.status === 403 || error.status === 409) {
        return false;
      }
    }

    throw error;
  }
};

export const adminLogin = async ({ email, password }) => {
  const response = await request("/api/auth/admin-login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });

  const data = response?.data;

  if (data?.accessToken) {
    persistAdminSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      admin: data.admin,
    });
  }

  return data;
};

export const adminLogout = async () => {
  const refreshToken = getRefreshToken();

  try {
    if (refreshToken) {
      await request("/api/auth/admin-logout", {
        method: "POST",
        body: { refreshToken },
        auth: false,
      });
    }
  } finally {
    clearAdminSession();
  }
};

export const ensureAdminSession = async () => {
  if (isAdminAuthenticated()) {
    return true;
  }

  if (!hasAutoAuthCredentials) {
    return false;
  }

  if (!pendingAdminLoginPromise) {
    pendingAdminLoginPromise = (async () => {
      try {
        await adminLogin({
          email: configuredAdminEmail,
          password: configuredAdminPassword,
        });
        return true;
      } catch (error) {
        if (error instanceof APIError && error.status === 401) {
          const provisioned = await autoProvisionSuperAdmin();
          if (provisioned) {
            return true;
          }
        }

        if (error instanceof APIError) {
          throw error;
        }

        throw new APIError(error?.message || "Automatic admin login failed");
      }
    })();
  }

  try {
    await pendingAdminLoginPromise;
    return isAdminAuthenticated();
  } finally {
    pendingAdminLoginPromise = null;
  }
};

export const fetchAdminProfile = async ({ forceRefresh = false } = {}) => {
  if (!forceRefresh) {
    const cachedProfile = getCachedAdminProfile();
    if (cachedProfile) {
      return cachedProfile;
    }
  }

  const response = await request("/api/auth/admin/me");
  const admin = response?.data?.admin || null;

  if (admin) {
    persistAdminSession({ admin });
  }

  return admin;
};

export const fetchPlatformAnalytics = async (params) => {
  await ensureAdminSession();

  const response = await request("/api/admin/analytics", { params });
  return response?.data ?? response;
};

export const fetchRevenueSummary = async (params) => {
  await ensureAdminSession();

  const response = await request("/api/admin/revenue/summary", { params });
  return response?.data ?? response;
};

export const fetchRevenueByMonth = async (params) => {
  await ensureAdminSession();

  const response = await request("/api/admin/revenue/by-month", { params });
  return response?.data ?? response;
};

export const fetchRevenueByType = async (params) => {
  await ensureAdminSession();

  const response = await request("/api/admin/revenue/by-type", { params });
  return response?.data ?? response;
};

export const fetchRevenueTransactions = async (params) => {
  await ensureAdminSession();

  const response = await request("/api/admin/revenue/transactions", { params });
  return response?.data ?? response;
};

export const fetchEducators = async (params) => {
  await ensureAdminSession();

  const response = await request("/api/admin/educators", { params });
  return response?.data ?? response;
};

export const updateEducatorStatus = async (educatorId, status) => {
  if (!educatorId) {
    throw new Error("Educator ID is required");
  }

  const response = await request(`/api/admin/educators/${educatorId}/status`, {
    method: "PUT",
    body: { status },
  });

  return response?.data ?? response;
};

export const deleteEducator = async (educatorId) => {
  if (!educatorId) {
    throw new Error("Educator ID is required");
  }

  const response = await request(`/api/admin/educators/${educatorId}`, {
    method: "DELETE",
  });

  return response?.data ?? response;
};

export const fetchStudents = async (params) => {
  await ensureAdminSession();

  const response = await request("/api/admin/students", { params });
  return response?.data ?? response;
};

export const updateStudentStatus = async (studentId, isActive) => {
  if (!studentId) {
    throw new Error("Student ID is required");
  }

  const response = await request(`/api/admin/students/${studentId}/status`, {
    method: "PUT",
    body: { isActive },
  });

  return response?.data ?? response;
};

export const deleteStudent = async (studentId) => {
  if (!studentId) {
    throw new Error("Student ID is required");
  }

  const response = await request(`/api/admin/students/${studentId}`, {
    method: "DELETE",
  });

  return response?.data ?? response;
};

export const fetchCourses = async (params) => {
  await ensureAdminSession();

  const response = await request("/api/admin/courses", { params });
  return response?.data ?? response;
};

export const deleteCourse = async (courseId) => {
  if (!courseId) {
    throw new Error("Course ID is required");
  }

  const response = await request(`/api/admin/courses/${courseId}`, {
    method: "DELETE",
  });

  return response?.data ?? response;
};

export const fetchWebinars = async (params) => {
  await ensureAdminSession();

  const response = await request("/api/admin/webinars", { params });
  return response?.data ?? response;
};

export const deleteWebinar = async (webinarId) => {
  if (!webinarId) {
    throw new Error("Webinar ID is required");
  }

  const response = await request(`/api/admin/webinars/${webinarId}`, {
    method: "DELETE",
  });

  return response?.data ?? response;
};

export const fetchTests = async (params) => {
  await ensureAdminSession();

  const response = await request("/api/admin/tests", { params });
  return response?.data ?? response;
};

export const fetchTestById = async (testId) => {
  if (!testId) {
    throw new Error("Test ID is required");
  }

  const response = await request(`/api/tests/${testId}`, {
    auth: false,
  });

  return response?.data ?? response;
};

export const fetchTestSeries = async (params) => {
  await ensureAdminSession();

  const response = await request("/api/admin/test-series", { params });
  return response?.data ?? response;
};

export const fetchTestSeriesById = async (testSeriesId) => {
  if (!testSeriesId) {
    throw new Error("Test series ID is required");
  }

  const response = await request(`/api/test-series/${testSeriesId}`, {
    auth: false,
  });

  return response?.data ?? response;
};

export const fetchLiveClasses = async (params) => {
  await ensureAdminSession();

  const response = await request("/api/admin/live-classes", {
    params,
  });

  return response?.data ?? response;
};

export const fetchLiveClassById = async (liveClassId) => {
  if (!liveClassId) {
    throw new Error("Live class ID is required");
  }

  const response = await request(`/api/live-classes/${liveClassId}`, {
    auth: false,
  });

  return response?.data ?? response;
};

export const deleteLiveClass = async (liveClassId) => {
  if (!liveClassId) {
    throw new Error("Live class ID is required");
  }

  const response = await request(`/api/live-classes/${liveClassId}`, {
    method: "DELETE",
  });

  return response?.data ?? response;
};

export const fetchWebinarById = async (webinarId) => {
  if (!webinarId) {
    throw new Error("Webinar ID is required");
  }

  const response = await request(`/api/webinars/${webinarId}`, {
    auth: false,
  });

  return response?.data ?? response;
};

export const fetchCourseById = async (courseId) => {
  if (!courseId) {
    throw new Error("Course ID is required");
  }

  const response = await request(`/api/courses/${courseId}`, {
    auth: false,
  });

  return response?.data ?? response;
};

export const fetchEducatorById = async (educatorId) => {
  if (!educatorId) {
    throw new Error("Educator ID is required");
  }

  const response = await request(`/api/educators/${educatorId}`, {
    auth: false,
  });

  return response?.data ?? response;
};

export const fetchStudentById = async (studentId) => {
  if (!studentId) {
    throw new Error("Student ID is required");
  }

  const response = await request(`/api/students/${studentId}`, {
    auth: false,
  });

  return response?.data ?? response;
};

export const fetchPaymentStatus = async (paymentIntentId) => {
  if (!paymentIntentId) {
    throw new Error("Payment intent ID is required");
  }

  const response = await request(`/api/payments/${paymentIntentId}`, {
    auth: false,
  });

  return response?.data ?? response;
};

export const fetchVideos = async (params) => {
  const response = await request("/api/videos", { params, auth: false });
  return response?.data ?? response;
};

// ============================
// Admin–Educator Chat APIs
// ============================

export const fetchChatConversations = async () => {
  await ensureAdminSession();
  const response = await request("/api/chat/conversations");
  return response?.data ?? response;
};

export const fetchChatMessages = async (
  conversationId,
  page = 1,
  limit = 50
) => {
  if (!conversationId) {
    throw new Error("Conversation ID is required");
  }
  await ensureAdminSession();
  const response = await request(
    `/api/chat/conversations/${conversationId}/messages`,
    { params: { page, limit } }
  );
  return response?.data ?? response;
};

export const sendChatMessage = async (payload) => {
  const {
    conversationId,
    receiverId,
    receiverType,
    content,
    messageType = "text",
    attachments = [],
  } = payload || {};

  if (!conversationId || !receiverId || !receiverType || !content) {
    throw new Error(
      "conversationId, receiverId, receiverType, and content are required"
    );
  }

  await ensureAdminSession();

  const response = await request("/api/chat/messages", {
    method: "POST",
    body: {
      conversationId,
      receiverId,
      receiverType,
      content,
      messageType,
      attachments,
    },
  });
  return response?.data ?? response;
};

export const markChatMessageAsRead = async (messageId) => {
  if (!messageId) {
    throw new Error("Message ID is required");
  }

  await ensureAdminSession();

  const response = await request(`/api/chat/messages/${messageId}/read`, {
    method: "PUT",
  });

  return response?.data ?? response;
};

export const markChatConversationAsRead = async (conversationId) => {
  if (!conversationId) {
    throw new Error("Conversation ID is required");
  }

  await ensureAdminSession();

  const response = await request(
    `/api/chat/conversations/${conversationId}/read`,
    {
      method: "PUT",
    }
  );

  return response?.data ?? response;
};

export const fetchUnreadChatCount = async () => {
  await ensureAdminSession();
  const response = await request(`/api/chat/unread-count`);
  return response?.data ?? response;
};

export const uploadChatImage = async (file) => {
  if (!file) {
    throw new Error("Image file is required");
  }

  await ensureAdminSession();

  const formData = new FormData();
  formData.append("image", file);

  const response = await request("/api/chat/upload/image", {
    method: "POST",
    body: formData,
  });

  return response?.data ?? response;
};

// Payout APIs
export const getAllPayouts = async (params) => {
  return request("/api/admin/payouts", {
    method: "GET",
    params,
  });
};

export const calculatePayouts = async (month, year) => {
  return request("/api/admin/payouts/calculate", {
    method: "POST",
    body: { month, year },
  });
};

export const processPayout = async (payoutId) => {
  return request("/api/admin/payouts/pay", {
    method: "POST",
    body: { payoutId },
  });
};

export const listAdminPayments = async (params) => {
  return request("/api/admin/payments", {
    method: "GET",
    params,
  });
};

const adminAPI = {
  auth: {
    login: adminLogin,
    logout: adminLogout,
    isAuthenticated: isAdminAuthenticated,
    getProfile: fetchAdminProfile,
    clearSession: clearAdminSession,
    getCachedProfile: getCachedAdminProfile,
    ensureSession: ensureAdminSession,
  },
  analytics: {
    getPlatformAnalytics: fetchPlatformAnalytics,
  },
  revenue: {
    getSummary: fetchRevenueSummary,
    getByMonth: fetchRevenueByMonth,
    getByType: fetchRevenueByType,
    getTransactions: fetchRevenueTransactions,
  },
  educators: {
    list: fetchEducators,
    getById: fetchEducatorById,
    updateStatus: updateEducatorStatus,
    remove: deleteEducator,
  },
  students: {
    list: fetchStudents,
    getById: fetchStudentById,
    updateStatus: updateStudentStatus,
    remove: deleteStudent,
  },
  courses: {
    list: fetchCourses,
    getById: fetchCourseById,
    remove: deleteCourse,
  },
  webinars: {
    list: fetchWebinars,
    getById: fetchWebinarById,
    remove: deleteWebinar,
  },
  tests: {
    list: fetchTests,
    getById: fetchTestById,
  },
  testSeries: {
    list: fetchTestSeries,
    getById: fetchTestSeriesById,
  },
  liveClasses: {
    list: fetchLiveClasses,
    getById: fetchLiveClassById,
    remove: deleteLiveClass,
  },
  payments: {
    getStatus: fetchPaymentStatus,
    list: listAdminPayments,
  },
  payouts: {
    list: getAllPayouts,
    calculate: calculatePayouts,
    process: processPayout,
  },
  videos: {
    list: fetchVideos,
  },
  chat: {
    listConversations: fetchChatConversations,
    listMessages: fetchChatMessages,
    sendMessage: sendChatMessage,
    markMessageAsRead: markChatMessageAsRead,
    markConversationAsRead: markChatConversationAsRead,
    getUnreadCount: fetchUnreadChatCount,
    uploadImage: uploadChatImage,
  },
};

export default adminAPI;
