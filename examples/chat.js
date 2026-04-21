import MessagingServiceFactory from "messagingservicejs";

const MessagingService = await MessagingServiceFactory.InitializeAsync(
	"_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|...", // .ROBLOSECURITY
	69_420_1337_80085 // Universe ID
);

await MessagingService.SubscribeAsync("chat", (message) => {
	console.log("Received:", message);
});

await MessagingService.PublishAsync("chat", "Hello!");

// How to publish to Roblox:
await MessagingService.PublishAsync("chat", {
	Sent: Date.now() / 1000, // Number, required
	Data: "Hello!", // Variant, required
	// TraceId: Math.random() * 10000000000000000000, // Number, optional
	// TracingEnabled: false // Number, optional
});
