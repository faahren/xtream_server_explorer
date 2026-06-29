const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('client/build'));

// Environment variables
const XTREAM_HOSTNAME = process.env.XTREAM_HOSTNAME;
const XTREAM_PASSWORD = process.env.XTREAM_PASSWORD;
const XTREAM_USER = process.env.XTREAM_USER;
const RPC_PASSWORD = process.env.RPC_PASSWORD;
const ARIA2_URL = process.env.ARIA2_URL || 'http://192.168.0.21:6800/jsonrpc';

// Helper function to build API URLs
function buildApiUrl(action, params = {}) {
    const baseUrl = `http://${XTREAM_HOSTNAME}/player_api.php`;
    const queryParams = new URLSearchParams({
        username: XTREAM_USER,
        password: XTREAM_PASSWORD,
        action: action,
        ...params
    });
    return `${baseUrl}?${queryParams.toString()}`;
}

// Helper function to build stream URLs
function buildStreamUrl(streamType, streamId, extension = '') {
    const baseUrl = `http://${XTREAM_HOSTNAME}/${streamType}/${XTREAM_USER}/${XTREAM_PASSWORD}`;
    return extension ? `${baseUrl}/${streamId}.${extension}` : `${baseUrl}/${streamId}`;
}

// API Routes

// Get playlist data
app.get('/api/playlist', async (req, res) => {
    try {
        const [streamsRes, catsRes] = await Promise.all([
            axios.get(buildApiUrl('get_live_streams')),
            axios.get(buildApiUrl('get_live_categories')),
        ]);

        // Build category_id → category_name map
        const catMap = {};
        for (const cat of catsRes.data) {
            catMap[String(cat.category_id)] = cat.category_name;
        }

        const transformedStreams = Object.values(streamsRes.data).map(stream => ({
            category_id: stream.category_id,
            category_name: catMap[String(stream.category_id)] || '',
            name: stream.name || '',
            stream_icon: stream.stream_icon || '',
            stream_url: buildStreamUrl('live', stream.stream_id, stream.container_extension),
            stream_type: stream.stream_type || 'live'
        }));

        res.json(transformedStreams);
    } catch (error) {
        console.error('Error fetching playlist:', error);
        res.status(500).json({ error: 'Failed to fetch playlist' });
    }
});

// Get Movies
app.get('/api/movies', async (req, res) => {
    refresh = req.query.refresh;
    let movies = {};
    try {
        if (fs.existsSync('downloads/movies.json') && refresh !== 'true') {
            console.log('[movies] Cache found, reading from file...');
            const raw = fs.readFileSync('downloads/movies.json', 'utf8');
            console.log(`[movies] File size: ${(raw.length / 1024).toFixed(1)} KB`);
            movies = JSON.parse(raw);
            console.log(`[movies] Parsed ${(movies.movies || []).length} movies, ${(movies.categories || []).length} categories`);
        } else {
            console.log('[movies] No cache, fetching streams from Xtream API...');
            const t0 = Date.now();
            let bytesReceived = 0;
            const timer = setInterval(() => {
                const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
                const kb = (bytesReceived / 1024).toFixed(1);
                console.log(`[movies] ... ${elapsed}s elapsed, ${kb} KB received so far`);
            }, 2000);
            const response = await axios.get(buildApiUrl('get_vod_streams'), {
                onDownloadProgress: (evt) => { bytesReceived = evt.loaded; }
            });
            clearInterval(timer);
            console.log(`[movies] Streams downloaded in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${response.data.length} items`);
            movies.movies = response.data;

            console.log('[movies] Fetching categories...');
            const categories = await axios.get(buildApiUrl('get_vod_categories'));
            console.log(`[movies] ${categories.data.length} categories received`);
            movies.categories = categories.data;

            console.log('[movies] Saving to cache...');
            fs.writeFileSync('downloads/movies.json', JSON.stringify(movies));
            fs.writeFileSync('downloads/movies_categories.json', JSON.stringify(categories.data));
            console.log('[movies] Cache saved');
        }
        res.json(movies);
    }
    catch (error) {
        console.error('Error fetching movies:', error);
        res.status(500).json({ error: 'Failed to fetch movies' });
    }
});

