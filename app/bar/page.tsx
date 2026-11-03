import { redirect } from "next/navigation";
import { isBarAuthed } from "@/lib/auth";
import BarBoard from "./BarBoard";

export const dynamic = "force-dynamic";

export default async function BarPage() {
  if (!(await isBarAuthed())) redirect("/bar/login");
  return <BarBoard barName={process.env.NEXT_PUBLIC_BAR_NAME || "QR Space"} />;
}
