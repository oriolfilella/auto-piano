import ScoreEditor from "@/components/ScoreEditor";

export default function Home() {
  return (
    <main className="min-h-screen p-2 md:p-6 bg-black">
      <div className="max-w-[98%] 2xl:max-w-[1600px] mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 text-blue-600">
          Mi Editor de Partituras
        </h1>

        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-semibold text-white">
            Bienvenido a Auto-Piano
          </h2>
          <p className="mt-2 text-gray-400">
            Esta es una aplicación para aprender y practicar piano. ¡Comienza a editar tu partitura a continuación!
          </p>
        </div>

        {/* HEMOS QUITADO overflow-hidden para que el sticky funcione */}
        <div className="rounded-3xl shadow-2xl">
          <ScoreEditor />
        </div>

        <p className="mt-4 text-center text-gray-500">🎶🎶🎶🎶🎶🎶🎶🎶</p>
      </div>
    </main>
  );
}
