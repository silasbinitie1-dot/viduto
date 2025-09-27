import React, { useState } from 'react';

export default function Logo({ size = 32, className = "", title = "Viduto" }) {
  const [failed, setFailed] = useState(false);
  const src = "https://base44.com/logo_v2.svg";

  if (failed) {
    return (
      <div
        className={`rounded-md flex items-center justify-center ${className}`}
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, #EA580C 0%, #DC2626 100%)"
        }}
        aria-label={title}
        title={title}
      >
        <span className="text-white text-xs font-bold">V</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title}
      width={size}
      height={size}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}