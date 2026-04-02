export default function SwampySoundboardPage() {
  const animalSounds = [
    { name: 'Crane', emoji: '🕊️' },
    { name: 'Owl', emoji: '🦉' },
    { name: 'Manatee', emoji: '🦭' },
    { name: 'Cardinal', emoji: '🐦' },
    { name: 'Alligator', emoji: '🐊' },
  ];

  const adventureMelodies = [
    { name: 'Harmonica Adventure', icon: '🎵' },
    { name: 'Bongos Rhythm', icon: '🥁' },
    { name: 'Mystery Keys', icon: '🎹' },
  ];

  const soundscapes = [
    { name: 'Swamp', gradient: 'from-teal-400 to-emerald-500' },
    { name: 'Rain', gradient: 'from-sky-400 to-indigo-500' },
    { name: 'River', gradient: 'from-cyan-400 to-blue-500' },
    { name: 'Beach', gradient: 'from-amber-300 to-sky-400' },
    { name: 'Underwater', gradient: 'from-blue-500 to-violet-500' },
  ];

  return (
    <main className="min-h-screen bg-sky-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col gap-4 rounded-[2rem] bg-white p-5 shadow-xl shadow-sky-100 sm:gap-5 sm:p-6 lg:gap-6 lg:p-8">
        <header className="rounded-3xl bg-gradient-to-r from-emerald-100 via-lime-100 to-cyan-100 py-4 text-center shadow-sm sm:py-5">
          <h1 className="text-3xl font-black tracking-tight text-emerald-700 sm:text-4xl lg:text-5xl">
            Swampy Soundboard
          </h1>
        </header>

        <section className="rounded-3xl bg-emerald-50 p-4 shadow-md shadow-emerald-100 sm:p-5">
          <h2 className="mb-4 text-xl font-bold text-emerald-700 sm:text-2xl">Animal Sounds</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {animalSounds.map((animal) => (
              <button
                key={animal.name}
                type="button"
                className="rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-emerald-100 transition-transform duration-150 hover:scale-[1.01]"
              >
                <div className="mb-2 flex aspect-square items-end justify-center rounded-xl bg-emerald-100 text-4xl sm:text-5xl">
                  <span className="leading-none" aria-hidden>{animal.emoji}</span>
                </div>
                <p className="text-center text-base font-semibold text-emerald-800 sm:text-lg">{animal.name}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-amber-50 p-4 shadow-md shadow-amber-100 sm:p-5">
          <h2 className="mb-4 text-xl font-bold text-amber-700 sm:text-2xl">Adventure Melodies</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {adventureMelodies.map((melody) => (
              <button
                key={melody.name}
                type="button"
                className="flex min-h-28 items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-amber-100"
              >
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-amber-100 text-3xl">
                  <span aria-hidden>{melody.icon}</span>
                </div>
                <p className="text-left text-base font-semibold leading-tight text-amber-800 sm:text-lg">{melody.name}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="grid flex-1 rounded-3xl bg-blue-100/80 p-4 shadow-md shadow-blue-200 sm:p-5">
          <div>
            <h2 className="mb-4 text-xl font-bold text-blue-700 sm:text-2xl">Soundscapes</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {soundscapes.map((scape) => (
                <button
                  key={scape.name}
                  type="button"
                  className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-blue-100"
                >
                  <div
                    className={`mb-3 h-20 rounded-xl bg-gradient-to-br ${scape.gradient} sm:h-24 lg:h-20`}
                    aria-hidden
                  />
                  <p className="text-center text-base font-semibold text-blue-800 sm:text-lg">{scape.name}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
