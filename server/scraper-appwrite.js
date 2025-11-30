// server/scraper-appwrite.js
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const { Client, Databases, ID } = require('node-appwrite');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Appwrite Configuration
const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || 'swl')
  .setKey(process.env.APPWRITE_API_KEY || 'YOUR_API_KEY'); // API Key för server-side

const databases = new Databases(client);

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'wishlist-db';
const PRODUCTS_COLLECTION_ID = process.env.APPWRITE_PRODUCTS_COLLECTION_ID || 'wishlist_table';

// Scraping endpoint med Appwrite-integration
app.post('/api/scrape-and-add', async (req, res) => {
  const { url, quantity = 1 } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL krävs' });
  }
  
  try {
    console.log('🔍 Scrapar URL:', url);
    
    // 1. Scrapa produktdata
    const scrapedData = await scrapeProduct(url);
    
    // 2. Spara till Appwrite
    console.log('💾 Sparar till Appwrite...');
    const document = await databases.createDocument(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      ID.unique(),
      {
        url: scrapedData.url,
        title: scrapedData.title,
        image: scrapedData.image,
        price: scrapedData.price,
        description: scrapedData.description || '',
        quantity: parseInt(quantity) || 1,
        claimed: false,
        claimedBy: null
      }
    );
    
    console.log('✅ Produkt sparad med ID:', document.$id);
    
    res.json({
      success: true,
      product: document,
      scrapedData: scrapedData
    });
    
  } catch (error) {
    console.error('❌ Fel vid scraping/sparning:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Enkel scraping endpoint (utan Appwrite)
app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL krävs' });
  }
  
  try {
    const scrapedData = await scrapeProduct(url);
    res.json(scrapedData);
  } catch (error) {
    console.error('Scraping fel:', error.message);
    res.status(500).json({
      error: error.message,
      fallback: {
        title: 'Kunde inte hämta produkttitel',
        image: 'https://via.placeholder.com/400x400?text=Bild+saknas',
        price: 'Se länk för pris',
        url: url
      }
    });
  }
});

// Scraping-funktion
async function scrapeProduct(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8'
      },
      timeout: 15000,
      maxRedirects: 5
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Hjälpfunktion för meta tags
    const getMetaContent = (property) => {
      return $(`meta[property="${property}"]`).attr('content') || 
             $(`meta[name="${property}"]`).attr('content') || 
             null;
    };
    
    // Extrahera titel
    let title = getMetaContent('og:title') || 
                getMetaContent('twitter:title') || 
                $('h1').first().text() ||
                $('title').text() ||
                'Produkttitel';
    
    // Extrahera bild
    let image = getMetaContent('og:image') || 
                getMetaContent('twitter:image') ||
                $('img[itemprop="image"]').first().attr('src') ||
                $('img').first().attr('src') ||
                'https://via.placeholder.com/400x400';
    
    // Fixa relativa URLs för bilder
    if (image && !image.startsWith('http')) {
      const urlObj = new URL(url);
      image = new URL(image, urlObj.origin).href;
    }
    
    // Extrahera beskrivning
    let description = getMetaContent('og:description') || 
                     getMetaContent('description') ||
                     $('p').first().text() ||
                     '';
    
    // Extrahera pris - flera strategier
    let price = 'Se länk för pris';
    
    // Strategi 1: Schema.org JSON-LD
    let jsonLdPrice = null;
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const data = JSON.parse($(elem).html());
        if (data.offers && data.offers.price) {
          const priceValue = data.offers.price;
          const currency = data.offers.priceCurrency || 'SEK';
          jsonLdPrice = `${priceValue} ${currency}`;
        } else if (data['@graph']) {
          // Ibland är data i @graph
          const product = data['@graph'].find(item => item['@type'] === 'Product');
          if (product && product.offers && product.offers.price) {
            jsonLdPrice = `${product.offers.price} ${product.offers.priceCurrency || 'SEK'}`;
          }
        }
      } catch (e) {}
    });
    
    // Strategi 2: Itemprop
    const itemPropPrice = $('[itemprop="price"]').first().text() || 
                         $('[itemprop="price"]').first().attr('content');
    
    // Strategi 3: Vanliga CSS-klasser
    const classPrice = $('.price').first().text() || 
                      $('[class*="price" i]').first().text() ||
                      $('[class*="Price"]').first().text() ||
                      $('#price').text();
    
    // Strategi 4: Meta tags
    const metaPrice = getMetaContent('product:price:amount');
    const metaCurrency = getMetaContent('product:price:currency') || 'SEK';
    
    // Välj bästa pris
    if (jsonLdPrice) {
      price = jsonLdPrice;
    } else if (itemPropPrice) {
      price = itemPropPrice;
    } else if (metaPrice) {
      price = `${metaPrice} ${metaCurrency}`;
    } else if (classPrice) {
      price = classPrice;
    }
    
    // Site-specific scraping
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('webhallen.com')) {
      title = $('h1.product-name').text() || $('h1').first().text() || title;
      price = $('.product-price-now').text() || $('.product-price').text() || price;
      image = $('.product-image img').first().attr('src') || image;
    } 
    else if (urlLower.includes('inet.se')) {
      title = $('h1[data-testid="product-name"]').text() || $('h1').first().text() || title;
      price = $('[data-testid="product-price"]').text() || $('.price').first().text() || price;
    } 
    else if (urlLower.includes('komplett.se')) {
      title = $('h1.product-title').text() || $('h1').first().text() || title;
      price = $('.product-price-now').text() || price;
    }
    else if (urlLower.includes('elgiganten.se')) {
      title = $('h1.product-title').text() || $('h1').first().text() || title;
      price = $('.price').first().text() || price;
    }
    else if (urlLower.includes('amazon.')) {
      title = $('#productTitle').text() || title;
      price = $('#priceblock_ourprice').text() || 
              $('.a-price .a-offscreen').first().text() || 
              price;
    }
    
    // Rensa och returnera
    return {
      url: url,
      title: cleanText(title, 200),
      image: image,
      price: cleanPrice(price),
      description: cleanText(description, 300)
    };
    
  } catch (error) {
    console.error('Scraping error:', error.message);
    throw error;
  }
}

