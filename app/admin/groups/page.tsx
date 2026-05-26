import prisma from "@/app/lib/prisma";
import GroupsPageClient from "./GroupsPageClient";
import { getGroupAccuracyStatsAction } from "@/app/actions";

export default async function GroupsPage() {
  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
  });

  const accuracyRes = await getGroupAccuracyStatsAction();
  const accuracyStats = accuracyRes.success && accuracyRes.data ? accuracyRes.data : [];

  return <GroupsPageClient initialGroups={groups} accuracyStats={accuracyStats} />;
}
