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
import adminAPI from "@/util/server";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [payPage, setPayPage] = useState(1);
  const [payTotalPages, setPayTotalPages] = useState(1);

  const currentDate = new Date();
  const [month, setMonth] = useState((currentDate.getMonth() + 1).toString());
  const [year, setYear] = useState(currentDate.getFullYear().toString());

  const { toast } = useToast();

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.payouts.list({
        page,
        limit: 10,
        month,
        year,
      });
      if (response.success) {
        setPayouts(response.data.payouts);
        setTotalPages(Math.ceil(response.data.count / 10));
      }
    } catch (error) {
      console.error("Error fetching payouts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [page, month, year]);

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
    try {
      await adminAPI.payouts.process(payoutId);
      toast({ title: "Success", description: "Payout initiated successfully" });
      fetchPayouts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate payout",
        variant: "destructive",
      });
    }
  };

  const fetchPayments = async () => {
    setLoadingPayments(true);
    try {
      const response = await adminAPI.payments.list({
        page: payPage,
        limit: 10,
      });
      if (response.success) {
        setPayments(response.data.payments);
        setPayTotalPages(response.data.pagination.pages || 1);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [payPage]);

  const columns = [
    {
      key: "educatorId",
      label: "Educator",
      render: (val: any) => val?.fullName || "Unknown",
    },
    {
      key: "amount",
      label: "Amount",
      render: (val: any) => `₹${val}`,
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
              : "bg-red-100 text-red-800"
          }`}
        >
          {val.charAt(0).toUpperCase() + val.slice(1)}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Date",
      render: (val: any) => new Date(val).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_: any, row: any) =>
        row.status === "pending" || row.status === "failed" ? (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleProcess(row._id);
            }}
          >
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

  const years = [2024, 2025, 2026];

  const paymentColumns = [
    {
      key: "productSnapshot",
      label: "Product",
      render: (val: any) => val?.title || "N/A",
    },
    {
      key: "productType",
      label: "Type",
      render: (val: any) => (val || "").toString(),
    },
    {
      key: "amount",
      label: "Amount",
      render: (val: any) => `₹${(Number(val || 0) / 100).toFixed(2)}`,
    },
    { key: "status", label: "Status", render: (val: any) => val },
    {
      key: "createdAt",
      label: "Date",
      render: (val: any) => (val ? new Date(val).toLocaleDateString() : "-"),
    },
  ];

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
          <DataTable
            columns={paymentColumns as any}
            data={payments}
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
