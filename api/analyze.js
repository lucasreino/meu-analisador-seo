const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL é obrigatória' });

    try {
        const targetUrl = url.startsWith('http') ? url : `https://${url}`;
        const { data } = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const $ = cheerio.load(data);

        // Extração de Dados Estruturados (JSON-LD)
        const jsonLd = [];
        $('script[type="application/ld+json"]').each((i, el) => {
            try { jsonLd.push(JSON.parse($(el).html())); } catch (e) {}
        });

        const results = {
            basic: {
                title: $('title').text() || 'Não encontrado',
                titleLength: $('title').text().length,
                description: $('meta[name="description"]').attr('content') || 'Não encontrada',
                canonical: $('link[rel="canonical"]').attr('href') || 'Não encontrado',
                lang: $('html').attr('lang') || 'Não definido'
            },
            social: {
                ogTitle: $('meta[property="og:title"]').attr('content'),
                ogImage: $('meta[property="og:image"]').attr('content'),
                twitterCard: $('meta[name="twitter:card"]').attr('content')
            },
            structure: {
                h1: $('h1').length,
                h2: $('h2').length,
                h3: $('h3').length,
                images: $('img').length,
                imagesAltMissing: $('img:not([alt])').length
            },
            links: {
                total: $('a').length,
                internal: 0,
                external: 0
            },
            schema: jsonLd.length > 0 ? "Detectado" : "Não encontrado"
        };

        // Lógica de contagem de links
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                if (href.startsWith('/') || href.includes(new URL(targetUrl).hostname)) {
                    results.links.internal++;
                } else if (href.startsWith('http')) {
                    results.links.external++;
                }
            }
        });

        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao analisar o site.' });
    }
};