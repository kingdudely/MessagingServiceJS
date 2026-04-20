import WebSocket from "ws";
import RBXScriptConnection from "./RBXScriptConnection.js";

const isEmptyObject = (object) => Object.keys(object).length === 0;
function parseJSON(data) {
	try {
		return JSON.parse(data);
	} catch (error) {
		console.warn(error);
		return undefined;
	}
}

const SignalR = {
	MessageSeparator: "\x1e",

	EncodeMessages(messages /* [objects] */) /* buffer */ {
		return Buffer.from(
			messages
				.map(JSON.stringify)
				.join(this.MessageSeparator) + this.MessageSeparator,
			"utf-8"
		);
	},

	DecodeMessages(buffer /* buffer */) /* [objects] */ {
		return buffer
			.toString("utf-8")
			.split(this.MessageSeparator)
			.filter(message => message !== "")
			.map(parseJSON)
			.filter(message => message !== undefined);
	},
};

export default class MessagingService {
	#InvocationId = 0;
	#PendingConnections = new Map();
	#SubscribersByTopic = new Map();
	#WebSocket;

	#SendRequest(target, args) {
		const invocationId = String(this.#InvocationId++);

		this.#WebSocket.send(SignalR.EncodeMessages([
			{
				type: 1,
				target,
				arguments: args,
				invocationId,
			}
		]));

		return new Promise(resolve => this.#PendingConnections.set(invocationId, new RBXScriptConnection(resolve)));
	};

	static async InitializeAsync(robloSecurity, universeId) {
		const instance = new this();

		instance.#WebSocket = new WebSocket(
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

		instance.#WebSocket.on("close", (code, reason) => {
			console.log("[WS] closed:", code, reason.toString());
		});

		instance.#WebSocket.on("error", (error) => {
			throw error;
		});

		await new Promise((resolve, reject) => {
			instance.#WebSocket.once("open", () => {
				instance.#WebSocket.send(SignalR.EncodeMessages([
					{
						protocol: "json",
						version: 1
					}
				]));

				instance.#WebSocket.once("message", (data) => {
					const messages = SignalR.DecodeMessages(data);
					const connectionSuccess = messages[0] && isEmptyObject(messages[0]);
					if (connectionSuccess) {
						resolve();
					} else {
						instance.#WebSocket.close();
						reject("Failed to connect to router");
					}
				});
			});
		});

		instance.#WebSocket.on("message", (data) => {
			const messages = SignalR.DecodeMessages(data);

			for (const message of messages) {
				switch (message.type) {
					case 1: { // got a published message and we gonna send it to subscribers
						if (message.target === "Message") {
							const [topic, payload] = message.arguments;
							const subscribers = instance.#SubscribersByTopic.get(topic);
							const data = parseJSON(payload);

							if (data !== undefined && subscribers && subscribers instanceof Set) {
								for (const connection of subscribers) {
									if (connection instanceof RBXScriptConnection) {
										if (!connection.Connected) {
											subscribers.delete(connection);
											continue;
										}
									
										connection.Fire({
											Data: data,
											Sent: Date.now() / 1000,
										});
									};
								}
								
								if (subscribers.size === 0) {
									instance.#SubscribersByTopic.delete(topic);
								}
							};
						};

						break;
					};

					case 3: { // response to a request we made
						if (message.invocationId) {
							const pendingConnection = instance.#PendingConnections.get(message.invocationId);

							if (pendingConnection && pendingConnection instanceof RBXScriptConnection) {
								pendingConnection.Fire(message.result);
								pendingConnection.Disconnect();
								instance.#PendingConnections.delete(message.invocationId);
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

		return instance;
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
		if (!this.#SubscribersByTopic.has(topic)) {
			this.#SubscribersByTopic.set(topic, new Set());
		};
	
		this.#SubscribersByTopic.get(topic).add(connection);

		this.#SendRequest("Subscribe", [
			topic,
			0
		]);

		return connection;
	};
};
