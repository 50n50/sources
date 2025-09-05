async function searchResults(keyword) {
    const baseUrl = "https://w7.animeland.tv";
    const results = [];
    try {
        const response = await fetchv2(baseUrl + "/?s=" + encodeURIComponent(keyword));
        const html = await response.text();

        const regex = /<a href="([^"]+)"[^>]*>\s*<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"/g;

        let match;
        while ((match = regex.exec(html)) !== null) {
            let href = match[1].trim();
            let image = match[2].trim();
            let title = match[3].trim();

            if (href.startsWith("/")) {
                href = baseUrl + href;
            }
            if (image.startsWith("/")) {
                image = baseUrl + image;
            }

            if (href === baseUrl + "/" || href.includes("kissanimes.net")) {
                continue;
            }

            results.push({
                href,
                image,
                title
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

        const regex = /<div class="Anime Info">\s*<\/div>\s*([\s\S]*?)<\/div>/i;
        const match = html.match(regex);

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
    const results = [];
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const regex = /<li class="play"><a[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a><\/li>/g;

        let match;
        while ((match = regex.exec(html)) !== null) {
            const href = match[1].trim();
            const text = match[2].trim();

            let number = null;
            const urlMatch = href.match(/-episode-(\d+)/i);
            if (urlMatch) {
                number = parseInt(urlMatch[1], 10);
            } else {
                const textMatch = text.match(/Episode\s*(\d+)/i);
                if (textMatch) number = parseInt(textMatch[1], 10);
            }

            results.push({
                href,
                number
            });
        }

        return JSON.stringify(results.reverse());
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
        const match = html.match(/file=([a-zA-Z0-9]+\.html)/);
        if (match) {
            const filename = match[1];
            console.log('Filename:' + filename);
            const videoUrl = `https://animesource.me/cache/${filename}.mp4`;
            console.log('Video URL:' + videoUrl);
            return videoUrl;
        }

    } catch (err) {
        console.error("Error:" + err);
        return null;
    }
}
