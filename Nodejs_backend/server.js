// external packages
const express = require('express');
require('dotenv').config("./env");
const test = require('./test.js');
const cors = require('cors');
const {createCertificate} = require('./certificate')
const course_approval = require('./course_status');
var Airtable = require('airtable');
const WA = require('./wati');
const airtable = require("./airtable_methods");
const outro = require('./outroflow');
// const cert = require('./certificate')
const mongoose = require("mongoose");
const mongodb = require('./mongodb');
const cop = require('./index');
const fs = require('fs');
const request = require('request');
const webApp = express();
const { sendText, sendTemplateMessage ,sendMedia,sendInteractiveButtonsMessage , sendInteractiveDualButtonsMessage} = require('./wati');
const{solveUserQuery} = require('./llama.js');
const { create } = require('domain');
const { send } = require('process');

webApp.use(express.json());
webApp.use(cors());


const getStudentData_Created = async (waId) => {
    var base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
    try {
        console.log("Getting student data....");

        const records = await base('Student').select({
            filterByFormula: `AND({Course Status} = 'Content Created', {Phone} = '${waId}',{Progress}='Pending')`,
        })
            .all();
        console.log(records);
        const filteredRecords = records.map(record => record.fields);
        return filteredRecords; // Note : this returns list of objects
    } catch (error) {
        console.error("Failed getting approved data", error);
    }
}
const updateStudentTableNextDayModule = async (waId, NextDay, NextModule) => {
    var base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
    try {
        let progress = "Pending";
        const CurrentDay = NextDay;
        const CurrentModule = NextModule;

        // Logic to update NextDay and NextModule
        if (NextModule == 3) {
            NextDay++;
            NextModule = 1;
        } else {
            NextModule++;
        }
        if (NextDay == 4) progress = "Completed";

        console.log("Updating student data....");

        // Fetching the record with the specified phone and other filters
        const records = await base('Student').select({
            filterByFormula: `AND({Course Status} = 'Content Created', {Phone} = '${waId}', {Progress} = 'Pending')`,
        }).all();

        if (records.length === 0) {
            console.log("No matching records found.");
            return; // Exit early if no records are found
        }

        const record = records[0];  // No need to map if we know there's a record
        const recordId = record.id;

        // Updated data to be patched into the record
        const updatedRecord = {
            "Module Completed": CurrentModule,
            "Day Completed": CurrentDay,
            "Next Day": NextDay,
            "Next Module": NextModule,
            "Progress": progress
        };

        console.log("Record ID to update:", recordId);
        console.log("Updated record data:", updatedRecord);

        // Updating the record (removed the extra "fields" key)
        await base('Student').update(recordId, updatedRecord);

        console.log("Record updated successfully");

    } catch (error) {
        console.error("Failed to update record", error);
    }
};

const getStudentData_Pending = async (waId) => {
    var base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
    try {
        console.log("Getting student data....");

        const records = await base('Student').select({
            filterByFormula: `AND({Course Status} = 'Content Created', {Phone} = '${waId}',{Progress}='Pending')`,
        })
            .all();
        console.log(records);
        const filteredRecords = records.map(record => record.fields);
        return filteredRecords; // Note : this returns list of objects
    } catch (error) {
        console.error("Failed getting approved data", error);
    }
}


const getCourseContent = async (courseTableName, NextModule, NextDay) => {
    var base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_COURSE_BASE_ID);
    try {
        console.log(NextDay, " ", NextModule);
        console.log("Getting course data from tables " + courseTableName + "....");
        const records = await base(courseTableName).select({
            filterByFormula: `{Day} = ${NextDay}`,
        })
            .all()
            .catch(err => console.log(err));
        console.log(records);
        return records;

    } catch (error) {
        console.error("Failed getting approved data", error);
    }
}

const getCourseCreatedStudent_airtable = async (waId) => {
    try {

        const records = await getStudentData_Created(waId);
        if (!records || records.length === 0) {
            console.log("No records found");
            return;
        }
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            let { Phone, Topic, Name, Goal, Style, Language, "Next Day": NextDay, "Next Module": NextModule } = record;
            const courseTableName = Topic + "_" + Phone;
            console.log(courseTableName, NextModule, NextDay);
            const courseData = await getCourseContent(courseTableName, NextModule, NextDay);
            if (!courseData || courseData.length === 0) {
                console.log("No course data found");
                return;
            }
            const currentModule = courseData[0].fields[`Module ${NextModule} Text`];
            const initialText = `Hello ${Name},\n\nI hope you are doing well. Here is your course content for today.\n Module ${NextModule}\n\n`;
            await sendText(initialText, Phone);
            setTimeout(() => { sendText(currentModule, Phone); }, 1000);

            await updateStudentTableNextDayModule(Phone, NextDay, NextModule);
            
            if (NextModule !== 3 || NextDay !== 3) {
                if (NextModule === 3) NextDay++;
                setTimeout(() => { 
                    if(NextModule ===3){
                        //Day over
                        // Now QNA time: user can ask for doubts.
                        sendInteractiveDualButtonsMessage(`Hey👋 ${Name}`, "You have completed the day's module. Do you have any doubts?", "Yes", "No", Phone); 
                    }else{
                        sendInteractiveButtonsMessage(`Hey👋 ${Name}`, "Don't let the learning stop!! Start next Module", "Next Module", Phone);
                    }
                }, 10000);

            } else {
                setTimeout(async() => {
                    sendText("Congratulations🎉🎊! You have completed the course. We are preparing your certificate of completion", Phone);
                    const pdfbuffer = await createCertificate(Name, Topic);
                    setTimeout(() => {
                        sendMedia(pdfbuffer,Name,Phone,"Hey👋, your course completion certificate is ready!! Don't forget to share your achievement.");
                    },5000);
                })
            }

            console.log(currentModule);
        }
    } catch (error) {
        console.error("Failed getting approved data", error);

    }
}

