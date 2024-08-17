export default function Login() {
	return (
		<>
			<label>
				エンドポイント
				<input id="endpoint" type="url" autoComplete="url" value="https://bsky.social" />
			</label>
			<br />
			<label>
				ハンドルかDID
				<input id="handle" type="text" autoComplete="username" placeholder="example.bsky.social" />
			</label>
			<br />
			<label>
				アプリパスワード
				<input id="password" type="password" autoComplete="current-password" placeholder="aaaa-bbbb-cccc-dddd" />
			</label>
			<br />
			<button type="button" id="login">
				ログイン
			</button>
			<div id="log" />
		</>
	);
}
