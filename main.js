import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  downloadContentFromMessage,
} from "@whiskeysockets/baileys";
import { createSticker, StickerTypes } from "wa-sticker-formatter";
import { Boom } from "@hapi/boom";
import pino from "pino";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import axios from "axios";
import os from "os";
import pm2 from "pm2"; // Import PM2
import {
  saveMedia,
  saveVideo,
  instagramDownloader,
  getTiktok,
} from "./lib/index.js";

// Set the path to the ffmpeg binary
const ffmpegPath = "./ffmpeg/bin/ffmpeg.exe";
ffmpeg.setFfmpegPath(ffmpegPath);

// Check if ffmpeg binary exists
if (!fs.existsSync(ffmpegPath)) {
  console.error(`ffmpeg binary not found at path: ${ffmpegPath}`);
  process.exit(1);
} else {
  console.log(`ffmpeg binary found at path: ${ffmpegPath}`);
}

export async function connectToWhatsApp(onMessage) {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    browser: "./chrome-win/chrome.exe",
    keepAliveIntervalMs: 10000,
    printQRInTerminal: true,
    auth: state,
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect.error instanceof Boom &&
        lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;
      console.log(
        "connection closed due to ",
        lastDisconnect.error,
        ", reconnecting ",
        shouldReconnect
      );
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      const owner = "6283841365567@s.whatsapp.net";
      //   console.log("opened connection");
      sock.sendMessage(owner, { text: "Bot berjalan ✅" });
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    // console.log(messages[0]?.message);
    // console.log(messages.message?.imageMessage);

    // console.log(messageInfo);
    let { key, pushName, message } = messages[0];
    let pesan = message?.conversation || message?.extendedTextMessage?.text;
    let id = key.remoteJid;
    let name = pushName;
    const prefix = ".";
    let command, args;
    if (pesan && pesan.startsWith(prefix)) {
      command = pesan
        .trim()
        .replace(prefix, "")
        .split(/\s/)
        .shift()
        .toLowerCase();
      args = pesan.trim().split(/\s/).slice(1);
      if (onMessage) {
        onMessage({ id, name, pesan, command, args });
      }
    }

    if (
      (message?.imageMessage?.caption === `${prefix}s` ||
        message?.imageMessage?.caption === `${prefix}stiker`) &&
      message?.imageMessage
    ) {
      async function getMedia(msg) {
        const messageType = Object.keys(msg.message)[0];
        const stream = await downloadContentFromMessage(
          msg.message[messageType],
          messageType.replace("Message", "")
        );
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
      }
      const mediaData = await getMedia(messages[0]);
      const stickerOption = {
        pack: "6285710069527",
        author: "Sanbot",
        type: StickerTypes.FULL,
        categories: ["😎", "🎉"],
        id: "unique-id",
        quality: 100,
      };
      const sticker = await createSticker(mediaData, stickerOption);

      // Save the sticker to a temporary file
      const stickerPath = "./data/temp/temp_sticker.webp";
      fs.writeFileSync(stickerPath, sticker);

      await sock.sendMessage(messages[0].key.remoteJid, {
        sticker: { url: stickerPath },
      });

      // Clean up the temporary file
      fs.unlinkSync(stickerPath);
    }

    switch (command) {
      case "hi":
        await sock.sendMessage(id, {
          text: `Hello ${name}\n\nsilahkan gunakan ${prefix}menu`,
        });
        // console.log(key.remoteJid);
        break;

      case "restart":
        await sock.sendMessage(id, { text: "Restarting bot..." });
        pm2.restart("sanbot", (err, proc) => {
          if (err) {
            sock.sendMessage(id, { text: "Failed to restart bot." });
            console.error(err);
          } else {
            sock.sendMessage(id, { text: "Bot successfully restarted." });
          }
        });
        break;
      case "uptime":
        const uptime = process.uptime();
        const memUsage = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const uptimeHours = Math.floor(uptime / 3600);
        const uptimeMinutes = Math.floor((uptime % 3600) / 60);
        const uptimeSeconds = Math.floor(uptime % 60);

        const uptimeMessage = `
          Bot Uptime: ${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s
          Total Memory: ${(totalMem / 1024 / 1024).toFixed(2)} MB
          Used Memory: ${(usedMem / 1024 / 1024).toFixed(2)} MB
          Free Memory: ${(freeMem / 1024 / 1024).toFixed(2)} MB
          RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB
          Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB
          Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB
        `;
        await sock.sendMessage(id, { text: uptimeMessage });
        break;

      case "tt":
        {
          try {
            if (args.length === 0) {
              await sock.sendMessage(id, {
                text: `Silahkan buat dengan ${prefix}tt <link tiktok yang ingin di download>`,
              });
              return;
            }
            await sock.sendMessage(id, { text: "Silahkan tunggu..." });
            let url = args[0];
            // let res = await axios.get(
            //   `http://192.168.1.6:3000/tiktok?url=${url}`
            // );
            // let { data } = res.data;
            let data = await getTiktok(url);
            // console.log(data[0].links[0]);
            let { desc, author, author_name, links } = data;
            const item = links.find(
              (item) => item.title === "NO logo [720x1280]"
            );
            if (item) {
              let { title, url } = item;
              let hasil = await saveMedia(url, "video");
              await sock.sendMessage(id, {
                video: { url: hasil },
                caption: `Silahkan Tuan`,
              });
              await sock.sendMessage(id, {
                text: `Username: ${author}\nName: ${author_name}\n\n${desc}`,
              });
            }
          } catch (e) {
            // console.log(e);
            await sock.sendMessage(id, { text: "Terjadi kesalahan" });
          }
        }
        break;
      case "tt2":
        {
          try {
            if (args.length === 0) {
              await sock.sendMessage(id, {
                text: `Silahkan buat dengan ${prefix}tt <link tiktok yang ingin di download>`,
              });
              return;
            }
            await sock.sendMessage(id, { text: "Silahkan tunggu..." });
            let url = args[0];
            let res = await axios.get(
              `https://markas-download.vercel.app/tiktok?url=${url}`
            );
            let { data } = res.data;
            // console.log(data[0].links[0]);
            let { desc, author, author_name, links } = data;
            const item = links.find(
              (item) => item.title === "NO logo [720x1280]"
            );
            if (item) {
              let { title, url } = item;
              let hasil = await saveMedia(url, "video");
              await sock.sendMessage(id, {
                video: { url: hasil },
                caption: `Silahkan Tuan`,
              });
              await sock.sendMessage(id, {
                text: `Username: ${author}\nName: ${author_name}\n\n${desc}`,
              });
            }
          } catch (e) {
            console.log(e);
          }
        }
        break;
      case "snack":
        {
          try {
            if (args.length === 0) {
              await sock.sendMessage(id, {
                text: `Silahkan buat dengan ${prefix}snack <link tiktok yang ingin di download>`,
              });
              return;
            }
            await sock.sendMessage(id, { text: "Silahkan tunggu..." });
            let url = args[0];
            let res = await axios.get(
              `https://markas-download.vercel.app/snack?url=${url}`
            );
            let { data } = res.data;
            // console.log(data[0].links[0]);
            // let hasil = await saveMedia(data.url, "video");
            // console.log(hasil);
            // await sock.sendMessage(id, {
            //   video: { url: hasil },
            //   caption: `Silahkan Tuan`,
            // });
            sock.sendMessage(id, {
              text: `Terjadi kesalahan\n\nSilahkana download manual ${data.url}`,
            });
          } catch (e) {
            console.log(e);
            sock.sendMessage(id, {
              text: `Terjadi kesalahan\n\nSilahkana download manual ${data.url}`,
            });
          }
        }
        break;
      case "ig":
        {
          try {
            if (args.length === 0) {
              await sock.sendMessage(id, {
                text: `Silahkan buat dengan ${prefix}ig <link ig yang ingin di download>`,
              });
              return;
            }
            await sock.sendMessage(id, { text: "Silahkan tunggu..." });
            let url = args[0];
            // let res = await axios.get(
            //   `http://192.168.1.6:3000/instagram?url=${url}`
            // );
            // let { data } = res.data;
            let data = await instagramDownloader(url);
            for (let i = 0; i < data.url.length; i++) {
              let hasil = await saveMedia(data.url[i]);
              // console.log(`ini adalah hasil: ${data.url[i]}`);
              if (hasil.includes("mp4")) {
                await sock.sendMessage(id, {
                  video: { url: hasil },
                  caption: `Silahkan Tuan`,
                });
              } else {
                await sock.sendMessage(id, {
                  image: { url: hasil },
                  caption: `Silahkan Tuan`,
                });
              }
            }
            await sock.sendMessage(id, {
              text: `Username: ${data.username}\nLikes: ${data.like}\nComment: ${data.comment}\n\nCaption: ${data.caption}`,
            });
          } catch (e) {
            console.log(e);
          }
        }
        break;
      case "mkig":
        {
          try {
            if (args.length === 0) {
              await sock.sendMessage(id, {
                text: `Silahkan buat dengan ${prefix}ig <link ig yang ingin di download>`,
              });
              return;
            }
            await sock.sendMessage(id, { text: "Silahkan tunggu..." });
            let url = args[0];
            let data = await instagramDownloader(url);
            // console.log(data);
            // let res = await axios.get(
            //   `http://192.168.1.6:3000/instagram?url=${url}`
            // );
            // let { data } = res.data;
            // console.log(data.url);
            let hasil = await saveVideo(data.url[0]);
            await sock.sendMessage(id, {
              video: { url: hasil },
            });
            if (data.caption === null) {
              data.caption = "";
            }
            await sock.sendMessage(id, {
              text: `${data.caption}\n.\n#ngakak #ngakakparah #ngakakabis #ngakaksehat #ngakakkocak #ngakakbanget #videolucu #video #videomemes #videongakakkocak #lucuabis #lucungakak #lucubanget #lucu #luculucuan #lucubangetkakak #markasbarudak`,
            });
          } catch (e) {
            console.log(e);
            await sock.sendMessage(id, { text: "Terjadi kesalahan" });
          }
        }
        break;
      case "pajak": {
        try {
          if (args.length === 0) {
            await sock.sendMessage(id, {
              text: `Silahkan buat dengan ${prefix}pajak <plat nomor kendaraan>`,
            });
            return;
          }
          await sock.sendMessage(id, { text: "Silahkan tunggu..." });
          let plat = args[0];
          let res = await fetch(
            `https://markas-download.vercel.app/cekpajak?nopol=${plat}`
          ).then((res) => res.json());
          console.log(res.data);
          // return;
          let {
            nopol,
            namapemilik,
            alamat,
            merek,
            tipe,
            jenis,
            norangka_mesin,
            tahun_cc_bbm,
            warna,
            warna_plat,
            tgl_akhir_pkb,
            tgl_akhir_stnk,
            pkb_pokok,
            keterangan,
            pkb_denda,
            swdkllj_pokok,
            swdkllj_denda,
            stnk,
            tnkb,
            pnbp_nopil,
            jumlah,
            tgl_akhir_pkb_yad,
          } = res.data;
          // console.log(res);
          let msg = `*INFO PAJAK BANTEN*\n\n*NO. POLISI:* ${nopol}\n*NAMA PEMILIK:* ${namapemilik}\n*ALAMAT:* ${alamat}\n*MEREK:* ${merek}\n*TIPE:* ${tipe}\n*JENIS:* ${jenis}\n*NO. RANGKA/MESIN:* ${norangka_mesin}\n*TAHUN:* ${tahun_cc_bbm}\n*WARNA:* ${warna}\n*PLAT:* ${warna_plat}\n*TGL. AKHIR STNK yl:* ${tgl_akhir_stnk}\n*TGL. AKHIR PKB yl:* ${tgl_akhir_pkb}\n*KETERANGAN:* ${keterangan}\n*PKB POKOK:* ${pkb_pokok}\n*PKB DENDA:* ${pkb_denda}\n*SWDKLLJ POKOK:* ${swdkllj_pokok}\n*SWDKLLJ DENDA:* ${swdkllj_denda}\n*STNK:* ${stnk}\n*TNKB:* ${tnkb}\n*PNBP NOPIL:* ${pnbp_nopil}\n*JUMLAH:* ${jumlah}\n*TGL. AKHIR PKB yad:* ${tgl_akhir_pkb_yad}`;
          await sock.sendMessage(id, { text: msg });
        } catch (e) {
          await sock.sendMessage(id, { text: "Terjadi kesalahan" });
        }
        break;
      }
      case "confess":
        {
          if (args.length === 0) {
            await sock.sendMessage(id, {
              text: `Silahkan buat dengan ${prefix}confess <pesan yang ingin di kirim>`,
            });
            return;
          }
          let tujuan = args[0];
          let pesan = args.slice(1).join(" ");
          const regex = /^08\d{9,10}$/;
          if (regex.test(tujuan)) {
            tujuan = tujuan.replace(/^08/, "628") + "@s.whatsapp.net";
            console.log(tujuan);
            await sock.sendMessage(tujuan, {
              text: `${pesan}\n\n---Confess---`,
            });
            await sock.sendMessage(id, { text: "Pesan berhasil di kirim" });
          } else {
            console.log(tujuan);
            await sock.sendMessage(id, { text: "Tujuan tidak valid" });
          }
        }
        break;
      case "menu": {
        const menu = `Selamat datang di SANBOT, Hallo ${name}🤗\n\n- ${prefix}tt => Download video tiktok\n- ${prefix}ig => Download video dari instragram\n- ${prefix}uptime => Melihat spesifikasi bot dan uptime`;
        await sock.sendMessage(id, { text: menu });
        break;
      }
    }
  });
}

// run in main file
// connectToWhatsApp();
