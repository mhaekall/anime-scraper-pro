const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('index_oploverz.html', 'utf8');
const $ = cheerio.load(html);
const items = [];

$('a[href*="/episode/"]').each((i, el) => {
    const imgEl = $(el).find('img');
    const img = imgEl.attr('src');
    // Grab title from alt attribute of the image, it's usually the best place
    let title = imgEl.attr('alt') || $(el).attr('title');
    
    if (!title) {
        // Try looking at parent elements or nearby text
        title = $(el).find('.line-clamp-2').text().trim() || $(el).attr('href').split('/')[2].replace(/-/g, ' ');
    }

    if (img && img.includes('poster')) {
        items.push({title, url: $(el).attr('href'), img});
    }
});

console.log(items.slice(0, 5));