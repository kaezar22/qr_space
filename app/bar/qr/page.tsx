import { redirect } from "next/navigation";
import BarNav from "@/components/BarNav";
import { isBarAuthed } from "@/lib/auth";
import QrSheet from "./QrSheet";

export const dynamic = "force-dynamic";

export default async function BarQrPage() {
  if (!(await isBarAuthed())) redirect("/bar/login");
  const barName = process.env.NEXT_PUBLIC_BAR_NAME || "QR Space";
  return (
    <div className="bar-shell">
      <BarNav barName={barName} />
      <main className="bar-main">
        <QrSheet barName={barName} />
      </main>
    </div>
  );
}
