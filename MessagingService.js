import WebSocket from "ws";
import RBXScriptConnection from "./RBXScriptConnection.js";

const isEmptyObject = object => Object.keys(object).length === 0;

const SignalR = {
	MessageSeperator: "\x1e",
	EncodeMessages(messages /* [objects] */) /* buffer */ {
		return Buffer.from(
			messages
				.map(JSON.stringify)
				.join(this.MessageSeperator) + this.MessageSeperator,
			"utf-8"
		);
	},
	DecodeMessages(buffer /* buffer */) /* [objects] */ {
		return buffer
			.toString("utf-8")
			.split(this.MessageSeperator)
			.filter(Boolean)
			.map(JSON.parse);
	}
};

export default class MessagingService {
	#InvocationId = 0;
	#Pending = new Map();
	#Subscribers = new Map();
	#Socket;

	#SendRequest(target, args) {
		this.#Socket.send(SignalR.EncodeMessages([
			{
				type: 1,
				target,
				arguments: args,
				invocationId: String(this.#InvocationId++),
			}
		]));

		return new Promise(resolve => this.#Pending.set(id, resolve));
	};

	constructor(robloSecurity, universeId) {
		return new Promise(async (resolve) => {
			this.#Socket = new WebSocket(
				`wss://csm.roblox.com/v1/router/?id=&universeId=${universeId}`,
				{
					headers: {
						// "User-Agent": "RobloxStudio/WinInet",
						"X-Roblox-ChannelType": "Test",
						// "Roblox-Place-Id": String(placeId),
						// "Roblox-Universe-Id": String(universeId),
						// "PlayerCount": "1",
						"Cookie": `.ROBLOSECURITY=${robloSecurity}`
					}
				}
			);
	
			this.#Socket.on("close", (code, reason) => {
				console.log("[WS] closed:", code, reason.toString());
			});
	
			this.#Socket.on("error", (error) => {
				throw error;
			});
	
			await new Promise((resolve, reject) => {
				this.#Socket.once("open", () => {
					this.#Socket.send(SignalR.EncodeMessages([
						{
							protocol: "json",
							version: 1
						}
					]));
	
					this.#Socket.once("message", (data) => {
						const messages = SignalR.DecodeMessages(data);
						const connectionSuccess = isEmptyObject(messages[0]);
						if (connectionSuccess) {
							resolve();
						} else {
							instance.#Socket.close();
							reject("Failed to connect to router");
						}
					});
				});
			});
	
			this.#Socket.on("message", (data) => {
				const messages = SignalR.DecodeMessages(data);
	
				for (const message of messages) {
					switch (message.type) {
						case 1: { // got a published message and we gonna send it to subscribers
							if (message.target === "Message") {
								const [topic, payload] = message.arguments;
								const connection = this.#Subscribers.get(topic);
	
								if (connection && connection instanceof RBXScriptConnection) {
									if (connection.Connected) {
										connection.Fire({
											"Data": JSON.parse(payload),
											"Sent":  Date.now() / 1000,
										});
									} else {
										this.#Subscribers.delete(topic);
									};
								};
							};
	
							break;
						};
	
						case 3: { // response to a request we made
							if (message.invocationId) {
								const resolveRequest = this.#Pending.get(message.invocationId);

								if (resolveRequest) {
									resolveRequest(message.result);
									this.#Pending.delete(message.invocationId);
								};
							};

							break;
						};
	
						case 6: break; // ping (do we send back? IDK)
	
						default: {
							console.warn("Unknown message type:", message);
							break;
						};
					};
				};
			});
	
			resolve(this);
		});
	};

	PublishAsync(topic, message) {
		this.#SendRequest("Publish", [
			topic,
			JSON.stringify(message),
			0
		]);

		return undefined;
	};

	SubscribeAsync(topic, callback) {
		const connection = new RBXScriptConnection(callback);
		this.#Subscribers.set(topic, connection);

		this.#SendRequest("Subscribe", [
			topic,
			0
		]);

		return connection;
	};
};