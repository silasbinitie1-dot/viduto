
import React from "react";
import { Loader2, Timer } from "lucide-react";

export default function ProductionProgress({ videoId, startedAt, darkMode = false }) {
  // Estimate: 6 minutes for initial productions
  const ESTIMATE_SECONDS = 6 * 60;

  const [now, setNow] = React.useState(Date.now());
  const safeStartedAt = typeof startedAt === "number" && startedAt > 0 ? startedAt : Date.now();

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - safeStartedAt) / 1000));
  const remaining = Math.max(0, ESTIMATE_SECONDS - elapsed);

  // Linear simulated progress up to 99%
  const rawProgress = Math.floor((elapsed / ESTIMATE_SECONDS) * 99);
  const progress = Math.min(99, Math.max(0, rawProgress));

  const formatTime = (s) => {
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // Clean labels without percent ranges
  const getPhase = (p) => {
    if (p <= 9) return "Analyzing Video Plan";
    if (p <= 69) return "Generating Scenes";
    if (p <= 79) return "Generating Music";
    if (p <= 89) return "Creating VoiceOver";
    return "Rendering Video";
  };

  return (
    <div className={`w-full rounded-xl p-8 md:p-10 border ${darkMode ? "bg-gray-800/60 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
      {/* Header centered with big percent */}
      <div className="text-center mb-4 md:mb-6">
        <p className="text-xl md:text-2xl font-light">Your video is generating...</p>
        <span className="block mt-2 text-5xl md:text-6xl font-bold text-orange-500 tabular-nums">
          {progress}%
        </span>
      </div>

      {/* Current phase centered */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <Loader2 className={`w-6 h-6 animate-spin ${darkMode ? "text-orange-400" : "text-orange-500"}`} />
        <span className="text-lg md:text-xl font-medium">{getPhase(progress)}</span>
      </div>

      {/* Progress bar */}
      <div className={`w-full ${darkMode ? "bg-gray-700" : "bg-gray-200"} rounded-full h-3 md:h-4`}>
        <div
          className="bg-orange-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Timer under the bar centered */}
      <div className="mt-4 md:mt-5 flex items-center justify-center gap-2">
        <Timer className={`w-5 h-5 ${darkMode ? "text-gray-300" : "text-gray-600"}`} />
        <span className="text-lg md:text-xl tabular-nums">{formatTime(remaining)}</span>
      </div>
    </div>
  );
}
