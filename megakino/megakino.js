function cleanTitle(title) {
    return title
        .replace(/&#8217;/g, "'")
        .replace(/&#8211;/g, "-")
        .replace(/&#[0-9]+;/g, "");
}

async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2("https://megakino.vip/?s=" + encodeURIComponent(keyword));
        const html = await response.text();

        const regex = /<article[^>]*>[\s\S]*?<h2 class="entry-title">([^<]+)<\/h2>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<a href="([^"]+)" class="lnk-blk"><\/a>/g;

        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: cleanTitle(match[1].trim()),
                image: match[2].trim().startsWith("//") ? "https:" + match[2].trim() : match[2].trim(),
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

        const match = html.match(/<div class="description">\s*<p>([\s\S]*?)<\/p>/i);
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
    return JSON.stringify([{
        href: url,
        number: 1
    }]);
}

async function extractStreamUrl(url) {
    try {
        const response = await fetchv2(url);
        const html = await response.text();
        
        const postIdMatch = html.match(/postid-(\d+)/);
        if (!postIdMatch) throw new Error("Post ID not found");
        const postId = postIdMatch[1];
        
        const embedUrl = `https://megakino.vip/?trembed=0&trid=${postId}&trtype=1`;
        const embedResp = await fetchv2(embedUrl);
        const embedHtml = await embedResp.text();
        
        const iframeMatch = embedHtml.match(/<iframe[^>]+src="([^"]+)"/);
        if (!iframeMatch) throw new Error("Iframe not found");
        const iframeUrl = iframeMatch[1];
        
        const iframeResp = await fetchv2(iframeUrl);
        const iframeHtml = await iframeResp.text();
        
        const videoObjectMatch = iframeHtml.match(/var video = (\{[^}]*\});/s);
        if (!videoObjectMatch) throw new Error("Video object not found");
        
        let videoStr = videoObjectMatch[1];
        
        const uidMatch = iframeHtml.match(/"uid"\s*:\s*"([^"]+)"/);
        const md5Match = iframeHtml.match(/"md5"\s*:\s*"([^"]+)"/);
        const idMatch = iframeHtml.match(/"id"\s*:\s*"([^"]+)"/);
        const statusMatch = iframeHtml.match(/"status"\s*:\s*"([^"]+)"/);
        
        if (!uidMatch || !md5Match || !idMatch || !statusMatch) {
            throw new Error("Video data not found");
        }
        
        const uid = uidMatch[1];
        const md5 = md5Match[1];
        const vidId = idMatch[1];
        const status = statusMatch[1];
        
        const hlsUrl = `/m3u8/${uid}/${md5}/master.txt?s=1&id=${vidId}&cache=${status}`;
        console.log("Extracted HLS URL:"+ hlsUrl);
        
        return "https://watch.gxplayer.xyz/" + hlsUrl; 
        
    } catch (err) {
        console.error(err);
        return "https://files.catbox.moe/avolvc.mp4";
    }
}
