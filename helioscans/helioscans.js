async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const url = `https://helioscans.com/series/?q=${encodedKeyword}`;
        const response = await soraFetch(url);
        const html = await response.text();

        const results = [];
        const regex = /<button[^>]+?title="([^"]+?)"[^>]*?>[\s\S]*?<a href="([^"]+?)"[\s\S]*?background-image:url\(([^)]+)\)/g;
        let match;

        while ((match = regex.exec(html)) !== null) {
            const title = match[1];
            const href = `https://helioscans.com${match[2]}`;
            const rawImage = match[3].replace(/&amp;/g, "&");
            const image = rawImage.startsWith("http") ? rawImage : `https:${rawImage}`;

            results.push({ title, href, image });
        }

        console.log(JSON.stringify(results));
        return JSON.stringify(results);
    } catch (error) {
        console.error("Error fetching or parsing: " + error);
        return JSON.stringify([{
            title: "Error",
            href: "",
            image: ""
        }]);
    }
}
extractChapters('https://helioscans.com/series/63a6054296b/');

async function extractDetails(url) {
  try {
    const response = await soraFetch(url);
    const htmlText = await response.text();

    const metaMatch = htmlText.match(/<meta name="description" content="([\s\S]*?)">/i);
    const description = metaMatch
      ? metaMatch[1].replace(/\s+/g, ' ').trim()
      : "No description available";

    const aliases = 'N/A';
    const airdate = 'N/A';

    const transformedResults = [{
      description,
      aliases,
      airdate
    }];

    console.log(JSON.stringify(transformedResults));
    return JSON.stringify(transformedResults);

  } catch (error) {
    console.log('Details error:' + error);
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
    console.log(htmlText);

    const chapters = [];
    const chapterLinkRegex = /<a\s+[^>]*href="([^"]*\/chapter\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let linkMatch;

    while ((linkMatch = chapterLinkRegex.exec(htmlText)) !== null) {
      const fullLinkHtml = linkMatch[0];
      const href = `https://helioscans.com${linkMatch[1]}`;

      const titleRegex = /<span[^>]*class="[^"]*\btext-sm\b[^"]*\btruncate\b[^"]*"[^>]*>([^<]+)<\/span>/i;
      const titleMatch = titleRegex.exec(fullLinkHtml);
      const rawTitle = titleMatch ? titleMatch[1].trim() : "";

      if (!rawTitle) continue;

      const isLocked = /Coin\.svg/i.test(fullLinkHtml);
      const title = isLocked ? `${rawTitle} (Locked – 100 credits)` : rawTitle;

      chapters.push({ title, href });
    }

    chapters.sort((a, b) => {
      const numA = parseFloat(a.title.match(/Chapter\s+(\d+)/i)?.[1]) || 0;
      const numB = parseFloat(b.title.match(/Chapter\s+(\d+)/i)?.[1]) || 0;
      return numA - numB;
    });

    chapters.forEach((chapter, index) => {
      chapter.number = index + 1;
    });

    console.log(JSON.stringify(chapters));
    return JSON.stringify(chapters);
  } catch (error) {
    console.error('Fetch error in extractChapters:', error);
    return JSON.stringify([{
      href: url,
      title: "Error fetching chapters",
      number: 0
    }]);
  }
}

async function extractText(url) {
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };
        
        const response = await soraFetch(url, headers);
        const htmlText = await response.text();
        
        const startMarker = '<div id="pages"';
        const startIndex = htmlText.indexOf(startMarker);
        if (startIndex === -1) {
            throw new Error("Pages content div start (<div id=\"pages\") not found");
        }
        
        const startTagEndIndex = htmlText.indexOf('>', startIndex);
        if (startTagEndIndex === -1) {
            throw new Error("Could not find the end of the opening <div id=\"pages\"> tag");
        }
        
        const contentStartIndex = startTagEndIndex + 1;
        let depth = 1;
        let pos = contentStartIndex;
        let endIndex = -1;
        
        while (depth > 0 && pos < htmlText.length) {
            const nextOpenDiv = htmlText.indexOf('<div', pos);
            const nextCloseDiv = htmlText.indexOf('</div', pos);
            
            if (nextCloseDiv === -1) {
                break;
            }
            
            if (nextOpenDiv !== -1 && nextOpenDiv < nextCloseDiv) {
                depth++;
                pos = nextOpenDiv + 4;
            } else {
                depth--;
                if (depth === 0) {
                    endIndex = nextCloseDiv;
                } else {
                    pos = nextCloseDiv + 5;
                }
            }
        }
        
        if (endIndex === -1) {
            throw new Error("Matching closing </div> for pages content div not found");
        }
        
        let innerContent = htmlText.substring(contentStartIndex, endIndex);
        
        innerContent = innerContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        innerContent = innerContent.replace(/<div[^>]*class="[^"]*fixed[^"]*z-\[60\][^"]*top-0[^"]*left-0[^"]*w-full[^"]*h-full[^"]*bg-black\/90[^"]*flex[^"]*justify-center[^"]*items-center[\s\S]*?<\/div>/gi, '');
        
        const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi;
        let textContent = '';
        let match;
        
        while ((match = paragraphRegex.exec(innerContent)) !== null) {
            const paragraphText = match[1].replace(/<[^>]*>/g, '').trim();
            if (paragraphText) {
                textContent += paragraphText + '\n';
            }
        }
        
        innerContent = innerContent.trim();
        
        if (!innerContent && !textContent) {
            throw new Error("Chapter text not found or empty after cleaning");
        }
        console.log(innerContent || textContent);
        return innerContent;
        
    } catch (error) {
        console.error("Fetch error in extractText: " + error.message);
        return '<p>Error: This is chapter is locked as early access by the website, you will have to pay on the website or wait for the chapter to be released globally</p>';
    }
}

async function soraFetch(url, options = {
    headers: {},
    method: 'GET',
    body: null
}) {
    try {
        return await fetchv2(url, options.headers ?? {}, options.method ?? 'GET', options.body ?? null);
    } catch (e) {
        try {
            return await fetch(url, options);
        } catch (error) {
            return null;
        }
    }
}

function decodeHtmlEntities(text) {
    const entities = {
        '&#x2014;': '—',
        '&#x2013;': '–',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#x27;': "'",
        '&#x2F;': '/',
        '&#x60;': '`',
        '&#x3D;': '=',
        '&nbsp;': ' '
    };

    return text.replace(/&#x[\dA-Fa-f]+;|&\w+;/g, (match) => {
        return entities[match] || match;
    });
}
