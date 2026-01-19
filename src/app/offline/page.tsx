export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">📵</div>
        <h1 className="text-3xl font-bold text-[#f7f3ed] mb-4">
          You&apos;re Offline
        </h1>
        <p className="text-gray-400 mb-8">
          It looks like you&apos;ve lost your connection. Don&apos;t worry, some content may still be available from your cache.
        </p>
        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 rounded-lg bg-[#c19a6b] text-[#0a0a0a] font-semibold hover:bg-[#d4ad7e] transition"
          >
            Try Again
          </button>
          <p className="text-sm text-gray-500">
            Your reading progress will be saved when you reconnect.
          </p>
        </div>
      </div>
    </main>
  )
}
