import { Api, TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/StringSession.js'
import input from 'input'
import express from 'express'
import fpe from 'node-fe1-fpe'
import int24 from 'int24'
import fs from 'fs/promises'
import YAML from 'yaml'
import bigInt from 'big-integer'

/**
 * Configuration object
 * @typedef {Object} Settings
 * @property {number} port
 * @property {number} myId
 * @property {number} chatId
 * @property {number} apiId
 * @property {string} apiHash
 * @property {number} startId
 * @property {string} secretEncrypt
 * @property {string} secretTweak
 * @property {string} modulus
 * @property {string} domain
 */

const app = express()

;(async () => {
	/**@type {Settings} */
	const config = YAML.parse(await fs.readFile('./config.yaml', 'utf8'))
	const initSession = await fs.readFile('./session.txt', 'utf8')
	const stringSession = new StringSession(initSession)
	const client = new TelegramClient(stringSession, config.apiId, config.apiHash, {
		connectionRetries: 5,
	})
	await client.start({
		phoneNumber: async () => await input.text('Please enter your number: '),
		password: async () => await input.text('Please enter your password: '),
		phoneCode: async () => await input.text('Please enter the code you received: '),
		onError: err => console.log(err),
	})
	console.log('You should now be connected.')
	const savedSession = client.session.save()
	if (savedSession !== initSession) await fs.writeFile('./session.txt', savedSession, 'utf8')
	stringSession.save()

	const myId = BigInt(config.myId)
	const chatId = BigInt(config.chatId)

	const encrypt = id => {
		const index = id - config.startId
		if (index < 0) return
		const encryptedValue = fpe.encrypt(config.modulus, index, config.secretEncrypt, config.secretTweak)
		const buf = Buffer.alloc(3)
		int24.writeUInt24BE(buf, 0, encryptedValue)

		return buf.toString('base64url')
	}

	const decrypt = encryptedText => {
		const length = Buffer.byteLength(encryptedText, 'base64url')
		if (length !== 3) throw new Error('Incorrect buffer length != 3')
		const buf = Buffer.alloc(3)
		buf.write(encryptedText, 'base64url')
		const decodedValue = int24.readUInt24BE(buf, 0)

		const decryptedValue = fpe.decrypt(config.modulus, decodedValue, config.secretEncrypt, config.secretTweak) // 1

		return decryptedValue + config.startId
	}

	const href = new URL(config.domain).href
	const url = url.endsWith('/') ? href : href + '/'

	await client.addEventHandler(async update => {
		if (update.className !== 'UpdateNewMessage') return
		if (update.message?.fromId?.userId?.value !== myId) return
		if (update.message?.peerId?.userId?.value !== chatId) return
		if (!update.message?.media?.document) return

		console.log('Encrypting messageId:', update.message.id)
		const id = encrypt(update.message.id)
		await client.sendMessage(chatId, { message: id ? url + id : 'incorrect startId' })
	})

	app.get('/:messageId', async (req, res) => {
		const { messageId } = req.params
		let id
		try {
			id = decrypt(messageId)
		} catch (err) {
			console.error('Error decrypting:', err)
			return res.sendStatus(400)
		}
		const result = await client.invoke(
			new Api.messages.GetMessages({
				id: [new Api.InputMessageID({ id })],
			})
		)
		const message = result.messages[0]
		if (!message || !message.media || message?.peerId?.userId?.value !== chatId) return res.sendStatus(404)
		const document = message.media.document
		const params = {
			requestSize: 512 * 1024,
			start: bigInt(0),
		}

		res.setHeader('Content-Type', 'video/mp4')
		res.setHeader('Cache-Control', 'max-age=31536000')

		for await (const chunk of client.iterDownload({
			file: new Api.MessageMediaDocument({
				document,
			}),
			offset: params.start,
			limit: params.start + params.requestSize,
			chunkSize: params.requestSize,
		})) {
			params.start = params.start.add(params.requestSize)
			console.log('Downloaded chunk of size', chunk.length)
			res.write(chunk)
		}
		res.end()
	})

	app.listen(config.port, () => {
		console.log(`Server listening on port ${config.port}`)
	})
})()
