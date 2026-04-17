export default function StudentAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-gradient-to-b from-emerald-900 via-emerald-800 to-teal-900 flex items-center justify-center p-4">
      {children}
    </div>
  );
}
