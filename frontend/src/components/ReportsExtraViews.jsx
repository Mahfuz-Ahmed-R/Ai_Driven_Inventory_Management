import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { RECHARTS_TOOLTIP_PROPS } from "../utils/chartTheme";
import { DollarSign, ShoppingBag, Users, PackageCheck, FileText, Printer } from "lucide-react";
import { AnimatedNumber } from "./ui/AnimatedNumber";
import { paginateItems, PaginationBar } from "./ui/Pagination";
import DateRangePicker, { normalizeDateString } from "./ui/DateRangePicker";

const CARD = "bg-white dark:bg-[#1E222D] rounded-[8px] border border-zinc-200 dark:border-slate-700/70";
const TH = "py-3 px-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold uppercase text-zinc-500 dark:text-zinc-400";
const COLORS = ["#10B981", "#0F766E", "#EF4444", "#3B82F6", "#8B5CF6"];

function EmptyReport({ message }) {
  return (
    <div className={`${CARD} p-8 text-center text-sm text-zinc-500 dark:text-zinc-400`}>
      {message}
    </div>
  );
}

export default function ReportsExtraViews({ page, job, erpData, searchQuery, darkMode }) {
  const skus = useMemo(() => (job?.skus?.length ? job.skus : erpData?.products || []), [job, erpData?.products]);
  const invoices = erpData?.invoices || [];
  const suppliers = erpData?.suppliers || [];
  const customers = erpData?.customers || [];
  const posOrders = erpData?.pos_orders || [];
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [listPage, setListPage] = useState(1);
  const gridStroke = darkMode ? "#27272A" : "#E4E4E7";
  const q = (searchQuery || "").toLowerCase();
  useEffect(() => {
    setListPage(1);
  }, [page, q, dateRange]);
  const filteredSkus = useMemo(() => {
    return skus.filter((s) => {
      if (q && !s.sku.toLowerCase().includes(q) && !s.product_name.toLowerCase().includes(q)) return false;
      if (dateRange.from || dateRange.to) {
        const d = normalizeDateString(s.mfg_date || s.date);
        if (d) {
          if (dateRange.from && d < dateRange.from) return false;
          if (dateRange.to && d > dateRange.to) return false;
        }
      }
      return true;
    });
  }, [skus, q, dateRange]);

  const filteredInvoices = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return invoices;
    return invoices.filter((i) => {
      const d = normalizeDateString(i.due_date);
      if (dateRange.from && (!d || d < dateRange.from)) return false;
      if (dateRange.to && (!d || d > dateRange.to)) return false;
      return true;
    });
  }, [invoices, dateRange]);

  const ReportHeader = ({ title, subtitle }) => (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-zinc-950 dark:text-white">{title}</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <div className="px-2 py-1 rounded-[8px] bg-white dark:bg-[#1E222D] border border-zinc-200 dark:border-slate-700">
          <DateRangePicker value={dateRange} onChange={setDateRange} label="Report Date" />
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-zinc-900 dark:bg-slate-800 text-white text-xs font-semibold cursor-pointer">
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
      </div>
    </div>
  );

  // 1. SALES REPORT
  if (page === "sales-report") {
    if (filteredSkus.length === 0) {
      return <EmptyReport message="No sales or forecast data yet. Upload a CSV to view the Sales & Forecast Report." />;
    }
    const totalSales = filteredSkus.reduce((acc, s) => acc + (s.total_28d_demand || 0) * (s.price || 0), 0);
    const totalUnits = filteredSkus.reduce((acc, s) => acc + (s.total_28d_demand || 0), 0);
    const categoryTotals = Object.values(
      filteredSkus.reduce((acc, s) => {
        const cat = s.category || "General";
        if (!acc[cat]) acc[cat] = { category: cat, revenue: 0 };
        acc[cat].revenue += (s.total_28d_demand || 0) * (s.price || 0);
        return acc;
      }, {})
    );

    return (
      <div className="space-y-5">
        <ReportHeader title="Sales & Forecast Report" subtitle="Manage your 28-day predicted sales & revenue report" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Projected Sales", val: totalSales, prefix: "$", Icon: DollarSign, cls: "text-emerald-500" },
            { label: "Recorded Orders", val: posOrders.length, prefix: "", Icon: ShoppingBag, cls: "text-[#0F766E]" },
            { label: "Active Customers", val: customers.length, prefix: "", Icon: Users, cls: "text-blue-400" },
            { label: "Units Forecast (28D)", val: totalUnits, prefix: "", Icon: PackageCheck, cls: "text-[#0E9384]" },
          ].map((k) => (
            <div key={k.label} className={`${CARD} p-4 flex items-center justify-between`}>
              <div>
                <div className="text-xs text-zinc-500">{k.label}</div>
                <div className="text-lg font-extrabold mt-0.5"><AnimatedNumber value={k.val} prefix={k.prefix} /></div>
              </div>
              <k.Icon className={`w-6 h-6 ${k.cls}`} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className={`lg:col-span-7 ${CARD} p-5`}>
            <h2 className="text-sm font-bold mb-4">Top 10 SKUs — 28-Day Predicted Demand</h2>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...filteredSkus].sort((a, b) => (b.total_28d_demand || 0) - (a.total_28d_demand || 0)).slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="sku" tick={{ fontSize: 10, fill: "#71717A" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
                  <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                  <Bar dataKey="total_28d_demand" name="28D Forecast (Units)" fill="#FE9F43" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className={`lg:col-span-5 ${CARD} p-5`}>
            <h2 className="text-sm font-bold mb-4">Projected Revenue by Category ($)</h2>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryTotals}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: "#71717A" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#71717A" }} />
                  <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                  <Bar dataKey="revenue" name="Revenue ($)" fill="#0E9384" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {(() => {
          const salesPager = paginateItems(filteredSkus, listPage, 10);
          return (
            <div className={`${CARD} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className={TH}>SKU</th>
                      <th className={TH}>Product Name</th>
                      <th className={TH}>Category</th>
                      <th className={`${TH} text-right`}>Sold Qty (28D)</th>
                      <th className={`${TH} text-right`}>Sold Amount</th>
                      <th className={`${TH} text-right`}>InStock Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {salesPager.pagedItems.map((s) => (
                      <tr key={s.sku}>
                        <td className="py-3 px-4 font-bold">{s.sku}</td>
                        <td className="py-3 px-4 font-medium">{s.product_name}</td>
                        <td className="py-3 px-4 text-zinc-500">{s.category}</td>
                        <td className="py-3 px-4 text-right font-semibold">{s.total_28d_demand || 0}</td>
                        <td className="py-3 px-4 text-right font-bold text-[#0E9384]">${((s.total_28d_demand || 0) * (s.price || 0)).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{s.current_stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                page={salesPager.safePage}
                totalPages={salesPager.totalPages}
                totalItems={salesPager.totalItems}
                pageSize={10}
                onPageChange={setListPage}
              />
            </div>
          );
        })()}
      </div>
    );
  }

  // 2. PURCHASE REPORT
  if (page === "purchase-report") {
    if (filteredSkus.length === 0) {
      return <EmptyReport message="No purchase data yet. Upload a CSV to view replenishment purchase quantities." />;
    }
    const purchaseChart = filteredSkus.slice(0, 10).map((s) => {
      const qty = s.suggested_order_qty || 0;
      return { sku: s.sku, qty, cost: qty * (s.price || 0) };
    });
    return (
      <div className="space-y-5">
        <ReportHeader title="Purchase Report" subtitle="Track supplier purchase orders & replenishment quantities" />
        <div className={`${CARD} p-5`}>
          <h2 className="text-sm font-bold mb-3">Recommended Purchase Cost ($) by SKU</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={purchaseChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="sku" tick={{ fontSize: 10, fill: "#71717A" }} />
                <YAxis tick={{ fontSize: 10, fill: "#71717A" }} />
                <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                <Bar dataKey="cost" name="PO Amount ($)" fill="#FE9F43" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {(() => {
          const purchasePager = paginateItems(filteredSkus, listPage, 10);
          return (
            <div className={`${CARD} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className={TH}>SKU</th>
                      <th className={TH}>Product Name</th>
                      <th className={TH}>Category</th>
                      <th className={`${TH} text-right`}>InStock Qty</th>
                      <th className={`${TH} text-right`}>Suggested Order Qty</th>
                      <th className={`${TH} text-right`}>Estimated PO Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {purchasePager.pagedItems.map((s) => {
                      const qty = s.suggested_order_qty || 0;
                      return (
                        <tr key={s.sku}>
                          <td className="py-3 px-4 font-bold">{s.sku}</td>
                          <td className="py-3 px-4 font-medium">{s.product_name}</td>
                          <td className="py-3 px-4 text-zinc-500">{s.category}</td>
                          <td className="py-3 px-4 text-right">{s.current_stock}</td>
                          <td className="py-3 px-4 text-right font-bold">{qty}</td>
                          <td className="py-3 px-4 text-right font-bold">${(qty * (s.price || 0)).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                page={purchasePager.safePage}
                totalPages={purchasePager.totalPages}
                totalItems={purchasePager.totalItems}
                pageSize={10}
                onPageChange={setListPage}
              />
            </div>
          );
        })()}
      </div>
    );
  }

  // 3. INVOICE REPORT
  if (page === "invoice-report") {
    if (invoices.length === 0) {
      return <EmptyReport message="No invoices recorded in the database yet." />;
    }
    const invPie = [
      { name: "Paid", value: filteredInvoices.filter((i) => i.status === "Paid").reduce((a, b) => a + b.amount, 0) },
      { name: "Unpaid", value: filteredInvoices.filter((i) => i.status === "Unpaid").reduce((a, b) => a + b.amount, 0) },
      { name: "Overdue", value: filteredInvoices.filter((i) => i.status === "Overdue").reduce((a, b) => a + b.amount, 0) },
    ];
    const totalAmt = filteredInvoices.reduce((a, b) => a + b.amount, 0);
    const totalPaid = filteredInvoices.reduce((a, b) => a + b.paid, 0);
    const totalDue = filteredInvoices.reduce((a, b) => a + b.due, 0);
    const totalOverdue = filteredInvoices.filter((i) => i.status === "Overdue").reduce((a, b) => a + b.due, 0);
    return (
      <div className="space-y-5">
        <ReportHeader title="Invoice Report" subtitle="Manage your invoice payments and overdue balances" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Amount", val: totalAmt, cls: "text-zinc-900 dark:text-white" },
            { label: "Total Paid", val: totalPaid, cls: "text-emerald-500" },
            { label: "Total Unpaid", val: totalDue, cls: "text-amber-500" },
            { label: "Overdue", val: totalOverdue, cls: "text-red-500" },
          ].map((k) => (
            <div key={k.label} className={`${CARD} p-4`}>
              <div className="text-xs text-zinc-500">{k.label}</div>
              <div className={`text-lg font-extrabold mt-0.5 ${k.cls}`}><AnimatedNumber value={k.val} prefix="$" /></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className={`lg:col-span-4 ${CARD} p-5`}>
            <h2 className="text-sm font-bold mb-2">Invoice Payment Status</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={invPie} dataKey="value" nameKey="name" innerRadius={40} outerRadius={68} paddingAngle={4}>
                    {invPie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className={`lg:col-span-8 ${CARD} p-5`}>
            <h2 className="text-sm font-bold mb-2">Paid vs. Due by Invoice</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredInvoices}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="inv" tick={{ fontSize: 10, fill: "#71717A" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#71717A" }} />
                  <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                  <Legend />
                  <Bar dataKey="paid" name="Paid ($)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="due" name="Due ($)" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {(() => {
          const invPager = paginateItems(filteredInvoices, listPage, 10);
          return (
            <div className={`${CARD} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className={TH}>Invoice Number</th>
                      <th className={TH}>Customer</th>
                      <th className={TH}>Due Date</th>
                      <th className={`${TH} text-right`}>Amount</th>
                      <th className={`${TH} text-right`}>Paid</th>
                      <th className={`${TH} text-right`}>Amount Due</th>
                      <th className={TH}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {invPager.pagedItems.map((i) => (
                      <tr key={i.inv}>
                        <td className="py-3 px-4 font-bold text-[#0F766E]">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <FileText className="w-3.5 h-3.5 shrink-0" /> {i.inv}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium">{i.customer}</td>
                        <td className="py-3 px-4 text-zinc-500">{i.due_date}</td>
                        <td className="py-3 px-4 text-right font-semibold">${i.amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-emerald-500 font-semibold">${i.paid.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-red-400 font-semibold">${i.due.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold ${i.status === "Paid" ? "bg-emerald-500/15 text-emerald-500" : i.status === "Overdue" ? "bg-red-500/15 text-red-500" : "bg-amber-500/15 text-amber-500"}`}>
                            {i.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                page={invPager.safePage}
                totalPages={invPager.totalPages}
                totalItems={invPager.totalItems}
                pageSize={10}
                onPageChange={setListPage}
              />
            </div>
          );
        })()}
      </div>
    );
  }

  // 4. SUPPLIER REPORT
  if (page === "supplier-report") {
    if (suppliers.length === 0) {
      return <EmptyReport message="No suppliers recorded yet. Add suppliers in Peoples → Suppliers to view this report." />;
    }
    const supByCountry = Object.entries(
      suppliers.reduce((acc, s) => ({ ...acc, [s.country || "Unknown"]: (acc[s.country || "Unknown"] || 0) + 1 }), {})
    ).map(([country, count]) => ({ country, count }));
    return (
      <div className="space-y-5">
        <ReportHeader title="Supplier Report" subtitle="View registered suppliers and regional coverage" />
        <div className={`${CARD} p-5`}>
          <h2 className="text-sm font-bold mb-3">Suppliers by Country</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supByCountry}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="country" tick={{ fontSize: 10, fill: "#71717A" }} />
                <YAxis tick={{ fontSize: 10, fill: "#71717A" }} allowDecimals={false} />
                <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                <Bar dataKey="count" name="Suppliers" fill="#0E9384" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {(() => {
          const supPager = paginateItems(suppliers, listPage, 10);
          return (
            <div className={`${CARD} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className={TH}>Code</th>
                      <th className={TH}>Supplier</th>
                      <th className={TH}>Email</th>
                      <th className={TH}>Phone</th>
                      <th className={TH}>Country</th>
                      <th className={TH}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {supPager.pagedItems.map((s) => (
                      <tr key={s.code}>
                        <td className="py-3 px-4 font-mono font-bold text-[#0F766E]">{s.code}</td>
                        <td className="py-3 px-4 font-semibold">{s.name}</td>
                        <td className="py-3 px-4 text-zinc-500">{s.email}</td>
                        <td className="py-3 px-4 text-zinc-500">{s.phone}</td>
                        <td className="py-3 px-4">{s.country}</td>
                        <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-[5px] text-[10px] font-bold bg-emerald-500/15 text-emerald-500">{s.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                page={supPager.safePage}
                totalPages={supPager.totalPages}
                totalItems={supPager.totalItems}
                pageSize={10}
                onPageChange={setListPage}
              />
            </div>
          );
        })()}
      </div>
    );
  }

  // 5. CUSTOMER REPORT
  if (page === "customer-report") {
    if (customers.length === 0) {
      return <EmptyReport message="No customer records in the database yet." />;
    }
    const custByCountry = Object.entries(
      customers.reduce((acc, c) => ({ ...acc, [c.country || "Unknown"]: (acc[c.country || "Unknown"] || 0) + 1 }), {})
    ).map(([country, count]) => ({ country, count }));
    return (
      <div className="space-y-5">
        <ReportHeader title="Customer Report" subtitle="Registered customers and regional distribution" />
        <div className={`${CARD} p-5`}>
          <h2 className="text-sm font-bold mb-3">Customers by Country</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={custByCountry}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="country" tick={{ fontSize: 10, fill: "#71717A" }} />
                <YAxis tick={{ fontSize: 10, fill: "#71717A" }} allowDecimals={false} />
                <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                <Bar dataKey="count" name="Customers" fill="#FE9F43" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {(() => {
          const custPager = paginateItems(customers, listPage, 10);
          return (
            <div className={`${CARD} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className={TH}>Code</th>
                      <th className={TH}>Customer</th>
                      <th className={TH}>Email</th>
                      <th className={TH}>Phone</th>
                      <th className={TH}>Country</th>
                      <th className={TH}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {custPager.pagedItems.map((c) => (
                      <tr key={c.code}>
                        <td className="py-3 px-4 font-bold">{c.code}</td>
                        <td className="py-3 px-4 font-semibold">{c.name}</td>
                        <td className="py-3 px-4 text-zinc-500">{c.email}</td>
                        <td className="py-3 px-4 text-zinc-500">{c.phone}</td>
                        <td className="py-3 px-4">{c.country}</td>
                        <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-[5px] text-[10px] font-bold bg-emerald-500/15 text-emerald-500">{c.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                page={custPager.safePage}
                totalPages={custPager.totalPages}
                totalItems={custPager.totalItems}
                pageSize={10}
                onPageChange={setListPage}
              />
            </div>
          );
        })()}
      </div>
    );
  }

  // 6. PRODUCT REPORT
  if (filteredSkus.length === 0) {
    return <EmptyReport message="No product data yet. Upload a CSV to view the Product Report." />;
  }
  const prodRevChart = filteredSkus.slice(0, 10).map((s) => ({
    sku: s.sku,
    revenue: (s.total_28d_demand || 0) * (s.price || 0),
    stock: s.current_stock || 0,
  }));
  return (
    <div className="space-y-5">
      <ReportHeader title="Product Report" subtitle="SKU-level unit economics, inventory depth, and revenue contribution" />
      <div className={`${CARD} p-5`}>
        <h2 className="text-sm font-bold mb-3">Projected Revenue ($) by SKU</h2>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={prodRevChart}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="sku" tick={{ fontSize: 10, fill: "#71717A" }} />
              <YAxis tick={{ fontSize: 10, fill: "#71717A" }} />
              <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
              <Bar dataKey="revenue" name="Revenue ($)" fill="#0E9384" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {(() => {
        const prodPager = paginateItems(filteredSkus, listPage, 10);
        return (
          <div className={`${CARD} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr>
                    <th className={TH}>SKU</th>
                    <th className={TH}>Product Name</th>
                    <th className={TH}>Category</th>
                    <th className={TH}>Brand</th>
                    <th className={`${TH} text-right`}>Qty</th>
                    <th className={`${TH} text-right`}>Price</th>
                    <th className={`${TH} text-right`}>Total Forecast</th>
                    <th className={`${TH} text-right`}>Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {prodPager.pagedItems.map((s) => (
                    <tr key={s.sku}>
                      <td className="py-3 px-4 font-bold">{s.sku}</td>
                      <td className="py-3 px-4 font-semibold">{s.product_name}</td>
                      <td className="py-3 px-4 text-zinc-500">{s.category}</td>
                      <td className="py-3 px-4 text-zinc-500">{s.brand || "—"}</td>
                      <td className="py-3 px-4 text-right">{s.current_stock}</td>
                      <td className="py-3 px-4 text-right">${Number(s.price || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-semibold">{s.total_28d_demand || 0}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#0E9384]">${((s.total_28d_demand || 0) * (s.price || 0)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar
              page={prodPager.safePage}
              totalPages={prodPager.totalPages}
              totalItems={prodPager.totalItems}
              pageSize={10}
              onPageChange={setListPage}
            />
          </div>
        );
      })()}
    </div>
  );
}
