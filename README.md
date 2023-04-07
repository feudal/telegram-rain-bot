# NotificationRainBot

NotificationRainBot is a Telegram bot that sends notifications when it's going to rain. It uses the OpenWeatherMap API to get weather data and the node-cron package to schedule notifications.

## Getting Started

To use NotificationRainBot, you need to have a Telegram account and create a new bot using [BotFather](https://core.telegram.org/bots#6-botfather). You will receive an API key that you will need to use in the code.

You also need to obtain an API key from [OpenWeatherMap](https://openweathermap.org/). Once you have the API key, you can replace `process.env.OPENWEATHERMAP_API_KEY` in the code with your API key.

To run the code, you need to install the required dependencies using npm:

```bash
npm install
```

Then, you can start the bot by running:

```bash
npm start
```

This will start an express server that listens on port 3000 (or the port specified in the `process.env.PORT` variable) and starts polling for Telegram messages.

## Commands

NotificationRainBot supports the following commands:

- `/start`: Start the bot
- `/notify`: Enable rain notifications
- `/notify_off`: Disable rain notifications
- `/weather`: Get current weather
- `/weather_tomorrow`: Get weather tomorrow

## Scheduling Notifications

NotificationRainBot uses the `node-cron` package to schedule notifications. By default, it sends a notification at 8 AM if it's going to rain at 6 PM and a notification at 12 PM if it's going to rain tomorrow. You can change the schedule by modifying the cron expressions in the code.

## License

This project is licensed under the MIT License. See the [LICENSE](https://choosealicense.com/licenses/mit/) file for details.
