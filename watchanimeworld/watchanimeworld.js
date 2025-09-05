async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2("https://watchanimeworld.in/?s=" + encodeURIComponent(keyword));
        const html = await response.text();

        const regex = /<h2 class="entry-title"[^>]*>(.*?)<\/h2>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<a href="([^"]+)" class="lnk-blk">/g;

        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[1].trim(),
                image: match[2].startsWith("//") ? "https:" + match[2].trim() : match[2].trim(),
                href: match[3].trim()
            });
        }

        return JSON.stringify(results);
    } catch (err) {
        return JSON.stringify([{
            title: "Error",
            image: "Error",
            href: "Error"
        }]);
    }
}


async function extractDetails(url) {
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const regex = /<div class="description"[^>]*>\s*<p>(.*?)<\/p>/s;
        const match = regex.exec(html);

        const description = match ? match[1].trim() : "N/A";

        return JSON.stringify([{
            description: description,
            aliases: "N/A",
            airdate: "N/A"
        }]);
    } catch (err) {
        return JSON.stringify([{
            description: "Error",
            aliases: "Error",
            airdate: "Error"
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const postMatch = html.match(/data-post="(\d+)"/);
        const postId = postMatch ? postMatch[1] : null;
        const seasonMatches = [...html.matchAll(/data-season="(\d+)"/g)];
        const seasons = seasonMatches.map(m => parseInt(m[1], 10));

        if (!postId || seasons.length === 0) {
            const metaMatch = html.match(/<meta property="og:url" content="([^"]+)"/);
            const fallbackUrl = metaMatch ? metaMatch[1] : url;

            return JSON.stringify([{
                href: fallbackUrl,
                number: 1,
                season: 1
            }]);
        }

        const seasonPromises = seasons.map(season => {
            const body = `action=action_select_season&season=${season}&post=${postId}`;
            const seasonUrl = `https://passthrough-worker.simplepostrequest.workers.dev/?url=${encodeURIComponent("https://watchanimeworld.in/wp-admin/admin-ajax.php")}&type=formdata&body=${encodeURIComponent(body)}`;

            return fetchv2(seasonUrl)
                .then(res => res.text())
                .then(seasonHtml => {
                    const regex = /<span class="num-epi">.*?<\/span>[\s\S]*?<a href="([^"]+)" class="lnk-blk"><\/a>/g;
                    let match, episodeCount = 1, episodes = [];

                    while ((match = regex.exec(seasonHtml)) !== null) {
                        episodes.push({
                            href: match[1].trim(),
                            number: episodeCount++,
                            season: season
                        });
                    }

                    return episodes;
                })
                .catch(err => {
                    console.log(`Error fetching season ${season}:`, err);
                    return [];
                });
        });

        const allSeasons = await Promise.all(seasonPromises);
        const results = allSeasons.flat();

        return JSON.stringify(results);
    } catch (err) {
        return JSON.stringify([{ href: "Error", number: "Error", season: "Error" }]);
    }
}

async function extractStreamUrl(url) {
    try {
        const html = await (await fetchv2(url)).text();
        const iframeMatch = html.match(/<iframe[^>]+src="https:\/\/play\.zephyrflick\.top\/video\/([a-z0-9]+)"/i);
        if (!iframeMatch) 
            return "https://files.catbox.moe/avolvc.mp4";
        
        const hash = iframeMatch[1];
        const postData = {
            "ilovefeet": "WE LOVE FEET"
        };
        const headers = {
            "X-Requested-With": "XMLHttpRequest",
            "Referer": "https://watchanimeworld.in/"
        };
        const fetchUrl = `https://play.zephyrflick.top/player/index.php?data=${hash}&do=getVideo`;
        const videoResponse = await fetchv2(fetchUrl, headers, "POST");
        const text = await videoResponse.text();
        console.log(text);
        const match = text.match(/"videoSource":"(https:[^"]+)"/);
        
        if (!match || !match[1]) {
            console.error("No videoSource found in response");
            return "https://files.catbox.moe/avolvc.mp4";
        }
        
        const decodedUrl = decodeURIComponent(match[1]);
        const fixedUrl = decodedUrl.replace(/\\/g, '').replace(/%5C/g, '/'); 
        
        return fixedUrl;
    } catch (err) { 
        console.error("Error extracting stream URL: " + err);
        return "https://files.catbox.moe/avolvc.mp4";
    }
}









