import imageCompression, { type Options } from "browser-image-compression";
import { BskyAgent, RichText } from "@atproto/api";

const textarea = <HTMLTextAreaElement>document.getElementById("text");
const timeinput = <HTMLInputElement>document.getElementById("time");
const imginput = <HTMLInputElement>document.getElementById("img");
const postbtn = <HTMLButtonElement>document.getElementById("post");
const logelem = <HTMLDivElement>document.getElementById("log");
const imgpreview = <HTMLDivElement>document.getElementById("imgpreview");

const compressOption: Options = {
	maxSizeMB: 0.9,
	fileType: "image/jpeg",
	maxWidthOrHeight: 2000,
};
const agent = new BskyAgent({ service: localStorage.getItem("endpoint") ?? "https://bsky.social" });

imginput.addEventListener("change", async (ev) => {
	logelem.innerText = "";
	const images = await imageprocess();
	if (!images || images === "error") {
		finloading();
		return;
	}
	//プレビューに表示
	imgpreview.append(
		...images.map((src) => {
			const elem = document.createElement("img");
			elem.src = src;
			return elem;
		}),
	);
});

postbtn.addEventListener("click", async () => {
	try {
		logelem.innerText = "";
		//ローディング表示
		loading();
		//画像を処理して4枚以上だったら送信不可
		const images = await imageprocess();
		if (images === "error") {
			finloading();
			return;
		}
		//日付を処理して5分間隔に沿っていなければ送信不可
		if (!timeinput.value) {
			finloading();
			return;
		}
		const date = new Date(timeinput.value);
		if (date.getMinutes() % 5 !== 0) {
			logelem.innerText = "5分刻みでしか投稿できません";
			finloading();
			return;
		}
		//richtextを作成
		const rt = new RichText({ text: textarea.value });
		await rt.detectFacets(agent);
		const body = {
			text: rt.text,
			date: date.toISOString(),
			facets: rt.facets??null,
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
			logelem.innerText = "予約に成功しました！";
			//入力欄をクリア
			textarea.value = "";
			imginput.value = "";
			timeinput.value = "";
			imgpreview.innerHTML = "";
		} else {
			logelem.innerText = `エラーが発生しました  ${res.status}:${res.statusText}`;
		}
		finloading();
	} finally {
		finloading();
	}
});

async function imageprocess() {
	//バリデーション
	if (imginput.files && imginput.files.length > 4) {
		logelem.innerText = "画像は4枚までです";
		imginput.value = "";
		return "error";
	}
	if (!imginput.files) {
		return;
	}
	//圧縮してbase64に変換
	const images = await Promise.all(
		Array.from(imginput.files).map(async (file) => {
			const img = await imageCompression(file, compressOption);
			return blobtobase64(img);
		}),
	);
	return images;
}
function blobtobase64(blob: Blob): Promise<string> {
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
}
function loading() {}
function finloading() {}
