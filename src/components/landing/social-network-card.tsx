"use client";

const socialButtons = [
  { color: "#615dfa", icon: "plus", label: "Add Friend" },
  { color: "#23d2e2", icon: "message", label: "Message" },
  { color: "#fd6729", icon: "share", label: "Share" },
  { color: "#ff3d57", icon: "heart", label: "Like" },
  { color: "#00c7d9", icon: "star", label: "Favorite" },
  { color: "#7750f8", icon: "flag", label: "Report" },
];

export function SocialNetworkCard() {
  return (
    <div className="rounded-xl bg-white shadow-[0_0_40px_rgba(94,92,154,0.06)]">
      {/* Header */}
      <div className="border-b border-[#eaeaf5] px-4 py-4 sm:px-7 sm:py-6">
        <h4 className="text-xs font-bold uppercase tracking-wide text-[#3e3f5e]">
          Social Network
        </h4>
      </div>

      {/* Content */}
      <div className="px-4 py-4 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-center gap-3">
          {socialButtons.map((btn, idx) => (
            <button
              key={idx}
              className="flex size-10 items-center justify-center rounded-full text-white transition-transform hover:scale-105"
              style={{ backgroundColor: btn.color }}
              title={btn.label}
            >
              {btn.icon === "plus" && (
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              )}
              {btn.icon === "message" && (
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
              )}
              {btn.icon === "share" && (
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
                </svg>
              )}
              {btn.icon === "heart" && (
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              )}
              {btn.icon === "star" && (
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              )}
              {btn.icon === "flag" && (
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
