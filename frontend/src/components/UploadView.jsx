import { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Info,
  Sparkles,
  RefreshCw,
  Table2,
  ShieldCheck,
  XCircle,
  ArrowRight,
  Lock,
} from "lucide-react";
import { apiRequest } from "../utils/apiClient";
import { getStoredTokens } from "../hooks/useAuth";
import { useSaas } from "../context/SaasContext";

const PIPELINE_STEPS = [
  { step: 1, title: "Preparing Your Sales Data", desc: "Applying confirmed columns and organizing daily sales" },
  { step: 2, title: "28-Day Demand Forecasting", desc: "Evaluating historical accuracy and predicting next 28 days" },
  { step: 3, title: "Stock & Reorder Planning", desc: "Calculating stockout dates, safety stock, and order quantities" },
  { step: 4, title: "Replenishment Strategy Check", desc: "Comparing restocking strategies to minimize cost" },
  { step: 5, title: "Executive Summary", desc: "Writing your actionable inventory insights" },
];

const STANDARD_FIELDS = [
  { key: "date", label: "Date / Transaction Date", required: true },
  { key: "product_id", label: "Product ID / SKU", required: true },
  { key: "quantity", label: "Quantity Sold / Units", required: true },
  { key: "product_name", label: "Product Name", required: false },
  { key: "selling_price", label: "Selling Price", required: false },
  { key: "revenue", label: "Revenue", required: false },
  { key: "discount", label: "Discount", required: false },
  { key: "category", label: "Category", required: false },
  { key: "store_id", label: "Store ID", required: false },
  { key: "current_stock", label: "Current Stock (Optional)", required: false },
];

const MAX_FILE_BYTES = 200 * 1024 * 1024;

