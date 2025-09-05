function cleanTitle(title) {
    return title
        .replace(/&#8217;/g, "'")   // right single quote
        .replace(/&#8216;/g, "'")   // left single quote
        .replace(/&#8220;/g, '"')   // left double quote
        .replace(/&#8221;/g, '"')   // right double quote
        .replace(/&#8211;/g, "-")   // en dash
        .replace(/&#8212;/g, "-")   // em dash
        .replace(/&quot;/g, '"')    // double quote
        .replace(/&apos;/g, "'")    // apostrophe
        .replace(/&amp;/g, "&")     // ampersand
        .replace(/&lt;/g, "<")      // less-than
        .replace(/&gt;/g, ">")      // greater-than
        .replace(/&nbsp;/g, " ")    // non-breaking space
        .replace(/&#[0-9]+;/g, "")  // other numeric entities
        .replace(/&[a-z]+;/gi, "")  // other named entities
        .replace(/\s+/g, " ")       // collapse multiple spaces
        .trim();                    // remove leading/trailing spaces
}

async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2("https://www3.veziseriale.org/?s=" + keyword);
        const html = await response.text();

        const regex = /<article[^>]+class="item (?:tvshows|movies)"[^>]*>.*?<img src="([^"]+)"[^>]*alt="([^"]+)">.*?<a href="([^"]+)">/gs;
        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: cleanTitle(match[2]),
                image: match[1].trim(),
                href: match[3].trim()
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

        const divMatch = html.match(/<div class="wp-content">([\s\S]*?)<\/div>/i);
        var description = "Idk why it don't got a description twin";

        if (divMatch) {
            var rawText = divMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

            description = rawText
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#(\d+);/g, function(match, num) {
                    return String.fromCharCode(parseInt(num, 10));
                });
        }

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
    if (url.includes("/filme/")) {
      return JSON.stringify([{ href: url, number: 1 }]);
    }

    const response = await fetchv2(url);
    const html = await response.text();

    const seasonRegex = /<div class=['"]se-c['"][^>]*>[\s\S]*?<div class=['"]se-a['"][^>]*>[\s\S]*?<ul class=['"]episodios['"][^>]*>([\s\S]*?)<\/ul>[\s\S]*?<\/div>[\s\S]*?<\/div>/gi;
    let seasonMatch;

    while ((seasonMatch = seasonRegex.exec(html)) !== null) {
      const episodesHtml = seasonMatch[1];

      const episodeRegex = /<a\s+href=['"]([^'"]+)['"][^>]*>\s*<strong[^>]*>[^<]*?Episodul\s+(\d+)\s*<\/strong>\s*<\/a>/gi;
      let episodeMatch;

      while ((episodeMatch = episodeRegex.exec(episodesHtml)) !== null) {
        results.push({
          href: episodeMatch[1].trim(),
          number: parseInt(episodeMatch[2], 10)
        });
      }
    }

    console.log(`[Debug] Found ${results.length} episodes`);
    console.log(`[Debug]`, JSON.stringify(results, null, 2));
    return JSON.stringify(results.reverse());
  } catch (err) {
    console.error('Error extracting episodes:', err);
    return JSON.stringify([{ href: "Error", number: "Error" }]);
  }
}

async function extractStreamUrl(url) {
    try {
        const firstresponse = await fetchv2(url);
        const firsthtml = await firstresponse.text();

        const idMatch = firsthtml.match(/href=['"]https:\/\/www3\.veziseriale\.org\/\?p=(\d+)['"]/);
        if (!idMatch) throw new Error('ID not found');
        const id = idMatch[1];

        const response = await fetchv2(
            `https://passthrough-worker.simplepostrequest.workers.dev/?url=https://manager.veziseriale.org/get_links.php&type=formdata&body=id%3D${id}`
        );
        const html = await response.text();
        const data = JSON.parse(html);

        const filemoonLink = data.links.find(link => link.buttonName === "Filemoon")?.url;
        if (!filemoonLink) throw new Error("Filemoon link not found");

        const filemoonId = filemoonLink.match(/\/e\/([^\/]+)/)?.[1];
        if (!filemoonId) throw new Error("Filemoon ID not found");

        const rewrittenStreamUrl = `https://l455o.com/bkg/${filemoonId}`;

        const subtitleFilename = data.subs2;
        const subtitleUrl = `https://manager.veziseriale.org/subtitles/${subtitleFilename}`;

        const response2 = await fetchv2(rewrittenStreamUrl);
        const streamHtml = await response2.text();

        const obfuscatedScript = streamHtml.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d.*?\)[\s\S]*?)<\/script>/);
        if (!obfuscatedScript) throw new Error("Obfuscated script not found");

        const unpackedScript = unpack(obfuscatedScript[1]);

        const hlsMatch = unpackedScript.match(/file\s*:\s*"([^"]+\.m3u8[^"]*)"/);
        if (!hlsMatch) throw new Error("HLS stream not found");
        const streamUrl = hlsMatch[1];

        return JSON.stringify({
            stream: streamUrl,
            subtitles: subtitleUrl
        });

    } catch (err) {
        console.error('Error extracting stream URL: ' + err);
        return {
            stream: "https://files.catbox.moe/avolvc.mp4",
            subtitles: ""
        };
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



