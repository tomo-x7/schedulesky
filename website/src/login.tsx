import { useEffect, useState } from "react";

export default function Login() {
	const [handle, sethandle] = useState<string | undefined>(undefined);
	useEffect(() => {
		const handle = localStorage.getItem("handle");
		if (handle) {
			sethandle(handle);
		}
	});
	return (
		<>
			{handle ? (
				<button type="button">
					<img alt="" src={localStorage.getItem("icon") ?? ""} />
					{/*そのユーザーのアイコン blueskyのアイコンか初期アイコンにフォールバック*/}
					{handle}でログイン
				</button>
			) : undefined}
			<button type="button">
				<img alt="" />
				{/* ↑blueskyのアイコン*/}
				{handle ? "他のユーザー" : "Bluesky"}でログイン
			</button>
			<button type="button">
				<img alt="" />
				{/* ↑blueskyのアイコン*/}
				{handle ? "他のユーザー" : "Bluesky"}でログイン{"(セルフホストPDSの方はこちら)"}
			</button>
			<div id="log" />
		</>
	);
}
