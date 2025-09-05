async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const response = await soraFetch(`https://www.novelcool.com/search/?name=${encodedKeyword}`);
        const data = await response.text();
        const results = [];
        const regex = /<div class="book-item"[^>]*itemtype\s*=\s*["'][^"']*Book[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
        let match;
        while ((match = regex.exec(data)) !== null) {
            const bookItemHTML = match[1];
            if (bookItemHTML.includes('book-type-manga')) {
                continue;
            }
            let titleMatch = bookItemHTML.match(/<div class="book-pic"[^>]*title="([^"]*)"/);
            let title = "";
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].trim();
            } else {
                titleMatch = bookItemHTML.match(/<div[^>]*\bclass\s*=\s*["'][^"']*book-name[^"']*["'][^>]*itemprop\s*=\s*["']name["'][^>]*>(.*?)<\/div>/);
                if (titleMatch && titleMatch[1]) {
                    title = titleMatch[1].trim();
                }
            }
            const hrefMatch = bookItemHTML.match(/<a[^>]*href\s*=\s*["'](https:\/\/www\.novelcool\.com\/novel\/[^"']*)["'][^>]*itemprop\s*=\s*["']url["']|<a[^>]*href\s*=\s*["'](https:\/\/www\.novelcool\.com\/novel\/[^"']*)["']/);
            const href = (hrefMatch && (hrefMatch[1] || hrefMatch[2])) ? (hrefMatch[1] || hrefMatch[2]).trim() : '';
            const imgTagMatch = bookItemHTML.match(/<img[^>]*itemprop\s*=\s*["']image["'][^>]*>/i);
            let image = '';
            if (imgTagMatch) {
                const imgTag = imgTagMatch[0];
                const srcMatch = imgTag.match(/\bsrc\s*=\s*["']([^"']*)["']/i);
                if (srcMatch && srcMatch[1]) {
                    image = srcMatch[1].trim();
                }
            }
            if (title && href) {
                results.push({
                    title: title,
                    href: href,
                    image: image 
                });
            }

        }
        console.log("Search Results:", results); 
        return JSON.stringify(results);
    } catch (error) {
        console.error('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', href: '', image: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const response = await soraFetch(url);
        const htmlText = await response.text();

        const descriptionMatch = htmlText.match(/<div class="bk-summary-txt"[^>]*>([\s\S]*?)<\/div>/);
        const description = descriptionMatch ? descriptionMatch[1].trim() : 'No description available';

        const transformedResults = [{
            description,
            aliases: 'N/A',
            airdate: 'N/A'
        }];

        console.log(JSON.stringify(transformedResults));
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error:', error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'N/A',
            airdate: 'N/A'
        }]);
    }
}

async function extractChapters(url) {
    try {
        const response = await soraFetch(url);
        const htmlText = await response.text();

        const rawChapters = [];
        const regex = /<div class="chp-item">[\s\S]*?<a href="([^"]+)"[^>]*title="([^"]+)">[\s\S]*?<\/a>[\s\S]*?<\/div>/g;

        let match;
        while ((match = regex.exec(htmlText)) !== null) {
            rawChapters.push({
                href: match[1].trim(),
                title: match[2].trim()
            });
        }

        const total = rawChapters.length;
        const chapters = rawChapters.map((ch, i) => ({
            ...ch,
            number: total - i 
        }));

        if (chapters.length === 0) {
            return [{
                href: url,
                title: "Currently no chapters available",
                number: 1
            }];
        }

        console.log(JSON.stringify(chapters));
        return chapters.reverse();
    } catch (error) {
        console.log('Fetch error in extractChapters:', error);
        return [{
            href: url,
            title: "Currently no chapters available",
            number: 1
        }];
    }
}


async function extractText(url) {
    try {
        const response = await soraFetch(url);
        const htmlText = await response.text();

        const match = htmlText.match(
            /<h2 class="chapter-title[^>]*>[\s\S]*?<\/h2>([\s\S]*?)<div class="bookinfo-share">/i
        );

        if (!match) {
            throw new Error("Chapter content not found");
        }

        let content = match[1].trim();

        content = content.replace(/<script[\s\S]*?<\/script>/gi, '');

        content = content.trim();

        console.log(JSON.stringify(content));
        return content;
    } catch (error) {
        console.log("Fetch error in extractText:", error);
        return JSON.stringify({ text: 'Error extracting text' });
    }
}

extractChapters('https://www.novelcool.com/novel/Shadow-Slave.html');

async function soraFetch(url, options = { headers: {}, method: 'GET', body: null }) {
    try {
        return await fetchv2(url, options.headers ?? {}, options.method ?? 'GET', options.body ?? null);
    } catch(e) {
        try {
            return await fetch(url, options);
        } catch(error) {
            return null;
        }
    }
}
