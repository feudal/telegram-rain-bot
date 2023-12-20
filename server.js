const TelegramBot = require("node-telegram-bot-api");
const moment = require("moment-timezone");
const express = require("express");
const schedule = require("node-schedule");
const axios = require("axios");
const fs = require("fs");

const app = express();
require("dotenv").config();

const LOCATION = "Chisinau,md";
// Load the saved notifications
const notificationsEnabled = new Set(readNotifications().enabledChatIds || []);

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

const listener = app.listen(8080, () => {
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
    const data = fs.readFileSync("notifications.json");
    return JSON.parse(data.toString());
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
    throw error; // Rethrow the error to propagate it
  }
}

async function getWeatherData() {
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${LOCATION}&appid=${process.env.OPENWEATHERMAP_API_KEY}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching weather data:", error);
    throw error; // Rethrow the error to propagate it
  }
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

bot.on("polling_error", (error) => {
  console.log("Polling error:", error.code, error.message);
});

// Set the bot's commands
bot
  .setMyCommands(commands)
  .then(() => console.log("Commands set successfully"))
  .catch((error) => console.error(error));

// Handle incoming messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const weatherData = await getWeatherData();
  const notifications = await readNotifications();
  const notificationsEnabled = new Set(notifications.enabledChatIds || []);

  switch (msg.text) {
    case "/start":
      bot.sendMessage(chatId, "Welcome to NotificationRainBot");
      break;
    case "/notify":
      notifications.enabledChatIds = notifications.enabledChatIds || [];
      notifications.enabledChatIds.push(chatId);
      await writeNotifications(notifications);
      notificationsEnabled.add(chatId); // Update the Set
      bot.sendMessage(chatId, "Notifications enabled.");
      break;
    case "/notify_off":
      notifications.enabledChatIds = notifications.enabledChatIds || [];
      notifications.enabledChatIds = notifications.enabledChatIds.filter(
        (id) => id !== chatId
      );
      await writeNotifications(notifications);
      notificationsEnabled.delete(chatId); // Update the Set
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
const rule1 = new schedule.RecurrenceRule();
rule1.hour = 8;
rule1.minute = 0;
rule1.tz = "Europe/Chisinau";

schedule.scheduleJob(rule1, () => {
  const weatherData = getWeatherData();
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

const rule2 = new schedule.RecurrenceRule();
rule2.hour = 20;
rule2.minute = 0;
rule2.tz = "Europe/Chisinau";

schedule.scheduleJob(rule2, async () => {
  const weatherData = await getWeatherData();
  const tomorrowRain = checkRainAt(moment().tz("Europe/Chisinau").hour() + 24)(
    weatherData
  );
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

const rule3 = new schedule.RecurrenceRule();
rule3.hour = 7;
rule3.minute = 30;
rule3.tz = "Europe/Chisinau";

schedule.scheduleJob(rule3, async () => {
  const weatherData = await getWeatherData();
  const currentWeather = weatherData.list[0];
  const temperature = Math.round(currentWeather.main.temp - 273.15); // Convert Kelvin to Celsius
  const description = currentWeather.weather[0].description;
  const message = `Good morning! The current temperature is ${temperature}°C and the weather is ${description}.`;

  for (const chatId of notificationsEnabled) {
    bot.sendMessage(chatId, message);
  }
});
