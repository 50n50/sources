async function searchResults(keyword) {
    const results = [];
    const response = await fetchv2("https://www.poseidonhd2.co/search?q=" + encodeURIComponent(keyword));
    const html = await response.text();
    const baseUrl = "https://www.poseidonhd2.co";
    
    const regex = /<a\s+href="([^"]+)">([\s\S]*?)<\/a>/gs;
    let match;
    
    while ((match = regex.exec(html)) !== null) {
        const href = match[1].trim();
        const linkContent = match[2];
        
        if (linkContent.includes('<span class="TpTv BgA">Serie</span>')) {
            continue;
        }
        
        const imgMatch = linkContent.match(/<img[^>]+src="([^"]+)"[^>]*>/);
        const titleMatch = linkContent.match(/<span class="Title[^"]*"[^>]*>([^<]+)<\/span>/);
        
        if (imgMatch && titleMatch) {
            results.push({
                title: titleMatch[1].trim(),
                image: baseUrl + decodeURIComponent(imgMatch[1].replace(/&amp;/g, "&").trim()),
                href: baseUrl + href
            });
        }
    }
    
    return JSON.stringify(results);
}

async function extractDetails(url) {
    const results = [];
    const response = await fetchv2(url);
    const html = await response.text();

    const regex = /<div class="Description">\s*<p>(.*?)<\/p>/s;
    const match = regex.exec(html);

    const description = match ? match[1].trim() : "N/A";

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
    console.log(url);

    const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (jsonMatch) {
        try {
            const data = JSON.parse(jsonMatch[1]);
            const seasons = data.props?.pageProps?.thisSerie?.seasons || [];

            for (const season of seasons) {
                for (const episode of season.episodes || []) {
                    results.push({
                        href: "https://www.poseidonhd2.co/" + episode.url.slug,
                        number: episode.number
                    });
                }
            }

            if (results.length > 0) return JSON.stringify(results);
        } catch (e) {
            console.warn("Failed to parse __NEXT_DATA__ episodes", e);
        }
    }

    try {
        const data = JSON.parse(jsonMatch[1]);
        const videos = data.props?.pageProps?.thisMovie?.videos || {};

        const getStreamwishLink = (videosArray) => {
            const entry = videosArray.find(v => v.cyberlocker === 'streamwish');
            return entry ? entry.result : null;
        };

        const latino = getStreamwishLink(videos.latino || []);
        const spanish = getStreamwishLink(videos.spanish || []);
        const subt = getStreamwishLink(videos.english || []);

        const parts = [];
        if (latino) parts.push(`Español latino:streamwish:${latino}`);
        if (spanish) parts.push(`Español:streamwish:${spanish}`);
        if (subt) parts.push(`Subtitulado:streamwish:${subt}`);

        if (parts.length > 0) {
            results.push({
                href: parts.join(' | '),
                number: 1
            });
            return JSON.stringify(results);
        }
    } catch (e) {
        console.warn("Failed to parse videos from __NEXT_DATA__", e);
    }

    const tableRowRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>[\s\S]*?(?:#?\d+[\s\S]*?)?(?:<!--[^]*?-->)?\s*([^<]+)[^<]*<\/td>[\s\S]*?<td[^>]*>([^<]+)[^<]*<\/td>[\s\S]*?<td[^>]*><span>([^<]+)<\/span><\/td>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*class="Button STPb">Descargar<\/a>[\s\S]*?<\/tr>/gi;

    const linksMap = {
        "Español latino": null,
        "Español": null,
        "Subtitulado": null
    };

    let match;
    while ((match = tableRowRegex.exec(html)) !== null) {
        const [, providerRaw, languageRaw, , link] = match;
        const provider = providerRaw.trim().toLowerCase();
        const language = languageRaw.trim();

        if (!provider.includes("streamwish")) continue;

        if (language === 'Latino') linksMap["Español latino"] = link;
        else if (language === 'Español') linksMap["Español"] = link;
        else if (language === 'Subtitulado') linksMap["Subtitulado"] = link;
    }

    const parts = [];
    for (const [lang, link] of Object.entries(linksMap)) {
        if (link) parts.push(`${lang}:streamwish:${link}`);
    }

    if (parts.length > 0) {
        results.push({
            href: parts.join(' | '),
            number: 1
        });
    }

    return JSON.stringify(results);
}

async function extractStreamUrl(urlData) {
    const languageBlocks = urlData.split("|");
    const streamwishLinks = {};
    
    for (const block of languageBlocks) {
        const match = block.match(/^([^:]+):streamwish:(.+)$/);
        if (!match) continue;
        const lang = match[1].trim();
        const link = match[2].trim();
        if (link && link !== "null") {
            if (lang === "Español latino") streamwishLinks.latino = link;
            else if (lang === "Español") streamwishLinks.espanol = link;
            else if (lang === "Subtitulado") streamwishLinks.subtitulado = link;
        }
    }
    
    console.log("Parsed streamwishLinks: " + JSON.stringify(streamwishLinks));
    
    async function getVarUrl(link) {
        try {
            const res = await fetchv2(link);
            const html = await res.text();
            const match = html.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/);
            return match ? match[1] : null;
        } catch (err) {
            return null;
        }
    }
    
    async function getFinalStream(link) {
        try {
            const res = await fetchv2(link);
            const html = await res.text();
            const scriptMatch = html.match(/eval\(function\(p,a,c,k,e,d\)\{[\s\S]+?\}\('.*?'\,\d+\,\d+\,'.*?'\.split\('\|'\)\)\)/);
            if (!scriptMatch) return null;
            const packed = scriptMatch[0];
            console.log("Obfuscated eval function found: " + packed.substring(0, 500));
            const unpacked = unpack(packed);
            console.log("Unpacked code snippet: " + unpacked.substring(0, 500));
            const hls2Match = unpacked.match(/"hls2"\s*:\s*"([^"]+)"/);
            return hls2Match ? hls2Match[1] : null;
        } catch (err) {
            console.log("Error in getFinalStream: " + err);
            return null;
        }
    }
    
    function rewriteStreamwishUrl(url) {
        return url.replace(/^https?:\/\/streamwish\.to\//, "https://xenolyzb.com/");
    }
    
    const streams = [];
    
    for (const [langKey, embedUrl] of Object.entries(streamwishLinks)) {
        const varUrlRaw = await getVarUrl(embedUrl);
        if (!varUrlRaw) continue;
        const varUrl = rewriteStreamwishUrl(varUrlRaw);
        const hls2 = await getFinalStream(varUrl);
        if (!hls2) continue;
        
        const label =
            langKey === "latino" ? "LATINO" :
            langKey === "espanol" ? "CASTELLANO" :
            langKey === "subtitulado" ? "SUB" :
            langKey.toUpperCase();
            
        streams.push(label, hls2);
    }
    
    if (streams.length === 0) {
        return "deijdjiwjdiwaidjwaodjiasjdioajidofejhifophwufipheuipfhepiuwghuiphfipehifspehwuipfhewipfhewhfuihfdlshfjkshfudislvhjdkslvsdjkl";
    }
    
    const final = {
        streams
    };
    console.log(JSON.stringify(final));
    return JSON.stringify(final);
}




