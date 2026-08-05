const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const getWeather = async (latitude, longitude) => {
    try {

        const response = await axios.get(
            "https://api.tomorrow.io/v4/weather/realtime",
            {
                params: {
                    location: `${latitude},${longitude}`,
                    apikey: process.env.TOMORROW_API_KEY
                }
            }
        );

        const data = response.data.data.values;

        return {
            temperature: data.temperature,
            humidity: data.humidity,
            rainfallIntensity: data.rainIntensity,
            precipitationProbability: data.precipitationProbability,
            windSpeed: data.windSpeed,
            pressure: data.pressureSurfaceLevel,
            cloudCover: data.cloudCover,
            visibility: data.visibility,
            weatherCode: data.weatherCode,
            uvIndex: data.uvIndex
        };

    } catch (error) {

        console.error(
            "Tomorrow.io Error:",
            error.response?.data || error.message
        );

        throw new Error("Unable to fetch weather data");

    }
};

module.exports = { getWeather };