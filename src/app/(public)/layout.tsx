import Image from "next/image";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-[#f6f6fb]">
      {/* Header */}
      <header
        className="flex h-16 w-full items-center justify-center px-4"
        style={{
          background: "linear-gradient(135deg, #F17521, #EB1A33, #FB06D4)",
        }}
      >
        <div className="flex items-center gap-3">
          <Image
            src="/advaspire-logo.png"
            alt="Advaspire"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <span className="text-white font-bold text-lg tracking-wide">
            Advaspire Robotics Academy
          </span>
        </div>
      </header>

      {children}
    </div>
  );
}
