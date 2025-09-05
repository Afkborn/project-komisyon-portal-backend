const express = require("express");
const router = express.Router();
const axios = require("axios");
const Parser = require("rss-parser");

// RSS Parser
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

// PROXY

require("dotenv/config");
const PROXY_ENABLED = process.env.PROXY_ENABLED == "true";
const PROXY_URL = process.env.PROXY_URL;
const PROXY_PORT = process.env.PROXY_PORT;
const PROXY_USERNAME = process.env.PROXY_USERNAME;

router.get("/", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: "RSS URL'si gereklidir." });
    }

    // URL güvenlik kontrolü
    const allowedDomains = ["eskisehirekspres.net", "www.eskisehirekspres.net"];

    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    if (!allowedDomains.some((d) => domain === d || domain.endsWith(`.${d}`))) {
      return res.status(403).json({
        error:
          "Güvenlik nedeniyle sadece izin verilen RSS kaynakları kullanılabilir.",
      });
    }

    let proxy = null;
    // İsteği proxy üzerinden yap
    if (PROXY_ENABLED) {
      proxy = {
        protocol: "http",
        host: PROXY_URL,
        port: parseInt(PROXY_PORT),
        auth: {
          username: PROXY_USERNAME,
          password: process.env.PROXY_PASSWORD,
        },
      };
    }

    // console.log("proxy config:", PROXY_ENABLED ? proxy : "No Proxy");
    // console.log("proxy pass env:", process.env.PROXY_PASSWORD ? "SET" : "NOT SET");
    // RSS içeriğini doğrudan çek
    const response = await axios.get(url, {
      timeout: 10000, // 10 saniye timeout 
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      proxy: PROXY_ENABLED ? proxy : false,
    });

    // RSS'i parse et
    const feed = await parser.parseString(response.data);

    // Son 3 aylık zaman aralığını hesapla
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Haberleri işle, ekstra bilgileri ekle ve son 3 aya ait olanları filtrele
    const processedItems = feed.items
      .filter((item) => {
        // Haber tarihini kontrol et
        const pubDate = new Date(item.pubDate);
        // Geçerli bir tarih ise ve son 3 ayın içindeyse kabul et
        return !isNaN(pubDate.getTime()) && pubDate >= threeMonthsAgo;
      })
      .map((item) => {
        // Haber için resim URL'si bul
        let imageUrl = null;

        // Enclosure'dan resim URL'si almayı dene
        if (item.enclosure && item.enclosure.url) {
          imageUrl = item.enclosure.url;
        }
        // Media içeriğinden resim URL'si almayı dene
        else if (item.media && item.media.length > 0) {
          const mediaItem = item.media.find(
            (m) =>
              m.$ &&
              m.$.url &&
              (m.$.medium === "image" || m.$.type?.startsWith("image/"))
          );
          if (mediaItem && mediaItem.$.url) {
            imageUrl = mediaItem.$.url;
          }
        }
        // Thumbnail'den resim URL'si almayı dene
        else if (item.thumbnail && item.thumbnail.$ && item.thumbnail.$.url) {
          imageUrl = item.thumbnail.$.url;
        }
        // İçerikten img tag'i içindeki src özniteliğini bulmayı dene
        else if (item.content) {
          const imgMatch = /<img[^>]+src="([^">]+)"/i.exec(item.content);
          if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
          }
        }
        // Açıklamadan img tag'i içindeki src özniteliğini bulmayı dene
        else if (item.description) {
          const imgMatch = /<img[^>]+src="([^">]+)"/i.exec(item.description);
          if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
          }
        }

        // Haber tarihini formatlı olarak ekle
        const pubDate = new Date(item.pubDate);
        const formattedDate = !isNaN(pubDate.getTime())
          ? `${pubDate.getDate()} ${pubDate.toLocaleString("tr-TR", {
              month: "long",
            })} ${pubDate.getFullYear()}, ${pubDate
              .getHours()
              .toString()
              .padStart(2, "0")}:${pubDate
              .getMinutes()
              .toString()
              .padStart(2, "0")}`
          : item.pubDate;

        // Özel alanlar eklenmiş işlenmiş haber öğesini döndür
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

    // Filtreleme yapıldığıyla ilgili bilgi ekle
    const filteredResponse = {
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

    // İşlenmiş feed'i döndür
    res.json(filteredResponse);
  } catch (error) {
    console.error("RSS isteği sırasında hata oluştu:", error);
    res.status(500).json({
      error: "RSS verileri alınamadı",
      message: error.message,
    });
  }
});

module.exports = router;
