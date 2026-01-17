"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import adminAPI from "@/util/server";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);
  const [selectedPayouts, setSelectedPayouts] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [processingPayout, setProcessingPayout] = useState<string | null>(null);
  const [processingBulk, setProcessingBulk] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [payPage, setPayPage] = useState(1);
  const [payTotalPages, setPayTotalPages] = useState(1);

  const currentDate = new Date();
  const [month, setMonth] = useState((currentDate.getMonth() + 1).toString());
  const [year, setYear] = useState(currentDate.getFullYear().toString());
  const [scheduledDate, setScheduledDate] = useState("");

  const { toast } = useToast();

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: 10,
        month,
        year,
      };
      if (scheduledDate) {
        params.scheduledDate = scheduledDate;
      }
      const response = await adminAPI.payouts.list(params);
      if (response.success) {
        setPayouts(response.data.payouts);
        setTotalPages(response.data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error("Error fetching payouts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
    setSelectedPayouts(new Set());
  }, [page, month, year, scheduledDate]);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      await adminAPI.payouts.calculate(month, year);
      toast({
        title: "Success",
        description: "Payouts calculated successfully",
      });
      fetchPayouts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to calculate payouts",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleProcess = async (payoutId: string) => {
    setProcessingPayout(payoutId);
    try {
      await adminAPI.payouts.process(payoutId);
      toast({ title: "Success", description: "Payout initiated successfully" });
      fetchPayouts();
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to initiate payout",
        variant: "destructive",
      });
    } finally {
      setProcessingPayout(null);
    }
  };

  const handleBulkPay = async (payoutIds?: string[]) => {
    setProcessingBulk(true);
    try {
      const ids = payoutIds || Array.from(selectedPayouts);
      const response = await adminAPI.payouts.bulkPay(ids, null, null);

      if (response.success) {
        const { summary } = response.data;
        toast({
          title: "Bulk Payout Completed",
          description: `${summary.succeeded} succeeded, ${summary.failed} failed`,
        });
        setSelectedPayouts(new Set());
        fetchPayouts();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to process bulk payouts",
        variant: "destructive",
      });
    } finally {
      setProcessingBulk(false);
    }
  };

  const handlePayAllPending = async () => {
    setProcessingBulk(true);
    try {
      const response = await adminAPI.payouts.bulkPay(
        null,
        parseInt(month),
        parseInt(year)
      );

      if (response.success) {
        const { summary } = response.data;
        toast({
          title: "Bulk Payout Completed",
          description: `${summary.succeeded} succeeded, ${summary.failed} failed`,
        });
        setSelectedPayouts(new Set());
        fetchPayouts();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to process bulk payouts",
        variant: "destructive",
      });
    } finally {
      setProcessingBulk(false);
    }
  };

  const fetchMonthlySales = async () => {
    setLoadingPayments(true);
    try {
      const params: any = {
        page: payPage,
        limit: 10,
      };
      if (month) params.month = month;
      if (year) params.year = year;
      if (scheduledDate) params.scheduledDate = scheduledDate;

      const response = await adminAPI.payouts.monthlySales(params);
      if (response.success) {
        setMonthlySales(response.data.monthlySales);
        setPayTotalPages(response.data.pagination.pages || 1);
      }
    } catch (error) {
      console.error("Error fetching monthly sales:", error);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    fetchMonthlySales();
  }, [payPage, month, year, scheduledDate]);

  const handleSelectPayout = (payoutId: string, checked: boolean) => {
    const newSelected = new Set(selectedPayouts);
    if (checked) {
      newSelected.add(payoutId);
    } else {
      newSelected.delete(payoutId);
    }
    setSelectedPayouts(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allPendingIds = payouts
        .filter((p: any) => p.status === "pending" || p.status === "failed")
        .map((p: any) => p._id);
      setSelectedPayouts(new Set(allPendingIds));
    } else {
      setSelectedPayouts(new Set());
    }
  };

  const columns = [
    {
      key: "select",
      label: "Select",
      render: (_: any, row: any) =>
        row.status === "pending" || row.status === "failed" ? (
          <input
            type="checkbox"
            checked={selectedPayouts.has(row._id)}
            onChange={(e) => handleSelectPayout(row._id, e.target.checked)}
            className="cursor-pointer"
          />
        ) : null,
    },
    {
      key: "educatorId",
      label: "Educator",
      render: (val: any) => val?.fullName || "Unknown",
    },
    {
      key: "amount",
      label: "Amount",
      render: (val: any) => `₹${(val / 100).toFixed(2)}`,
    },
    {
      key: "status",
      label: "Status",
      render: (val: any) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            val === "paid"
              ? "bg-green-100 text-green-800"
              : val === "pending"
              ? "bg-yellow-100 text-yellow-800"
              : val === "processing"
              ? "bg-blue-100 text-blue-800"
              : val === "failed"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {val.charAt(0).toUpperCase() + val.slice(1)}
        </span>
      ),
    },
    {
      key: "scheduledDate",
      label: "Scheduled Date",
      render: (val: any) => (val ? new Date(val).toLocaleDateString() : "-"),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_: any, row: any) =>
        row.status === "pending" || row.status === "failed" ? (
          <Button
            size="sm"
            disabled={processingPayout === row._id || processingBulk}
            onClick={(e) => {
              e.stopPropagation();
              handleProcess(row._id);
            }}
          >
            {processingPayout === row._id && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Pay Now
          </Button>
        ) : null,
    },
  ];

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const years = [2024, 2025, 2026, 2027];

  const monthlySalesColumns = [
    {
      key: "educator",
      label: "Educator",
      render: (val: any) => val?.fullName || "Unknown",
    },
    {
      key: "month",
      label: "Month/Year",
      render: (_: any, row: any) => {
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        return `${monthNames[row.month - 1]} ${row.year}`;
      },
    },
    {
      key: "totalSales",
      label: "Total Sales",
      render: (val: any) => `₹${(val / 100).toFixed(2)}`,
    },
    {
      key: "totalCommission",
      label: "Commission",
      render: (val: any) => `₹${(val / 100).toFixed(2)}`,
    },
    {
      key: "totalPayable",
      label: "Payable Amount",
      render: (val: any) => `₹${(val / 100).toFixed(2)}`,
    },
    {
      key: "scheduledDate",
      label: "Scheduled Date",
      render: (val: any) => (val ? new Date(val).toLocaleDateString() : "-"),
    },
    {
      key: "status",
      label: "Status",
      render: (val: any) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            val === "paid"
              ? "bg-green-100 text-green-800"
              : val === "pending"
              ? "bg-yellow-100 text-yellow-800"
              : val === "processing"
              ? "bg-blue-100 text-blue-800"
              : val === "failed"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {val.charAt(0).toUpperCase() + val.slice(1)}
        </span>
      ),
    },
  ];

  const pendingCount = payouts.filter(
    (p: any) => p.status === "pending" || p.status === "failed"
  ).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Payouts</h1>
        <div className="flex gap-2 items-center">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-30">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={i} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-25">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleCalculate} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Calculate
          </Button>
        </div>
      </div>

      {selectedPayouts.size > 0 && (
        <div className="flex gap-2 items-center p-4 bg-blue-50 rounded-lg">
          <span className="text-sm font-medium">
            {selectedPayouts.size} payout(s) selected
          </span>
          <Button
            size="sm"
            onClick={() => handleBulkPay()}
            disabled={processingBulk}
          >
            {processingBulk && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Pay Selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedPayouts(new Set())}
          >
            Clear Selection
          </Button>
        </div>
      )}

      <div className="flex justify-between items-center">
        {pendingCount > 0 && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={
                payouts.length > 0 &&
                payouts
                  .filter(
                    (p: any) => p.status === "pending" || p.status === "failed"
                  )
                  .every((p: any) => selectedPayouts.has(p._id))
              }
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="cursor-pointer"
            />
            <span className="text-sm text-gray-600">Select All Pending</span>
          </div>
        )}
        {pendingCount > 0 && (
          <Button
            onClick={handlePayAllPending}
            disabled={processingBulk || loading}
            variant="outline"
          >
            {processingBulk && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Pay All Pending ({pendingCount})
          </Button>
        )}
      </div>

      <DataTable columns={columns} data={payouts} isLoading={loading} />
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <Card>
        <CardHeader>
          <CardTitle>Payments History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="scheduledDate" className="text-sm font-medium">
                Filter by Scheduled Date
              </label>
              <Input
                id="scheduledDate"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="mt-1"
              />
            </div>
            {scheduledDate && (
              <Button variant="outline" onClick={() => setScheduledDate("")}>
                Clear Filter
              </Button>
            )}
          </div>
          <DataTable
            columns={monthlySalesColumns as any}
            data={monthlySales}
            isLoading={loadingPayments}
          />
          <Pagination
            currentPage={payPage}
            totalPages={payTotalPages}
            onPageChange={setPayPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
