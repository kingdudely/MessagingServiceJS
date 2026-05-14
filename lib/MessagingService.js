import { z } from "zod";
import { HubConnectionBuilder, HubConnectionState, HttpTransportType, LogLevel } from "@microsoft/signalr";

const MessageSchema = z.object({
	Sent: z.number().finite(),
	Data: z.json(),
});

export default class MessagingService {
	#Connection;
	#Subscriptions = new Map();

	constructor(ROBLOSECURITY, universeId) {
		this.#Connection = new HubConnectionBuilder()
			.withUrl(`https://csm.roblox.com/v1/router/?id=&universeId=${universeId}`, {
				transport: HttpTransportType.WebSockets,
				skipNegotiation: true,
				headers: {
					"X-Roblox-ChannelType": "Test",
					"Cookie": `.ROBLOSECURITY=${ROBLOSECURITY}`,
				},
			})
			.withAutomaticReconnect()
			.configureLogging(LogLevel.Warning)
			.build();

		this.#Connection.on("Message", (topic, payload) => {
			const callbacks = this.#Subscriptions.get(topic);

			if (callbacks) {
				const message = MessageSchema.parse(JSON.parse(payload));

				for (const callback of callbacks) {
					callback(structuredClone(message)); // Canonical MessagingService behaviour
				}
			};
		});

		this.#Connection.onreconnected(async () => {
			for (const topic of this.#Subscriptions.keys()) {
				await this.#Connection.invoke("Subscribe", topic, 0);
			}
		});

		this.#Connection.onclose(() => {
			this.#Subscriptions.clear();
		});
	}

	get Closed() {
		return this.#Connection.state === HubConnectionState.Disconnected;
	}

	async ConnectAsync() {
		await this.#Connection.start();
	}

	async PublishAsync(topic, data) {
		const message = MessageSchema.parse({
			Data: data,
			Sent: Date.now() / 1_000,
		});

		await this.#Connection.invoke("Publish", topic, JSON.stringify(message), 0);
	}

	async SubscribeAsync(topic, callback) {
		if (!this.#Subscriptions.has(topic)) {
			this.#Subscriptions.set(topic, new Set());
			await this.#Connection.invoke("Subscribe", topic, 0);
		}

		this.#Subscriptions.get(topic).add(callback);
		return async () => await this.UnsubscribeAsync(topic, callback);
	};

	async UnsubscribeAsync(topic, callback) {
		const callbacks = this.#Subscriptions.get(topic);

		if (callbacks) {
			callbacks.delete(callback);

			if (callbacks.size === 0) {
				this.#Subscriptions.delete(topic);
				await this.#Connection.invoke("Unsubscribe", topic);
			}
		}
	};

	async DisconnectAsync() {
		await this.#Connection.stop();
	};
}
