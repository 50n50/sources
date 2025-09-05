async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2("https://prmovies.casa/?s=" + encodeURIComponent(keyword));
        const html = await response.text();

        const regex = /<div[^>]+class="ml-item"[^>]*>\s*<a href="([^"]+)"[^>]*>\s*[\s\S]*?<img[^>]+(?:data-original|src)="([^"]+)"[^>]*>[\s\S]*?<h2>(.*?)<\/h2>/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[3].trim(),
                image: match[2].trim(),
                href: match[1].trim()
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
        console.log(html);
        const regex = /<a href="([^"]+)"[^>]*class="lnk-lnk lnk-1"[^>]*>/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                href: match[1].trim(),
                number: 1
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
        const headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Referer": "https://prmovies.casa/"
        };
        const response = await fetchv2(url, headers);
        const html = await response.text();

        let postData = "";

        const regex = /<input type="hidden" name="([^"]+)" value="([^"]*)">/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            if (postData.length > 0) postData += "&";
            postData += encodeURIComponent(match[1]) + "=" + encodeURIComponent(match[2]);
        }
        const headers2 = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Referer": "https://spedostream.com"
        };
        postData += "&imhuman=Proceed+to+video";
        console.log(postData);

        const response2 = await fetchv2(url, headers2, "POST", postData);
        const html2 = await response2.text();

        const matchTwo = html2.match(/sources:\s*\[\{file:"([^"]+)"/);
        const videoUrl = matchTwo ? matchTwo[1] : "Error";

        console.log(videoUrl);


        return videoUrl;
    } catch (err) {
        return "Error extracting postData";
    }
}
