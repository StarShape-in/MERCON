import Sidebar from './Sidebar';
import Header from './Header';

interface DashboardLayoutProps {
  active: string;
  title: string;
  breadcrumb?: string;
  pageTitle?: string;
  pageSub?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function DashboardLayout({
  active,
  title,
  breadcrumb,
  pageTitle,
  pageSub,
  actions,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F5F7]">
      <Sidebar active={active} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header title={title} breadcrumb={breadcrumb} actions={actions} />
        <div className="flex-1 overflow-y-auto min-h-0 relative pt-8">
          {children}
        </div>
      </div>
    </div>
  );
}
