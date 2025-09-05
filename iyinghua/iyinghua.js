async function searchResults(keyword) {
    const results = [];
    const response = await fetchv2(`http://www.iyinghua.com/search/${keyword}/`);
    const html = await response.text();

    const regex = /<a href="(\/show\/\d+\.html)"><img src="(http[^"]+)" alt="([^"]+)"><\/a><h2><a href="[^"]+" title="([^"]+)"/g;
    
    let match;
    while ((match = regex.exec(html)) !== null) {
        results.push({
            title: match[4].trim(),
            image: match[2].trim(),
            href: `http://www.iyinghua.com${match[1].trim()}`
        });
    }

    return JSON.stringify(results);
}

async function extractDetails(url) {
    const results = [];
    const response = await fetchv2(url);
    const html = await response.text();

    const descriptionRegex = /<div class="info">([^<]+)<\/div>/;
    const descriptionMatch = descriptionRegex.exec(html);
    const description = descriptionMatch ? descriptionMatch[1].trim() : 'N/A';

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

    const episodeRegex = /<li><a href="(\/v\/\d+-([\dpv]+)\.html)" target="_blank">([^<]+)<\/a><\/li>/g;

    let match;
    let episodeCount = 0;

    while ((match = episodeRegex.exec(html)) !== null) {
        const href = `http://www.iyinghua.com${match[1].trim()}`;
        const number = match[2].match(/^\d+$/) ? parseInt(match[2], 10) : null;

        if (number !== null) {
            results.push({ href, number });
        } else {
            episodeCount++; 
        }
    }

    if (results.length === 0 && episodeCount > 0) {
        episodeRegex.lastIndex = 0; 
        let index = 1;
        while ((match = episodeRegex.exec(html)) !== null) {
            results.push({
                href: `http://www.iyinghua.com${match[1].trim()}`,
                number: index++
            });
        }
    }
    results.reverse();
    return JSON.stringify(results);
}

async function extractStreamUrl(url) {
    const response = await fetchv2(url);
    const html = await response.text();
    console.error(html);
    
    const streamRegex = /data-vid="([^"]+)"/;
    const match = streamRegex.exec(html);
    return match ? match[1] : null;
  }

