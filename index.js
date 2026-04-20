import MessagingServiceFactory from "./MessagingService.js";

const MessagingService = await new MessagingServiceFactory(
	"_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|...", // .ROBLOSECURITY
	69_420_1337_80085 // Universe ID
);

router.SubscribeAsync("chat", (message) => {
	console.log("Received:", message.Data);
});

router.PublishAsync("chat", "Hello!")
