async function searchResults(keyword) {
    const results = [];
    const response = await fetchv2(`https://animexin.dev/?s=${keyword}`);
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
    const response = await fetchv2(url);
    const html = await response.text();

    const optionRegex = /<option value="([^"]+)"[^>]*>\s*([\s\S]*?)\s*<\/option>/g;
    const allowedLabels = ["Hardsub English Dailymotion", "Hardsub Indonesia Dailymotion"];
    const videoOptions = [];

    let match;
    while ((match = optionRegex.exec(html)) !== null) {
        const base64 = match[1];
        const label = match[2].trim();
        if (!base64 || !allowedLabels.includes(label)) continue;

        const decodedValue = atob(base64);
        if (!decodedValue) continue;

        const idMatch = decodedValue.match(/dailymotion\.com\/embed\/video\/([a-zA-Z0-9]+)/);
        const videoId = idMatch ? idMatch[1] : null;
        if (!videoId) continue;

        videoOptions.push({ videoId, label: label.replace(" Dailymotion", "") }); 
    }

    async function getBestHls(hlsUrl) {
        try {
            const res = await fetchv2(hlsUrl);
            const text = await res.text();

            const regex = /#EXT-X-STREAM-INF:.*RESOLUTION=(\d+)x(\d+).*?\n(https?:\/\/[^\n]+)/g;
            let match;
            const streams = [];

            while ((match = regex.exec(text)) !== null) {
                const width = parseInt(match[1]);
                const height = parseInt(match[2]);
                const url = match[3];
                streams.push({ width, height, url });
            }

            if (streams.length === 0) return hlsUrl;
            streams.sort((a, b) => b.height - a.height); 
            return streams[0].url;
        } catch (err) {
            return hlsUrl;
        }
    }

    const streams = [];
    for (const option of videoOptions) {
        try {
            const metaRes = await fetchv2(`https://www.dailymotion.com/player/metadata/video/${option.videoId}`);
            const metaJson = await metaRes.json();
            const hlsLink = metaJson.qualities?.auto?.[0]?.url;
            if (!hlsLink) continue;

            const bestHls = await getBestHls(hlsLink);
            streams.push(option.label.toUpperCase().startsWith("HARDSUB ENGLISH") ? "HardSub English" : "HardSub Indonesian");
            streams.push(bestHls);
        } catch (err) {
            continue;
        }
    }

    return JSON.stringify({
        streams: streams,
        subtitles: ""
    });
}