const get_student_table_send_remainder = async () => {
    var base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
    const records = await base('Student').select({
        filterByFormula: `AND({Course Status} = 'Content Created', {Progress} = 'Pending')`,
    }).all();
    for(let i=0;i<records.length;i++){
        let { Phone, Topic, Name, Goal, Style, Language, "Next Day": NextDay, "Next Module": NextModule } = records[i].fields;
        sendTemplateMessage(NextDay, Topic, "generic_course_template", Phone); sendText("Press Start Day to get started with next Module", Phone);

    }
}

const setDountBit = async (waId, doubtBit,Title) => {
    var base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
    try {
        console.log("Setting doubt bit....");

        // Fetching the record with the specified phone and other filters
        const records = await base('Student').select({
            filterByFormula: `AND({Phone} = '${waId}', {Progress} = 'Pending',{Topic}='${Title}')`,
        }).all();

        if (records.length === 0) {
            console.log("No matching records found.");
            return; // Exit early if no records are found
        }

        const record = records[0];  // No need to map if we know there's a record
        const recordId = record.id;

        // Updated data to be patched into the record
        const updatedRecord = {
            "Doubt": doubtBit
        };

        console.log("Record ID to update:", recordId);
        console.log("Updated record data:", updatedRecord);

        // Updating the record (removed the extra "fields" key)
        await base('Student').update(recordId, updatedRecord);

        console.log("Record updated successfully");

    } catch (error) {
        console.error("Failed to update record", error);
    }
}

const getDoubtBit = async (waId,Title) => {
    var base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
    try {
        console.log("Getting doubt bit....");

        // Fetching the record with the specified phone and other filters
        const records = await base('Student').select({
            filterByFormula: `AND({Phone} = '${waId}', {Progress} = 'Pending',{Topic}='${Title}')`,
        }).all();

        if (records.length === 0) {
            console.log("No matching records found.");
            return; // Exit early if no records are found
        }

        
        return record.fields.Doubt;

    } catch (error) {
        console.error("getdoubtbit fucntion: Failed to update record", error);
    }
}

webApp.get('/nextday', async (req, res) => {
    get_student_table_send_remainder();
    res.send("Sending Remainder to students");
});

webApp.post('/cop', async (req, res) => {
    const event = req.body;


    if ((event.eventType === 'message' && event.buttonReply && event.buttonReply.text === 'Start Day')) {
        console.log("Button Clicked");

        getCourseCreatedStudent_airtable(event.waId);

        console.log(event);


        const buttonText = event.buttonReply.text;
        const buttonPayload = event.buttonReply.payload;

        // console.log(`Button Text: ${buttonText}`);
        // console.log(`Button Payload: ${buttonPayload}`);


    }else if(event.type === 'interactive' &&  event.text === 'Next Module'){
        console.log("Button Clicked");

        getCourseCreatedStudent_airtable(event.waId);

        
    }else if(event.type === 'interactive' &&  event.text === 'Yes'){
        console.log("Button Clicked Yes");
        try {
            const records = await getStudentData_Pending(event.waId);
            const record = records[0];
            const { Phone, Topic, Name, Goal, Style, Language, "Next Day": NextDay, "Next Module": NextModule,"Doubt":Doubt } = record;
            //set doubt bit to true;
            setDountBit(event.waId,1,Topic);
        } catch (error) {
            console.error("Failed getting approved data", error);
        }
        sendText("Please type your query", event.waId);
    }else if(event.type==='interactive' && event.text === 'No'){
        //set doubt bit to false;
        try {
            const records = await getStudentData_Pending(event.waId);
            const record = records[0];
            const { Phone, Topic, Name, Goal, Style, Language, "Next Day": NextDay, "Next Module": NextModule,"Doubt":Doubt } = record;
            //set doubt bit to true;
            setDountBit(event.waId,0,Topic);
        } catch (error) {
            console.error("Failed getting approved data", error);
        }
        
        console.log("Button Clicked No");
        sendText("Great!! Keep learning and See you tomorrow!", event.waId);
    }else if(event.eventType === 'message'){
        let flag=false;
        let doubt=0;
        let name="User";
        let Phone=event.waId;
        try {
            const records = await getStudentData_Pending(event.waId);
            const record = records[0];
            const { "Name":Name, "Doubt":Doubt } = record;
            flag = true;
            doubt = Doubt;
            name=Name;
            
        } catch (error) {
            console.error("Failed getting approved data", error);
        }
        if(flag && doubt==1){
            //User query
            console.log("User Query", event.text);
            await solveUserQuery(event.text, event.waId);
            setTimeout(async () => {
                await sendInteractiveDualButtonsMessage(
                    `Hey👋 ${name}`, 
                    "Any other doubts?", 
                    "Yes", 
                    "No", 
                    Phone
                );
            }, 1000);  // 10 seconds delay

        }

    };


    res.sendStatus(200);//send acknowledgement to wati server
});


webApp.get("/ping", async (req, res) => {
    console.log("Pinging whatsapp server")
    course_approval.course_approval()
    res.send("Booting Up AI Engine.........")
})

const port = process.env.port || 3000;
webApp.listen(port, () => {
    console.log(`Server is up and running at ${port}`);
});