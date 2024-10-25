
const Airtable = require('airtable');
require('dotenv').config();
const express = require('express');
const { sendTemplateMessage,sendText } = require('./wati');
const axios = require('axios');




const getApprovedRecords = async () => {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
    try {
        const records = await base('Student').select({
            filterByFormula: `{Course Status} = 'Approved'`,
        }).all();
        return records.map(record => record.fields);
    } catch (error) {
        console.error("Failed getting approved data", error);
    }
};

async function createTable(courseName, moduleNumber = 3) {
    const airtableFields = [
        { name: "Day", type: "number", options: { precision: 0 } },
        ...Array.from({ length: moduleNumber }, (_, i) => ({
            name: `Module ${i + 1} Text`,
            type: "multilineText"
        }))
    ];

    const requestBody = {
        name: courseName,
        description: "A description of the course topics",
        fields: airtableFields
    };

    try {
        const response = await fetch(`https://api.airtable.com/v0/meta/bases/${process.env.AIRTABLE_COURSE_BASE_ID}/tables`, {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            const responseData = await response.json();
            return responseData.id;
        } else {
            const responseData = await response.json();
            console.error("Error creating table:", responseData);
        }
    } catch (error) {
        console.error("Error creating table:", error);
    }
}

async function updateCourseRecords(tableId, courseData) {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_COURSE_BASE_ID);
    let dayno = 1;
    for (const [day, modules] of Object.entries(courseData)) {
        const moduleContents = [
            modules.module1?.content || "",
            modules.module2?.content || "",
            modules.module3?.content || ""
        ];
        await base(tableId).create([{
            fields: {
                "Day": Number(dayno++),
                "Module 1 Text": moduleContents[0],
                "Module 2 Text": moduleContents[1],
                "Module 3 Text": moduleContents[2]
            }
        }]);
    }
}

async function cleanUpStudentTable(phoneNumber, status = "Content Created") {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
    const records = await base('Student').select({
        filterByFormula: `AND({Phone} = ${phoneNumber},{Course Status}= "Approved")`
    }).all();
    if (records.length > 0) {
        await base('Student').update([{ id: records[0].id, fields: { "Course Status": status } }]);
    }
}

const generateCourse = async () => {
    const approvedRecords = await getApprovedRecords();
    console.log("Running AI Engine.....");
    if (approvedRecords.length > 0) {
        for (let i = 0; i < approvedRecords.length; i++) {
            const record = approvedRecords[i];
            //   const id = approvedRecords[i][0];
            const { Phone, Topic, Name, Goal, Style, Language, "Next Day": NextDay } = record;
            //   console.log("Generating course for ",id);
            try {
                const prompt = `Create a 3-day micro-course on ${Topic} in ${Language} using teaching style of ${Style}, delivered via WhatsApp. The students' goal is to understand the gaming landscape and career opportunities in the industry. Strict Guidelines: Structure: 3 days, 3 modules per day (total of 9 modules). Content: Each module must contain engaging and informative content, with a minimum of 10 sentences. Module Length: Ensure that each module is between 10 to 12 sentences, providing comprehensive insights while remaining concise. Style: Use a professional teaching style that encourages learning and engagement. Language: All content must be in English. Engagement: Incorporate 1-2 relevant emojis in each module to enhance engagement. Formatting: Use '\n' for new lines in the JSON format. Content Approach: Start each module with a hook or key point. Focus on one core concept or skill per module. Use clear, simple language suitable for mobile reading. Include a brief actionable task or reflection question at the end of each module. Output Format: Provide the micro-course in JSON format as follows:{ "day1": { "module1": { "content": "Concise content for Day 1, Module 1..." }, "module2": { "content": "Concise content for Day 1, Module 2..." }, "module3": { "content": "Concise content for Day 1, Module 3..." } }, "day2": { "module1": { "content": "Concise content for Day 2, Module 1..." }, "module2": { "content": "Concise content for Day 2, Module 2..." }, "module3": { "content": "Concise content for Day 2, Module 3..." } }, "day3": { "module1": { "content": "Concise content for Day 3, Module 1..." }, "module2": { "content": "Concise content for Day 3, Module 2..." }, "module3": { "content": "Concise content for Day 3, Module 3..." } } } dont give any other words other than json
                `
                const headers = {
                    "Content-Type": "application/json",
                    "Authorization": process.env.AZURE_LLAMA_API_KEY,
                };

                const payload = {
                    messages: [
                        {
                            role: "system",
                            content: prompt,
                        }
                    ],
                    temperature: 0
                };

                const ENDPOINT = process.env.AZURE_LLAMA_ENDPOINT;

                // Send request to OpenAI API
                const response = await axios.post(ENDPOINT, payload, { headers: headers });
                if (response.data.choices[0].message.content) {
                    console.log("Course generated successfully");
                    console.log(response.data.choices[0].message.content);
                    
                    let st = response.data.choices[0].message.content;
                    st=st.replaceAll("```", ""); //Filter the response to exclude umcessary characters
                    const courseData = JSON.parse(st);
                    // console.log(courseData);
                    const Tableid = await createTable(Topic + "_" + Phone);
                    
                    await updateCourseRecords(Tableid, courseData);
                    await cleanUpStudentTable(Phone);
                    console.log("-->", NextDay, Topic, "generic_course_template", Phone);
                    await sendTemplateMessage(NextDay, Topic, "generic_course_template", Phone);


                } else {
                    console.log("Failed to generate course");
                    cleanUpStudentTable(Phone, "Failed");
                }
            } catch (error) {
                console.error("Failed to create course", error);
                cleanUpStudentTable(Phone, "Failed");
            }
        }
    } else {
        console.log("No approved records found");
    }
}

const solveUserQuery = async (prompt,waId) => {
    try {
        const headers = {
            "Content-Type": "application/json",
            "Authorization": process.env.AZURE_LLAMA_API_KEY,
        };

        const payload = {
            messages: [
                {
                    role: "system",
                    content: "Your a a doubt solver give short crisp and correct answer to this query : "+ prompt + " (If the query is not genuine or maliciaous then send that this query violates the Ekatra guidelines)",
                }
            ],
            temperature: 0
        };
        const ENDPOINT = process.env.AZURE_LLAMA_ENDPOINT;
        // Send request to OpenAI API
        const response = await axios.post(ENDPOINT, payload, { headers: headers });
        if (response.data.choices[0].message.content){
            let st = response.data.choices[0].message.content;
            st=st.replaceAll("```", ""); //Filter the response to exclude umcessary characters
            sendText(st, waId);
            
        }

    } catch (error) {
        console.error("Failed to solve user query", error);
        
    }
}

module.exports = { generateCourse,solveUserQuery };


