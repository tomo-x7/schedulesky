import { useRef } from "react";
import imageCompression, { type Options } from "browser-image-compression";
import { AtpAgent, RichText } from "@atproto/api";

const agent = new AtpAgent({ service: "https://bsky.social" });
export default function App() {
	const compressOption: Options = {
		maxSizeMB: 0.9,
		fileType: "image/jpeg",
		maxWidthOrHeight: 2000,
	};
	const logelem = useRef<HTMLDivElement>(null);
	const textelem = useRef<HTMLTextAreaElement>(null);
	const imgelem = useRef<HTMLInputElement>(null);
	const timeelem = useRef<HTMLInputElement>(null);
	const imgpreviewelem = useRef<HTMLDivElement>(null);
	const loading = () => {};
	const finloading = () => {};
	const log = (str: string) => {
		if (logelem.current) {
			logelem.current.innerText = str;
		}
	};
	const filechanged = async () => {
		log("");
		const images = await imageprocess();
		if (!images || images === "error") {
			finloading();
			return;
		}
		//プレビューに表示
		imgpreviewelem.current?.append(
			...images.map((src) => {
				const elem = document.createElement("img");
				elem.src = src;
				return elem;
			}),
		);
	};
	const blobtobase64 = (blob: Blob): Promise<string> => {
		return new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				if (!e.target || !e.target.result) {
					return reject();
				}
				resolve(e.target.result as string);
			};
			reader.readAsDataURL(blob);
		});
	};
	const imageprocess = async () => {
		//バリデーション
		if (imgelem.current?.files && imgelem.current.files.length > 4) {
			log("画像は4枚までです");
			imgelem.current.value = "";
			return "error";
		}
		if (!imgelem.current?.files) {
			return;
		}
		//圧縮してbase64に変換
		const images = await Promise.all(
			Array.from(imgelem.current.files).map(async (file) => {
				const img = await imageCompression(file, compressOption);
				return blobtobase64(img);
			}),
		);
		return images;
	};
	const post = async () => {
		try {
			log("");
			//ローディング表示
			loading();
			//画像を処理して4枚以上だったら送信不可
			const images = await imageprocess();
			if (images === "error") {
				finloading();
				return;
			}
			//日付を処理して5分間隔に沿っていなければ送信不可
			if (!timeelem.current?.value) {
				finloading();
				return;
			}
			const date = new Date(timeelem.current.value);
			if (date.getMinutes() % 5 !== 0) {
				log("5分刻みでしか投稿できません");
				finloading();
				return;
			}
			//richtextを作成
			const rt = new RichText({ text: textelem.current?.value ?? "" });
			await rt.detectFacets(agent);
			const body = {
				text: rt.text,
				date: date.toISOString(),
				facets: rt.facets ?? null,
				images: images?.map((str) => {
					return { base64: str, alt: null };
				}),
			};
			const res = await fetch("/api/createpost", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (res.ok) {
				log("予約に成功しました！");
				//入力欄をクリア
				if (textelem.current && imgelem.current && imgpreviewelem.current) {
					textelem.current.value = "";
					imgelem.current.value = "";
					timeelem.current.value = "";
					imgpreviewelem.current.innerHTML = "";
				}
			} else {
				log(`エラーが発生しました  ${res.status}:${res.statusText}`);
			}
			finloading();
		} finally {
			finloading();
		}
	};
	return (
		<>
			<textarea id="text" ref={textelem} />
			<label id="imgwrap">
				<img id="imgicon" alt="画像を選択" />
				<input style={{ display: "none" }} id="img" type="file" accept="image/*" multiple ref={imgelem} onChange={filechanged} />
			</label>
			<input type="datetime-local" id="time" step="300" ref={timeelem} />
			<div id="imgpreview" ref={imgpreviewelem} />
			<button id="post" type="button" onClick={post}>
				予約する
			</button>
			<div id="log" ref={logelem} />
		</>
	);
}
