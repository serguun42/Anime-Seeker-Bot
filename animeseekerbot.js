const
	Telegraf = require("telegraf"),
	NodeFetch = require("node-fetch"),
	DEV = require("os").platform() === "win32" || process.argv[2] === "DEV",
	MAL_API_DOMAIN = "https://api.jikan.moe/v3/",
	SHIKI_API_DOMAIN = "https://shikimori.org/api/",
	SHIKI_DOMAIN = "https://shikimori.one",
	MONTHS = ["BUG", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
	{
		TELEGRAM_BOT_TOKEN,
		ADMIN_TELEGRAM_DATA,
		USER_AGENT
	} = require("./animeseekerbot.config.json");




/**
 * @param {String} iString
 * @returns {String}
 */
const MALMakeUpDate = iString => {
	if (!iString || typeof iString !== "string") return "Неизвестно";
	if (!iString.split().length) return "Неизвестно";

	let year = iString.split("-")[0],
		month = parseInt(iString.split("-")[1]) || 0;

	if (!year || !month || month < 1 || month > 12) return "Неизвестно";

	return `${MONTHS[month]} ${year}`;
};

/**
 * @param {Object.<string, any>} iAnime
 * @returns {String}
 */
const MALMakeUpYears = iAnime => {
	if (!iAnime || typeof iAnime !== "object") return "<i>Неизвестно</i>";

	let outDates = new String();

	let startDate = iAnime["start_date"],
		endDate = iAnime["end_date"];

	if (!startDate) return "<i>Неизвестно</i>";

	if (!endDate || startDate === endDate)
		outDates = `(${MALMakeUpDate(startDate)}`
	else
		outDates = `(${MALMakeUpDate(startDate)} — ${MALMakeUpDate(endDate)}`


	if (iAnime["airing"]) outDates += "; Онгоинг";

	outDates += ")";

	return `<i>${TGE(outDates)}</i>`;
};

/**
 * @param {Object.<string, any>} iAnime
 * @returns {String}
 */
const MALMakeUpType = iAnime => {
	if (!iAnime || typeof iAnime !== "object") return "";
	if (!iAnime["type"] || typeof iAnime["type"] !== "string") return "";

	let type = new String();

	switch (iAnime["type"].toLowerCase()) {
		case "tv": type = " [TV]"; break;
		case "ova": type = " [OVA]"; break;
		case "movie": type = " [Фильм]"; break;
		case "special": type = " [Спешл]"; break;
		case "ona": type = " [ONA]"; break;
		case "music": type = " [Музыкальное]"; break;
		default: type = ""; break;
	};


	return `<i>${TGE(type)}</i>`;
};

/**
 * @param {String} iString
 * @returns {String}
 */
const ShikiMakeUpDate = iString => {
	if (!iString || typeof iString !== "string") return "Неизвестно";
	if (!iString.split().length) return "Неизвестно";

	let year = iString.split("-")[0],
		month = parseInt(iString.split("-")[1]) || 0;

	if (!year || !month || month < 1 || month > 12) return "Неизвестно";

	return `${MONTHS[month]} ${year}`;
};

/**
 * @param {Object.<string, any>} iAnime
 * @returns {String}
 */
const ShikiMakeUpYears = iAnime => {
	if (!iAnime || typeof iAnime !== "object") return "<i>Неизвестно</i>";
	if (!iAnime["aired_on"]) return "<i>Неизвестно</i>";

	let outDates = new String();

	let startDate = iAnime["aired_on"],
		endDate = iAnime["released_on"];

	if (!startDate) return "<i>Неизвестно</i>";

	if (!endDate || startDate === endDate)
		outDates = `(${ShikiMakeUpDate(startDate)}`
	else
		outDates = `(${ShikiMakeUpDate(startDate)} — ${ShikiMakeUpDate(endDate)}`


	if (iAnime["ongoing"]) outDates += "; Онгоинг";

	outDates += ")";

	return `<i>${TGE(outDates)}</i>`;
};

/**
 * @param {Object.<string, any>} iAnime
 * @returns {String}
 */
const ShikiMakeUpType = iAnime => {
	if (!iAnime || typeof iAnime !== "object") return "";
	if (!iAnime["kind"] || typeof iAnime["kind"] !== "string") return "";

	let type = new String();

	switch (iAnime["kind"].toLowerCase()) {
		case "tv": type = " [TV]"; break;
		case "ova": type = " [OVA]"; break;
		case "movie": type = " [Фильм]"; break;
		case "special": type = " [Спешл]"; break;
		case "ona": type = " [ONA]"; break;
		case "music": type = " [Музыкальное]"; break;
		default: type = ""; break;
	};


	return `<i>${TGE(type)}</i>`;
};

/**
 * @param {Object.<string, any>} iAnime
 * @returns {String}
 */
const ShikiMakeUpName = iAnime => {
	if (!iAnime || typeof iAnime !== "object") return "";

	if (iAnime["russian"] && typeof iAnime["russian"] == "string") return iAnime["russian"];

	if (iAnime["name"] && typeof iAnime["name"] == "string") return iAnime["name"];

	if (iAnime["english"] && typeof iAnime["english"][0] == "string") return iAnime["english"][0];

	if (iAnime["japanese"] && typeof iAnime["japanese"][0] == "string") return iAnime["japanese"][0];

	if (iAnime["synonyms"] && typeof iAnime["synonyms"][0] == "string") return iAnime["synonyms"][0];

	return "<Обычно, у аниме есть название, но Шики его почему-то не дают>";
};



const telegraf = new Telegraf.Telegraf(TELEGRAM_BOT_TOKEN);
const telegram = telegraf.telegram;



telegraf.on("inline_query", (ctx) => {
	const { inlineQuery } = ctx;

	const seeking = inlineQuery.query;
	if (!seeking) return false;


	if (!(/[а-я]/gi.test(seeking))) { // MAL SEARCH
		NodeFetch(`${MAL_API_DOMAIN}search/anime?q=${encodeURIComponent(seeking.toString())}`, {
			headers: {
				"User-agent": USER_AGENT
			},
			method: "GET"
		})
		.then((res) => {
			if (res.status === 200)
				return res.json();
			else
				return Promise.reject(`Status code ${res.status} ${res.statusText}`);
		})
		.then(({ results }) => {
			if (!results) return false;
			if (!results.length) return false;


			ctx.answerInlineQuery(results.map((anime) => ({
				type: "article",
				id: `MAL_${anime["mal_id"]}_${Date.now()}`,
				title: anime["title"],
				description: anime["synopsis"],
				url: anime["url"],
				thumb_url: anime["image_url"],
				input_message_content: {
					message_text: `<a href="${TGE(encodeURI(anime.url))}">${TGE(anime.title)}</a>\n${MALMakeUpYears(anime)}${MALMakeUpType(anime)}\n<b>Рейтинг</b>: ${TGE(anime.score ? anime.score : "Неизвестно")}`,
					parse_mode: "HTML",
				},
				reply_markup: Telegraf.Markup.inlineKeyboard([
					{
						text: "MyAnimeList",
						url: anime["url"]
					},
					{
						text: "Shikimori",
						url: `${SHIKI_DOMAIN}/animes/${anime["mal_id"]}`
					}
				]).reply_markup
			}))).catch((e) => console.error("Error on answering from MAL", e));
		})
		.catch(console.warn);
	} else { // SHIKI SEARCH
		NodeFetch(`${SHIKI_API_DOMAIN}animes?search=${encodeURIComponent(seeking.toString())}`, {
			headers: {
				"User-agent": USER_AGENT
			},
			method: "GET"
		})
		.then((res) => {
			if (res.status === 200)
				return res.json();
			else
				return Promise.reject(`Status code ${res.status} ${res.statusText}`);
		})
		.then((results) => {
			if (!results) return false;
			if (!results.length) return false;


			ctx.answerInlineQuery(results.map((anime) => ({
				type: "article",
				id: `SHIKI_${anime["id"]}_${Date.now()}`,
				title: ShikiMakeUpName(anime),
				url: SHIKI_DOMAIN + anime.url,
				thumb_url: SHIKI_DOMAIN + anime["image"]["original"],
				input_message_content: {
message_text: `<a href="${TGE(SHIKI_DOMAIN + anime.url)}">${TGE(ShikiMakeUpName(anime))}</a>
${ShikiMakeUpYears(anime)}${ShikiMakeUpType(anime)}
<b>Рейтинг</b>: ${TGE(anime.score ? anime.score : "Неизвестно")}`,
					parse_mode: "HTML",
				},
				reply_markup: Telegraf.Markup.inlineKeyboard([
					{
						text: "MyAnimeList",
						url: `https://myanimelist.net/anime/${anime["id"]}`
					},
					{
						text: "Shikimori",
						url: SHIKI_DOMAIN + anime.url
					}
				]).reply_markup
			}))).catch((e) => console.error("Error on answering from Shiki", e));
		})
		.catch(console.warn);
	};
});

telegraf.launch();



const TGE = iStr => {
	if (!iStr) return "";
	
	if (typeof iStr === "string")
		return iStr
			.replace(/\&/g, "&amp;")
			.replace(/\</g, "&lt;")
			.replace(/\>/g, "&gt;");
	else
		return TGE(iStr.toString());
};

/**
 * @param {String} message
 */
const TelegramSendToAdmin = (message) => {
	if (!message) return;

	telegram.sendMessage(ADMIN_TELEGRAM_DATA.id, message, {
		parse_mode: "HTML",
		disable_notification: false
	}).catch(console.warn);
};

if (!DEV)
	TelegramSendToAdmin(`Anime Seeker Bot have been spawned at ${new Date().toISOString()} <i>(ISO 8601, UTC)</i>`);
