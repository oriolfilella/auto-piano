import ScoreCanvas from "@/components/ScoreEditor";

export default function Home() {
  return (
    <main className="min-h-screen p-12 bg-black">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12 text-blue-600">
          Mi Editor de Partituras
        </h1>

        {/* Aquí llamamos al componente que acabas de crear */}
        <ScoreCanvas />

        <p className="mt-8 text-center text-gray-500">🎶🎶🎶🎶🎶🎶🎶🎶</p>
      </div>
    </main>
  );
}
