async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2(`https://www.topstreamfilm.live/?story=${encodeURIComponent(keyword)}&do=search&subaction=search`);
        const html = await response.text();

        const regex = /<li class="TPostMv">[\s\S]*?<a href="([^"]+)">[\s\S]*?<figure[^>]*>[\s\S]*?<img[^>]*data-src="([^"]+)"[^>]*>[\s\S]*?<h3 class="Title">([^<]+)<\/h3>/g;

        let match;
        while ((match = regex.exec(html)) !== null) {
            const href = match[1].trim();
            const image = "https://www.topstreamfilm.live" + match[2].trim();
            let title = (match[3].trim()).trim();

            title = title
                .replace(/&#8211;/g, "–")
                .replace(/&#8217;/g, "'")
                .replace(/&amp;/g, "&")
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'")
                .replace(" – Der Film", "");

            results.push({
                title,
                image,
                href
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

        const regex = /<div class="Description">([\s\S]*?)<\/div>/i;
        const match = regex.exec(html);

        let description = "N/A";
        if (match) {
            description = match[1]
                .replace(/<[^>]+>/g, " ")
                .replace(/&amp;/g, "&")
                .replace(/&#8211;/g, "–")
                .replace(/&#8217;/g, "’")
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'")
                .replace(/\s+/g, " ")
                .trim();
        }

        return JSON.stringify([{
            description,
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

        // First try: capture season, episode number, and supervideo link
        const regex = /id="serie-(\d+)_(\d+)"[\s\S]*?data-m="supervideo"[^>]+data-link="([^"]+)"/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            const season = parseInt(match[1], 10);
            const episode = parseInt(match[2], 10);
            const href = match[3].trim();
            results.push({
                season,
                number: episode,
                href
            });
        }

        if (results.length === 0) {
            const scriptRegex = /<script src="(https:\/\/meinecloud\.click\/ddl\/[^"]+)" type="[^"]*text\/javascript"><\/script>/g;
            const scriptMatch = scriptRegex.exec(html);

            if (scriptMatch) {
                const scriptUrl = scriptMatch[1].trim();

                try {
                    const scriptResponse = await fetchv2(scriptUrl);
                    const scriptContent = await scriptResponse.text();

                    const supervideRegex = /\\'(https:\/\/supervideo\.tv\/[^']+)\\'/;
                    const supervideMatch = scriptContent.match(supervideRegex);

                    if (supervideMatch) {
                        const supervideUrl = supervideMatch[1].trim();
                        results.push({
                            season: 1,
                            number: 1,
                            href: supervideUrl
                        });
                    }
                } catch (scriptErr) {
                    console.log("Error fetching script: " + scriptErr);
                }
            }
        }

        return JSON.stringify(results);
    } catch (err) {
        return JSON.stringify([{
            season: "Error",
            number: "Error",
            href: "Error"
        }]);
    }
}

async function extractStreamUrl(url) {
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const obfuscatedScript = html.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d.*?\)[\s\S]*?)<\/script>/);
        const unpackedScript = unpack(obfuscatedScript[1]);

        const regex = /file:\s*"([^"]+\.m3u8)"/;
        const match = regex.exec(unpackedScript);
        if (match) {
            const fileUrl = match[1];
            console.log("File URL:" + fileUrl);

            return fileUrl;
        }

        return "deiofjdew";
    } catch (err) {
        console.log("Error extracting stream URL: " + err);
        return "https://files.catbox.moe/avolvc.mp4";
    }
}


/***********************************************************
 * UNPACKER MODULE
 * Credit to GitHub user "mnsrulz" for Unpacker Node library
 * https://github.com/mnsrulz/unpacker
 ***********************************************************/
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
