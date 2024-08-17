export default function App() {
	return (
		<>
			<textarea id="text" />
			<label id="imgwrap">
				<img id="imgicon" alt="画像を選択" />
				<input style={{ display: "none" }} id="img" type="file" accept="image/*" multiple />
			</label>
			<input type="datetime-local" id="time" step="300" />
			<div id="imgpreview" />
			<button id="post" type="button">
				予約する
			</button>
			<div id="log" />
		</>
	);
}
