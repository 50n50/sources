function decodeHtml(html) {
    return html.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
               .replace(/&amp;/g, "&")
               .replace(/&quot;/g, '"')
               .replace(/&apos;/g, "'")
               .replace(/&lt;/g, "<")
               .replace(/&gt;/g, ">");
}

async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2("https://www.movi.pk/?s=" + encodeURIComponent(keyword));
        const html = await response.text();

        const regex = /<div data-movie-id="\d+" class="ml-item">[\s\S]*?<a href="(https:\/\/www\.movi\.pk\/[^"]+)"[^>]*>[\s\S]*?<img [^>]*data-original="([^"]+)"[^>]*>[\s\S]*?<h2>([^<]+)<\/h2>/g;

        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                href: match[1].trim(),
                image: match[2].trim(),
                title: decodeHtml(match[3].trim())
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

        const match = html.match(/<p class="f-desc">(.*?)<\/p>/s);
        const description = match ? match[1].trim() : "N/A";

        return JSON.stringify([{
            description: decodeHtml(description),
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

        const match = html.match(/<iframe\s+src=(https?:\/\/lizer[^\s>]+)[^>]*>/i);
        const href = match ? match[1].trim() : url; 

        return JSON.stringify([{
            href: href,
            number: 1
        }]);
    } catch (err) {
        return JSON.stringify([{
            href: "Error",
            number: "Error"
        }]);
    }
}

async function extractStreamUrl(url) {
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const match = html.match(/var\s+video\s*=\s*(\{.*?\});/s);
        if (!match) throw new Error("Video JSON not found");

        const videoJson = JSON.parse(match[1]);
        const uid = videoJson.uid;
        const hash = videoJson.md5;

        const m3u8Path = `m3u8/${uid}/${hash}/720p/720p.m3u8?id=`;

        const encoded = btoa(m3u8Path);

        return `https://lizer123.site/stream/${encoded}`;
    } catch (err) {
        return "https://files.catbox.moe/avolvc.mp4";
    }
}