/*
 * UNPACKER MODULE
 * Credit to GitHub user "mnsrulz" for  Unpacker Node library
 * https://github.com/mnsrulz/unpacker
 */

class Unbaser {
    constructor(base) {
        /* Functor for a given base. Will efficiently convert
          strings to natural numbers. */
        this.ALPHABET = {
            62: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
            95: "' !\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'",
        };
        this.dictionary = {};
        this.base = base;
        // fill elements 37...61, if necessary
        if (36 < base && base < 62) {
            this.ALPHABET[base] = this.ALPHABET[base] ||
                this.ALPHABET[62].substr(0, base);
        }
        // If base can be handled by int() builtin, let it do it for us
        if (2 <= base && base <= 36) {
            this.unbase = (value) => parseInt(value, base);
        }
        else {
            // Build conversion dictionary cache
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
        /* Decodes a value to an integer. */
        let ret = 0;
        [...value].reverse().forEach((cipher, index) => {
            ret = ret + ((Math.pow(this.base, index)) * this.dictionary[cipher]);
        });
        return ret;
    }
}

function detect(source) {
    /* Detects whether `source` is P.A.C.K.E.R. coded. */
    return source.replace(" ", "").startsWith("eval(function(p,a,c,k,e,");
}

function unpack(source) {
    /* Unpacks P.A.C.K.E.R. packed js code. */
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
        /* Look up symbols in the synthetic symtab. */
        const word = match;
        let word2;
        if (radix == 1) {
            //throw Error("symtab unknown");
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
        /* Juice from a source file the four args needed by decoder. */
        const juicers = [
            /}\('(.*)', *(\d+|\[\]), *(\d+), *'(.*)'\.split\('\|'\), *(\d+), *(.*)\)\)/,
            /}\('(.*)', *(\d+|\[\]), *(\d+), *'(.*)'\.split\('\|'\)/,
        ];
        for (const juicer of juicers) {
            //const args = re.search(juicer, source, re.DOTALL);
            const args = juicer.exec(source);
            if (args) {
                let a = args;
                if (a[2] == "[]") {
                    //don't know what it is
                    // a = list(a);
                    // a[1] = 62;
                    // a = tuple(a);
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
        /* Strip string lookup table (list) and replace values in source. */
        /* Need to work on this. */
        return source;
    }
}

