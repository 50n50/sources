async function searchResults(keyword) {
    const results = [];
    try {
        const workerUrl = "https://passthrough-worker.simplepostrequest.workers.dev/?url=" +
            encodeURIComponent("https://www.dmand5.com/index.php?m=vod-search") +
            "&type=multipart&body=" + encodeURIComponent(JSON.stringify({
                wd: keyword
            }));

        const response = await fetchv2(workerUrl);
        const html = await response.text();

        const regex = /<a href="(\/detail\/\d+\.html)" title="(.*?)" target="_blank"><img .*?src="(.*?)"/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[2].trim(),
                image: match[3].trim(),
                href: "https://www.dmand5.com" + match[1].trim()
            });
        }

        console.log("Search results:" + JSON.stringify(results));
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

        const descMatch = html.match(/<div class="des">(.*?)<\/div>/s);
        const description = descMatch ? descMatch[1].trim() : "N/A";

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
    const results = [];
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const blockMatch = html.match(/<ul class="mn_list_li_movie"[^>]*>([\s\S]*?)<\/ul>/);
        const blockHtml = blockMatch ? blockMatch[1] : "";

        const regex = /<a href="(\/play\/\d+-\d+-(\d+)\.html)"[^>]*>第\d+集<\/a>/g;
        let match;

        while ((match = regex.exec(blockHtml)) !== null) {
            results.push({
                href: parseInt(match[2], 10) + " https://www.dmand5.com" + match[1].trim(),
                number: parseInt(match[2], 10)
            });
        }

        console.log("Episodes:" + JSON.stringify(results));
        return JSON.stringify(results);
    } catch (err) {
        return JSON.stringify([{
            href: "Error",
            number: "Error"
        }]);
    }
}
async function extractStreamUrl(url) {
  try {
    const leadingNumberMatch = url.match(/^(\d+)\s+(.+)$/);
    const episodeNumber = leadingNumberMatch ? parseInt(leadingNumberMatch[1], 10) : 1;
    const cleanUrl = leadingNumberMatch ? leadingNumberMatch[2] : url;
    
    const fetchUrl = cleanUrl;
    
    console.log(fetchUrl);
    const response = await fetchv2(fetchUrl);
    const html = await response.text();
    
    const macMatch = html.match(/mac_url\s*=\s*unescape\(\s*'([^']+)'\s*\)/s);
    if (!macMatch) return "https://files.catbox.moe/avolvc.mp4";
    
    let raw = macMatch[1];
    
    raw = raw.replace(/%u([\dA-F]{4})/gi, (_, g1) =>
      String.fromCharCode(parseInt(g1, 16))
    );
    
    const decoded = decodeURIComponent(raw);
    
    const episodes = decoded.split("#");
    
    const epEntry = episodes[episodeNumber - 1] || episodes[0];
    const hlsUrl = epEntry.split("$")[1];
    
    return hlsUrl || "https://files.catbox.moe/avolvc.mp4";
  } catch (err) {
    return "https://files.catbox.moe/avolvc.mp4";
  }
}
