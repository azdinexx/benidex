import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import AdminNav from "@/app/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/admin");
  }

  if ((session.user as any)?.role !== "ADMIN") {
    redirect("/user");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminNav />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
