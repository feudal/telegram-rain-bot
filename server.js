const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const cron = require("node-cron");
const express = require("express");
const app = express();
const fs = require("fs");
require("dotenv").config();

const LOCATION = "Chisinau,md";
// Load the saved notifications
const notificationsEnabled = new Set(readNotifications().enabledChatIds || []);

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

const commands = [
  { command: "/start", description: "Start the bot" },
  { command: "/notify", description: "Enable rain notifications" },
  { command: "/notify_off", description: "Disable rain notifications" },
  { command: "/weather", description: "Get current weather" },
  { command: "/weather_tomorrow", description: "Get weather tomorrow" },
];

function readNotifications() {
  try {
    const data = fs.readFileSync("notifications.json", "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading notifications file:", error);
    return {};
  }
}

function writeNotifications(notifications) {
  try {
    fs.writeFileSync("notifications.json", JSON.stringify(notifications));
  } catch (error) {
    console.error("Error writing notifications file:", error);
  }
}

async function getWeatherData() {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${LOCATION}&appid=${process.env.OPENWEATHERMAP_API_KEY}`;
  const response = await axios.get(url);
  return response.data;
}

function checkRainAt(hour) {
  return (weatherData) =>
    weatherData.list.find(
      (item) =>
        new Date(item.dt_txt).getHours() === hour &&
        item.weather[0].main === "Rain"
    );
}

const bot = new TelegramBot(process.env.TELEGRAM_API_KEY, { polling: true });

// Set the bot's commands
bot
  .setMyCommands(commands)
  .then(() => console.log("Commands set successfully"))
  .catch((error) => console.error(error));

// Handle incoming messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const weatherData = await getWeatherData();

  switch (msg.text) {
    case "/start":
      bot.sendMessage(chatId, "Welcome to NotificationRainBot");
      break;
    case "/notify":
      notificationsEnabled.add(chatId);
      writeNotifications({ enabledChatIds: Array.from(notificationsEnabled) });
      bot.sendMessage(chatId, "Notifications enabled.");
      break;
    case "/notify_off":
      notificationsEnabled.delete(chatId);
      writeNotifications({ enabledChatIds: Array.from(notificationsEnabled) });
      bot.sendMessage(chatId, "Notifications disabled.");
      break;
    case "/weather":
      const currentWeather = weatherData.list[0];
      const temperature = Math.round(currentWeather.main.temp - 273.15); // Convert Kelvin to Celsius
      const description = currentWeather.weather[0].description;
      const message = `The current temperature is ${temperature}°C and the weather is ${description}.`;
      bot.sendMessage(chatId, message);
      break;
    case "/weather_tomorrow":
      const tomorrowWeather = weatherData.list[8];
      const tomorrow_temperature = Math.round(
        tomorrowWeather.main.temp - 273.15
      );
      const tomorrow_description = tomorrowWeather.weather[0].description;
      const tomorrow_message = `The temperature tomorrow will be ${tomorrow_temperature}°C and the weather will be ${tomorrow_description}.`;
      bot.sendMessage(chatId, tomorrow_message);
      break;
    default:
      // Handle unknown commands or messages
      bot.sendMessage(chatId, "Unknown command. Please try again.");
      break;
  }
});

// Send notifications
cron.schedule("0 8 * * *", async () => {
  const weatherData = await getWeatherData();
  const rainAt6PM = checkRainAt(18)(weatherData);
  if (rainAt6PM) {
    for (const chatId of notificationsEnabled) {
      bot.sendMessage(
        chatId,
        "It will rain at 6 PM. Don't forget to take an umbrella!"
      );
    }
  }
});

cron.schedule("0 12 * * *", async () => {
  const weatherData = await getWeatherData();
  const tomorrowRain = checkRainAt(new Date().getHours() + 24)(weatherData);
  if (tomorrowRain) {
    console.log("Sending tomorrow rain notification");
    const rainIntensity = tomorrowRain.rain["3h"];
    for (const chatId of notificationsEnabled) {
      bot.sendMessage(
        chatId,
        `It will rain tomorrow with an intensity of ${rainIntensity} mm.`
      );
    }
  }
});
