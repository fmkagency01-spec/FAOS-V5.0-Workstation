import { redirect } from "next/navigation";

/** Workstation hub — maps legacy /dashboard to the apps launcher. */
export default function DashboardPage() {
  redirect("/");
}
