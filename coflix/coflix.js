async function searchResults(keyword) {
    try {
        const response = await fetchv2(`https://coflix.cc/suggest.php?query=${encodeURIComponent(keyword)}`);
        const data = await response.json();

        if (!Array.isArray(data)) {
            return JSON.stringify([]);
        }

        const results = [];

        for (const item of data) {
            let imgUrl = '';
            const imgMatch = item.image.match(/src="([^"]+)"/);
            if (imgMatch && imgMatch[1]) {
                const src = imgMatch[1].trim();
                imgUrl = src.startsWith('//') ? 'https:' + src : src;
            }

            const href = item.url.trim();

            results.push({
                title: item.title.trim(),
                image: imgUrl,
                href: href
            });
        }

        return JSON.stringify(results);
    } catch (err) {
        console.error("Search failed:", err);
        return JSON.stringify([]);
    }
}

async function extractDetails(url) {
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const match = html.match(/<div aria-label="Description"[^>]*>\s*<p>(.*?)<\/p>/s);
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
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const seasonMatch = html.match(/<span class="fz12 ttu fwb db mb1 primary-co">(\d+) seasons?/i);
        const totalSeasons = seasonMatch ? parseInt(seasonMatch[1], 10) : null;

        const postIdMatch = html.match(/<body[^>]+postid-(\d+)/i);
        const postId = postIdMatch ? postIdMatch[1] : null;

        const results = [];

        if (!totalSeasons || !postId) {
            results.push({
                href: url,
                number: 1
            });
        } else {
            for (let season = 1; season <= totalSeasons; season++) {
                const apiUrl = `https://coflix.cc/wp-json/apiflix/v1/series/${postId}/${season}`;
                const seasonResp = await fetchv2(apiUrl);
                const seasonData = await seasonResp.json();

                if (seasonData.episodes && Array.isArray(seasonData.episodes)) {
                    seasonData.episodes.forEach(ep => {
                        results.push({
                            href: ep.links,
                            number: parseInt(ep.number, 10)
                        });
                    });
                }
            }
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

        const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
        const iframeUrl = iframeMatch ? iframeMatch[1] : null;
        if (!iframeUrl) throw new Error("Iframe not found");

        const iframeResp = await fetchv2(iframeUrl);
        const iframeHtml = await iframeResp.text();

        const uqloadMatch = iframeHtml.match(/<li[^>]*onclick="showVideo\('([^']+)',\s*'[^']+'\)">\s*<img[^>]*src="static\/server\/uqload[^"]*"[^>]*>\s*<span>Uqload/i);
        if (uqloadMatch) {
            const uqload = atob(uqloadMatch[1]);
            console.log("Uqload URL:" + uqload);
            const uqResp = await fetchv2(uqload);
            const uqHtml = await uqResp.text();

            const mp4Match = uqHtml.match(/sources:\s*\[\s*"([^"]+\.mp4)"/);
            if (mp4Match) {
                const mp4Url = mp4Match[1];
                console.log("MP4 URL:" + mp4Url);
                return mp4Url;
            }
        }

        const fileMonMatch = iframeHtml.match(/<li[^>]*onclick="showVideo\('([^']+)',\s*'[^']+'\)">\s*<img[^>]*src="static\/server\/filemoon[^"]*"[^>]*>\s*<span>FileMon/i);
        if (fileMonMatch) {
            const filemoon = atob(fileMonMatch[1]);
            console.log("FileMon URL:" + filemoon);
            const fileResp = await fetchv2(filemoon);
            const fileHtml = await fileResp.text();
            return filemoonExtractor(fileHtml, filemoon);
        }

        return "https://files.catbox.moe/avolvc.mp4";

    } catch (err) {
        return "https://files.catbox.moe/avolvc.mp4";
    }
}



/* SCHEME START */
/* {REQUIRED PLUGINS: unbaser} */

/**
 * @name filemoonExtractor
 * @author Cufiy - Inspired by Churly
 */

