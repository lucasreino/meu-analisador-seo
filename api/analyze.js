const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL é obrigatória' });

    try {
        const targetUrl = url.startsWith('http') ? url : `https://${url}`;
        const { data } = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36' },
            timeout: 15000
        });
        const $ = cheerio.load(data);

        // ── SEO Básico ──────────────────────────────────────────
        const title = $('title').text().trim() || '';
        const description = $('meta[name="description"]').attr('content') || '';
        const canonical = $('link[rel="canonical"]').attr('href') || '';
        const metaRobots = $('meta[name="robots"]').attr('content') || '';

        // Contagem de palavras no body (texto visível)
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
        const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;

        // Contagem de caracteres no artigo
        const articleText = $('article').text().replace(/\s+/g, ' ').trim();
        const articleCharCount = articleText.length;

        // ── Open Graph ──────────────────────────────────────────
        const ogTitle = $('meta[property="og:title"]').attr('content') || '';
        const ogDescription = $('meta[property="og:description"]').attr('content') || '';
        const ogImage = $('meta[property="og:image"]').attr('content') || '';
        const ogUrl = $('meta[property="og:url"]').attr('content') || '';
        const ogType = $('meta[property="og:type"]').attr('content') || '';
        const ogSiteName = $('meta[property="og:site_name"]').attr('content') || '';

        // ── Twitter Cards ───────────────────────────────────────
        const twitterCard = $('meta[name="twitter:card"]').attr('content') || '';
        const twitterTitle = $('meta[name="twitter:title"]').attr('content') || '';
        const twitterDescription = $('meta[name="twitter:description"]').attr('content') || '';
        const twitterImage = $('meta[name="twitter:image"]').attr('content') || '';

        // ── Estrutura de Headings ───────────────────────────────
        const h1Count = $('h1').length;
        const h2Count = $('h2').length;
        const h3Count = $('h3').length;
        const h4Count = $('h4').length;
        const h5Count = $('h5').length;
        const h6Count = $('h6').length;

        // Hierarquia de títulos
        const headings = [];
        $('h1, h2, h3, h4, h5, h6').each((i, el) => {
            const tag = el.tagName.toUpperCase();
            const text = $(el).text().trim().substring(0, 80);
            headings.push({ tag, text });
        });

        // Verifica hierarquia correta (H1 → H2 → H3+)
        let hierarchyOk = true;
        let prevLevel = 0;
        for (const h of headings) {
            const level = parseInt(h.tag.charAt(1));
            if (level > prevLevel + 1 && prevLevel > 0) {
                hierarchyOk = false;
                break;
            }
            prevLevel = level;
        }

        // ── Imagens ─────────────────────────────────────────────
        const totalImages = $('img').length;
        const imagesWithoutAlt = $('img:not([alt]), img[alt=""]').length;
        const imagesWithAlt = totalImages - imagesWithoutAlt;

        // ── Links ───────────────────────────────────────────────
        const hostname = new URL(targetUrl).hostname;
        let linksInternal = 0;
        let linksExternal = 0;
        let linksNofollow = 0;
        const totalLinks = $('a[href]').length;

        $('a[href]').each((i, el) => {
            const href = $(el).attr('href') || '';
            const rel = $(el).attr('rel') || '';

            if (rel.includes('nofollow')) {
                linksNofollow++;
            }

            if (href.startsWith('/') || href.startsWith('#') || href.includes(hostname)) {
                linksInternal++;
            } else if (href.startsWith('http')) {
                linksExternal++;
            }
        });

        // ── Técnico ─────────────────────────────────────────────
        const metaViewport = $('meta[name="viewport"]').attr('content') || '';
        const favicon = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href') || '';
        const charset = $('meta[charset]').attr('charset') || '';
        const contentType = $('meta[http-equiv="Content-Type"]').attr('content') || '';
        const detectedCharset = charset || (contentType.match(/charset=([^\s;]+)/i) || [])[1] || '';
        const hreflang = $('link[hreflang]').attr('hreflang') || '';
        const metaAuthor = $('meta[name="author"]').attr('content') || '';
        const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
        const publishedTime = $('meta[property="article:published_time"]').attr('content') || 
                              $('meta[name="date"]').attr('content') || 
                              $('time[datetime]').first().attr('datetime') || '';

        // ── Dados Estruturados (JSON-LD) ────────────────────────
        const jsonLd = [];
        $('script[type="application/ld+json"]').each((i, el) => {
            try { jsonLd.push(JSON.parse($(el).html())); } catch (e) {}
        });

        // Extrair tipos de schema
        const schemaTypes = new Set();
        const extractTypes = (obj) => {
            if (!obj) return;
            if (Array.isArray(obj)) {
                obj.forEach(item => extractTypes(item));
                return;
            }
            if (typeof obj === 'object') {
                if (obj['@type']) {
                    if (Array.isArray(obj['@type'])) {
                        obj['@type'].forEach(t => schemaTypes.add(t));
                    } else {
                        schemaTypes.add(obj['@type']);
                    }
                }
                // Recursively check nested objects
                if (obj['@graph']) extractTypes(obj['@graph']);
                Object.values(obj).forEach(val => {
                    if (typeof val === 'object') extractTypes(val);
                });
            }
        };
        jsonLd.forEach(item => extractTypes(item));

        // ── Resultado Final ─────────────────────────────────────
        const results = {
            analyzedUrl: targetUrl,
            basic: {
                title: title || 'Não encontrado',
                titleLength: title.length,
                description: description || 'Não encontrada',
                descLength: description.length,
                canonical: canonical || 'Não encontrado',
                metaRobots: metaRobots || 'Não definido',
                wordCount,
                articleCharCount
            },
            openGraph: {
                ogTitle: ogTitle || 'N/A',
                ogDescription: ogDescription || 'N/A',
                ogImage: ogImage || 'N/A',
                ogUrl: ogUrl || 'N/A',
                ogType: ogType || 'N/A',
                ogSiteName: ogSiteName || 'N/A'
            },
            twitter: {
                twitterCard: twitterCard || 'N/A',
                twitterTitle: twitterTitle || 'N/A',
                twitterDescription: twitterDescription || 'N/A',
                twitterImage: twitterImage || 'N/A'
            },
            structure: {
                h1: h1Count,
                h2: h2Count,
                h3: h3Count,
                h4: h4Count,
                h5: h5Count,
                h6: h6Count,
                headings: headings.slice(0, 20), // Limit to 20
                hierarchyOk
            },
            images: {
                total: totalImages,
                withAlt: imagesWithAlt,
                withoutAlt: imagesWithoutAlt
            },
            links: {
                total: totalLinks,
                internal: linksInternal,
                external: linksExternal,
                nofollow: linksNofollow
            },
            technical: {
                viewport: metaViewport,
                favicon: favicon,
                charset: detectedCharset,
                hreflang: hreflang,
                metaAuthor: metaAuthor,
                metaKeywords: metaKeywords,
                publishedTime: publishedTime
            },
            schema: {
                detected: jsonLd.length > 0,
                types: [...schemaTypes]
            }
        };

        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao analisar o site: ' + (error.message || 'Erro desconhecido') });
    }
};