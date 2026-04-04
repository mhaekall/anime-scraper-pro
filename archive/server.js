const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });
const app = express();
const PORT = 3000;
const BASE_URL = 'https://anime.oploverz.ac'; // Base url from the html headers

app.use(cors());

// Fetch Series List
app.get('/api/series', async (req, res) => {
    try {
        const url = 'https://o.oploverz.ltd/series';
        const response = await axios.get(url, { httpsAgent: agent, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(response.data);
        const series = [];

        $('a[href^="/series/"]').each((i, el) => {
            const href = $(el).attr('href');
            const title = $(el).text().trim();
            if (href && href.length > 8 && title && !series.find(s => s.url === href)) {
                series.push({ title, url: href.startsWith('http') ? href : BASE_URL + href });
            }
        });

        // ENHANCE METADATA DENGAN ANILIST (HD PREVIEWS)
        const enhancedSeries = await Promise.all(series.map(async (item) => {
            const anilistData = await fetchAniListInfo(item.title);
            if (anilistData) {
                return {
                    ...item,
                    title: anilistData.cleanTitle || item.title,
                    img: anilistData.hdImage, // Tambahkan gambar HD
                    banner: anilistData.banner,
                    score: anilistData.score
                };
            }
            return item;
        }));

        res.json({ success: true, data: enhancedSeries });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch Home Page (Latest Episodes with Images)
app.get('/api/home', async (req, res) => {
    try {
        const url = 'https://o.oploverz.ltd/';
        const response = await axios.get(url, { httpsAgent: agent, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(response.data);
        const items = [];

        $('a[href*="/episode/"]').each((i, el) => {
            const imgEl = $(el).find('img');
            const img = imgEl.attr('src');
            // Grab title from alt attribute of the image, usually "cover-animename"
            let title = imgEl.attr('alt') || $(el).attr('title');
            if (title && title.startsWith('cover-')) {
                title = title.replace('cover-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            }
            if (!title || title.trim() === '') {
                title = $(el).attr('href').split('/')[2].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            }

            if (img && img.includes('poster')) {
                // To support series playback, extract the series URL
                const href = $(el).attr('href');
                const seriesUrl = href.substring(0, href.indexOf('/episode/'));
                
                // Avoid strict duplicates in the home feed
                if(!items.find(item => item.title === title)) {
                    items.push({
                        title: title, 
                        url: seriesUrl.startsWith('http') ? seriesUrl : BASE_URL + seriesUrl, 
                        episodeUrl: href.startsWith('http') ? href : BASE_URL + href,
                        img: img
                    });
                }
            }
        });

        res.json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch Episode List for a Series
app.get('/api/episodes', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'URL is required' });

    try {
        const response = await axios.get(targetUrl, { httpsAgent: agent, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(response.data);
        const episodes = [];

        $('a[href*="/episode/"]').each((i, el) => {
            const href = $(el).attr('href');
            const title = $(el).text().trim().replace(/<!--\[!-->/g, '').replace(/<!--\]-->/g, '').replace(/<!---->/g, '');
            if (href && title && !episodes.find(e => e.url === href)) {
                episodes.push({ title, url: href.startsWith('http') ? href : BASE_URL + href });
            }
        });

        res.json({ success: true, data: episodes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Scrape Episode for Videos
app.get('/api/scrape', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'URL is required' });

    try {
        const response = await axios.get(targetUrl, { httpsAgent: agent, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = response.data;
        const $ = cheerio.load(html);

        let embeds = [];
        let title = $('title').text() || 'Unknown Title';

        const addEmbed = (url, providerText) => {
            if (!url || typeof url !== 'string') return;
            
            if (url.includes('<iframe')) {
                const match = url.match(/src=["'](.*?)["']/);
                if (match) url = match[1];
            }
            
            if (url.startsWith('P')) { 
                try {
                    const decoded = Buffer.from(url, 'base64').toString('utf8');
                    const match = decoded.match(/src=["'](.*?)["']/);
                    if (match) url = match[1];
                } catch(e) {}
            }

            if (url.startsWith('//')) url = 'https:' + url;
            if (!url.startsWith('http')) return;

            // --- FILTERING (BUANG SAMPAH & IKLAN) ---
            const badKeywords = ['youtube', 'facebook', 'twitter', 'instagram', 't.me', 'ads', 'banner', 'histats', 'google', 'wp-admin', 'cutt.ly', 't2m.io', 'vtxlinks', 'ombak', 'togel', 'slot', 'gcbos', 'guguk', 'joiboy', 'tapme', 'infodomain', 'tempatsucii'];
            if (badKeywords.some(kw => url.toLowerCase().includes(kw))) return;

            // Ekstrak nama domain utama sebagai Provider jika tidak ada teks yang jelas
            let domain = '';
            try { domain = new URL(url).hostname.replace('www.', ''); } catch(e) { return; }
            
            if (providerText.includes('Data') || providerText.includes('Option') || providerText.includes('Found')) {
                providerText = domain.split('.')[0].toUpperCase();
            }

            let quality = "Auto";
            const textToSearch = (providerText + " " + url).toLowerCase();
            if (textToSearch.includes('1080') || textToSearch.includes('fhd')) quality = "1080p";
            else if (textToSearch.includes('720') || textToSearch.includes('hd')) quality = "720p";
            else if (textToSearch.includes('480') || textToSearch.includes('sd')) quality = "480p";
            else if (textToSearch.includes('360')) quality = "360p";

            // --- DEDUPLIKASI (Jangan masukkan link dari domain yang sama dan resolusi sama) ---
            const isDuplicate = embeds.find(e => e.resolved === url || (e.domain === domain && e.quality === quality));

            if (!isDuplicate) {
                embeds.push({
                    provider: providerText,
                    domain: domain,
                    quality: quality,
                    resolved: url,
                    type: 'iframe' // Kembalikan ke Iframe demi kestabilan
                });
            }
        };

        $('iframe').each((i, el) => { addEmbed($(el).attr('src'), 'Iframe'); });

        $('*').each((i, el) => {
            const dataVideo = $(el).attr('data-video');
            const dataSrc = $(el).attr('data-src');
            const dataUrl = $(el).attr('data-url');
            let text = $(el).text().trim() || '';

            if (dataVideo) addEmbed(dataVideo, text);
            if (dataSrc) addEmbed(dataSrc, text);
            if (dataUrl) addEmbed(dataUrl, text);
            
            if ($(el).is('option')) {
                const val = $(el).attr('value');
                if (val && val.includes('http')) addEmbed(val, text);
            }

            // Oploverz uses <a> tags for external downloads
            if ($(el).is('a')) {
                const href = $(el).attr('href');
                const target = $(el).attr('target');
                
                if ($(el).find('img').length > 0) return;

                if (href && href.startsWith('http') && target === '_blank') {
                    if (text.length < 2) text = $(el).parent().text().trim();
                    
                    const rowText = $(el).closest('.flex-row').text().toLowerCase();
                    if (rowText) {
                        if (rowText.includes('1080')) text += ' 1080p';
                        else if (rowText.includes('720')) text += ' 720p';
                        else if (rowText.includes('480')) text += ' 480p';
                        else if (rowText.includes('360')) text += ' 360p';
                        else if (!text) text = rowText;
                    }
                    
                    addEmbed(href, text || 'External Download');
                }
            }
        });

        // --- SVELTE PAYLOAD EXTRACTION (STREAMING LINKS) ---
        // Oploverz hides the actual streaming iframe links inside a JSON payload in a <script> tag
        const streamMatches = [...html.matchAll(/\{source:\"([^\"]+)\",url:\"(https?:\/\/[^\"]+)\"\}/g)];
        streamMatches.forEach(match => {
            const sourceName = match[1]; // e.g., "Nonton Online 1080p"
            const url = match[2];
            addEmbed(url, sourceName);
        });

        // --- SORTING ---
        // Urutkan resolusi dari yang tertinggi (1080p -> 720p -> 480p -> 360p -> Auto)
        const qualityRank = { "1080p": 5, "720p": 4, "480p": 3, "360p": 2, "Auto": 1 };
        embeds.sort((a, b) => {
            return qualityRank[b.quality] - qualityRank[a.quality];
        });

        res.json({
            success: true,
            anime: { title },
            sources: embeds
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});