async function filemoonExtractor(html, url = null) {
    // check if contains iframe, if does, extract the src and get the url
    const regex = /<iframe[^>]+src="([^"]+)"[^>]*><\/iframe>/;
    const match = html.match(regex);
    if (match) {
        console.log("Iframe URL: " + match[1]);
        const iframeUrl = match[1];
        const iframeResponse = await soraFetch(iframeUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Referer": url,
            }
        });
        console.log("Iframe Response: " + iframeResponse.status);
        html = await iframeResponse.text();
    }
    // console.log("HTML: " + html);
    // get /<script[^>]*>([\s\S]*?)<\/script>/gi
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    const scripts = [];
    let scriptMatch;
    while ((scriptMatch = scriptRegex.exec(html)) !== null) {
        scripts.push(scriptMatch[1]);
    }
    // get the script with eval and m3u8
    const evalRegex = /eval\((.*?)\)/;
    const m3u8Regex = /m3u8/;
    // console.log("Scripts: " + scripts);
    const evalScript = scripts.find(script => evalRegex.test(script) && m3u8Regex.test(script));
    if (!evalScript) {
        console.log("No eval script found");
        return null;
    }
    const unpackedScript = unpack(evalScript);
    // get the m3u8 url
    const m3u8Regex2 = /https?:\/\/[^\s]+master\.m3u8[^\s]*?(\?[^"]*)?/;
    const m3u8Match = unpackedScript.match(m3u8Regex2);
    if (m3u8Match) {
        return m3u8Match[0];
    } else {
        console.log("No M3U8 URL found");
        return null;
    }
}


/* REMOVE_START */


class Unbaser {
    constructor(base) {
        this.ALPHABET = {
            62: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
            95: "' !\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'",
        };
        this.dictionary = {};
        this.base = base;
        if (36 < base && base < 62) {
            this.ALPHABET[base] = this.ALPHABET[base] ||
                this.ALPHABET[62].substr(0, base);
        }
        if (2 <= base && base <= 36) {
            this.unbase = (value) => parseInt(value, base);
        }
        else {
            try {
                [...this.ALPHABET[base]].forEach((cipher, index) => {
                    this.dictionary[cipher] = index;
                });
            }
            catch (er) {
                throw Error("Unsupported base encoding.");
            }
            this.unbase = this._dictunbaser;
        }
    }
    _dictunbaser(value) {
        let ret = 0;
        [...value].reverse().forEach((cipher, index) => {
            ret = ret + ((Math.pow(this.base, index)) * this.dictionary[cipher]);
        });
        return ret;
    }
}


function unpack(source) {
    let { payload, symtab, radix, count } = _filterargs(source);
    if (count != symtab.length) {
        throw Error("Malformed p.a.c.k.e.r. symtab.");
    }
    let unbase;
    try {
        unbase = new Unbaser(radix);
    }
    catch (e) {
        throw Error("Unknown p.a.c.k.e.r. encoding.");
    }
    function lookup(match) {
        const word = match;
        let word2;
        if (radix == 1) {
            word2 = symtab[parseInt(word)];
        }
        else {
            word2 = symtab[unbase.unbase(word)];
        }
        return word2 || word;
    }
    source = payload.replace(/\b\w+\b/g, lookup);
    return _replacestrings(source);
    function _filterargs(source) {
        const juicers = [
            /}\('(.*)', *(\d+|\[\]), *(\d+), *'(.*)'\.split\('\|'\), *(\d+), *(.*)\)\)/,
            /}\('(.*)', *(\d+|\[\]), *(\d+), *'(.*)'\.split\('\|'\)/,
        ];
        for (const juicer of juicers) {
            const args = juicer.exec(source);
            if (args) {
                let a = args;
                if (a[2] == "[]") {
                }
                try {
                    return {
                        payload: a[1],
                        symtab: a[4].split("|"),
                        radix: parseInt(a[2]),
                        count: parseInt(a[3]),
                    };
                }
                catch (ValueError) {
                    throw Error("Corrupted p.a.c.k.e.r. data.");
                }
            }
        }
        throw Error("Could not make sense of p.a.c.k.e.r data (unexpected code structure)");
    }
    function _replacestrings(source) {
        return source;
    }
}


/**
 * Uses Sora's fetchv2 on ipad, fallbacks to regular fetch on Windows
 * @author ShadeOfChaos
 *
 * @param {string} url The URL to make the request to.
 * @param {object} [options] The options to use for the request.
 * @param {object} [options.headers] The headers to send with the request.
 * @param {string} [options.method='GET'] The method to use for the request.
 * @param {string} [options.body=null] The body of the request.
 *
 * @returns {Promise<Response|null>} The response from the server, or null if the
 * request failed.
 */
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
/* REMOVE_END */

/* SCHEME END */