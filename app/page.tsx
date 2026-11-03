import Link from "next/link";

const barName = process.env.NEXT_PUBLIC_BAR_NAME || "QR Space";

export default function Home() {
  return (
    <main className="client" style={{ paddingTop: 48 }}>
      <h1 className="display" style={{ fontSize: "2.6rem" }}>{barName}</h1>
      <p className="muted">
        Escanea el código QR de tu mesa para ver el menú y pedir. Te avisamos aquí mismo cuando tu
        pedido esté listo.
      </p>
      <div className="stack" style={{ marginTop: 28 }}>
        <Link className="btn btn-primary btn-lg" href="/mesa/1">Ver el menú (mesa de prueba)</Link>
        <Link className="btn btn-ghost" href="/bar">Soy del bar</Link>
      </div>
    </main>
  );
}
