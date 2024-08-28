import { useEffect, useRef, useState } from "react";
import fallbacklogo from "/fallback.svg";

export default function Login() {
	const [handle, sethandle] = useState<string | undefined>(undefined);
	useEffect(() => {
		const handle = localStorage.getItem("handle");
		if (handle) {
			sethandle(handle);
		}
	});
	const dialog = useRef<HTMLDialogElement>(null);
	const PDSInput = useRef<HTMLInputElement>(null);
	const log = useRef<HTMLDivElement>(null);
	const anyPDSLogin = () => {
		if (!PDSInput.current?.value) {
			if (!log.current) return;
			log.current.innerText = "入力してください";
			return;
		}
		location.href = `/api/login?endpoint=${PDSInput.current?.value}`;
	};
	return (
		<>
			{handle ? (
				<a href={`/api/login?handle=${handle}`}>
					<img alt="" src={localStorage.getItem("icon") ?? fallbacklogo} />
					{/*そのユーザーのアイコン blueskyのアイコンか初期アイコンにフォールバック*/}
					{handle}でログイン
				</a>
			) : undefined}
			<a href="/api/login?endpoint=https://bsky.social">
				<img alt="" />
				{/* ↑blueskyのアイコン*/}
				{handle ? "他のユーザー" : "Bluesky"}でログイン
			</a>
			<button
				type="button"
				onClick={() => {
					dialog.current?.showModal();
				}}
			>
				<img alt="" />
				{/* ↑blueskyのアイコン*/}
				{handle ? "他のユーザー" : "Bluesky"}でログイン{"(セルフホストPDSの方はこちら)"}
			</button>
			<dialog ref={dialog}>
				<input type="text" ref={PDSInput} placeholder="https://bsky.social" />
				<button
					type="button"
					onClick={() => {
						dialog.current?.close();
					}}
				>
					閉じる
				</button>
				<button type="button" onClick={anyPDSLogin}>
					ログイン
				</button>
				<div ref={log} />
			</dialog>
			<div id="log" />
		</>
	);
}
