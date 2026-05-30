import Upload from './components/Upload'
import RecentSubtitles from './components/RecentSubtitles'

function App() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-100 p-6">
      <div className="flex w-full max-w-5xl flex-col gap-6 md:flex-row md:items-start">
        <main className="md:w-2/3">
          <Upload />
        </main>
        <aside className="md:w-1/3">
          <RecentSubtitles />
        </aside>
      </div>
    </div>
  )
}

export default App
