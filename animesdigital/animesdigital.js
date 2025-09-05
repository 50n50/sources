async function searchResults(keyword) {
    const results = [];
    try {
        const headers = {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest"
        };
        const postdata = `token=c1deb78cd4&pagina=1&search=${keyword}&limit=3000&type=lista&filters=%7B%22filter_data%22%3A%22filter_letter%3D0%26type_url%3Danimes%26filter_audio%3Dlegendado%26filter_order%3Dname%22%2C%22filter_genre_add%22%3A%5B%5D%2C%22filter_genre_del%22%3A%5B%5D%7D`;

        const response = await fetchv2("https://animesdigital.org/func/listanime", headers, "POST", postdata);
        const data = await response.json();

        const regex = /<a href="([^"]+)"[^>]*>.*?<img src="([^"]+)"[^>]*>.*?<span class="title_anime">(.*?)<\/span>/s;

        for (const item of data.results) {
            const match = regex.exec(item);
            if (match) {
                results.push({
                    href: match[1].trim(),
                    image: match[2].trim(),
                    title: match[3].trim()
                });
            }
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

        const regex = /<div class="sinopse">(.*?)<\/div>/s;
        const match = regex.exec(html);

        const description = match ? match[1]
            .replace(/&nbsp;/g, " ") 
            .replace(/\s+/g, " ")   
            .trim() : "N/A";

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

        const regex = /<a href="([^"]+)"[^>]*>[\s\S]*?<div class="title_anime">.*?Epis[oó]dio\s*([0-9]+(?:\.[0-9]+)?)<\/div>/g;

        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                href: match[1].trim(),
                number: Math.round(parseFloat(match[2]))
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
        
        const iframeRegex = /<iframe[^>]*src="([^"]*anivideo\.net[^"]*)"[^>]*>/i;
        const iframeMatch = html.match(iframeRegex);
        
        if (!iframeMatch) {
            return "https://files.catbox.moe/avolvc.mp4";
        }
        
        const apiUrl = iframeMatch[1];
        
        const apiResponse = await fetchv2(apiUrl);
        const apiHtml = await apiResponse.text();
        
        const m3u8Regex = /file:\s*['"]([^'"]*\.m3u8[^'"]*)['"]/i;
        const m3u8Match = apiHtml.match(m3u8Regex);
        
        if (m3u8Match) {
            return m3u8Match[1];
        }
        
        return "https://files.catbox.moe/avolvc.mp4";
        
    } catch (err) {
        console.error('Error extracting stream URL:', err);
        return "https://files.catbox.moe/avolvc.mp4";
    }
}
