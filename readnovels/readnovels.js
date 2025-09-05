async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const url = `https://wuxiaworld.eu/api/search/?search=${encodedKeyword}&offset=0&limit=40&order=`;
        const response = await soraFetch(url);
        const data = await response.json();

        const results = data.results.map(item => ({
            title: item.name || "Untitled",
            href: `https://wuxiaworld.eu/novel/${item.slug}`,
            image: item.image && item.image.startsWith("http") ? item.image : ""
        }));
        console.log(JSON.stringify(results));
        return JSON.stringify(results);
    } catch (error) {
        console.error("Error fetching or parsing:"+ error);
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

    const jsonMatch = htmlText.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!jsonMatch) throw new Error("NEXT_DATA JSON not found");

    const nextData = JSON.parse(jsonMatch[1]);

    const novelData = nextData.props.pageProps.dehydratedState.queries[0].state.data;

    const description = novelData.description ? 
      novelData.description.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : 
      "No description available";

    const aliases = 'N/A';

    const airdate = novelData.created_at || 'N/A';

    const transformedResults = [{
      description,
      aliases,
      airdate
    }];

    console.log(JSON.stringify(transformedResults));
    return JSON.stringify(transformedResults);

  } catch (error) {
    console.log('Details error:'+ error);
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

        const jsonMatch = htmlText.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (!jsonMatch) throw new Error("NEXT_DATA JSON not found");

        const nextData = JSON.parse(jsonMatch[1]);
        const slug = nextData.props?.pageProps?.dehydratedState?.queries?.[0]?.state?.data?.slug;
        if (!slug) throw new Error("Slug not found");

        const apiResponse = await soraFetch(`https://wuxiaworld.eu/api/chapters/${slug}/`);
        const json = await apiResponse.json();

        const chapters = json.map((item, index) => ({
            title: item.title,
            number: index + 1,
            href: item.novSlugChapSlug
        }));

        console.log('Final chapters:'+ JSON.stringify(chapters));
        return JSON.stringify(chapters);

    } catch (error) {
        console.log('Fetch error in extractChapters:'+ error);
        return [{
            href: url,
            title: "Currently no chapters available",
            number: 1
        }];
    }
}

async function extractText(slug) {
    try {
        const response = await soraFetch(`https://readnovel.eu/_next/data/qBnFmM2GSCSijw3mqDLF7/en/chapter/${slug}.json?slug=${slug}`);
        const jsonReturn = await response.json();

        const text = jsonReturn?.pageProps?.dehydratedState?.queries?.[0]?.state?.data?.text;

        if (!text) {
            throw new Error("Chapter text not found");
        }

        const cleaned = text
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/\n{2,}/g, '\n') 
            .trim();

        console.log(cleaned);
        return cleaned;
    } catch (error) {
        console.log("Fetch error in extractText:"+ error);
        return JSON.stringify({
            text: 'Error extracting text'
        });
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