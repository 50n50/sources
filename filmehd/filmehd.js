function decodeHtmlEntities(text) {
    return text
        .replace(/&#8217;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&#8230;/g, '...')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(num));
}

async function searchResults(keyword) {
    const results = [];
    const regex = /<article[^>]*class="item (movies|seasons)"[^>]*>[\s\S]*?<img\s+src="([^"]+)"[^>]*title="([^"]+)"[^>]*>[\s\S]*?<a\s+href="([^"]+)"[^>]*>/gi;

    try {
        const response = await fetchv2("https://filmehd.to/?s=" + encodeURIComponent(keyword));
        const html = await response.text();

        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                image: match[2].trim(),
                title: decodeHtmlEntities(match[3].trim()),
                href: match[4].trim()
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

        const match = /<div class="wp-content"[^>]*>\s*<p>(.*?)<\/p>/i.exec(html);
        const description = match ? match[1].trim() : "No description found";

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
        
        const episodes = [];
        
        const iframeMatch = html.match(/<iframe[^>]+src\s*=\s*"([^"]*movies\/iframe\/[^"]*?)"/i);
        if (iframeMatch) {
            episodes.push({
                href: iframeMatch[1].trim(),
                number: 1
            });
        } else {
            const allDataVs = [];
            const dataVsRegex = /data-vs\s*=\s*"([^"]*?)"/g;
            let match;
            while ((match = dataVsRegex.exec(html)) !== null) {
                allDataVs.push(match[1].trim());
            }
            
            const allNumbers = [];
            const numberRegex = /<span[^>]*class="servers"[^>]*>(\d+)<\/span>/g;
            while ((match = numberRegex.exec(html)) !== null) {
                allNumbers.push(parseInt(match[1], 10));
            }
            
            const server1Start = html.indexOf('SERVER 1');
            let server1End = html.indexOf('SERVER 2');
            if (server1End === -1) server1End = html.length;
            
            if (server1Start !== -1) {
                const server1Section = html.substring(server1Start, server1End);
                const server1Count = (server1Section.match(/<span[^>]*class="servers"/g) || []).length;
                
                for (let i = 0; i < server1Count && i < allDataVs.length && i < allNumbers.length; i++) {
                    episodes.push({
                        href: allDataVs[i],
                        number: allNumbers[i]
                    });
                }
            }
        }
        
        episodes.sort((a, b) => a.number - b.number);
        
        if (episodes.length === 0) {
            throw new Error("No episodes found");
        }
        
        return JSON.stringify(episodes);
        
    } catch (err) {
        return JSON.stringify([{
            href: "Error",
            number: "Error", 
            message: err.message
        }]);
    }
}

async function extractStreamUrl(url) {
    try {
        const headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
            "Referer": "https://filmehd.to/"
        };
        const response = await fetchv2(url, headers);
        const html = await response.text();

        const iframeMatch = /<iframe[^>]+src="([^"]+)"[^>]*><\/iframe>/i.exec(html);
        if (!iframeMatch) throw new Error("Iframe not found");
        const iframeUrl = iframeMatch[1].trim();

        const iframeResponse = await fetchv2(iframeUrl, headers);
        const iframeContent = await iframeResponse.text();

        console.log(`[Debug] Iframe content: ${iframeContent}`);

        const scriptMatch = iframeContent.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d.*?\)[\s\S]*?)<\/script>/);

        if (!scriptMatch) throw new Error("Obfuscated script not found");
        const evalContent = scriptMatch[1];

        const unpackedScript = unpack(evalContent); 

        const fileMatch = /sources:\s*\[\s*\{\s*file:\s*"([^"]+\.m3u8[^"]*)"/.exec(unpackedScript);
        if (!fileMatch) throw new Error("Stream URL not found");


        const subtitleMatch = /tracks:\s*\[\s*\{\s*file:\s*"([^"]+\.vtt[^"]*)"/.exec(unpackedScript);

        return JSON.stringify({
            stream: fileMatch[1],
            subtitles: subtitleMatch ? subtitleMatch[1] : null
        });
    } catch (err) {
        console.error("Error extracting stream URL:", err);
        return JSON.stringify({
            stream: "https://files.catbox.moe/avolvc.mp4",
            subtitles: null
        });
    }
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


