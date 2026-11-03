import { redirect } from "next/navigation";
import BarNav from "@/components/BarNav";
import { isBarAuthed } from "@/lib/auth";
import MenuAdmin from "./MenuAdmin";

export const dynamic = "force-dynamic";

export default async function BarMenuPage() {
  if (!(await isBarAuthed())) redirect("/bar/login");
  return (
    <div className="bar-shell">
      <BarNav barName={process.env.NEXT_PUBLIC_BAR_NAME || "QR Space"} />
      <main className="bar-main" style={{ maxWidth: 1000 }}>
        <MenuAdmin />
      </main>
    </div>
  );
}
