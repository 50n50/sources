async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2(
            "https://witanime.red/?search_param=animes&s=" + encodeURIComponent(keyword)
        );
        const html = await response.text();

        const regex = /<div class="anime-card-container">[\s\S]*?<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[\s\S]*?<h3><a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a><\/h3>/gi;

        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[4].trim(), 
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

        const descMatch = /<p class="anime-story">([\s\S]*?)<\/p>/i.exec(html);
        const description = descMatch ? descMatch[1].trim() : "N/A";

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

    function decryptEpisodeData(encodedData) {
        const parts = encodedData.split('.');
        const encryptedData = atob(parts[0]); 
        const xorKey = atob(parts[1]);        

        let decryptedString = '';

        for (let i = 0; i < encryptedData.length; i++) {
            const decryptedChar = String.fromCharCode(
                encryptedData.charCodeAt(i) ^ xorKey.charCodeAt(i % xorKey.length)
            );
            decryptedString += decryptedChar;
        }

        return JSON.parse(decryptedString);
    }

    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const dataRegex = /var\s+processedEpisodeData\s*=\s*'([^']+)'/;
        const dataMatch = dataRegex.exec(html);

        const encodedData = dataMatch ? dataMatch[1] : null;

        if (encodedData) {
            const decoded = decryptEpisodeData(encodedData);

            const addEpisode = (ep) => {
                const num = parseInt(ep.number, 10);
                results.push({ href: ep.url, number: isNaN(num) ? 0 : num });
            };

            if (Array.isArray(decoded)) {
                decoded.forEach(addEpisode);
            } else {
                addEpisode(decoded);
            }

            return JSON.stringify(results);
        }

        return JSON.stringify(results);
    } catch (err) {
        return JSON.stringify([{
            href: "Error",
            number: 0
        }]);
    }
}

async function extractStreamUrl(url) {
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const servers = a(html);
        console.log(JSON.stringify(servers));
        const priorities = [
            "streamwish - fhd",
            "streamwish",
            "mp4upload",
            "playerwish - fhd",
            "playerwish"
        ];

        let chosenServer = null;
        for (const provider of priorities) {
            chosenServer = servers.find(s =>
                s.name.toLowerCase().includes(provider)
            );
            if (chosenServer) break;
        }

        if (!chosenServer) {
            throw new Error("No valid server found");
        }

        const streamUrl = chosenServer.url;
        const name = chosenServer.name.toLowerCase();

        if (name.includes("streamwish")) {
            const response = await fetchv2(streamUrl.replace("https://zuvioeb.com/e/", "https://hgplaycdn.com/e/"));
            const html = await response.text();

            const result = await b(html);
            return result;
        } else if (name.includes("mp4upload")) {
            const response = await fetchv2(streamUrl);
            const html = await response.text();

            const result = await c(html);
            return result;
        } else if (name.includes("playerwish")) {
            const response = await fetchv2(streamUrl);
            const html = await response.text();

            const result = await b(html);
            return result;
        } else {
            throw new Error("Unsupported provider: " + chosenServer.name);
        }
    } catch (err) {
        console.error(err);
        return "https://files.catbox.moe/avolvc.mp4";
    }
}

function a(html) {
    try {
        const zGMatch = html.match(/var _zG="([^"]+)";/);
        const zHMatch = html.match(/var _zH="([^"]+)";/);
        if (!zGMatch || !zHMatch) throw new Error("Could not find _zG or _zH in HTML");

        const resourceRegistry = JSON.parse(atob(zGMatch[1]));
        const configRegistry = JSON.parse(atob(zHMatch[1]));

        const serverNames = {};
        const serverLinks = html.matchAll(
            /<a[^>]+class="server-link"[^>]+data-server-id="(\d+)"[^>]*>\s*<span class="ser">([^<]+)<\/span>/g
        );
        for (const match of serverLinks) {
            serverNames[match[1]] = match[2].trim();
        }

        const servers = [];
        for (let i = 0; i < 10; i++) {
            const resourceData = resourceRegistry[i];
            const config = configRegistry[i];
            if (!resourceData || !config) continue;

            let decrypted = resourceData.split('').reverse().join('');
            decrypted = decrypted.replace(/[^A-Za-z0-9+/=]/g, '');
            let rawUrl = atob(decrypted);

            const indexKey = atob(config.k);
            const paramOffset = config.d[parseInt(indexKey, 10)];
            rawUrl = rawUrl.slice(0, -paramOffset);

            servers.push({
                id: i,
                name: serverNames[i] || `Unknown Server ${i}`,
                url: rawUrl.trim()
            });
        }

        return servers;
    } catch (error) {
        return [];
    }
}

async function b(data, url = null) {
    const obfuscatedScript = data.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d.*?\)[\s\S]*?)<\/script>/);

    const unpackedScript = unpack(obfuscatedScript[1]);

    const m3u8Match = unpackedScript.match(/"hls2"\s*:\s*"([^"]+)"/);

    const m3u8Url = m3u8Match[1];
    return m3u8Url;
}

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

function detect(source) {
    return source.replace(" ", "").startsWith("eval(function(p,a,c,k,e,");
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

async function c(data, url = null) {
    const srcMatch = data.match(/src:\s*"([^"]+\.mp4)"/);
    const srcUrl = srcMatch ? srcMatch[1] : null;

    return srcUrl;
}
