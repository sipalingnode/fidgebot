const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

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
[ACC${i + 1}] PCEDO  : ${Number(user.pcedo_earned || 0)}
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
        (Math.random() * 1 + 2)
        .toFixed(2)
      );

    const points =
      Number(
        (energy * 1.5)
        .toFixed(2)
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

async function autoConvert(
  token,
  points,
  index
) {

  let currentPoints =
    Number(points || 0);

  let currentGems = 0;

  while (currentPoints >= 10000) {

    try {

      const res = await axios.post(
        `${BASE_URL}/api/profile/convert-points`,
        {
          points: 10000
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

      currentPoints =
        Number(
          res.data.points || 0
        );

      currentGems =
        Number(
          res.data.gems || 0
        );

      console.log(
`[ACC${index}] CONVERT POINT => GEMS
[ACC${index}] GEMS: ${currentGems}`
      );

      await sendTelegram(
`[ACC${index}] CONVERT POINT => GEMS
[ACC${index}] GEMS: ${currentGems}`
      );

      await delay(3000);

    } catch (err) {

      console.log(
        `[ACC${index}] CONVERT FAILED`
      );

      console.log(
        err.response?.data || err.message
      );

      await sendTelegram(
        `[ACC${index}] CONVERT FAILED`
      );

      break;
    }
  }

  return {
    points: currentPoints,
    gems: currentGems
  };
}

async function spinWheel(token) {

  try {

    const res = await axios.post(
      `${BASE_URL}/api/wheel/spin`,
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
      "[WHEEL ERROR]",
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

    console.log(
      `[ACC${index}] BOT STARTED`
    );

    await sendTelegram(
      `[ACC${index}] BOT STARTED`
    );

    let lastReport = Date.now();

    let adsCooldownUntil = 0;

    while (true) {

      if (!botRunning) {

        await delay(10000);

        continue;
      }

      let profile;

      try {

        const profileRes =
          await axios.get(
            `${BASE_URL}/api/profile`,
            {
              headers: {
                "x-auth-token":
                  token,
                Accept:
                  "application/json",
                "User-Agent":
                  "Mozilla/5.0"
              }
            }
          );

        profile =
          profileRes.data.user;

      } catch (err) {

        console.log(
          `[ACC${index}] PROFILE FAILED`
        );

        await sendTelegram(
          `[ACC${index}] PROFILE FAILED`
        );

        break;
      }

      const currentEnergy =
        Number(
          profile.energy || 0
        );

      if (currentEnergy > 0.1) {

        console.log(
          `[ACC${index}] AUTO SPINNER STARTED`
        );

        await sendTelegram(
          `[ACC${index}] AUTO SPINNER STARTED`
        );

        while (true) {

          const result =
            await sync(token);

          if (!result) {

            console.log(
              `[ACC${index}] SPINNER FAILED`
            );

            await sendTelegram(
              `[ACC${index}] SPINNER FAILED`
            );

            break;
          }

          console.log(
            `[ACC${index}] POINTS ${result.points.toFixed(1)} | ENERGY ${result.energy.toFixed(2)}`
          );

          if (result.points >= 10000) {

            const convert =
              await autoConvert(
                token,
                result.points,
                index
              );

            result.points =
              convert.points;
          }

          if (
            Date.now() -
              lastReport >=
            5 * 60 * 1000
          ) {

            const report =
`[ACC${index}] POINTS : ${result.points.toFixed(1)}
[ACC${index}] ENERGY : ${result.energy.toFixed(2)}`;

            console.log(report);

            await sendTelegram(
              report
            );

            lastReport =
              Date.now();
          }

          if (
            result.energy <= 0.1
          ) {

            console.log(
              `[ACC${index}] ENERGY EMPTY`
            );

            await sendTelegram(
              `[ACC${index}] ENERGY EMPTY`
            );

            break;
          }

          const randomDelay =
            Math.floor(
              Math.random() * 2000
            ) + 4000;

          await delay(
            randomDelay
          );
        }
      }

      if (
        Date.now() >=
        adsCooldownUntil
      ) {

        console.log(
          `[ACC${index}] ENERGY EMPTY`
        );

        await sendTelegram(
          `[ACC${index}] ENERGY EMPTY`
        );

        while (true) {

          console.log(
            `[ACC${index}] WATCHING ADS`
          );

          await sendTelegram(
            `[ACC${index}] WATCHING ADS`
          );

          await delay(17000);

          const ads =
            await watchAd(token);

          if (ads.success) {

            console.log(
              `[ACC${index}] WATCH ADS SUCCESS`
            );

            await sendTelegram(
              `[ACC${index}] WATCH ADS SUCCESS`
            );

            await delay(3000);

            continue;
          }

          const cooldown =
            ads.error
              ?.cooldown_seconds ||
            7200;

          adsCooldownUntil =
            Date.now() +
            cooldown * 1000;

          const minutes =
            Math.ceil(
              cooldown / 60
            );

          console.log(
            `[ACC${index}] ADS COOLDOWN ${minutes} MINUTES`
          );

          await sendTelegram(
            `[ACC${index}] ADS COOLDOWN ${minutes} MINUTES`
          );

          break;
        }

        const adsProfile =
          await axios.get(
            `${BASE_URL}/api/profile`,
            {
              headers: {
                "x-auth-token":
                  token,
                Accept:
                  "application/json",
                "User-Agent":
                  "Mozilla/5.0"
              }
            }
          );

        const adsEnergy =
          Number(
            adsProfile.data.user
              .energy || 0
          );

        if (adsEnergy > 0.1) {

          console.log(
            `[ACC${index}] ENERGY REFILLED`
          );

          await sendTelegram(
            `[ACC${index}] ENERGY REFILLED`
          );

          continue;
        }
      }

      console.log(
        `[ACC${index}] AUTO WHEEL STARTED`
      );

      await sendTelegram(
        `[ACC${index}] AUTO WHEEL STARTED`
      );

      const wheelProfile =
        await axios.get(
          `${BASE_URL}/api/profile`,
          {
            headers: {
              "x-auth-token":
                token,
              Accept:
                "application/json",
              "User-Agent":
                "Mozilla/5.0"
            }
          }
        );

      let currentPoints =
        Number(
          wheelProfile.data.user
            .points || 0
        );

      let currentGems =
        Number(
          wheelProfile.data.user
            .gems || 0
        );

      if (
        currentPoints >= 10000
      ) {

        const convert =
          await autoConvert(
            token,
            currentPoints,
            index
          );

        currentPoints =
          convert.points;

        currentGems =
          convert.gems;
      }

      while (currentGems >= 2) {

        const spin =
          await spinWheel(token);

        if (!spin.success) {

          console.log(
            `[ACC${index}] WHEEL FAILED`
          );

          await sendTelegram(
            `[ACC${index}] WHEEL FAILED`
          );

          break;
        }

        const spinResult =
          spin.data.result;

        const spinUser =
          spin.data.user;

        const prize =
          spinResult.prize;

        currentPoints =
          Number(
            spinUser.points || 0
          );

        currentGems =
          Number(
            spinUser.gems || 0
          );

        let telegramMessage = "";

        if (
          prize.type ===
          "points"
        ) {

          telegramMessage =
`[ACC${index}] WHEEL SUCCESS
[ACC${index}] REWARD: ${prize.value} POINTS
[ACC${index}] TOTAL POINTS: ${Number(spinUser.points).toFixed(1)}`;

        } else if (
          prize.type ===
          "gems"
        ) {

          telegramMessage =
`[ACC${index}] WHEEL SUCCESS
[ACC${index}] REWARD: ${prize.value} GEMS
[ACC${index}] TOTAL GEMS: ${spinUser.gems}`;

        } else if (
          prize.type ===
          "pcedo"
        ) {

          telegramMessage =
`[ACC${index}] WHEEL SUCCESS
[ACC${index}] REWARD: ${prize.value} PCEDO
[ACC${index}] TOTAL PCEDO: ${spinUser.pcedo_earned}`;
        }

        console.log(
          telegramMessage
        );

        await sendTelegram(
          telegramMessage
        );

        if (
          currentPoints >= 10000
        ) {

          const convert =
            await autoConvert(
              token,
              currentPoints,
              index
            );

          currentPoints =
            convert.points;

          currentGems =
            convert.gems;
        }

        await delay(7000);
      }

      console.log(
        `[ACC${index}] GEMS EMPTY`
      );

      await sendTelegram(
        `[ACC${index}] GEMS EMPTY`
      );

      console.log(
        `[ACC${index}] WAITING ADS COOLDOWN / UTC RESET`
      );

      await sendTelegram(
        `[ACC${index}] WAITING ADS COOLDOWN / UTC RESET`
      );

      while (true) {

        const profileCheck =
          await axios.get(
            `${BASE_URL}/api/profile`,
            {
              headers: {
                "x-auth-token":
                  token,
                Accept:
                  "application/json",
                "User-Agent":
                  "Mozilla/5.0"
              }
            }
          );

        const energy =
          Number(
            profileCheck.data.user
              .energy || 0
          );

        if (energy > 0.1) {

          console.log(
            `[ACC${index}] ENERGY AUTO REFILLED`
          );

          await sendTelegram(
            `[ACC${index}] ENERGY AUTO REFILLED`
          );

          break;
        }

        if (
          Date.now() >=
          adsCooldownUntil
        ) {

          console.log(
            `[ACC${index}] ADS COOLDOWN FINISHED`
          );

          await sendTelegram(
            `[ACC${index}] ADS COOLDOWN FINISHED`
          );

          break;
        }

        await delay(60000);
      }
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
