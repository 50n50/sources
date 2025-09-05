async function searchResults(keyword) {
    const results = [];
    const response = await fetchv2(`https://lmanime.com/?s=${keyword}`);
    const html = await response.text();

    const regex = /<article class="bs"[^>]*>.*?<a href="([^"]+)"[^>]*>.*?<img src="([^"]+)"[^>]*>.*?<h2[^>]*>(.*?)<\/h2>/gs;

    let match;
    while ((match = regex.exec(html)) !== null) {
        results.push({
            title: match[3].trim(),
            image: match[2].trim(),
            href: match[1].trim()
        });
    }

    return JSON.stringify(results);
}

async function extractDetails(url) {
    const results = [];
    const response = await fetchv2(url);
    const html = await response.text();

    const match = html.match(/<div class="entry-content"[^>]*>([\s\S]*?)<\/div>/);

    let description = "N/A";
    if (match) {
        description = match[1]
            .replace(/<[^>]+>/g, '') 
            .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code)) 
            .replace(/&quot;/g, '"') 
            .replace(/&apos;/g, "'") 
            .replace(/&amp;/g, "&") 
            .trim();
    }

    results.push({
        description: description,
        aliases: 'N/A',
        airdate: 'N/A'
    });

    return JSON.stringify(results);
}

async function extractEpisodes(url) {
    const results = [];
    const response = await fetchv2(url);
    const html = await response.text();

    const regex = /<a href="([^"]+)">\s*<div class="epl-num">([\d.]+)<\/div>/g;

    let match;
    while ((match = regex.exec(html)) !== null) {
        results.push({
            href: match[1].trim(),
            number: parseInt(match[2], 10)
        });
    }
    results.reverse();
    return JSON.stringify(results);
}

async function extractStreamUrl(url) {
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const iframeMatch = html.match(/dailymotion\.com\/embed\/video\/([a-zA-Z0-9]+)/);
        if (!iframeMatch) return JSON.stringify({ streams: [], subtitles: "" });

        const videoId = iframeMatch[1];

        const metaRes = await fetchv2(`https://www.dailymotion.com/player/metadata/video/${videoId}`);
        const metaJson = await metaRes.json();
        const hlsLink = metaJson.qualities?.auto?.[0]?.url;
        if (!hlsLink) return JSON.stringify({ streams: [], subtitles: "" });

        async function getBestHls(hlsUrl) {
            try {
                const res = await fetchv2(hlsUrl);
                const text = await res.text();
                const regex = /#EXT-X-STREAM-INF:.*RESOLUTION=(\d+)x(\d+).*?\n(https?:\/\/[^\n]+)/g;
                const streams = [];
                let match;
                while ((match = regex.exec(text)) !== null) {
                    streams.push({ width: parseInt(match[1]), height: parseInt(match[2]), url: match[3] });
                }
                if (streams.length === 0) return hlsUrl;
                streams.sort((a, b) => b.height - a.height);
                return streams[0].url;
            } catch {
                return hlsUrl;
            }
        }

        const bestHls = await getBestHls(hlsLink);

        const subtitles = metaJson.subtitles?.data?.['en-auto']?.urls?.[0] || "";

        const result = {
            streams: ["english", bestHls],
            subtitles: subtitles
        };

        console.log("Extracted stream result:" + JSON.stringify(result));

        return JSON.stringify(result);
    } catch {
        const empty = { streams: [], subtitles: "" };
        console.log("Extracted stream result:" + JSON.stringify(empty));
        return JSON.stringify(empty);
    }
}
