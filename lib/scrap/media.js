import axios from "axios";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

export async function saveMedia(url, type = null) {
  try {
    if (!url) {
      throw new Error("URL is undefined or null");
    }

    if (url.includes("mp4") || type === "video") {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 10000,
      });
      const buffer = Buffer.from(response.data, "binary");
      const downloadDir = "./data/temp/videos";
      const videoPath = `${downloadDir}/${
        fs.readdirSync(downloadDir).length + 1
      }.mp4`;
      fs.writeFileSync(videoPath, buffer);
      return videoPath;
    } else {
      const response = await axios.get(url, { responseType: "arraybuffer" });
      const buffer = Buffer.from(response.data, "binary");
      const downloadDir = "./data/temp/images";
      const photoPath = `${downloadDir}/${
        fs.readdirSync(downloadDir).length + 1
      }.jpg`;
      fs.writeFileSync(photoPath, buffer);
      return photoPath;
    }
  } catch (e) {
    console.log(e);
  }
}
