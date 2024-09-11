const App: React.FC = () => {
  return (
    <div className="flex justify-center items-center min-h-svh p-4">
      <div className="flex-1 max-w-md px-8 sm:px-12 material rounded-lg">
        <div className="flex flex-col items-center my-16">
          <svg
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="size-10"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <div className="h-4" />
          <h1 className="text-slate-800 text-4xl sm:text-5xl font-bold">
            Schedulesky
          </h1>
          <div className="h-2" />
          <p className="text-slate-600">Bluesky予約投稿サービス</p>
        </div>
        <div className="flex flex-col items-center my-8">
          <Button
            action={() => {}}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold transition hover:bg-indigo-500 active:scale-[0.96]"
          >
            Blueskyでログイン
          </Button>
          <div className="h-4" />
          <Button
            action={() => {}}
            className="px-4 py-2 rounded-lg text-indigo-700 text-sm font-bold transition hover:bg-white/50 active:scale-[0.96]"
          >
            セルフホストPDSの方はこちら
          </Button>
        </div>
      </div>
    </div>
  )
}

const Button: React.FC<ButtonProps> = ({ action, className, children }) => {
  if (typeof(action) === 'string') {
    return <a href={action} className={className}>{children}</a>
  }

  return <button onClick={action} className={className}>{children}</button>
}

type ButtonProps = {
  action: string | (() => void)
  className: string
  children: React.ReactNode
};

export default App