// Kategorisering baserad på produktdata
function categorizeProduct(title, description, url) {
  const text = `${title} ${description} ${url}`.toLowerCase();
  
  // Kategorier med keywords
  const categories = {
    'Elektronik': [
      'dator', 'laptop', 'pc', 'skärm', 'monitor', 'tangentbord', 'keyboard', 
      'mus', 'mouse', 'headset', 'hörlurar', 'gpu', 'grafikkort', 'processor',
      'cpu', 'ram', 'ssd', 'hdd', 'router', 'modem', 'usb', 'hdmi', 'kabel',
      'webcam', 'mikrofon', 'högtalare', 'speaker', 'bluetooth', 'wifi'
    ],
    'Mobiltelefoner & Surfplattor': [
      'iphone', 'samsung', 'galaxy', 'smartphone', 'mobil', 'telefon', 
      'ipad', 'surfplatta', 'tablet', 'android', 'ios', 'xiaomi', 'oneplus',
      'skal', 'skärmskydd', 'laddare', 'powerbank', 'airpods', 'earbuds'
    ],
    'Gaming': [
      'playstation', 'ps5', 'ps4', 'xbox', 'nintendo', 'switch', 'steam',
      'controller', 'handkontroll', 'gaming', 'gamer', 'spel', 'game',
      'headset', 'mus', 'keyboard', 'stol', 'gamingstol', 'vr', 'oculus'
    ],
    'Hem & Hushåll': [
      'stekpanna', 'kastrull', 'köksredskap', 'mixer', 'blender', 'köksbord',
      'stol', 'soffa', 'säng', 'gardin', 'matta', 'lampa', 'belysning',
      'städ', 'dammsugare', 'tvättmaskin', 'torktumlare', 'diskmaskin',
      'kyl', 'frys', 'micro', 'ugn', 'kaffebryggare', 'vattenkokare'
    ],
    'Smart Hem': [
      'google home', 'alexa', 'smart', 'wifi', 'app', 'fjärrkontroll',
      'philips hue', 'glödlampa led', 'sensor', 'termostat', 'kamera',
      'larm', 'dörrklocka', 'nest', 'smarta', 'automation', 'iot'
    ],
    'TV & Ljud': [
      'tv', 'television', 'soundbar', 'receiver', 'förstärkare', 'amplifier',
      'högtalare', 'subwoofer', 'streaming', 'chromecast', 'apple tv',
      'roku', 'hdmi', 'bluray', 'dvd', 'projektor', 'screen'
    ],
    'Kamera & Foto': [
      'kamera', 'camera', 'canon', 'nikon', 'sony alpha', 'objektiv', 'lens',
      'stativ', 'tripod', 'blixt', 'flash', 'gopro', 'actionkamera',
      'dslr', 'mirrorless', 'fotoutrustning', 'filter', 'minneskort'
    ],
    'Sport & Fritid': [
      'cykel', 'löpning', 'gym', 'fitness', 'träning', 'yoga', 'matta',
      'hantlar', 'vikter', 'springskor', 'sportklocka', 'garmin', 'polar',
      'tält', 'sovsäck', 'vandring', 'fiske', 'skidor', 'snowboard'
    ],
    'Kläder & Mode': [
      'tröja', 'skjorta', 'byxor', 'jeans', 'jacka', 'skor', 'sneakers',
      'klänning', 'väska', 'ryggsäck', 'klocka', 'smycke', 'ring',
      'halsband', 'örhängen', 'solglasögon', 'keps', 'mössa', 'halsduk'
    ],
    'Böcker & Media': [
      'bok', 'book', 'roman', 'kokbok', 'lärobok', 'pocket', 'häftad',
      'inbunden', 'e-bok', 'ljudbok', 'tidning', 'magasin', 'serie',
      'manga', 'comic', 'vinyl', 'cd', 'dvd', 'bluray'
    ],
    'Leksaker & Spel': [
      'leksak', 'lego', 'playmobil', 'docka', 'bil', 'tåg', 'pussel',
      'brädspel', 'sällskapsspel', 'kortspel', 'barn', 'baby', 'bebis',
      'nalle', 'gosedjur', 'figur', 'modell', 'hobby'
    ],
    'Trädgård & Utomhus': [
      'gräsklippare', 'trimmer', 'trädgård', 'kruka', 'växt', 'frö',
      'grill', 'grillkol', 'utemöbel', 'parasoll', 'trampolin',
      'pool', 'pump', 'slang', 'spade', 'redskap', 'verktyg'
    ],
    'Verktyg & Bygg': [
      'borrmaskin', 'skruvdragare', 'såg', 'hammare', 'tång', 'mejsel',
      'verktyg', 'toolbox', 'bosch', 'makita', 'dewalt', 'milwaukee',
      'batteri', 'laddare', 'bits', 'borr', 'slipmaskin', 'vinkelslip'
    ],
    'Bil & Motor': [
      'biltvättat', 'lackskydd', 'motorolja', 'filter', 'däck', 'fälg',
      'däcktryck', 'spolarvätska', 'polish', 'schampo', 'däckhotell',
      'takbox', 'cykelhållare', 'dashcam', 'gps', 'parkeringskamera'
    ],
    'Musikinstrument': [
      'gitarr', 'piano', 'keyboard', 'synth', 'trummor', 'drums', 'bas',
      'fiol', 'trumpet', 'saxofon', 'mikrofon', 'förstärkare', 'amp',
      'pedal', 'effekt', 'strängar', 'plektrum', 'ställ', 'stativ', 'mixer'
    ],
    'Konst & Inredning': [
      'tavla', 'poster', 'print', 'konst', 'affisch', 'canvas', 'ram',
      'målning', 'foto', 'bild', 'väggdekoration', 'konstnär', 'galleri',
      'litografi', 'tryck', 'grafik', 'design', 'inredning', 'dekoration',
      'vase', 'skulptur', 'prydnad', 'väggprydnad'
    ]
  };
  
  // Hitta matchande kategori
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }
  
  // Fallback baserat på URL
  if (text.includes('webhallen.com') || text.includes('inet.se') || text.includes('komplett.se')) {
    return 'Elektronik';
  }
  if (text.includes('amazon')) {
    return 'Övrigt';
  }
  
  return 'Övrigt';
}

