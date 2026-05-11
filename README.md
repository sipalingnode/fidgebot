<p align="center">
  <img height="300" height="auto" src="https://github.com/sipalingnode/sipalingnode/blob/main/logo.png">
</p>

<h2 align="center"><b>Follow Community Team</b></h2>
<p align="center">
  <a href="https://www.airdropasc.com" target="_blank"><img src="https://github.com/sipalingnode/sipalingnode/blob/main/logo.png" width="50"/></a>&nbsp;&nbsp;&nbsp;
  <a href="https://t.me/airdropasc" target="_blank"><img src="https://github.com/user-attachments/assets/56e7f6ee-18b7-4b36-becc-ec6e4de7bff9" width="50"/></a>&nbsp;&nbsp;&nbsp;
  <a href="https://x.com/Autosultan_team" target="_blank"><img src="https://github.com/user-attachments/assets/fbb43aa4-9652-4a49-b984-5cf032b6b1ac" width="50"/></a>&nbsp;&nbsp;&nbsp;
  <a href="https://www.youtube.com/@ZamzaSalim" target="_blank"><img src="https://github.com/user-attachments/assets/c15509f9-acb7-49ce-989a-5bac62e7e549" width="50"/></a>
</p>

---

# FIDGEBOT [SOURCE](https://t.me/airdropasc/90165)
## BOT FEATURE
- Support Multi-account
- Telegram control & Monitoring
- Auto spinning
- Auto watch ads
- Auto conversion point-to-gems
## TUTORIAL
### Install NodeJS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### Clone repository
```
git clone https://github.com/sipalingnode/fidgebot.git
cd fidgebot
```
### Install dependencies
```
npm install
```
### Create Telegram Bot
- Open [BotFather](https://t.me/BotFather)
- Send: `/newbot`
- Enter bot name & username
- Copy the BOT TOKEN
### Get Telegram Chat ID
- Open [GetID](https://t.me/userinfobot)
- Send: /start
- Copy your Chat ID
### Paste Bot Token & Chat ID di telegram.json
```
nano telegram.json
```
**Save file telegram.json dengan `CTRL+X+Y lalu Enter`**
### Submit Email & Password di accounts.json
```
nano accounts.json
```
**Save file accounts.json dengan `CTRL+X+Y lalu Enter`**
### Run bot
```
node bot.js
```
### Telegram commands
- `/run`
- `/stop`
- `/status`
- `/addaccount`
