
import React from "react";
import { Loader2, Timer } from "lucide-react";

export default function RevisionProgressInline({ startedAt, darkMode = false }) {
  // Estimate: 3 minutes for revisions
  const ESTIMATE_SECONDS = 3 * 60;

  const [now, setNow] = React.useState(Date.now());
  const safeStartedAt = typeof startedAt === "number" && startedAt > 0 ? startedAt : Date.now();

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - safeStartedAt) / 1000));
  const remaining = Math.max(0, ESTIMATE_SECONDS - elapsed);

  // Cap progress at 99% to avoid jumping to 100 before callback
  const rawProgress = Math.floor((elapsed / ESTIMATE_SECONDS) * 99);
  const progress = Math.min(99, Math.max(0, rawProgress));

  const formatTime = (s) => {
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // Clean labels without percent ranges
  const getPhase = (p) => {
    // At final stage show Exporting
    if (p >= 99) return "Exporting";
    if (p <= 9) return "Analyzing Video Plan";
    if (p <= 69) return "Generating Scenes";
    if (p <= 79) return "Generating Music";
    if (p <= 89) return "Creating VoiceOver";
    return "Rendering Video";
  };

  const isFinalizing = progress >= 99;

  return (
    <div className={`w-full rounded-xl p-6 md:p-8 ${darkMode ? "bg-gray-800/40" : "bg-white/60"} backdrop-blur-sm`}>
      {/* Header centered with big percent */}
      <div className="text-center mb-4 md:mb-6">
        <p className="text-base md:text-lg font-light">Your video is generating...</p>
        <span className="block mt-2 text-4xl md:text-5xl font-bold text-orange-500 tabular-nums">
          {progress}%
        </span>
      </div>

      {/* Current phase centered */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <Loader2 className={`w-6 h-6 animate-spin ${darkMode ? "text-orange-400" : "text-orange-500"}`} />
        <span className="text-base md:text-lg font-medium">{getPhase(progress)}</span>
      </div>

      {/* Progress bar */}
      <div className={`w-full ${darkMode ? "bg-gray-700" : "bg-gray-200"} rounded-full h-3 md:h-4`}>
        <div
          className="bg-orange-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Timer / final message */}
      <div className="mt-4 md:mt-5 flex items-center justify-center gap-2">
        {isFinalizing ? (
          <span className="text-base md:text-lg">
            Your video will be ready shortly...
          </span>
        ) : (
          <>
            <Timer className={`w-5 h-5 ${darkMode ? "text-gray-300" : "text-gray-600"}`} />
            <span className="text-base md:text-lg tabular-nums">{formatTime(remaining)}</span>
          </>
        )}
      </div>
    </div>
  );
}
