import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App.tsx";
import Login from "./login.tsx";
import fallbacklogo from "/fallback.svg";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BrowserRouter>
			<header>
				<h1>Schedulesky{/*--ロゴに置き換えたい*/}</h1>
				<a href="/docs">使い方</a>
				{/*リリース前に作成*/}
				<div id="menu">
					<button type="button" id="menubutton">
						<img id="avatar" width="32" height="32" alt="" src={localStorage.getItem("icon") ?? fallbacklogo} />
					</button>
					<div>
						<button type="button">サインアウト{/*API未実装*/}</button>
						{/* 自分が予約したものの一覧もリリース後に作成したい */}
					</div>
				</div>
			</header>
			<Routes>
				<Route path="/" Component={App} />
				<Route path="/login" Component={Login} />
			</Routes>
			<footer>
				developed by <a href="https://bsky.app/profile/did:plc:qcwvyds5tixmcwkwrg3hxgxd">tomo-x</a>
				<br />
				designed by <a href="https://bsky.app/profile/unosw.bsky.social">unosw</a>
			</footer>
		</BrowserRouter>
	</StrictMode>,
);
