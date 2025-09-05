async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2("https://animeav1.com/catalogo?search=" + encodeURIComponent(keyword));
        const html = await response.text();
        console.log(html);
        
        const regex = /<article[^>]*class="group\/item[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*alt="[^"]*"[^>]*>[\s\S]*?<h3[^>]*class="[^"]*text-lead[^"]*">([^<]+)<\/h3>[\s\S]*?<a[^>]+href="([^"]+)"/g;
        
        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[2].trim(),
                image: match[1].trim(),
                href: "https://animeav1.com" + match[3].trim()
            });
        }
        
        return JSON.stringify(results);
    } catch (err) {
        console.error("Search error:", err);
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

        const match = html.match(/<div class="entry[^>]*>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/);
        const description = match ? match[1].trim() : "N/A";

        return JSON.stringify([{
            description,
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

        const regex = /<a[^>]+href="([^"]+\/(\d+))"[^>]*>\s*<span class="sr-only">/g;
        let match;

        while ((match = regex.exec(html)) !== null) {
            results.push({
                href: "https://animeav1.com" + match[1].trim(),
                number: parseInt(match[2], 10)
            });
        }

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
        const response = await fetchv2(url);
        const html = await response.text();

        const match = html.match(/<iframe[^>]+src="(https:\/\/player\.zilla-networks\.com\/play\/[^"]+)"/);
        if (match) {
            return match[1].replace("/play/", "/m3u8/");
        }

        return "https://files.catbox.moe/avolvc.mp4";
    } catch (err) {
        return "https://files.catbox.moe/avolvc.mp4";
    }
}


