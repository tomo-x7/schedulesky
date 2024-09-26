const HomePage: React.FC = () => {
  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex flex-col items-center gap-4 p-12">
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-10">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-slate-800 text-4xl sm:text-5xl font-bold">
            Schedulesky
          </h1>
          <p className="text-slate-600">Bluesky 予約投稿サービス</p>
        </div>
      </div>
      <div className="flex items-center max-w-lg mx-auto p-2 material rounded-lg">
        <div className="rounded-lg w-12 h-12 bg-indigo-500" />
        <div className="w-3" />
        <div className="flex-1">
          <p className="text-sm">ジャンボンブール斎藤</p>
          <p className="text-slate-500 text-xs">@unosw.bsky.social</p>
        </div>
        <button className="size-8 me-1 p-1.5 rounded-lg text-red-600 transition hover:bg-white/50" title="ログアウト">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" />
          </svg>
        </button>
      </div>
      <div className="h-4" />
      <div className="max-w-lg mx-auto material rounded-lg">
        <textarea className="block w-full p-4 bg-transparent rounded-xl outline-none resize-none" placeholder="最近どう？" rows={8} />
        <p className="px-4 py-3 text-end">300</p>
      </div>
      <div className="h-4" />
      <div className="flex flex-col p-4 material rounded-lg max-w-lg mx-auto">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
          </svg>
          <div className="w-2" />
          <p className="text-sm font-bold">日付</p>
          <div className="flex-1" />
          <p className="text-sm font-bold">2024年9月18日 (水)</p>
        </div>
        <div className="my-3 border-t border-slate-900/10" />
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <div className="w-2" />
          <p className="text-sm font-bold">時刻</p>
          <div className="flex-1" />
          <p className="text-sm font-bold">12:30</p>
        </div>
      </div>
      <div className="h-8" />
      <div className="max-w-lg mx-auto">
        <button className="block ms-auto bg-indigo-600 text-white px-4 py-2 rounded-lg shadow transition hover:bg-indigo-500 active:scale-95">
          投稿を予約
        </button>
      </div>
    </div>
  )
}

export default HomePage
