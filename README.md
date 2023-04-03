# Telegram video hosting

Have you ever wondered if you can create a free* video hosting? Like basically unlimited and pretty good...  
If so, you've come to the right place. This is a telegram "bot" that also listens to the http requests.  
When you send a video to the chat you designated as a hosting chat this "bot" will reply you with a link to this video.  
This link can be embedded into discord or other messengers.
Tricky part is that the bots are limited to files of [20 MB](https://core.telegram.org/bots/api#sending-files) so you'd need to create your own "client" and authenticate under your profile.

## Get creds
- Get apiId and apiHash by following [this steps](https://core.telegram.org/api/obtaining_api_id#obtaining-api-id)
- Get myId and chatId by forwarding message of a bot that you created. Forward the message to the bot like [this one](https://t.me/getidsbot)
- StartId is obtained from the logs

## Config
Copy `config.template.yaml` as `config.yaml`, edit to fit your needs
```bash
cp config.template.yaml config.yaml
vim config.yaml
```

- port - port of the web app
- myId - id of your account
- chatId - id of chat designated as a hosting chat
- apiId - telegram api ID
- apiHash - telegram api hash
- startId - index of the first message this worker can send
- secretEncrypt - random 32-64 byte string
- secretTweak - random >1 byte init vector [(more)](https://github.com/eCollect/node-fe1-fpe/blob/v1.0/index.js#L15)
- modulus - total amount of options. bigger value slower encryption, lower value more chance of a collision
- domain - public domain and path for the host


## Install deps

npm
```bash
npm i
```
pnpm
```bash
pnpm i
```
## Run

npm
```bash
npm run start
```
pnpm
```bash
pnpm run start
```

When running first time you'll be prompted all your telegram creds, which are stored plain-text locally afterwards.

## Tips
- use cloudflare for https and caching since telegram download is pretty slow
- \* assuming you have second-level domain to tie to cloudflare to add first-class CDN to your videos