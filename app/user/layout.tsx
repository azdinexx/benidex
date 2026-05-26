import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import UserNav from "@/app/components/UserNav";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/user");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <UserNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
