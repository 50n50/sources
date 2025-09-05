async function searchResults(keyword) {
    const results = [];

    const response = await fetchv2("https://ak.sv/search?q=" + encodeURIComponent(keyword));
    const html = await response.text();
    const filmListRegex = /<div class="col-lg-auto col-md-4 col-6 mb-12">[\s\S]*?<\/div>\s*<\/div>/g;
    const items = html.match(filmListRegex) || [];

    items.forEach((itemHtml) => {
        const titleMatch = itemHtml.match(/<h3 class="entry-title[^>]*>\s*<a href="([^"]+)"[^>]*>([^<]+)<\/a>/);
        const href = titleMatch ? titleMatch[1] : '';
        const title = titleMatch ? titleMatch[2] : '';
        const imgMatch = itemHtml.match(/<img[^>]*data-src="([^"]+)"[^>]*>/);
        const imageUrl = imgMatch ? imgMatch[1] : '';

        if (title && href) {
            results.push({
                title: title.trim(),
                image: imageUrl.trim(),
                href: href.trim(),
            });
        }
    });
    console.log(results);
    return JSON.stringify(results);
}

async function extractDetails(url) {
    const details = [];
    let description = 'N/A';
    let aliases = 'N/A';
    let airdate = 'N/A';
    const genres = [];
    const response = await fetch(url);
    const html = await response.text();
    const airdateMatch = html.match(
        /<div class="font-size-16 text-white mt-2">\s*<span>\s*السنة\s*:\s*(\d{4})\s*<\/span>\s*<\/div>/
    );
    if (airdateMatch) airdate = airdateMatch[1];

    const descriptionMatch = html.match(
        /<div class="text-white font-size-18"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/
    );
    if (descriptionMatch) {
        description = decodeHTMLEntities(descriptionMatch[1].replace(/<[^>]+>/g, '').trim());
    }

    const genresMatch = html.match(/<div class="font-size-16 d-flex align-items-center mt-3">([\s\S]*?)<\/div>/);
    const genresHtml = genresMatch ? genresMatch[1] : '';

    const genreAnchorRe = /<a[^>]*>([^<]+)<\/a>/g;
    let genreMatch;
    while ((genreMatch = genreAnchorRe.exec(genresHtml)) !== null) {
        genres.push(decodeHTMLEntities(genreMatch[1].trim()));
    }

    details.push({
        description: description,
        airdate: airdate,
        aliases: genres.join(', ') || 'N/A'
    });

    console.log(details);
    return JSON.stringify(details);
}

async function extractEpisodes(url) {
    const episodes = [];
    const response = await fetchv2(url);
    const html = await response.text();
    const movieRegex = /<a[^>]+href=["']([^"']+)["'][^>]+class=["'][^"']*link-btn link-show[^"']*["'][^>]*>/i;
    const movieMatch = movieRegex.exec(html);

    if (movieMatch && movieMatch[1]) {
        episodes.push({
            href: movieMatch[1],
            number: 1
        });
    } else {
        const reversedHtml = html.split('\n').reverse().join('\n');

        const episodeBlocks = reversedHtml.match(/<div class="col-md-auto text-center pb-3 pb-md-0">[\s\S]*?<a href=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>/g);

        if (episodeBlocks) {
            episodeBlocks.forEach((block, index) => {
                const hrefMatch = block.match(/href=["']([^"']+)["']/);
                if (hrefMatch) {
                    episodes.push({
                        href: hrefMatch[1],
                        number: index + 1
                    });
                }
            });
        }
    }

    console.log(JSON.stringify(episodes));
    return JSON.stringify(episodes);
}

async function extractStreamUrl(url) {
    let stream = null;
    const response = await fetchv2(url);
    const html = await response.text();
    const urlMatch = html.match(/<meta property="og:url" content="([^"]+)"/);
    const isEpisode = urlMatch && urlMatch[1] && urlMatch[1].includes("/episode/");

    if (isEpisode) {
        const linkBtnMatches = html.match(/<a[^>]*class="link-btn link-show[^"]*"[^>]*>[\s\S]*?<\/a>/g);
        let match = null;

        if (linkBtnMatches && linkBtnMatches.length > 0) {
            const hrefMatch = linkBtnMatches[0].match(/href="([^"]+)"/);
            if (hrefMatch && hrefMatch[1]) {
                match = [null, hrefMatch[1]];
            }
        }

        if (match && match[1]) {
            try {
                const shortnerResponse = await fetch(match[1]);
                const shortnerHtml = await shortnerResponse;

                const finalMatch = shortnerHtml.match(/<div class="d-none d-md-block">\s*<a href="([^"]+)"/);

                if (finalMatch && finalMatch[1]) {
                    let finalUrl = finalMatch[1].replace("two.akw.cam", "ak.sv");

                    const lastResponse = await fetch(finalUrl);
                    const lastHtml = await lastResponse;
                    const videoMatch = lastHtml.match(/<source\s+src="([^"]+)"\s+type="video\/mp4"/);

                    if (videoMatch && videoMatch[1]) {
                        stream = videoMatch[1];
                    }
                }
            } catch (error) {
                console.error("Error fetching shortener URL:", error);
                return null;
            }
        }
    } else {
        const finalMatch = html.match(/<div class="d-none d-md-block">\s*<a href="([^"]+)"/);
        if (finalMatch && finalMatch[1]) {
            try {
                let finalUrl = finalMatch[1].replace("two.akw.cam", "ak.sv");
                const lastResponse = await fetch(finalUrl);
                const lastHtml = await lastResponse;
                const videoMatch = lastHtml.match(/<source\s+src="([^"]+)"\s+type="video\/mp4"/);

                if (videoMatch && videoMatch[1]) {
                    stream = videoMatch[1];
                }
            } catch (error) {
                console.error("Error fetching final URL:", error);
                return null;
            }
        }
    }

    console.log(stream);
    return stream;
}

function decodeHTMLEntities(text) {
    text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));

    const entities = {
        '&quot;': '"',
        '&amp;': '&',
        '&apos;': "'",
        '&lt;': '<',
        '&gt;': '>'
    };

    for (const entity in entities) {
        text = text.replace(new RegExp(entity, 'g'), entities[entity]);
    }

    return text;
}
