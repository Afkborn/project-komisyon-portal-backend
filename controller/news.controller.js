const axios = require("axios");
const Parser = require("rss-parser");
require("dotenv/config");

const PROXY_ENABLED = process.env.PROXY_ENABLED == "true";
const PROXY_URL = process.env.PROXY_URL;
const PROXY_PORT = process.env.PROXY_PORT;
const PROXY_USERNAME = process.env.PROXY_USERNAME;

// RSS Parser yapılandırması
const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "media", { keepArray: true }],
      ["media:thumbnail", "thumbnail"],
      ["description", "description"],
      ["content:encoded", "content"],
      ["category", "categories", { keepArray: true }],
    ],
  },
});

// Helper: Proxy yapılandırmasını oluştur
function getProxyConfig() {
  if (!PROXY_ENABLED) return false;

  return {
    protocol: "http",
    host: PROXY_URL,
    port: parseInt(PROXY_PORT),
    auth: {
      username: PROXY_USERNAME,
      password: process.env.PROXY_PASSWORD,
    },
  };
}

// Helper: URL'nin izin verilen domain'den olup olmadığını kontrol et
function isValidDomain(urlString) {
  const allowedDomains = ["eskisehirekspres.net", "www.eskisehirekspres.net"];
  
  try {
    const urlObj = new URL(urlString);
    const domain = urlObj.hostname;
    return allowedDomains.some((d) => domain === d || domain.endsWith(`.${d}`));
  } catch (error) {
    return false;
  }
}

// Helper: Haber resmini bul
function extractImageUrl(item) {
  // Enclosure'dan resim URL'si almayı dene
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url;
  }

  // Media içeriğinden resim URL'si almayı dene
  if (item.media && item.media.length > 0) {
    const mediaItem = item.media.find(
      (m) =>
        m.$ &&
        m.$.url &&
        (m.$.medium === "image" || m.$.type?.startsWith("image/"))
    );
    if (mediaItem && mediaItem.$.url) {
      return mediaItem.$.url;
    }
  }

  // Thumbnail'den resim URL'si almayı dene
  if (item.thumbnail && item.thumbnail.$ && item.thumbnail.$.url) {
    return item.thumbnail.$.url;
  }

  // İçerikten img tag'i içindeki src özniteliğini bulmayı dene
  if (item.content) {
    const imgMatch = /<img[^>]+src="([^">]+)"/i.exec(item.content);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }
  }

  // Açıklamadan img tag'i içindeki src özniteliğini bulmayı dene
  if (item.description) {
    const imgMatch = /<img[^>]+src="([^">]+)"/i.exec(item.description);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }
  }

  return null;
}

// Helper: Tarihi Türkçe formata dönüştür
function formatDateTR(dateString) {
  const pubDate = new Date(dateString);

  if (isNaN(pubDate.getTime())) {
    return dateString;
  }

  return `${pubDate.getDate()} ${pubDate.toLocaleString("tr-TR", {
    month: "long",
  })} ${pubDate.getFullYear()}, ${pubDate
    .getHours()
    .toString()
    .padStart(2, "0")}:${pubDate
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

// GET /news
// Eskişehir Ekspres'ten haberleri çek
exports.getNews = async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "RSS URL'si gereklidir.",
      });
    }

    // URL güvenlik kontrolü
    if (!isValidDomain(url)) {
      return res.status(403).json({
        success: false,
        error:
          "Güvenlik nedeniyle sadece izin verilen RSS kaynakları kullanılabilir.",
      });
    }

    // RSS içeriğini çek
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      proxy: getProxyConfig(),
    });

    // RSS'i parse et
    const feed = await parser.parseString(response.data);

    // Son 3 aylık zaman aralığını hesapla
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Haberleri işle ve filtrele
    const processedItems = feed.items
      .filter((item) => {
        const pubDate = new Date(item.pubDate);
        return !isNaN(pubDate.getTime()) && pubDate >= threeMonthsAgo;
      })
      .map((item) => {
        const imageUrl = extractImageUrl(item);
        const formattedDate = formatDateTR(item.pubDate);

        return {
          ...item,
          source: feed.title,
          sourceLink: feed.link,
          feedUrl: url,
          enclosure: item.enclosure || (imageUrl ? { url: imageUrl } : null),
          categories: item.categories || [],
          contentSnippet:
            item.contentSnippet ||
            item.description?.replace(/<[^>]*>?/gm, "").substring(0, 150) +
              "...",
          formattedDate: formattedDate,
        };
      });

    // Sonuç döndür
    const filteredResponse = {
      success: true,
      title: feed.title,
      description: feed.description,
      link: feed.link,
      lastBuildDate: feed.lastBuildDate,
      items: processedItems,
      filtering: {
        applied: true,
        start: threeMonthsAgo.toISOString(),
        end: new Date().toISOString(),
        originalCount: feed.items.length,
        filteredCount: processedItems.length,
      },
    };

    res.json(filteredResponse);
  } catch (error) {
    console.error("RSS isteği sırasında hata oluştu:", error);
    res.status(500).json({
      success: false,
      error: "RSS verileri alınamadı",
      message: error.message,
    });
  }
};
