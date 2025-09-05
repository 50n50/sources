function searchResults(html) {
    if (typeof html !== 'string') {
        console.error('Invalid HTML input: expected a string.');
        return [];
    }

    const results = [];

    const titleRegex = /<h4[^>]*>(.*?)<\/h4>/;
    const hrefRegex = /<a\s+href="([^"]+)"\s*[^>]*>/;
    const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/;

    const itemRegex = /<a\s+href="[^"]+"\s+class="btn btn-md btn-light simple-title-card[^"]*"[^>]*>[\s\S]*?<\/a>/g;
    const items = html.match(itemRegex) || [];

    items.forEach((itemHtml, index) => {
        try {
            if (typeof itemHtml !== 'string') {
                console.error(`Item ${index} is not a string.`);
                return;
            }

            const titleMatch = itemHtml.match(titleRegex);
            const title = titleMatch?.[1]?.trim() ?? '';

            const hrefMatch = itemHtml.match(hrefRegex);
            const href = hrefMatch?.[1]?.trim() ?? '';

            const imgMatch = itemHtml.match(imgRegex);
            const imageUrl = imgMatch?.[1]?.trim() ?? '';

            if (title && href) {
                results.push({
                    title: decodeHTMLEntities(title),
                    image: imageUrl,
                    href: href
                });
            } else {
                console.error(`Missing title or href in item ${index}`);
            }
        } catch (err) {
            console.error(`Error processing item ${index}:`, err);
        }
    });

    return results;
}


function extractDetails(html) {
  const details = [];

  const containerMatch = html.match(/<div class="py-4 flex flex-col gap-2">\s*((?:<p class="sm:text-\[1\.04rem\] leading-loose text-justify">[\s\S]*?<\/p>\s*)+)<\/div>/);

  let description = "";
  if (containerMatch) {
    const pBlock = containerMatch[1];

    const pRegex = /<p class="sm:text-\[1\.04rem\] leading-loose text-justify">([\s\S]*?)<\/p>/g;
    const matches = [...pBlock.matchAll(pRegex)]
      .map(m => m[1].trim())
      .filter(text => text.length > 0); 

    description = decodeHTMLEntities(matches.join("\n\n")); 
  }

  const airdateMatch = html.match(/<td[^>]*title="([^"]+)">[^<]+<\/td>/);
  let airdate = airdateMatch ? airdateMatch[1].trim() : "";

  const genres = [];
  const aliasesMatch = html.match(
    /<div\s+class="flex flex-wrap gap-2 lg:gap-4 text-sm sm:text-\[\.94rem\] -mt-2 mb-4">([\s\S]*?)<\/div>/
  );
  const inner = aliasesMatch ? aliasesMatch[1] : "";

  const anchorRe = /<a[^>]*class="btn btn-md btn-plain !p-0"[^>]*>([^<]+)<\/a>/g;
  let m;
  while ((m = anchorRe.exec(inner)) !== null) {
    genres.push(m[1].trim());
  }

  if (description && airdate) {
    details.push({
      description: description,
      aliases: genres.join(", "),
      airdate: airdate,
    });
  }

  console.log(details);
  return details;
}


function extractEpisodes(html) {
    const episodes = [];
    const htmlRegex = /<a\s+[^>]*href="([^"]*?\/episode\/[^"]*?)"[^>]*>[\s\S]*?الحلقة\s+(\d+)[\s\S]*?<\/a>/gi;
    const plainTextRegex = /الحلقة\s+(\d+)/g;

    let matches;

    if ((matches = html.match(htmlRegex))) {
        matches.forEach(link => {
            const hrefMatch = link.match(/href="([^"]+)"/);
            const numberMatch = link.match(/الحلقة\s+(\d+)/);
            if (hrefMatch && numberMatch) {
                const href = hrefMatch[1];
                const number = numberMatch[1];
                episodes.push({
                    href: href,
                    number: number
                });
            }
        });
    } 
    else if ((matches = html.match(plainTextRegex))) {
        matches.forEach(match => {
            const numberMatch = match.match(/\d+/);
            if (numberMatch) {
                episodes.push({
                    href: null, 
                    number: numberMatch[0]
                });
            }
        });
    }

    console.log(episodes);
    return episodes;
}

async function extractStreamUrl(html) {
    try {
        const sourceMatch = html.match(/data-video-source="([^"]+)"/);
        let embedUrl = sourceMatch?.[1]?.replace(/&amp;/g, '&');
        if (!embedUrl) return null;
    
        const cinemaMatch = html.match(/url\.searchParams\.append\(\s*['"]cinema['"]\s*,\s*(\d+)\s*\)/);
        const lastMatch = html.match(/url\.searchParams\.append\(\s*['"]last['"]\s*,\s*(\d+)\s*\)/);
        const cinemaNum = cinemaMatch ? cinemaMatch[1] : undefined;
        const lastNum = lastMatch ? lastMatch[1] : undefined;
    
        if (cinemaNum) embedUrl += `&cinema=${cinemaNum}`;
        if (lastNum) embedUrl += `&last=${lastNum}`;
        embedUrl += `&next-image=undefined`;
    
        console.log('Full embed URL:', embedUrl);
    
        const response = await fetchv2(embedUrl);
        const data = await response.text();
        console.log('Embed page HTML:', data);

        const qualities = extractQualities(data);

        const epMatch = html.match(/<title>[^<]*الحلقة\s*(\d+)[^<]*<\/title>/);
        const currentEp = epMatch ? Number(epMatch[1]) : null;
    
        let nextEpNum, nextDuration, nextSubtitle;
        if (currentEp !== null) {
            const episodeRegex = new RegExp(
                `<a[^>]+href="[^"]+/episode/[^/]+/(\\d+)"[\\s\\S]*?` +
                `<span[^>]*>([^<]+)<\\/span>[\\s\\S]*?` +
                `<p[^>]*>([^<]+)<\\/p>`,
                'g'
            );
            let m;
            while ((m = episodeRegex.exec(html)) !== null) {
                const num = Number(m[1]);
                if (num > currentEp) {
                    nextEpNum = num;
                    nextDuration = m[2].trim();
                    nextSubtitle = m[3].trim();
                    break;
                }
            }
        }

        if (nextEpNum != null) {
            embedUrl += `&next-title=${encodeURIComponent(nextDuration)}`;
            embedUrl += `&next-sub-title=${encodeURIComponent(nextSubtitle)}`;
        }

        const result = {
            streams: qualities,
        }
    
        console.log(JSON.stringify(result));
        return JSON.stringify(result);
    } catch (err) {
        console.error(err);
        return null;
    }
}
  
function extractQualities(html) {
    const match = html.match(/var\s+videos\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) return [];
    
    const raw = match[1];
    const regex = /\{\s*src:\s*'([^']+)'\s*[^}]*label:\s*'([^']*)'/g;
    const list = [];
    let m;

    while ((m = regex.exec(raw)) !== null) {
        list.push(m[2], m[1]);
    }
    
    return list;
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
