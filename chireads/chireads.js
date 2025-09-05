async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const url = `https://chireads.com/search?x=0&y=0&name=${encodedKeyword}`;
        const response = await soraFetch(url);
        const html = await response.text();

        const results = [];
        const liRegex = /<li>([\s\S]*?)<\/li>/g;
        let liMatch;

        while ((liMatch = liRegex.exec(html)) !== null) {
            const liHtml = liMatch[1];

            const linkMatch = liHtml.match(/<div class="news-list-img">[\s\S]*?<a href="([^"]+)"\s+title="([^"]+)"/);
            const imgMatch = liHtml.match(/<div class="news-list-img">[\s\S]*?<img src="([^"]+)"/);
            const titleMatch = liHtml.match(/<h5 class="font-color-black3">[\s\S]*?<a [^>]+>([^<]+)<\/a>/);

            if (linkMatch && imgMatch && titleMatch) {
                let image = imgMatch[1];
                if (!image.startsWith("http")) image = "https:" + image;

                results.push({
                    title: decodeHtmlEntities(titleMatch[1].trim()),
                    href: linkMatch[1].trim(),
                    image: image.trim()
                });
            }
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

async function extractDetails(url) {
  try {
    const response = await soraFetch(url);
    const htmlText = await response.text();

    const descMatch = htmlText.match(/<div class="inform-txt-show font-color-black6">\s*<span>([\s\S]*?)<\/span>\s*<\/div>/i);

    let description = descMatch
      ? descMatch[1]
          .replace(/<br\s*\/?>/gi, '\n')    
          .replace(/\s+/g, ' ')            
          .trim()
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
    
    let contentHtml = null;
    
    const ulPattern = /<ul><li><a href="[^"]*chapitre-\d+[^"]*"[\s\S]*?<\/ul>/i;
    const ulMatch = htmlText.match(ulPattern);
    
    if (ulMatch) {
      contentHtml = ulMatch[0];
      console.log("Found chapters using UL pattern");
    } else {
      const chapterSectionRegex = /<div[^>]*class="chapitre-table"[^>]*>([\s\S]*?)<\/div>/gi;
      let bestSection = null;
      let maxChapterCount = 0;
      let sectionMatch;
      
      while ((sectionMatch = chapterSectionRegex.exec(htmlText)) !== null) {
        const sectionContent = sectionMatch[1];
        const chapterCount = (sectionContent.match(/chapitre-\d+/gi) || []).length;
        
        if (chapterCount > maxChapterCount) {
          maxChapterCount = chapterCount;
          bestSection = sectionContent;
        }
      }
      
      if (bestSection && maxChapterCount > 0) {
        contentHtml = bestSection;
        console.log(`Found chapters using best section method (${maxChapterCount} chapters)`);
      }
    }
    
    if (!contentHtml) {
      const chapterLinksPattern = /(<[^>]*>[\s\S]*?){5,}chapitre-\d+[\s\S]*?(<\/[^>]*>[\s\S]*?){5,}/i;
      const fallbackMatch = htmlText.match(chapterLinksPattern);
      
      if (fallbackMatch) {
        const startIndex = htmlText.indexOf(fallbackMatch[0]);
        const endIndex = startIndex + fallbackMatch[0].length;
        
        const beforeText = htmlText.substring(0, startIndex);
        const divStart = beforeText.lastIndexOf('<div');
        
        const afterText = htmlText.substring(endIndex);
        const divEnd = afterText.indexOf('</div>');
        
        if (divStart !== -1 && divEnd !== -1) {
          contentHtml = htmlText.substring(divStart, endIndex + divEnd + 6);
          console.log("Found chapters using fallback method");
        }
      }
    }
    
    if (!contentHtml) {
      throw new Error("Chapters content not found");
    }
    
    console.log("Content HTML length:", contentHtml.length);
    console.log("Content preview:", contentHtml.substring(0, 200) + "...");
    
    const linkRegex = /<a\s+href="([^"]*(?:chapitre|chapter)[^"]*)"[^>]*(?:title="([^"]*)")?[^>]*>(.*?)<\/a>/gi;
    const chapters = [];
    let linkMatch;
    
    while ((linkMatch = linkRegex.exec(contentHtml)) !== null) {
      const href = linkMatch[1].trim();
      const titleAttr = linkMatch[2]?.trim();
      const linkText = linkMatch[3].trim();
      
      const title = titleAttr || linkText;
      
      if (title && /chapitre\s*\d+/i.test(title)) {
        chapters.push({ title, href });
      }
    }
    
    console.log(`Found ${chapters.length} chapters before sorting`);
    
    chapters.sort((a, b) => {
      const numA = parseFloat(a.title.match(/chapitre\s*(\d+)/i)?.[1]) || 0;
      const numB = parseFloat(b.title.match(/chapitre\s*(\d+)/i)?.[1]) || 0;
      return numA - numB;
    });
    
    chapters.forEach((chapter, index) => {
      chapter.number = index + 1;
    });
    
    console.log(`Final result: ${chapters.length} chapters`);
    if (chapters.length > 0) {
      console.log("First chapter:", chapters[0]);
      console.log("Last chapter:", chapters[chapters.length - 1]);
    }
    
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
    const response = await soraFetch(url);
    let htmlText = await response.text();

    const contentRegex = /<div[^>]+id=['"]content['"][^>]*class=["']font-color-black3 article-font["'][^>]*>([\s\S]*?)<\/div>/i;
    const match = contentRegex.exec(htmlText);

    if (!match) {
      throw new Error("Main content div not found");
    }

    let content = match[1];

    content = content.replace(/<div id="pf-\d+-\d+"[^>]*>[\s\S]*?<\/div>/gi, '');
    content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<[^p\/][^>]*>/gi, '');
    content = content.replace(/\s+/g, ' ').trim();

    if (!content) {
      throw new Error("No content extracted");
    }

    console.log(content);
    return content;

  } catch (error) {
    console.log("Fetch error in extractText: " + error);
    return '<p>Error extracting text</p>';
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