// Hjälpfunktioner
const cleanText = (text, maxLength = 150) => {
  if (!text) return '';
  // Konvertera till sträng om det inte redan är det
  text = String(text);
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .substring(0, maxLength);
};

const cleanPrice = (price) => {
  if (!price) return 'Se länk för pris';
  
  // Konvertera till sträng om det inte redan är det
  price = String(price);
  
  // Ta bort extra whitespace
  price = price.trim().replace(/\s+/g, ' ');
  
  // Ta bort "från" prefix
  if (price.toLowerCase().includes('från')) {
    price = price.split('från')[1].trim();
  }
  
  // Lägg till kr om det saknas
  if (/^\d+[,.]?\d*$/.test(price.replace(/\s/g, ''))) {
    price = price + ' kr';
  }
  
  return price;
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Scraper server is running',
    project: 'SimpleWishList',
    appwrite: {
      endpoint: process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1',
      project: process.env.APPWRITE_PROJECT_ID || 'swl',
      configured: !!process.env.APPWRITE_API_KEY
    }
  });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║  🎁 SimpleWishList - Scraper Server          ║
╠═══════════════════════════════════════════════╣
║  📡 Server: http://localhost:${PORT}          ║
║  🔍 Scrape: POST /api/scrape                 ║
║  💾 Scrape + Save: POST /api/scrape-and-add  ║
║  ❤️  Health: GET /health                      ║
║  ☁️  Appwrite: https://fra.cloud.appwrite.io ║
║  📦 Project: swl                              ║
╚═══════════════════════════════════════════════╝
  `);
});