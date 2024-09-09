import * as cheerio from "cheerio";
import axios from "axios";

export async function getTiktok(url) {
  try {
    if (url.includes("photo")) {
      const regex = /https:\/\/www\.tiktok\.com\/@[^\/]+\/photo\/(\d+)/;

      const match = url.match(regex);
      if (match) {
        url = `https://www.tiktok.com/@/video/${match[1]}`;
      }
    }
    console.log(url);
    let payload = new URLSearchParams();
    payload.append("query", url);
    const cookies =
      "cf_clearance=FdnQI9qnWamHU6kn4K9Eu4c8g3MmIsGtVUwVCOt9xjM-1723880989-1.2.1.1-2lx6lpGM14NIURXkFXllRe7FOa81jTMrTAOF5KpIuUNlJSITwHZ2cWlXfelMfBJDK3ryQtAQVuT0bJPZPIVh_c39NTtcoSJ2JQhQ2i_wjl0r1.KTz50IuP_fld5VX1u3f4xcL6ccFyxpyFddMd.151_ROTtF5LkFCVkuN4AkwgKjz8i.VQTybBmUBe0gn1h_cQ1eG9SEPSnztzRv7hwKaY7FAmUVhDYRt3MAnV1WuAGbi.X7eIDWGT.hXuKuBa0tz0WO_ydwQTX3StZgtYAchTa_gSFbu16J9QofpI2ctYbNtptvPuJ8MzlRofgw8xzmni7iuazHBpWlKnxM_D0Q33TahSBGzjbANBtwOdFGiKoMkWBKi0nvETAZvO6NMyJxFQ34jlBTM8uPztYkWs34lDCf81_aOz7tW68WAgrym0SXMkrDKovsCIWmj1aEafdW";

    const response = await axios.post(
      "https://lovetik.com/api/ajax/search",
      payload.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          cookie: cookies,
        },
      }
    );
    let filterlink = [];
    let { cover, desc, author, author_name, author_a, links } = response.data;
    links.map((item) => {
      let { s, a } = item;
      filterlink.push({ title: s, url: a });
    });
    let result = {
      cover,
      desc,
      author,
      author_name,
      author_a,
      links: filterlink,
    };
    return result;
  } catch (error) {
    return null;
  }
}
