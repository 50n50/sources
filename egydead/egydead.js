async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2("https://tv3.egydead.live/?s=" + encodeURIComponent(keyword));
        const html = await response.text();

        const regex = /<li class="movieItem">\s*<a href="([^"]+)" title="([^"]+)">\s*<img src="([^"]+)">/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                href: match[1].trim(),
                title: match[2].trim(),
                image: match[3].trim()
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

        const match = html.match(/<div class="extra-content">\s*<span>القصه<\/span>\s*<p>([\s\S]*?)<\/p>/);
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
    const results = [];
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const regex = /<a href="([^"]+)"[^>]*>\s*حلقه\s*(\d+)\s*<\/a>/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                href: match[1].trim(),
                number: parseInt(match[2], 10)
            });
        }

        if (results.length === 0) {
            results.push({
                href: url,
                number: 1
            });
        }
        return JSON.stringify(results.reverse());
    } catch (err) {
        return JSON.stringify([{
            href: "Error",
            number: "Error"
        }]);
    }
}

async function extractStreamUrl(url) {
    try {
        const header = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/"
        };
        const postData = "View=1";
        const response = await fetchv2(url, header, "POST", postData);
        const html = await response.text();
        const match = html.match(/<li data-link="(https:\/\/mivalyo\.com\/v\/[^"]+)"/);
        const streamUrl = match ? match[1] : "https://files.catbox.moe/avolvc.mp4";
        console.log("Stream URL:", streamUrl);
        
        const responseTwo = await fetchv2(streamUrl);
        const htmlTwo = await responseTwo.text();
        const obfuscatedScript = htmlTwo.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d.*?\)[\s\S]*?)<\/script>/);
        
        if (!obfuscatedScript) {
            console.log("No obfuscated script found, using fallback");
            return "https://files.catbox.moe/avolvc.mp4";
        }
        
        const unpackedScript = unpack(obfuscatedScript[1]);
        console.log("Unpacked script:", unpackedScript.substring(0, 200) + "...");
        
        let hlsLink = null;
        const baseUrl = url.match(/^(https?:\/\/[^/]+)/)[1];
        
        const streamMatch = unpackedScript.match(/["'](\/stream\/[^"']+)["']/);
        if (streamMatch) {
            hlsLink = streamMatch[1];
            console.log("Found stream path:", hlsLink);
            return baseUrl + hlsLink;
        }

        const hlsObjectMatch = unpackedScript.match(/["']hls\d?["']\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/);
        if (hlsObjectMatch) {
            hlsLink = hlsObjectMatch[1];
            console.log("Found HLS object link:", hlsLink);
            return hlsLink;
        }
        
        const m3u8Match = unpackedScript.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/);
        if (m3u8Match) {
            hlsLink = m3u8Match[1];
            console.log("Found m3u8 link:", hlsLink);
            return hlsLink;
        }
        
        const cdnMatch = unpackedScript.match(/["'](https?:\/\/[^"']*(?:cdn|stream)[^"']*\.m3u8[^"']*)["']/i);
        if (cdnMatch) {
            hlsLink = cdnMatch[1];
            console.log("Found CDN link:", hlsLink);
            return hlsLink;
        }
        
        const linksMatch = unpackedScript.match(/links\s*[=:]\s*({[^}]+}|\[[^\]]+\])/);
        if (linksMatch) {
            const linksStr = linksMatch[1];
            const urlInLinks = linksStr.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/);
            if (urlInLinks) {
                hlsLink = urlInLinks[1];
                console.log("Found link in links object:", hlsLink);
                return hlsLink;
            }
        }
        
        console.log("No HLS link found in unpacked script, using fallback");
        return "https://files.catbox.moe/avolvc.mp4";
        
    } catch (err) {
        console.error("Error in extractStreamUrl:", err);
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