export default function UploadView({
  onUploadSuccess,
  activeWsJobId,
  wsProgress,
  wsEvents,
  wsStreamedSummary,
  wsError,
}) {
  const { saasState, saasLoading, setOnboardingOpen } = useSaas();
  const isOnboardingCompleted = Boolean(saasState?.onboarding?.completed);
  const onboardingData = saasState?.onboarding?.data || {};
  const fileInputRef = useRef(null);
  const companyDirtyRef = useRef(false);
  const leadTimeDirtyRef = useRef(false);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [companyName, setCompanyName] = useState(onboardingData.company_name || "Freshmart Retail Corp");
  const [leadTimeDays, setLeadTimeDays] = useState(Number(onboardingData.default_lead_time) || 4);

  useEffect(() => {
    if (!companyDirtyRef.current && onboardingData.company_name) {
      setCompanyName(onboardingData.company_name);
    }
    if (!leadTimeDirtyRef.current && onboardingData.default_lead_time) {
      setLeadTimeDays(Number(onboardingData.default_lead_time));
    }
  }, [onboardingData.company_name, onboardingData.default_lead_time]);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [revalidating, setRevalidating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [inspection, setInspection] = useState(null);
  const [editableMapping, setEditableMapping] = useState({});
  const [previewTab, setPreviewTab] = useState("standardized");

  const handleFileSelected = (selected) => {
    if (!selected) return;
    if (!isOnboardingCompleted) {
      setUploadError("Please complete workspace onboarding setup before uploading a CSV.");
      return;
    }
    setUploadError("");
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setUploadError("Unsupported file format. Please select a .csv file.");
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setUploadError("File exceeds the 200 MB upload limit.");
      return;
    }
    setFile(selected);
    inspectFile(selected);
  };

  const inspectFile = (selectedFile) => {
    setUploading(true);
    setUploadProgress(10);
    setUploadError("");
    setInspection(null);

    const form = new FormData();
    form.append("file", selectedFile);
    form.append("company_name", companyName);

    const { access } = getStoredTokens();
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/ingestion/upload/");
    xhr.withCredentials = true;
    if (access) {
      xhr.setRequestHeader("Authorization", `Bearer ${access}`);
    }

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.min(85, Math.round((ev.loaded / ev.total) * 85));
        setUploadProgress(pct);
      }
    };

    xhr.onload = async () => {
      if (xhr.status === 401) {
        // Token may have expired; retry via apiRequest which refreshes JWT automatically
        try {
          const data = await apiRequest("/api/ingestion/upload/", {
            method: "POST",
            body: form,
            timeoutMs: 60000,
          });
          setUploadProgress(100);
          setUploading(false);
          setInspection(data);
          setEditableMapping(data.column_mapping || {});
          setPreviewTab(data.standardized_preview?.length ? "standardized" : "raw");
          return;
        } catch (err) {
          setUploading(false);
          setUploadProgress(0);
          setUploadError(err.message || "Authentication required. Please sign in again.");
          return;
        }
      }

      setUploadProgress(100);
      setUploading(false);
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300) {
          setInspection(data);
          setEditableMapping(data.column_mapping || {});
          setPreviewTab(data.standardized_preview?.length ? "standardized" : "raw");
        } else {
          setUploadError(data.error || "Failed to inspect CSV file.");
        }
      } catch {
        setUploadError("Invalid response from server during CSV inspection.");
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setUploadProgress(0);
      setUploadError("Network error while uploading CSV.");
    };

    xhr.send(form);
  };

  const handleMappingChange = (targetField, sourceCol) => {
    setEditableMapping((prev) => {
      const next = { ...prev };
      if (!sourceCol) {
        delete next[targetField];
      } else {
        next[targetField] = sourceCol;
      }
      return next;
    });
  };

  const handleRevalidate = async () => {
    if (!inspection?.dataset_id) return;
    setRevalidating(true);
    setUploadError("");
    try {
      const data = await apiRequest(`/api/ingestion/${inspection.dataset_id}/validate/`, {
        method: "POST",
        body: { column_mapping: editableMapping },
      });
      setInspection(data);
      setEditableMapping(data.column_mapping || {});
      if (data.standardized_preview?.length) setPreviewTab("standardized");
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setRevalidating(false);
    }
  };

  const handleConfirmForecast = async () => {
    if (!inspection?.dataset_id) return;
    setConfirming(true);
    setUploadError("");
    try {
      const data = await apiRequest(`/api/ingestion/${inspection.dataset_id}/confirm/`, {
        method: "POST",
        body: {
          company_name: companyName,
          lead_time_days: leadTimeDays,
          column_mapping: editableMapping,
        },
        timeoutMs: 60000,
      });
      onUploadSuccess(data.job_id);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const completedSteps = new Set(
    wsEvents.filter((ev) => ev.status === "done" || ev.status === "complete").map((ev) => ev.step)
  );
  const runningStep = wsEvents.length > 0 ? wsEvents[wsEvents.length - 1].step : 0;

  const clf = inspection?.classification_result || {};
  const report = inspection?.validation_report || {};
  const headers = inspection?.profile?.headers || [];
  const mappingDetails = Object.fromEntries(
    (clf.mappings || []).map((m) => [m.target_field, m])
  );

  const canConfirm =
    Boolean(inspection) &&
    clf.accepted === true &&
    report.can_proceed === true &&
    !uploading &&
    !revalidating &&
    !confirming;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-white">
            Upload Sales Data
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Upload any sales CSV file — we automatically recognize your columns, check data quality, and generate inventory plan.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Upload, Classification, Mapping, Validation, Preview */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white dark:bg-[#1E222D] rounded-[8px] border border-zinc-200 dark:border-slate-700/70 p-4 sm:p-5 space-y-4">
            {saasLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-xs font-medium text-zinc-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-[#0F766E]" />
                <span>Checking workspace setup...</span>
              </div>
            ) : !isOnboardingCompleted ? (
              <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-zinc-300 dark:border-slate-700 rounded-[8px] p-8 bg-zinc-50 dark:bg-[#161922]/70 space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h2 className="text-sm font-bold text-zinc-950 dark:text-white">
                    Complete Workspace Setup to Upload CSV
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-slate-400">
                    Finish the quick onboarding wizard (company name, industry, SKU scale, and default supplier lead time) before uploading sales data.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOnboardingOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#0F766E] hover:bg-[#0E9384] text-white text-xs font-bold transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Complete Onboarding Setup
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-slate-400 mb-1.5">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => {
                        companyDirtyRef.current = true;
                        setCompanyName(e.target.value);
                      }}
                      className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-[#161922] text-zinc-900 dark:text-white border border-zinc-200 dark:border-slate-700 rounded-[8px] focus:outline-none focus:border-[#0F766E]"
                      placeholder="Acme Retail Ltd."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-slate-400 mb-1.5">
                      Supplier Lead Time (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={leadTimeDays}
                      onChange={(e) => {
                        leadTimeDirtyRef.current = true;
                        setLeadTimeDays(Number(e.target.value) || 4);
                      }}
                      className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-[#161922] text-zinc-900 dark:text-white border border-zinc-200 dark:border-slate-700 rounded-[8px] focus:outline-none focus:border-[#0F766E]"
                    />
                  </div>
                </div>

                {/* Drag-and-Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const dropped = e.dataTransfer.files?.[0];
                    handleFileSelected(dropped);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[8px] p-6 cursor-pointer transition ${isDragging
                    ? "border-[#0F766E] bg-[#0F766E]/10"
                    : "border-zinc-300 dark:border-slate-700 hover:border-[#0F766E] bg-zinc-50 dark:bg-[#161922]/70"
                    }`}
                >
                  <div className="w-11 h-11 rounded-full bg-zinc-900 dark:bg-slate-800 text-white flex items-center justify-center mb-2.5">
                    {uploading ? (
                      <Loader2 className="w-5 h-5 text-[#0F766E] animate-spin" />
                    ) : (
                      <UploadCloud className="w-5 h-5 text-[#0F766E]" />
                    )}
                  </div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white text-center break-all">
                    {file ? file.name : "Drag & drop your sales CSV here, or click to browse"}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-slate-400 mt-1 text-center">
                    Any column names supported (e.g. <code className="bg-zinc-200 dark:bg-slate-800 px-1 rounded">trans_dt</code>,{" "}
                    <code className="bg-zinc-200 dark:bg-slate-800 px-1 rounded">sku</code>,{" "}
                    <code className="bg-zinc-200 dark:bg-slate-800 px-1 rounded">qty</code>,{" "}
                    <code className="bg-zinc-200 dark:bg-slate-800 px-1 rounded">unit_price</code>) · Max 200 MB
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => handleFileSelected(e.target.files?.[0])}
                  />
                </div>
              </>
            )}

            {uploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-zinc-500 dark:text-slate-400">
                  <span>Uploading and analyzing your file...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0F766E] transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {(uploadError || wsError) && (
              <div className="flex items-start gap-2 p-3 rounded-[8px] bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{uploadError || wsError}</span>
              </div>
            )}
          </div>

          {/* Classification Status Card */}
          {inspection && (
            <div
              className={`rounded-[8px] border p-4 sm:p-5 space-y-3 ${clf.accepted
                ? "bg-emerald-500/5 border-emerald-500/30"
                : "bg-red-500/5 border-red-500/30"
                }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {clf.accepted ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">
                    Detected File Type: {inspection.classification}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-semibold">
                  <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-slate-800 text-zinc-700 dark:text-slate-300">
                    Match Confidence: {Math.round((inspection.classification_confidence || 0) * 100)}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#0F766E]/15 text-[#0F766E]">
                    {inspection.analysis_source === "gemini" ? "AI-Assisted" : "Auto-Detected"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-slate-300 leading-relaxed">
                {clf.accepted ? clf.classification_reason : clf.rejection_reason}
              </p>
            </div>
          )}

          {/* Column Mapping Editor */}
          {inspection && (
            <div className="bg-white dark:bg-[#1E222D] rounded-[8px] border border-zinc-200 dark:border-slate-700/70 p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Column Mapping
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-slate-400">
                    Confirm or adjust which columns in your file correspond to each sales field.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRevalidate}
                  disabled={revalidating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-zinc-100 dark:bg-slate-800 hover:bg-[#0F766E] hover:text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${revalidating ? "animate-spin" : ""}`} />
                  {revalidating ? "Validating..." : "Re-Validate Mapping"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STANDARD_FIELDS.map((field) => {
                  const selectedCol = editableMapping[field.key] || "";
                  const meta = mappingDetails[field.key];
                  const conf = meta?.confidence;
                  return (
                    <div
                      key={field.key}
                      className="p-2.5 rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200/80 dark:border-slate-700/70 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-800 dark:text-slate-200">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </span>
                        {selectedCol && typeof conf === "number" && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${conf >= 0.75
                              ? "bg-emerald-500/15 text-emerald-500"
                              : "bg-amber-500/15 text-amber-500"
                              }`}
                          >
                            {Math.round(conf * 100)}%
                          </span>
                        )}
                      </div>
                      <select
                        value={selectedCol}
                        onChange={(e) => handleMappingChange(field.key, e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#1E222D] text-zinc-900 dark:text-white border border-zinc-200 dark:border-slate-700 rounded-[6px] focus:outline-none focus:border-[#0F766E]"
                      >
                        <option value="">-- Not Mapped --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Validation Report */}
          {inspection && report.total_rows !== undefined && (
            <div className="bg-white dark:bg-[#1E222D] rounded-[8px] border border-zinc-200 dark:border-slate-700/70 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Data Quality Check
                </h2>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${report.can_proceed
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-red-500/15 text-red-500"
                    }`}
                >
                  {report.can_proceed ? "Ready to Forecast" : "Action Required"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded bg-zinc-50 dark:bg-[#161922]">
                  <div className="text-zinc-500 dark:text-slate-400">Valid / Total Rows</div>
                  <div className="font-bold text-zinc-900 dark:text-white mt-0.5">
                    {report.valid_rows} / {report.total_rows}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-zinc-50 dark:bg-[#161922]">
                  <div className="text-zinc-500 dark:text-slate-400">Invalid Records</div>
                  <div className="font-bold text-red-500 mt-0.5">{report.invalid_records_count || 0}</div>
                </div>
                <div className="p-2.5 rounded bg-zinc-50 dark:bg-[#161922]">
                  <div className="text-zinc-500 dark:text-slate-400">Valid Zero-Sales</div>
                  <div className="font-bold text-zinc-900 dark:text-white mt-0.5">{report.valid_zero_sales_count || 0}</div>
                </div>
                <div className="p-2.5 rounded bg-zinc-50 dark:bg-[#161922]">
                  <div className="text-zinc-500 dark:text-slate-400">Potential Stockouts</div>
                  <div className="font-bold text-amber-500 mt-0.5">
                    {report.potential_stockout_observations_count || 0}
                  </div>
                </div>
              </div>

              {report.issues?.length > 0 && (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {report.issues.map((iss, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 p-2.5 rounded-[6px] text-xs border ${iss.severity === "error"
                        ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                        : iss.severity === "warning"
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                          : "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-300"
                        }`}
                    >
                      {iss.severity === "error" ? (
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : iss.severity === "warning" ? (
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <span>{iss.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Confirm & Launch Forecasting */}
              <div className="flex justify-end pt-2 border-t border-zinc-200 dark:border-slate-700/70">
                <button
                  type="button"
                  onClick={handleConfirmForecast}
                  disabled={!canConfirm}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#0F766E] hover:bg-emerald-600 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {confirming ? "Launching Pipeline..." : "Confirm & Run 28-Day Forecast"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Data Preview */}
          {inspection && (
            <div className="bg-white dark:bg-[#1E222D] rounded-[8px] border border-zinc-200 dark:border-slate-700/70 p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
                  <Table2 className="w-4 h-4 text-[#0F766E]" />
                  Data Preview (First 8 Rows)
                </div>
                <div className="flex rounded-[6px] bg-zinc-100 dark:bg-[#161922] p-0.5 text-xs">
                  {inspection.standardized_preview?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewTab("standardized")}
                      className={`px-2.5 py-1 rounded-[5px] font-semibold cursor-pointer ${previewTab === "standardized"
                        ? "bg-white dark:bg-[#1E222D] text-zinc-900 dark:text-white shadow-sm"
                        : "text-zinc-500"
                        }`}
                    >
                      Cleaned Data
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewTab("raw")}
                    className={`px-2.5 py-1 rounded-[5px] font-semibold cursor-pointer ${previewTab === "raw"
                      ? "bg-white dark:bg-[#1E222D] text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-500"
                      }`}
                  >
                    Original File
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                {previewTab === "standardized" && inspection.standardized_preview?.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-slate-700 text-zinc-500 dark:text-slate-400">
                        {Object.keys(inspection.standardized_preview[0]).map((col) => (
                          <th key={col} className="py-2 px-2.5 font-semibold whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {inspection.standardized_preview.map((row, idx) => (
                        <tr key={idx} className="border-b border-zinc-100 dark:border-slate-800/70">
                          {Object.values(row).map((val, cIdx) => (
                            <td key={cIdx} className="py-1.5 px-2.5 whitespace-nowrap text-zinc-700 dark:text-slate-300">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-slate-700 text-zinc-500 dark:text-slate-400">
                        {headers.map((col) => (
                          <th key={col} className="py-2 px-2.5 font-semibold whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(inspection.profile?.preview_rows || []).map((row, idx) => (
                        <tr key={idx} className="border-b border-zinc-100 dark:border-slate-800/70">
                          {headers.map((h) => (
                            <td key={h} className="py-1.5 px-2.5 whitespace-nowrap text-zinc-700 dark:text-slate-300">
                              {row[h] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Analysis Progress */}
        <div className="lg:col-span-5 bg-white dark:bg-[#1E222D] rounded-[8px] border border-zinc-200 dark:border-slate-700/70 p-4 sm:p-6 flex flex-col justify-between h-fit">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Forecast Progress</h2>
              <span className="text-xs font-bold text-emerald-500">{wsProgress}%</span>
            </div>

            <div className="w-full h-2 bg-zinc-100 dark:bg-slate-800 rounded-full overflow-hidden mb-5">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${wsProgress}%` }}
              />
            </div>

            <div className="space-y-2.5">
              {PIPELINE_STEPS.map((s) => {
                const isDone = completedSteps.has(s.step) || wsProgress === 100;
                const isActive = !isDone && activeWsJobId && runningStep === s.step;
                return (
                  <div
                    key={s.step}
                    className={`flex items-start gap-3 p-2.5 rounded-[8px] border ${isDone
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : isActive
                        ? "bg-[#0F766E]/15 border-[#0F766E]/40 text-zinc-900 dark:text-white"
                        : "bg-zinc-50 dark:bg-[#161922]/60 border-zinc-200/70 dark:border-slate-700/60"
                      }`}
                  >
                    <div className="mt-0.5">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 text-[#0F766E] animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-zinc-300 dark:border-slate-600" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-900 dark:text-white">{s.title}</div>
                      <div className="text-[11px] text-zinc-500 dark:text-slate-400">{s.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {wsStreamedSummary && (
            <div className="mt-4 p-3 rounded-[8px] bg-[#161922] border border-slate-700 text-white text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                Executive Summary Preview
              </div>
              <p className="text-slate-300 line-clamp-4 leading-relaxed">{wsStreamedSummary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
