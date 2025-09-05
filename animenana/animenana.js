async function searchResults(keyword) {
  const results = [];
  try {
    const response = await fetchv2("https://animenana.com/search/?key=" + keyword);
    const html = await response.text();
    
    const cardMatches = html.match(/<div class="card component-latest">[\s\S]*?<\/div>\s*<\/div>\s*<\/a>/g);
    
    if (cardMatches) {
      for (const cardHtml of cardMatches) {
        const hrefMatch = cardHtml.match(/<a href="([^"]+)"/);
        
        const imgMatch = cardHtml.match(/<img[^>]+(?:data-src|src)="([^"]+)"/);
        
        const titleMatch = cardHtml.match(/<h5 class="animename"[^>]*>(.*?)<\/h5>/);
        
        if (hrefMatch && imgMatch && titleMatch) {
          results.push({
            href: "https://animenana.com" + hrefMatch[1].trim(),
            image: "https://animenana.com" + imgMatch[1].trim(),
            title: titleMatch[1].trim()
          });
        }
      }
    }
    
    if (results.length === 0) {
      const colMatches = html.match(/<div class="col-md-4">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/a>\s*<\/div>/g);
      
      if (colMatches) {
        for (const colHtml of colMatches) {
          const hrefMatch = colHtml.match(/<a href="([^"]+)"/);
          const imgMatch = colHtml.match(/<img[^>]+(?:data-src|src)="([^"]+)"/);
          const titleMatch = colHtml.match(/<h5 class="animename"[^>]*>(.*?)<\/h5>/);
          
          if (hrefMatch && imgMatch && titleMatch) {
            results.push({
              href: "https://animenana.com" + hrefMatch[1].trim(),
              image: "https://animenana.com" + imgMatch[1].trim(), 
              title: titleMatch[1].trim()
            });
          }
        }
      }
    }
    
    if (results.length === 0) {
      const regex = /<a href="([^"]+)"[\s\S]*?<img[^>]+(?:data-src|src)="([^"]+)"[\s\S]*?<h5 class="animename"[^>]*>(.*?)<\/h5>/g;
      let match;
      while ((match = regex.exec(html)) !== null) {
        results.push({
          href: "https://animenana.com" + match[1].trim(),
          image: "https://animenana.com" + match[2].trim(),
          title: match[3].trim()
        });
      }
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

        const regex = /<p><b>Description:\s*<\/b><\/p>([\s\S]*?)<br\s*\/?>/i;
        const match = regex.exec(html);

        let description = match ? match[1].trim() : "N/A";

        description = description.replace(/<[^>]+>/g, "").trim();

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
    
    // More flexible regex to handle the actual HTML structure
    const epRegex = /<a href="([^"]+)"[^>]*title="[^"]*Episode\s*(\d+)">/g;
    let match;
    while ((match = epRegex.exec(html)) !== null) {
      results.push({
        href: "https://animenana.com" + match[1].trim(),
        number: parseInt(match[2], 10)
      });
    }
    
    const specialRegex = /<span class="badge[^"]*"[^>]*>([^<]+)<\/span>[\s\S]*?<a href="([^"]+)"[^>]*>[\s\S]*?<h5 class="animename">([^<]+)<\/h5>/g;
    while ((match = specialRegex.exec(html)) !== null) {
      results.push({
        href: "https://animenana.com" + match[2].trim(),
        number: 1
      });
    }
    
    if (results.length >= 2 && results[0].number > results[1].number) {
      results.reverse();
      results.forEach((item, index) => {
        item.number = index + 1;
      });
    }
    
    if (results.length === 0) {
      results.push({
        href: url,
        number: 1
      });
    }
    
    return JSON.stringify(results);
  } catch (err) {
    return JSON.stringify([{
      href: "Error",
      number: "Error",
      type: "Error"
    }]);
  }
}

async function extractStreamUrl(url) {
  try {
    const response = await fetchv2(url);
    const html = await response.text();
    const fmRegex = /function\s+fm\(\)\s*\{[^}]*document\.getElementById\("videowrapper"\)\.innerHTML\s*=\s*['"]<iframe\s+src=['"]([^'"]+)['"]/;
    const match = fmRegex.exec(html);

    
    let streamUrl = "https://files.catbox.moe/avolvc.mp4";
    
    if (match && match[1]) {
      const iframeSrc = match[1];
      
      if (iframeSrc.startsWith("https://")) {
        streamUrl = iframeSrc;
      } else {
        streamUrl = "https://animenana.com" + iframeSrc;
      }
    }
    
    const finalUrl = streamUrl;

    console.log(finalUrl);

    const diejfioe = await fetchv2(finalUrl);
    const jdi83rjf = await diejfioe.text();

    const kvrokofrmfrklefmklrd = jdi83rjf.match(/<iframe[^>]+src="([^"]+)"/);
    if (kvrokofrmfrklefmklrd) {
        const iframeUrl = kvrokofrmfrklefmklrd[1];
        console.log("Iframe URL:"+ iframeUrl);

        const headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Referer": "https://animenana.com" + url,
        };

        const i9jfrhtiee = await fetchv2(iframeUrl, headers);
        const kopefjir4o0 = await i9jfrhtiee.text();

        const obfuscatedScript = kopefjir4o0.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d.*?\)[\s\S]*?)<\/script>/);
        const unpackedScript = unpack(obfuscatedScript[1]);
        //console.log(unpackedScript);

        const hlsMatch = unpackedScript.match(/file:"(https?:\/\/.*?\.m3u8.*?)"/);
        const hlsUrl = hlsMatch ? hlsMatch[1] : null;
        console.log("HLS URL:"+hlsUrl);
        return hlsUrl;
    } else {
        console.log("No iframe found");
    }


    return "blehh";
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

