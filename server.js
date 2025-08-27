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
        const response = await axios.get(buildApiUrl('get_live_streams'));
        const streams = response.data;
        
        // Transform the data to match your current format
        const transformedStreams = Object.values(streams).map(stream => ({
            category_name: stream.category_name || '',
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
            movies = JSON.parse(fs.readFileSync('downloads/movies.json', 'utf8'));
            console.log('Movies file found, reading from file');
        } else {
            console.log('Movies file not found, fetching from TVHeadend');
            const response = await axios.get(buildApiUrl('get_vod_streams'));
            movies.movies = response.data;
            const categories = await axios.get(buildApiUrl('get_vod_categories'));
            movies.categories = categories.data;
            fs.writeFileSync('downloads/movies.json', JSON.stringify(movies));
            fs.writeFileSync('downloads/movies_categories.json', JSON.stringify(categories.data));
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
            series = JSON.parse(fs.readFileSync('downloads/series.json', 'utf8'));
            console.log('Series file found, reading from file');
        } else {
            console.log('Series file not found, fetching from TVHeadend');
            const response = await axios.get(buildApiUrl('get_series'));
            series = response.data;
            fs.writeFileSync('downloads/series.json', JSON.stringify(series));
        }

        
        // Transform series data
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

// Serve React app for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
