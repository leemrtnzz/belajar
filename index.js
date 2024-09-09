import cfonts from "cfonts";
import { connectToWhatsApp } from "./main.js";
import chalk from "chalk";

let { say } = cfonts;
say("SANBOT", {
  align: "center",
  gradient: ["red", "green"],
});
say("WhatsApp bot v1.2 by Muhammad Ichsan Haekal", {
  font: "console",
  align: "center",
  gradient: ["blue", "green"],
});

(async () => {
  console.log(chalk.yellow(`[SANBOT]`));
  console.log(chalk.green(`[DEV] => BOT Started! ✅`));

  await connectToWhatsApp(({ id, name, pesan, command }) => {
    // id = id.match(/\d+/g).join(""); // Remove replace operations
    name = name || "[anon]"; // Ganti dengan [anon] jika name null
    console.log(
      chalk.green(
        `[~>>] =>`,
        chalk.red(`${name}`),
        chalk.magenta(`(${id})`),
        chalk.green(`: ${pesan}`)
      )
    );
  });
})();
