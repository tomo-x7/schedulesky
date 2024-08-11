(<HTMLInputElement>document.getElementById("endpoint")).defaultValue = localStorage.getItem("endpoint") ?? "https://bsky.social";

document.getElementById("login")!.addEventListener("click", async () => {
	const endpoint = (<HTMLInputElement>document.getElementById("endpoint")).value;
	const handle = (<HTMLInputElement>document.getElementById("handle")).value;
	const password = (<HTMLInputElement>document.getElementById("password")).value;
	const res = await fetch("/api/login", {
		method: "POST",
		body: JSON.stringify({ identifier: handle, password, endpoint }),
		headers: { "Content-Type": "application/json" },
	});
	if (res.ok) {
		localStorage.setItem("endpoint", endpoint);
		location.href = "/";
	} else {
		const log = document.getElementById("log")!;
		try {
			log.innerText = JSON.stringify(await res.json());
		} catch {
			log.innerText = `${res.status} ${res.statusText}`;
		}
	}
});
