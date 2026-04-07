// api/analyze.js
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL é obrigatória' });
    }

    try {
        const targetUrl = url.startsWith('http') ? url : `https://${url}`;
        const { data } = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36' }
        });

        const $ = cheerio.load(data);

        const results = {
            basic: {
                title: $('title').text() || 'Não encontrado',
                titleLength: $('title').text().length,
                description: $('meta[name="description"]').attr('content') || 'Não encontrada',
                descLength: $('meta[name="description"]').attr('content')?.length || 0,
                canonical: $('link[rel="canonical"]').attr('href') || 'Não encontrado',
            },
            headings: {
                h1: $('h1').length,
                h2: $('h2').length,
                h3: $('h3').length
            },
            images: {
                total: $('img').length,
                missingAlt: $('img:not([alt])').length
            },
            og: {
                title: $('meta[property="og:title"]').attr('content') || 'N/A',
                image: $('meta[property="og:image"]').attr('content') || 'N/A'
            }
        };

        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao acessar a URL. Verifique se o site permite acesso.' });
    }
};