// Get series list
app.get('/api/series', async (req, res) => {
    try {
        let series;
        // If file containing series is found, read it
        if (fs.existsSync('downloads/series.json') && req.query.refresh !== 'true') {
            console.log('[series] Cache found, reading from file...');
            const raw = fs.readFileSync('downloads/series.json', 'utf8').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
            console.log(`[series] File size: ${(raw.length / 1024).toFixed(1)} KB`);
            series = JSON.parse(raw);
            console.log(`[series] Parsed ${Object.values(series).length} entries`);
        } else {
            console.log('[series] No cache, fetching from Xtream API...');
            const t0 = Date.now();
            let bytesReceived = 0;
            const timer = setInterval(() => {
                const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
                const kb = (bytesReceived / 1024).toFixed(1);
                console.log(`[series] ... ${elapsed}s elapsed, ${kb} KB received so far`);
            }, 2000);
            const response = await axios.get(buildApiUrl('get_series'), {
                onDownloadProgress: (evt) => { bytesReceived = evt.loaded; }
            });
            clearInterval(timer);
            console.log(`[series] Download complete in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
            series = response.data;
            const count = Object.values(series).length;
            console.log(`[series] ${count} series received, saving to cache...`);
            fs.writeFileSync('downloads/series.json', JSON.stringify(series));
            console.log('[series] Cache saved');
        }


        // Transform series data
        console.log('[series] Transforming data...');
        const transformedSeries = Object.values(series).map(s => ({
            num: s.num,
            name: s.name,
            series_id: s.series_id,
            cover: s.cover,
            plot: s.plot,
            cast: s.cast,
            director: s.director,
            genre: s.genre,
            releaseDate: s.releaseDate,
            release_date: s.release_date,
            last_modified: s.last_modified,
            rating: s.rating,
            rating_5based: s.rating_5based,
            backdrop_path: s.backdrop_path,
            youtube_trailer: s.youtube_trailer,
            tmdb: s.tmdb,
            episode_run_time: s.episode_run_time,
            category_id: s.category_id,
            category_ids: s.category_ids
        }));
        
        console.log(`[series] Transformed ${transformedSeries.length} entries, sending response`);
        res.json(transformedSeries);
    } catch (error) {
        console.error('Error fetching series:', error);
        res.status(500).json({ error: 'Failed to fetch series' });
    }
});

// Get series details by ID
app.get('/api/series/:id', async (req, res) => {
    try {
        const seriesId = req.params.id;
        const response = await axios.get(buildApiUrl('get_series_info', { series_id: seriesId }));
        
        if (response.data && response.data.info) {
            res.json(response.data);
        } else {
            res.status(404).json({ error: 'Series not found' });
        }
    } catch (error) {
        console.error('Error fetching series details:', error);
        res.status(500).json({ error: 'Failed to fetch series details' });
    }
});

// Download file with aria2
app.post('/api/download', async (req, res) => {
    try {
        const { name, id, container_extension, type } = req.body;
        stream_url = buildStreamUrl(type, id, container_extension);
        
        if (!stream_url || !name || !id || !container_extension || !type) {
            return res.status(400).json({ error: 'Missing stream_url or name' });
        }
        
        // Clean the name (remove everything before first " - " and parentheses except years)
        let cleanName = name;
        if (name.includes(' - ')) {
            parts = name.split(' - ');
            parts.shift();
            cleanName = parts.join(' - ');
        }

        // All parenthesis and their content (except years) should be removed
        cleanName = cleanName.replace(/\([^)]*\)/g, (match) => {
            return /\d{4}/.test(match) ? match : '';
        }).trim();

        // Remove all double spaces
        cleanName = cleanName.replace(/\s+/g, ' ');

        console.log(stream_url);
        console.log(cleanName);
        
        const payload = {
            jsonrpc: "2.0",
            id: "1",
            method: "aria2.addUri",
            params: [
                `token:${RPC_PASSWORD}`,
                [stream_url],
                {
                    dir: "/downloads",
                    out: `${cleanName}.${container_extension}`
                }
            ]
        };
        
        const aria2Response = await axios.post(ARIA2_URL, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (aria2Response.status === 200) {
            res.json({ success: true, message: 'Download started successfully' });
        } else {
            res.status(500).json({ error: 'Failed to start download' });
        }
    } catch (error) {
        console.error('Error starting download:', error);
        res.status(500).json({ error: 'Failed to start download' });
    }
});

// List all downloads with their status
app.get('/api/download/status', async (req, res) => {
    try {
        // Get active downloads
        const activePayload = {
            jsonrpc: "2.0",
            id: "1", 
            method: "aria2.tellActive",
            params: [`token:${RPC_PASSWORD}`]
        };

        // Get completed downloads
        const completedPayload = {
            jsonrpc: "2.0",
            id: "2",
            method: "aria2.tellStopped", 
            params: [`token:${RPC_PASSWORD}`, 0, 1000]
        };

        // Make requests to aria2
        const [activeResponse, completedResponse] = await Promise.all([
            axios.post(ARIA2_URL, activePayload),
            axios.post(ARIA2_URL, completedPayload)
        ]);

        const downloads = {
            active: activeResponse.data.result || [],
            completed: completedResponse.data.result || []
        };

        res.json(downloads);

    } catch (error) {
        console.error('Error getting download status:', error);
        res.status(500).json({ error: 'Failed to get download status' });
    }
});

// Search series
app.get('/api/series/search/:query', async (req, res) => {
    try {
        const query = req.params.query.toLowerCase();
        const response = await axios.get(buildApiUrl('get_series'));
        const series = response.data;
        
        const filteredSeries = Object.values(series).filter(s => 
            s.name && s.name.toLowerCase().includes(query)
        );
        
        res.json(filteredSeries);
    } catch (error) {
        console.error('Error searching series:', error);
        res.status(500).json({ error: 'Failed to search series' });
    }
});

// Get categories
app.get('/api/categories/:type', async (req, res) => {
    try {
        const type = req.params.type; // live, vod, or series
        const action = `get_${type}_categories`;
        const response = await axios.get(buildApiUrl(action));
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// HLS stream proxy — follows redirects, rewrites manifest URLs, streams segments
app.get('/api/stream-proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Missing url');

    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        const response = await axios.get(targetUrl, {
            responseType: 'stream',
            maxRedirects: 10,
            timeout: 20000,
            headers: { 'User-Agent': 'Mozilla/5.0' },
        });

        const contentType = response.headers['content-type'] || '';
        const finalUrl = response.request?.res?.responseUrl || targetUrl;
        const isM3U8 = contentType.includes('mpegurl') || targetUrl.includes('.m3u8');

        if (isM3U8) {
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            let body = '';
            response.data.on('data', chunk => { body += chunk.toString(); });
            response.data.on('end', () => {
                const base = new URL(finalUrl);
                const rewritten = body.split('\n').map(line => {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('#')) return line;
                    const absUrl = trimmed.startsWith('http') ? trimmed : new URL(trimmed, base).toString();
                    return `/api/stream-proxy?url=${encodeURIComponent(absUrl)}`;
                }).join('\n');
                res.end(rewritten);
            });
        } else {
            res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp2t');
            res.setHeader('Cache-Control', 'no-cache');
            response.data.pipe(res);
        }
    } catch (err) {
        console.error('[proxy] error:', err.message);
        if (!res.headersSent) res.status(502).send('Proxy error');
    }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
