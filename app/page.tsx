'use client'

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">Only W&apos;s Fantasy</h1>
      <p className="text-lg text-slate-400 max-w-xl">
        Select a team from the sidebar to view its draftboard, manage picks, and explore player stats.
      </p>
    </main>
  );
}