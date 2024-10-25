const WA = require('./wati');
const airtable = require("./airtable_methods");
require('dotenv').config();
let axios = require('axios');
let cop = require('./index');
let openaiModule = require('./OpenAI');

// let Airtable = require('airtable');
let course_base = process.env.course_base

let base_student = process.env.studentBase
let student_table = process.env.studentTable

let apiKey = process.env.personal_access_token;
async function find_course_to_create() {

    let config = {
        method: 'GET',
        url: `https://api.airtable.com/v0/${base_student}/${student_table}?fields%5B%5D=Phone&fields%5B%5D=Topic&fields%5B%5D=Course+Status&fields%5B%5D=Name&fields%5B%5D=Language&fields%5B%5D=Goal&fields%5B%5D=Style&filterByFormula=OR(%7BCourse+Status%7D+%3D+%22Approved%22%2C%7BCourse+Status%7D+%3D+%22Failed%22+)&maxRecords=1&sort%5B0%5D%5Bfield%5D=Created&sort%5B0%5D%5Bdirection%5D=asc`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',

        }

    };
    result = axios.request(config)
        .then((response) => {

            res = response.data
            return response.data.records

        })
        .catch((error) => {
            if (error.response) {
                console.log("Alfred Record Error", error.response.data);
                return error.response.data;
            } else {
                console.log("Error occurred but no response received from the server:", error);
                // Handle the error further if necessary
                return null; // or any default value you want to return
            }
        });
    return result
}

async function course_approval() {
    try {
        openaiModule.generateCourse();
    } catch (error) {
        console.log("Error generating course", error);
    }
}




module.exports = {
    find_course_to_create,
    course_approval
}