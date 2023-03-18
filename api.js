const axios = require('axios');

const getData = async () => {
    const { data } = await axios.get('https://datausa.io/api/data?drilldowns=Nation&measures=Population');

    return data.data;
}

const sumPopulation = async (data) => {
    const sum = data.filter(elem => elem.Year > 2017 && elem.Year < 2021).reduce((acc, curr) => acc + curr.Population, 0);

    return sum;
} 

module.exports = {
    getData,
    sumPopulation,
};