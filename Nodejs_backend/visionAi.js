(async () => {
    const fetch = (await import('node-fetch')).default; // Dynamic import of node-fetch
    const { BlobServiceClient } = require('@azure/storage-blob'); // Import Azure Storage Blob SDK

    const AZURE_STORAGE_CONNECTION_STRING = process.env.azurestring; // Replace with your Azure Storage connection string
    const CONTAINER_NAME = process.env.containername; // Replace with your blob container name

    // Function to fetch image with auth headers
    const fetchImage = async (url, authHeaders) => {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: authHeaders
            });

            // Check if the response is ok and log headers for debugging
            console.log(`Fetch Response Status: ${response.status}`);
            console.log(`Fetch Response Headers:`, response.headers.raw());

            if (!response.ok) {
                throw new Error(`Image not accessible: ${response.status}`);
            }

            // Check if the response is of image type
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.startsWith('image/')) {
                throw new Error(`Expected an image but got: ${contentType}`);
            }

            const buffer = await response.buffer(); // Await buffer creation
            return buffer;
        } catch (error) {
            console.error('Error fetching image:', error);
            return null; // Return null on error
        }
    };

    // Function to upload image to Azure Blob Storage
    const uploadImageToBlob = async (imageBuffer, blobName) => {
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        
        // Create the container if it does not exist
        await containerClient.createIfNotExists();
        
        // Upload the image
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.upload(imageBuffer, imageBuffer.length, {
            blobHTTPHeaders: {
                blobContentType: 'image/jpg',
                blobContentDisposition: 'inline' // Set to inline for viewing
            }
        });

        console.log(`Image uploaded to Azure Blob Storage: ${blobName}`);
        console.log(`Public URL: ${blockBlobClient.url}`);
        return blockBlobClient.url; // Return the public URL of the uploaded image
    };

    // Function to call the vision model API
    const callVisionModel = async (imageUrl) => {
        const apiEndpoint = process.env.tuneapi;
        const apiKey = process.env.tuneapikey; // Make sure to handle your API key securely

        try {
            const response = await fetch(apiEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": apiKey,
                },
                body: JSON.stringify({
                    temperature: 0.8,
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: "\n"
                                }
                            ]
                        },
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: "what is it"
                                },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: imageUrl // Use the public URL from Azure
                                    }
                                }
                            ]
                        }
                    ],
                    model: "meta/llama-3.2-90b-vision",
                    stream: false,
                    frequency_penalty: 0,
                    max_tokens: 900
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Response Data:", data);
            const message = data.choices[0].message;
            console.log("Message Content:", message.content);
            return message.content; // Return the message content
        } catch (error) {
            console.error("Error fetching data:", error);
            return null; // Return null or an appropriate value to indicate failure
        }
    };

    // Example usage
    const imageUrl = ""; // Replace with your image URL
    const authHeaders = {
        "Authorization": "token" // Replace with your auth token
    };

    const imageBuffer = await fetchImage(imageUrl, authHeaders);
    if (imageBuffer) {
        const blobName = "uploaded_image.jpg"; // Name for the uploaded image
        const publicUrl = await uploadImageToBlob(imageBuffer, blobName);
        await callVisionModel(publicUrl);
    }
})();
