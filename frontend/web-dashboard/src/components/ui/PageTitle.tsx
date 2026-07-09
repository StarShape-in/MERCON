interface PageTitleProps {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
}

export default function PageTitle({ title, sub, actions }: PageTitleProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 shrink-0 bg-[#F5F5F7]">
      <div>
        <h1 className="text-xl font-bold text-[#111] leading-tight tracking-tight">{title}</h1>
        {sub && <p className="text-xs text-[#6E6E80] mt-0.5 font-medium">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
