const request = require('request-promise')
const WA = require('./wati');
const us = require('./airtable_methods.js')
var Airtable = require('airtable');
require('dotenv').config("./env")

var base = new Airtable({ apiKey: process.env.apiKey }).base(process.env.base);


async function sendMediaFile(cDay, cModule, number) {
    var course_tn = await us.findTable(number).then(`Table name of ${number} is ${course_tn}`).catch(e => console.log(e))

    const records = await base(course_tn).select({
        filterByFormula: "({Day} =" + cDay + ")",
        view: "Grid view",

    }).all(
    );
    records.forEach(function (record) {
        img = record.get("Module " + cModule + " File")
        // console.log(typeof img)


        if (img != undefined) {
            len = img.length
            console.log(len)

            for (i = 0; i < len; i++) {
                filename = img[i].filename
                imgurl = img[i].url

                // console.log(filename, imgurl);

                console.log("Delay of sending images")
                load(imgurl, filename, number)



            }
        }
        else {
            console.log("No media in this module")
        }

    })
}

async function sendMediaFile_v2(index, cDay, cModule, number) {
    var course_tn = await us.findTable(number).then(`Table name of ${number} is ${course_tn}`).catch(e => console.log(e))

    const records = await base(course_tn).select({
        filterByFormula: "({Day} =" + cDay + ")",
        view: "Grid view",

    }).all(
    );
    records.forEach(function (record) {
        img = record.get("Module " + cModule + " File")
        // console.log(typeof img)


        if (img != undefined) {
            len = img.length
            let i = index
            console.log(index)

            for (i = index; i == index; i++) {
                filename = img[i].filename
                imgurl = img[i].url

                // console.log(filename, imgurl);

                console.log("Delay of sending images")
                load(imgurl, filename, number)



            }
        }
        else {
            console.log("No media in this module")
        }

    })
}



async function load(uri, path, number) {
    const options = {
        uri: uri,
        encoding: null
    };
    const body = await request(options)

    WA.sendMedia(body, path, number)

}
module.exports = { sendMediaFile, sendMediaFile_v2 }


