import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import axios from "axios";

// Set the path to the ffmpeg binary
const ffmpegPath = "./ffmpeg/bin/ffmpeg.exe"; // Replace with the actual path to ffmpeg.exe
ffmpeg.setFfmpegPath(ffmpegPath);

// Check if ffmpeg binary exists
if (!fs.existsSync(ffmpegPath)) {
  console.error(`ffmpeg binary not found at path: ${ffmpegPath}`);
  process.exit(1);
}
async function editVideoWatermark(text) {
  const videoPath = "./bahan/1.mp4";
  const outputPath = "./bahan/output.mp4";
  const watermarkPath = "./bahan/watermark.png";
  const background = "./bahan/background.mp4";
  const font = "./bahan/anteroly.ttf";

  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .output(outputPath)
      .complexFilter([
        `drawtext=text='${text}':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=60:fontcolor=white@0.30:fontfile=${font}`,
      ])
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

export async function saveVideo(url) {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data, "binary");
    const bahanDir = "./lib/markas/bahan";
    const videoPath = `${bahanDir}/${fs.readdirSync(bahanDir).length + 1}.mp4`;
    fs.writeFileSync(videoPath, buffer);
    return editvideoBackground(videoPath);
  } catch (e) {
    console.log(e);
  }
}

async function editvideoBackground(bahanpath) {
  const backgroundsDir = "./lib/markas/backgrounds/";
  const tempDir = "./lib/markas/temp/";
  const font = "./lib/markas/fonts/anteroly.ttf";
  const randomBg =
    Math.floor(Math.random() * fs.readdirSync(backgroundsDir).length) + 1;
  const background = `${backgroundsDir}${randomBg}.mp4`;
  const outputPath = `${tempDir}${fs.readdirSync(tempDir).length + 1}.mp4`;

  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(background)
      .inputOptions("-stream_loop", "-1") // Loop the background video indefinitely
      .input(bahanpath)
      .complexFilter([
        `[0:v] setpts=N/FRAME_RATE/TB, scale=720:1280 [bg]`, // Keep the background video size and add text
        `[1:v] scale=576:1024:force_original_aspect_ratio=decrease [scaledVideo]`, // Scale overlay to 50% of its original size and add text
        `[bg][scaledVideo] overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2 [outv]`, // Overlay scaled video in the center
        `[1:a] anull [outa]`,
        `[outv] drawtext=text='@markasbarudak':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=60:fontcolor=white@0.30:fontfile=${font} [timpahTeks]`, // Add text overlay
      ])
      .map("[timpahTeks]") // Map the video stream with text overlay
      .map("[outa]") // Map the audio stream
      .outputOptions([
        "-c:v libx264", // Use libx264 for video encoding
        "-shortest", // Ensure the output is the shortest of the inputs
      ])
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  return outputPath;
}

// Uncomment to test the functions
// editvideoBackground("@markasbarudak");
// console.log(
//   await saveVideo(
//     "https://instagram.fcgk33-1.fna.fbcdn.net/o1/v/t16/f2/m69/An8s18wmAJWoqmXu8aSdI5j3bs5S6bkiHQ8noOLpOIkCZ_xaXlarrxKmfK_BJiMNliM0hg0O5ZJMPkU7vNgAtt_3.mp4?efg=eyJxZV9ncm91cHMiOiJbXCJpZ193ZWJfZGVsaXZlcnlfdnRzX290ZlwiXSIsInZlbmNvZGVfdGFnIjoidnRzX3ZvZF91cmxnZW4uY2xpcHMuYzIuMTA3OC5iYXNlbGluZSJ9&_nc_cat=106&vs=1966981380439420_3912256141&_nc_vs=HBksFQIYOnBhc3N0aHJvdWdoX2V2ZXJzdG9yZS9HS0tTTlFkU09xQWRjQVlEQUlCenJsOHNLNjBNYnBSMUFBQUYVAALIAQAVAhg6cGFzc3Rocm91Z2hfZXZlcnN0b3JlL0dMbzBHeHVkRUJEZHdrMEZBRmRXTWQ4Q2pIeE9icV9FQUFBRhUCAsgBACgAGAAbABUAACbY99zwy7TBPxUCKAJDMywXQDcAAAAAAAAYFmRhc2hfYmFzZWxpbmVfMTA4MHBfdjERAHX%2BBwA%3D&_nc_rid=0d9189ddc7&ccb=9-4&oh=00_AYDSN9a-zShSazqmQUuJcWfIIOPgB2wLWFLM6Ec9-Sv2bw&oe=66CB006F&_nc_sid=10d13b"
//   )
// );
// editVideoWatermark();
