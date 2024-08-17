import "./main.css";
document.addEventListener("DOMContentLoaded", async () => {
	const profile = await fetch("/api/getprofile");
	if (profile.status === 401) {
		location.href = "/login/";
	}
	(<HTMLImageElement>document.getElementById("avatar")).src = (await profile.json()).avatar;
});
