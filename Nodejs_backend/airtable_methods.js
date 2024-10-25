require('dotenv').config();
let axios = require('axios');




// let internal_course = new Airtable({ apiKey: process.env.airtable_api }).base(process.env.internal_course_base);
let course_base = process.env.course_base

let base_student = process.env.studentBase
let student_table = process.env.studentTable
let apiKey = process.env.personal_access_token;


// console.log(base)
async function updateField(id, field_name, updatedValue) {
    try {
        // const tableName = 'Student'; // Replace with your table name
        const url = `https://api.airtable.com/v0/${base_student}/${student_table}/${id}`;
        // console.log("Update URL ",url)

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    [field_name]: updatedValue
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Record updated successfully:');
    } catch (error) {
        console.error('Error updating record:', error);
    }
}

async function getID(number) {


    const url = `https://api.airtable.com/v0/${base_student}/${student_table}`;

    const params = new URLSearchParams({
        filterByFormula: `({Phone} = "${number}")`,
        view: 'Grid view'
    });

    try {
        const response = await fetch(`${url}?${params}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }

        const data = await response.json();

        if (data.records && data.records.length > 0) {
            const id = data.records[0].id;
            console.log("id", id);
            return id;
        } else {
            throw new Error('No matching record found');
        }
    } catch (error) {
        console.error('Error in getID:', error);
        //throw error;
    }
}

const totalDays = async (number) => {
    try {


        const course_tn = await findTable(number);
        // console.log("course_tn", course_tn);

        const url = `https://api.airtable.com/v0/${course_base}/${course_tn}?fields%5B%5D=Day`;
        console.log(url)



        const response = await fetch(`${url}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }

        const data = await response.json();

        const count = data.records.length;
        console.log("total days ", count);
        return count;

    } catch (error) {
        console.error('Error in totalDays:', error);
        // //throw error;
    }
};


const findTable = async (number) => {

    const url = `https://api.airtable.com/v0/${base_student}/${student_table}`;

    const params = new URLSearchParams({
        filterByFormula: `({Phone} = "${number}")`,
        view: 'Grid view'
    });

    try {
        const response = await fetch(`${url}?${params}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }

        const data = await response.json();
        console.log("findTable ", data.records[0]);
        if (data.records && data.records.length > 0) {
            const course_tn = data.records[0].fields.Topic;
            // console.log("Table Name = " + course_tn);
            return course_tn;
        } else {
            // throw new Error('No matching record found');
        }
    } catch (error) {
        console.error('Error in findTable:', error);
        //throw error;
    }
};

const findRecord = async (id) => {
    const url = `https://api.airtable.com/v0/${base_student}/${student_table}/${id}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }

        const data = await response.json();

        const field_name = "Question Responses";
        return data.fields[field_name];
    } catch (error) {
        console.error('Error in findRecord:', error);
        // //throw error;
    }
};



const findQuesRecord = async (id) => {

    const url = `https://api.airtable.com/v0/${base_student}/${student_table}/${id}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }

        const data = await response.json();
        // console.log("Data ", data)

        return data.fields.Responses;
    } catch (error) {
        console.error('Error in findQuesRecord:', error);
        // //throw error;
    }
};

const findTitle = async (currentDay, module_no, number) => {

    try {
        // First, get the course table name
        const course_tn = await findTable(number);

        const url = `https://api.airtable.com/v0/${course_base}/${course_tn}`;

        const params = new URLSearchParams({
            filterByFormula: `({Day} = ${currentDay})`,
            view: 'Grid view'
        });

        const response = await fetch(`${url}?${params}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }

        const data = await response.json();

        if (data.records && data.records.length > 0) {
            for (const record of data.records) {
                const titleField = `Module ${module_no} LTitle`;
                const optionsField = `Module ${module_no} List`;

                const title = record.fields[titleField];
                const options = record.fields[optionsField];

                if (title !== undefined) {
                    console.log(title, options.split("\n"));
                    return [title, options.split("\n")];
                }
            }
            // If we've gone through all records and haven't returned, no matching title was found
            return [0, 0];
        } else {
            return [0, 0];
        }
    } catch (error) {
        console.error('Error in findTitle:', error);
        // //throw error;
    }
};

const findInteractive = async (currentDay, module_no, number) => {

    try {
        // First, get the course table name
        const course_tn = await findTable(number);

        const url = `https://api.airtable.com/v0/${course_base}/${course_tn}`;

        const params = new URLSearchParams({
            filterByFormula: `({Day} = ${currentDay})`,
            view: 'Grid view'
        });

        const response = await fetch(`${url}?${params}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }

        const data = await response.json();

        if (data.records && data.records.length > 0) {
            for (const record of data.records) {
                const bodyField = `Module ${module_no} iBody`;
                const buttonsField = `Module ${module_no} iButtons`;

                const body = record.fields[bodyField];
                const buttons = record.fields[buttonsField];

                if (body !== undefined) {
                    return [body, buttons.split("\n")];
                }
            }
            // If we've gone through all records and haven't returned, no matching body was found
            return "No matching interactive content found"
        } else {
            return "No records found for the given day"
        }
    } catch (error) {
        console.error('Error in findInteractive:', error);
        // //throw error;
    }
};

const findQuestion = async (currentDay, module_no, number) => {


    try {
        // First, get the course table name
        const course_tn = await findTable(number);

        const url = `https://api.airtable.com/v0/${course_base}/${course_tn}`;

        const params = new URLSearchParams({
            filterByFormula: `({Day} = ${currentDay})`,
            view: 'Grid view'
        });

        const response = await fetch(`${url}?${params}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }

        const data = await response.json();

        if (data.records && data.records.length > 0) {
            for (const record of data.records) {
                const questionField = `Module ${module_no} Question`;
                const body = record.fields[questionField];

                if (body !== undefined) {
                    return body;
                }
            }
            // If we've gone through all records and haven't returned, no matching question was found
            return "No matching question found"
        } else {
            return "No records found for the given day";
        }
    } catch (error) {
        console.error('Error in findQuestion:', error);
        // //throw error;
    }
};

const findLastMsg = async (number) => {

    try {
        const url = `https://api.airtable.com/v0/${base_student}/${student_table}`;

        const params = new URLSearchParams({
            filterByFormula: `({Phone} = "${number}")`,
            view: 'Grid view'
        });

        const response = await fetch(`${url}?${params}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            return undefined;
        }

        const data = await response.json();

        if (data.records && data.records.length > 0) {
            const lastMsg = data.records[0].fields.Last_Msg;
            // console.log("Last msg of " + number, lastMsg);
            return lastMsg !== undefined ? lastMsg : undefined;
        }

        return undefined;

    } catch (error) {
        console.error('Error in findLastMsg:', error);
        return undefined;
    }
};

const find_ContentField = async (field, currentDay, current_module, number) => {

    try {
        // First, get the course table name
        const course_tn = await findTable(number);

        const url = `https://api.airtable.com/v0/${course_base}/${course_tn}`;

        const params = new URLSearchParams({
            filterByFormula: `({Day} = ${currentDay})`,
            view: 'Grid view'
        });

        const response = await fetch(`${url}?${params}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            return 0;
        }

        const data = await response.json();

        if (data.records && data.records.length > 0) {
            for (const record of data.records) {
                const fieldName = `Module ${current_module} ${field}`;
                const body = record.fields[fieldName];

                if (body !== undefined) {
                    // console.log("Feedback  " + number, body);
                    return body.split("\n");
                }
            }
        }

        console.log("Feedback  0");
        return 0;

    } catch (error) {
        console.error('Error in find_ContentField:', error);
        return 0;
    }
};

const findField = async (field, number) => {

    try {
        const url = `https://api.airtable.com/v0/${base_student}/${student_table}`;

        const params = new URLSearchParams({
            filterByFormula: `({Phone} = "${number}")`,
            view: 'Grid view'
        });

        const response = await fetch(`${url}?${params}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            return 0;
        }

        const data = await response.json();

        if (data.records && data.records.length > 0) {
            const body = data.records[0].fields[field];
            return body !== undefined ? body : 0;
        }

        return 0;

    } catch (error) {
        console.error('Error in findField:', error);
        return 0;
    }
};

const findAns = async (currentDay, module_no, number) => {

    try {
        // First, get the course table name
        const course_tn = await findTable(number);

        const url = `https://api.airtable.com/v0/${course_base}/${course_tn}`;

        const params = new URLSearchParams({
            filterByFormula: `({Day} = ${currentDay})`,
            view: 'Grid view'
        });

        const response = await fetch(`${url}?${params}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            return null;
        }

        const data = await response.json();

        if (data.records && data.records.length > 0) {
            const ansField = `Module ${module_no} Ans`;
            const body = data.records[0].fields[ansField];
            return body !== undefined ? body : null;
        }

        return null;

    } catch (error) {
        console.error('Error in findAns:', error);
        return null;
    }
};

//--------------------------------------------------------

async function createTable(course_name, course_fields) {
    let data = JSON.stringify({
        "description": course_name + "Course generated by COP",
        "fields": course_fields,
        "name": course_name
    });

    // console.log("data ", data)
    let config = {
        method: 'post',

        url: `https://api.airtable.com/v0/meta/bases/${course_base}/tables`,
        headers: {
            'Authorization': `Bearer ${process.env.personal_access_token}`,
            'Content-Type': 'application/json',

        },
        data: data
    };

    table_id = axios.request(config)
        .then((response) => {
            console.log(JSON.stringify(response.data.id));
            console.log(typeof (response.data.id))
            return response.data.id
        })
        .catch((error) => {
            console.log("1. error ", error.response.data);
            if (error.response.data.error.type == "DUPLICATE_OR_EMPTY_FIELD_NAME") {
                console.log("DUPLICATE_OR_EMPTY_FIELD_NAME ", error.response.data.error)
                // console.log(typeof (error.response.data))

            }
            else {
                console.log("2. error ", error.response.data);
                console.log(typeof (error.response.data))

            }
            return error.response.data
        });
    return table_id
}

// async function createTable(course_name, course_fields) {
//     let data = JSON.stringify({
//         "description": course_name + "Course generated by COP",
//         "fields": course_fields,
//         "name": course_name
//     });

//     console.log("data here :", data);

//     let config = {
//         method: 'post',
//         url: `https://api.airtable.com/v0/meta/bases/appESkhemFLj2ftxN/tables`,
//         headers: {
//             'Authorization': `Bearer ${process.env.personal_access_token}`,
//             'Content-Type': 'application/json',
//         },
//         data: data,
//         timeout: 10000,
//     };

//     for (let attempt = 0; attempt < 3; attempt++) {
//         try {
//             let response = await axios.request(config);
//             console.log("response.data.id : ", JSON.stringify(response.data.id));
//             console.log(typeof (response.data.id));
//             return response.data.id;
//         } catch (error) {
//             // if (error.code === 'ETIMEDOUT') {
//             //     console.error('Request timed out. Retrying...');
//             //     continue;
//             // }
//             // if (error.response && error.response.data) {
//             //     console.log("1. error ", error.response.data);
//             //     if (error.response.data.error && error.response.data.error.type == "DUPLICATE_OR_EMPTY_FIELD_NAME") {
//             //         console.log("DUPLICATE_OR_EMPTY_FIELD_NAME ", error.response.data.error);
//             //         console.log(typeof (error.response.data));
//             //     } else {
//             //         console.log("2. error ", error.response.data);
//             //         console.log(typeof (error.response.data));
//             //     }
//             //     return error.response.data;
//             // } else {
//             console.error("An error occurred: ", error.response.data);
//             // }
//         }
//     }

//     console.error('Failed to create table after 3 attempts');
//     return null;
// }


// // const fetch = require('node-fetch');

// async function createTable(course_name, course_fields) {
//     const data = JSON.stringify({
//         "description": course_name + "Course generated by COP",
//         "fields": course_fields,
//         "name": course_name
//     });

//     console.log("data here:", data);

//     const config = {
//         method: 'POST',
//         headers: {
//             'Authorization': `Bearer ${process.env.personal_access_token}`,
//             'Content-Type': 'application/json',
//         },
//         body: data,
//         timeout: 10000,
//     };

//     try {
//         const response = await fetch(`https://api.airtable.com/v0/meta/bases/${process.env.course_base}/tables`, config);
//         const responseData = await response.json();
//         console.log("response.data.id:", JSON.stringify(responseData.id));
//         console.log(typeof (responseData.id));
//         return responseData.id;
//     } catch (error) {
//         console.error("An error occurred:", error);
//         return null;
//     }
// }


async function updateCourseTable(course_name, new_table_name) {
    let data = JSON.stringify({
        "name": new_table_name
    });

    // console.log("data ", data)
    let config = {
        method: 'patch',

        url: `https://api.airtable.com/v0/meta/bases/${course_base}/tables/${course_name}`,
        headers: {
            'Authorization': `Bearer ${process.env.personal_access_token}`,
            'Content-Type': 'application/json',

        },
        data: data
    };

    table_id = axios.request(config)
        .then((response) => {
            // console.log(JSON.stringify(response.data.id));
            // console.log(typeof (response.data.id))
            return response.status
        })
        .catch((error) => {
            console.log("1. update table error ", error.response.data);

            return error.response.data
        });
    return table_id
}

async function create_record(record_array, course_name) {
    let data = JSON.stringify({
        "records": record_array
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://api.airtable.com/v0/${course_base}/` + course_name,
        headers: {
            'Authorization': `Bearer ${process.env.personal_access_token}`,
            'Content-Type': 'application/json',

        },
        data: data
    };

    result = axios.request(config)
        .then((response) => {
            console.log(response.data);
            return response.status

        })
        .catch((error) => {
            console.log(error.response.data);
            return error.response.data
        });
    return result

}

async function create_student_record(senderID, name, topic) {
    let data = JSON.stringify({
        "records": [{
            fields: {
                'Phone': senderID,
                'Name': name,
                'Topic': topic,
                'Module Completed': 0,
                'Next Module': 1,
                'Day Completed': 0,
                'Next Day': 1,
                'Progress': 'In Progress'
            }
        }
        ]
    });

    let config = {
        method: 'post',
        url: `https://api.airtable.com/v0/${base_student}/${student_table}`,
        headers: {
            'Authorization': `Bearer ${process.env.personal_access_token}`,
            'Content-Type': 'application/json',

        },
        data: data
    };

    result = axios.request(config)
        .then((response) => {
            console.log(response.data);
            return response.status

        })
        .catch((error) => {
            console.log(error.response.data);
            return error.response.data
        });
    return result

}

async function update_student_record(id) {
    let data = JSON.stringify({
        "records": [{
            fields: {
                'Module Completed': 0,
                'Next Module': 1,
                'Day Completed': 0,
                'Next Day': 1,
                'Progress': 'In Progress'
            }
        }
        ]
    });

    let config = {
        method: 'patch',
        url: `https://api.airtable.com/v0/${base_student}/${student_table}/${id}`,
        headers: {
            'Authorization': `Bearer ${process.env.personal_access_token}`,
            'Content-Type': 'application/json',

        },
        data: data
    };

    result = axios.request(config)
        .then((response) => {
            console.log("Updated Student", response.data);
            return response.status

        })
        .catch((error) => {
            console.log("Student Update Error", error.response.data);
            return error.response.data
        });
    return result

}
async function create_course_record(senderID, name) {
    let data = JSON.stringify({
        "records": [{
            fields: {
                'Phone': senderID,
                'Name': name,
                'Topic': "",
                'Course Status': "Pending Approval",
                'Progress': "In Progress",
            }
        }
        ]
    });

    let config = {
        method: 'post',
        url: `https://api.airtable.com/v0/${base_student}/${student_table}`,
        headers: {
            'Authorization': `Bearer ${process.env.personal_access_token}`,
            'Content-Type': 'application/json',

        },
        data: data
    };

    result = axios.request(config)
        .then((response) => {
            console.log(response.data);
            return response.status

        })
        .catch((error) => {
            console.log(error.response.data);
            return error.response.data
        });
    return result

}

async function find_student_record(senderID) {



    let config = {
        method: 'GET',
        url: `https://api.airtable.com/v0/${base_student}/${student_table}?fields%5B%5D=Phone&filterByFormula=Phone%3D${senderID}`,
        headers: {
            'Authorization': `Bearer ${process.env.personal_access_token}`,
            'Content-Type': 'application/json',

        },


    };

    result = axios.request(config)
        .then((response) => {

            res = response.data
            console.log(res);
            return response.data.records

        })
        .catch((error) => {
            console.log(error);
            return error.response.data
        });
    return result

}

async function find_alfred_course_record(senderID) {



    let config = {
        method: 'GET',
        url: `https://api.airtable.com/v0/${base_student}/${student_table}?fields%5B%5D=Phone&fields%5B%5D=Last_Msg&filterByFormula=Phone%3D${senderID}`,
        headers: {
            'Authorization': `Bearer ${process.env.personal_access_token}`,
            'Content-Type': 'application/json',

        },


    };

    result = axios.request(config)
        .then((response) => {

            res = response.data
            // console.log("Alfred  Record ", res.records);
            return response.data.records

        })
        .catch((error) => {
            console.log("Alfred  Record Error", error);
            return error.response.data
        });
    return result

}

async function existingStudents(senderID) {
    let config = {
        method: 'GET',
        url: `https://api.airtable.com/v0/${process.env.alfred_waitlist_base}/tblAq61H84ablbDlW?fields%5B%5D=Phone&fields%5B%5D=Topic`,
        headers: {
            'Authorization': `Bearer ${process.env.personal_access_token}`,
            'Content-Type': 'application/json',

        },


    };

    result = axios.request(config)
        .then((response) => {

            res = response.data
            // console.log("Existing Records ", res.records);
            return response.data.records

        })
        .catch((error) => {
            console.log(error);
            return error.response.data
        });
    return result

}

async function existingStudents_internal(senderID) {
    let config = {
        method: 'GET',
        url: `https://api.airtable.com/v0/${base_student}/${student_table}?fields%5B%5D=Phone&fields%5B%5D=Course&fields%5B%5D=Last_Msg&filterByFormula=Phone%3D${senderID}`,
        headers: {
            'Authorization': `Bearer ${process.env.personal_access_token}`,
            'Content-Type': 'application/json',

        },


    };

    result = axios.request(config)
        .then((response) => {

            res = response.data
            // console.log("Existing Records ", res.records);
            return response.data.records

        })
        .catch((error) => {
            console.log(error);
            return error.response.data
        });
    return result

}
async function update_internal_student_record(student_id, last_msg) {
    let data = JSON.stringify(
        {
            fields: {

                'Last_Msg': last_msg,
                'Source': "COP"

            }
        }

    );

    let config = {
        method: 'PATCH',
        url: `https://api.airtable.com/v0/${base_student}/${student_table}/${student_id}`,
        headers: {
            'Authorization': `Bearer ${process.env.personal_access_token}`,
            'Content-Type': 'application/json',

        },
        data: data

    };

    result = axios.request(config)
        .then((response) => {

            res = response.data.records
            // console.log(res.length);
            return response.status

        })
        .catch((error) => {
            console.log("1. ", error.response.data);
            return error.response.data
        });
    return result

}

async function update_student_record(student_id, course_name) {
    let data = JSON.stringify(
        {
            fields: {

                'Topic': course_name,
                'Module Completed': 0,
                'Next Module': 1,
                'Day Completed': 0,
                'Next Day': 1

            }
        }

    );

    let config = {
        method: 'PATCH',
        url: `https://api.airtable.com/v0/${base_student}/${student_table}/${student_id}`,
        headers: {
            'Authorization': `Bearer ${process.env.personal_access_token}`,
            'Content-Type': 'application/json',

        },
        data: data

    };

    result = axios.request(config)
        .then((response) => {

            res = response.data.records
            // console.log(res.length);
            return response.status

        })
        .catch((error) => {
            console.log(error.response.data);
            return error.response.data
        });
    return result

}

async function updateAlfredData(course_id, field_name, field_value) {
    let data = JSON.stringify(
        {
            fields: {

                [field_name]: field_value,

            }
        }

    );

    let config = {
        method: 'PATCH',
        url: `https://api.airtable.com/v0/${base_student}/${student_table}/${course_id}`,
        headers: {
            'Authorization': `Bearer ${process.env.personal_access_token}`,
            'Content-Type': 'application/json',

        },
        data: data

    };

    result = axios.request(config)
        .then((response) => {

            res = response.data.records
            // console.log(res.length);
            return response.status

        })
        .catch((error) => {
            console.log(error.response.data);
            return error.response.data
        });
    return result

}

async function ListCourseFields(course_name) {


    let config = {
        method: 'GET',

        url: `https://api.airtable.com/v0/${course_base}/${course_name}`,
        headers: {
            'Authorization': `Bearer ${process.env.personal_access_token}`,
            'Content-Type': 'application/json',

        },


    };

    result = axios.request(config)
        .then((response) => {

            res = response.data.records

            console.log(res);
            return response.data

        })
        .catch((error) => {
            console.log("List record ", error.response.data);
            return error.response.data
        });
    return result

}

module.exports = {
    createTable, create_record, create_student_record, find_student_record, update_student_record, findTable,
    totalDays,
    updateField,
    findRecord,
    findTitle,
    findInteractive,
    findQuestion,
    findQuesRecord,
    getID,
    findLastMsg,
    findField,
    findAns,
    find_ContentField,
    existingStudents
    , find_alfred_course_record
    , create_course_record
    , updateAlfredData,
    updateCourseTable,
    ListCourseFields,
    existingStudents_internal,
    update_internal_student_record,

}