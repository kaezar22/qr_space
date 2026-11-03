import OrderTracker from "./OrderTracker";

export const dynamic = "force-dynamic";

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderTracker id={id} barName={process.env.NEXT_PUBLIC_BAR_NAME || "QR Space"} />;
}
