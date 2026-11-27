import { useEffect, useRef, useState } from "react";
import { getStoredTokens } from "./useAuth";

export function useAnalysisWebSocket(jobId, onComplete) {
  const [events, setEvents] = useState([]);
  const [progress, setProgress] = useState(0);
  const [streamedSummary, setStreamedSummary] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const wsRef = useRef(null);

  useEffect(() => {
    if (!jobId) return;
    setEvents([]);
    setProgress(5);
    setStreamedSummary("");
    setStatusMessage("Connecting to real-time analysis pipeline...");
    setError("");

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const { access } = getStoredTokens();
    const tokenParam = access ? `?token=${encodeURIComponent(access)}` : "";
    const wsUrl = `${proto}//${window.location.host}/ws/analysis/${jobId}/${tokenParam}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (typeof data.progress === "number") {
          setProgress(data.progress);
        }
        if (data.status === "streaming" && data.token) {
          setStreamedSummary((prev) => prev + data.token);
          return;
        }
        if (data.message) {
          setStatusMessage(data.message);
          setEvents((prev) => [...prev, data]);
        }
        if (data.status === "error") {
          setError(data.message || "Analysis failed.");
        }
        if (data.status === "complete") {
          onComplete?.(data.job_id || jobId);
        }
      } catch {
        // Ignore malformed frame
      }
    };

    ws.onerror = () => {
      setError("Unable to connect to live progress updates. Please try again.");
    };

    return () => {
      ws.close();
    };
  }, [jobId]);

  return { events, progress, streamedSummary, statusMessage, error };
}
