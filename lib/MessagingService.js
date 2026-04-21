import {
	HubConnectionBuilder,
	HttpTransportType,
	LogLevel,
} from "@microsoft/signalr";
import RBXScriptConnection from "./RBXScriptConnection.js";

export default class MessagingService {
	#Connection;
	#SubscribersByTopic = new Map();

	static async InitializeAsync(robloSecurity, universeId) {
		const instance = new this();

		const url = `https://csm.roblox.com/v1/router/?id=&universeId=${universeId}`;

		instance.#Connection = new HubConnectionBuilder()
			.withUrl(url, {
				transport: HttpTransportType.WebSockets,
				headers: {
					"X-Roblox-ChannelType": "Test",
					"Cookie": `.ROBLOSECURITY=${robloSecurity}`,
				},
				skipNegotiation: true,
			})
			.configureLogging(LogLevel.Information)
			.withAutomaticReconnect()
			.build();

		// Handle incoming messages
		instance.#Connection.on("Message", (topic, payload) => {
			const subscribers = instance.#SubscribersByTopic.get(topic);

			if (!subscribers) return;

			let data;
			try {
				data = JSON.parse(payload);
			} catch {
				return;
			}

			for (const connection of subscribers) {
				if (!connection.Connected) {
					subscribers.delete(connection);
					continue;
				}

				connection.Fire(data);
			}

			if (subscribers.size === 0) {
				instance.#SubscribersByTopic.delete(topic);
			}
		});

		await instance.#Connection.start();

		return instance;
	}

	async PublishAsync(topic, message) {
		await this.#Connection.invoke("Publish", topic, JSON.stringify(message), 0);
	}

	async SubscribeAsync(topic, callback) {
		const connection = new RBXScriptConnection(callback);

		if (!this.#SubscribersByTopic.has(topic)) {
			this.#SubscribersByTopic.set(topic, new Set());
		}

		this.#SubscribersByTopic.get(topic).add(connection);

		await this.#Connection.invoke("Subscribe", topic, 0).catch(console.error);

		return connection;
	}
}
