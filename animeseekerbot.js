const
	Telegraf = require("telegraf"),
	Sessions = require("telegraf/session"),
	Markup = require("telegraf/markup"),
	Telegram = require("telegraf/telegram"),
	CONFIG = JSON.parse(require("fs").readFileSync("./config.json"))["ASB"],
	TELEGRAM_BOT_TOKEN = CONFIG.TELEGRAM_BOT_TOKEN,
	ADMIN_TELEGRAM_DATA = CONFIG.ADMIN_TELEGRAM_DATA,
	PERMISSION_LIST = CONFIG.PERMISSION_LIST;



const
	telegram = new Telegram(TELEGRAM_BOT_TOKEN),
	TOB = new Telegraf(TELEGRAM_BOT_TOKEN);

TOB.use(Sessions());
TOB.on("text", (ctx) => {
	if (ctx.from && ctx.from["id"] === ADMIN_TELEGRAM_DATA.id && ctx.from["username"] === ADMIN_TELEGRAM_DATA.username) {
		ctx.reply("```\n" + JSON.stringify({
			status: "OK",
			message: "You're ADMIN, writing in private",
			from: ctx.from,
			chat: ctx.chat
		}, false, "    ") + "\n```", {
			parse_mode: "MarkdownV2"
		});
	};
});

TOB.launch();




TOB.on("inline_query", ({ inlineQuery, answerInlineQuery }) => {
	let seeking = inlineQuery.query;
	if (!seeking) return false;
	if (!inlineQuery.from) return false;




	let permissionIndex = PERMISSION_LIST.indexOf(inlineQuery.from["username"]);

	if (permissionIndex > -1) {
		if (!(/[а-я]/gi.test(seeking))) { // MAL SEARCH
			request(`${MAL_API_DOMAIN}search/anime?q=${encodeURIComponent(seeking.toString())}`, {
				headers: {
					"User-agent": USER_AGENT
				},
				method: "GET"
			}, (iErr, iResponse, iBody) => {
				if (iErr) return false;
				if (iResponse.statusCode !== 200) return false;


				let results;

				try {
					results = JSON.parse(iBody)["results"];
				} catch (e) {
					return false;
				};

				if (!results) return false;
				if (!results.length) return false;


				answerInlineQuery(results.map(anime => ({
					type: "article",
					id: `MAL_${anime["mal_id"]}`,
					title: anime["title"],
					description: anime["synopsis"],
					url: anime["url"],
					thumb_url: anime["image_url"],
					input_message_content: {
message_text: `<a href="${TGE(encodeURI(anime.url))}">${TGE(anime.title)}</a>
${MALMakeUpYears(anime)}${MALMakeUpType(anime)}
<b>Рейтинг</b>: ${TGE(anime.score ? anime.score : "Неизвестно")}`,
						parse_mode: "HTML",
					},
					reply_markup: Markup.inlineKeyboard([
						Markup.urlButton("MyAnimeList", anime["url"]),
						Markup.urlButton("Shikimori", SHIKI_DOMAIN + "/animes/" + anime["mal_id"])
					])
				}))).catch((e) => console.error("Error on answering from MAL", e));
			});
		} else { // SHIKI SEARCH
			request(`${SHIKI_API_DOMAIN}animes?search=${encodeURIComponent(seeking.toString())}`, {
				headers: {
					"User-agent": USER_AGENT
				},
				method: "GET"
			}, (iErr, iResponse, iBody) => {
				if (iErr) return false;
				if (iResponse.statusCode !== 200) return false;


				let results;

				try {
					results = JSON.parse(iBody);
				} catch (e) {
					return false;
				};

				if (!results) return false;
				if (!results.length) return false;


				


				answerInlineQuery(results.map(anime => ({
					type: "article",
					id: `SHIKI_${anime["id"]}`,
					title: ShikiMakeUpName(anime),
					url: SHIKI_DOMAIN + anime.url,
					thumb_url: SHIKI_DOMAIN + anime["image"]["original"],
					input_message_content: {
message_text: `<a href="${TGE(SHIKI_DOMAIN + anime.url)}">${TGE(ShikiMakeUpName(anime))}</a>
${ShikiMakeUpYears(anime)}${ShikiMakeUpType(anime)}
<b>Рейтинг</b>: ${TGE(anime.score ? anime.score : "Неизвестно")}`,
						parse_mode: "HTML",
					},
					reply_markup: Markup.inlineKeyboard([
						Markup.urlButton("MyAnimeList", `https://myanimelist.net/anime/${anime["id"]}`),
						Markup.urlButton("Shikimori", SHIKI_DOMAIN + anime.url)
					])
				}))).catch((e) => console.error("Error on answering from Shiki", e));
			});
		};
	} else {
		answerInlineQuery([{
			type: "article",
			id: `REJECT_${new Date().toISOString()}`,
			title: "У вас нет доступа",
			input_message_content: {
				message_text: seeking,
				parse_mode: "HTML",
			}
		}]).catch((e) => console.error("Error on answering from Shiki", e));
	}
});




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
 * @param {String} iMessage
 */
const TelegramSendToAdmin = (iMessage) => {
	if (!iMessage) return;

	telegram.sendMessage(ADMIN_TELEGRAM_DATA.id, iMessage, {
		parse_mode: "HTML",
		disable_notification: false
	}).then(() => {}, (e) => console.error(e));
};

TelegramSendToAdmin(`Anime Seeker Bot have been spawned at ${new Date().toISOString()} <i>(ISO 8601, UTC)</i>`);























/**
 * MAL and SHIKI API TIME
 */



const
	request = require("request"),
	USER_AGENT = CONFIG.USER_AGENT,
	MAL_API_DOMAIN = "https://api.jikan.moe/v3/",
	SHIKI_API_DOMAIN = "https://shikimori.org/api/",
	SHIKI_DOMAIN = "https://shikimori.one",
	MONTHS = ["BUG", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];


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