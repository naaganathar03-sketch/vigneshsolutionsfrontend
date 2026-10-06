const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v24.0";

module.exports = async function handler(req, res) {
  // Meta webhook verification
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send("Forbidden");
  }

  // Incoming WhatsApp messages
  if (req.method === "POST") {
    try {
      const body = req.body;

      const value =
        body?.entry?.[0]?.changes?.[0]?.value;

      const message = value?.messages?.[0];

      // Ignore delivery/read status webhooks
      if (!message) {
        return res.status(200).json({ success: true });
      }

      const from = message.from;

      let incomingText = "";

      if (message.type === "text") {
        incomingText = message.text?.body || "";
      }

      if (message.type === "interactive") {
        incomingText =
          message.interactive?.button_reply?.title ||
          message.interactive?.list_reply?.title ||
          "";
      }

      if (!incomingText) {
        await sendTextMessage(
          from,
          "Thanks for contacting Vignesh Solutions. Please send your requirement as a text message."
        );

        return res.status(200).json({ success: true });
      }

      const language = detectLanguage(incomingText);
      const reply = getWelcomeReply(language);

      await sendTextMessage(from, reply);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("WhatsApp webhook error:", error);

      // Respond 200 so Meta doesn't keep retrying the same webhook
      return res.status(200).json({ success: false });
    }
  }

  return res.status(405).send("Method Not Allowed");
};

function detectLanguage(text) {
  // Tamil Unicode present
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return "tamil";
  }

  const lower = text.toLowerCase();

  const tanglishWords = [
    "vanakkam",
    "enaku",
    "ennaku",
    "venum",
    "ungaluku",
    "ungalukku",
    "pannanum",
    "pananum",
    "panna",
    "evlo",
    "evalo",
    "iruku",
    "irukku",
    "website venum",
    "app venum",
    "design pannanum",
    "redesign pannanum",
    "create pannanum"
  ];

  if (tanglishWords.some((word) => lower.includes(word))) {
    return "tanglish";
  }

  return "english";
}

function getWelcomeReply(language) {
  const website = "https://vigneshsolutions.vercel.app/";

  if (language === "tamil") {
    return `👋 வணக்கம்!

Vignesh Solutions-ஐ தொடர்பு கொண்டதற்கு நன்றி.

🌐 எங்கள் website:
${website}

நாங்கள் Website, Ecommerce, Mobile App, Web Application மற்றும் AI Automation solutions develop செய்து தருகிறோம்.

உங்களுக்கு என்ன தேவை?

1️⃣ Website Development
2️⃣ Ecommerce Website
3️⃣ Mobile App Development
4️⃣ Web Application / SaaS
5️⃣ AI / Automation
6️⃣ Other

Option number அல்லது உங்கள் requirement-ஐ message செய்யுங்கள்.`;
  }

  if (language === "tanglish") {
    return `👋 Vanakkam!

Vignesh Solutions-ai contact pannathukku thanks.

🌐 Enga website:
${website}

Naanga Website, Ecommerce, Mobile App, Web Application and AI Automation solutions develop pannrom.

Ungalukku enna service venum?

1️⃣ Website Development
2️⃣ Ecommerce Website
3️⃣ Mobile App Development
4️⃣ Web Application / SaaS
5️⃣ AI / Automation
6️⃣ Other

Option number illa unga requirement-a message pannunga.`;
  }

  return `👋 Hi! Welcome to Vignesh Solutions.

Thank you for contacting us.

🌐 Visit our website:
${website}

We develop Websites, Ecommerce solutions, Mobile Apps, Web Applications and AI Automation solutions.

What are you looking for?

1️⃣ Website Development
2️⃣ Ecommerce Website
3️⃣ Mobile App Development
4️⃣ Web Application / SaaS
5️⃣ AI / Automation
6️⃣ Other

Reply with the option number or simply tell us about your requirement.`;
}

async function sendTextMessage(to, text) {
  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: true,
        body: text
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("WhatsApp API error:", data);
    throw new Error(JSON.stringify(data));
  }

  return data;
}
