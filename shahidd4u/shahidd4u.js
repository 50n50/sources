async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2("https://shahidd4u.net/search?s=" + encodeURIComponent(keyword));
        const html = await response.text();

        const regex = /<a href="([^"]+)"[^>]+background-image:\s*url\(([^)]+)\)[^>]*>[\s\S]*?<p class="title">(.*?)<\/p>/g;

        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[3].trim(),
                image: match[2].trim(),
                href: match[1].trim()
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

        const regex = /<span class="description">\s*([\s\S]*?)\s*<\/span>/i;
        const match = regex.exec(html);

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
        const regex = /<a href="([^"]+)" class="btn watch">/i;
        const match = regex.exec(html);
        
        if (match) {
            const extractedUrl = match[1].trim();
            
            const encodedUrl = encodeURI(extractedUrl);

            return JSON.stringify([{
                href: encodedUrl,
                number: 1
            }]);
        }
        return JSON.stringify([]);
    } catch (err) {
        console.error('Error details:', err);
        return JSON.stringify([{
            href: "Error",
            number: "Error"
        }]);
    }
}

async function extractStreamUrl(url) {
    console.log("Extracting stream URL from: " + url);
    try {
        const response = await fetchv2(url);
        const html = await response.text();
        console.log(html);
        
        const jsonRegex = /let servers = JSON\.parse\('(\[.*?\])'\);/;
        const jsonMatch = jsonRegex.exec(html);
        
        if (jsonMatch) {
            const servers = JSON.parse(jsonMatch[1]);
            
            const earnVidsServer = servers.find(server => server.name === "EarnVids");
            
            if (earnVidsServer) {
                console.log("Stream URL: " + earnVidsServer.url);
                return await extractEarnVids(earnVidsServer.url);
            } else {
                if (servers.length > 0) {
                    console.log("EarnVids not found, using first server: " + servers[0].name);
                    console.log("Stream URL: " + servers[0].url);
                    return await extractEarnVids(servers[0].url);
                }
            }
        }
        
        console.log("No servers found");
        return null;
        
    } catch (err) {
        console.error("Error extracting stream URL:", err);
        return null;
    }
}

async function extractEarnVids(url) {
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const obfuscatedScript = html.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d.*?\)[\s\S]*?)<\/script>/);
        const unpackedScript = unpack(obfuscatedScript[1]);

        const streamMatch = unpackedScript.match(/["'](\/stream\/[^"']+)["']/);
        const hlsLink = streamMatch ? streamMatch[1] : null;

        const baseUrl = url.match(/^(https?:\/\/[^/]+)/)[1];

        console.log("HLS Link:" + baseUrl + hlsLink);

        return baseUrl + hlsLink;
    } catch (err) {
        console.log(err);
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
