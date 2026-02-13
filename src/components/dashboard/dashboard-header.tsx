interface DashboardHeaderProps {
  title: string;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  return (
    <header className="fixed flex h-14 shrink-0 items-center border-b px-6 ">
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
