import streamlit as st
import torch
import base64
import os
import warnings
import requests
import json
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import threading
import socket
import time
import io

# Suppress warnings
warnings.filterwarnings("ignore")

# API configurations
TUNE_API_URL = "https://proxy.tune.app/chat/completions"
TUNE_API_KEY = os.environ.get("TUNE_API_KEY", "sk-tune-noF4s7Wn00G0BYf6CHTw2I7D3HvwkxMeJ6x")
TUNE_ORG_ID = os.environ.get("TUNE_ORG_ID", "")
TUNE_MODEL_NAME = "meta/llama-3.2-90b-vision"

SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"
SARVAM_TTS_KEY = "8284730b-1772-4702-a0aa-2d0f0bf4f793"

# System prompts
SYSTEM_PROMPT_ENGLISH = """You are Alfred, a helpful AI assistant by ekatra. Respond directly to the user's input without repeating their messages. Be concise, relevant, and avoid roleplaying or making claims about being a specific gender or person. If you don't understand or can't answer a question, say so politely."""

SYSTEM_PROMPT_MARATHI = """तुम्ही एकत्र द्वारे तयार केलेले अल्फ्रेड आहात, एक सहाय्यक AI सहाय्यक. वापरकर्त्याच्या इनपुटला थेट प्रतिसाद द्या, त्यांचे संदेश पुन्हा न सांगता. संक्षिप्त, संबंधित राहा आणि रोल-प्ले करणे किंवा विशिष्ट लिंग किंवा व्यक्ती असल्याचा दावा करणे टाळा. जर तुम्हाला प्रश्न समजत नसेल किंवा उत्तर देता येत नसेल तर विनम्रपणे सांगा."""

# Flask app
app = Flask(__name__)
CORS(app)

# Connected clients
connected_clients = set()

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

def generate_speech(text, language_code="mr-IN"):
    """Generate speech from text using Sarvam TTS API"""
    try:
        payload = {
            "inputs": [text],
            "target_language_code": language_code
        }
        headers = {
            "api-subscription-key": SARVAM_TTS_KEY,
            "Content-Type": "application/json"
        }
        
        response = requests.post(SARVAM_TTS_URL, json=payload, headers=headers)
        response.raise_for_status()
        
        # Get the base64 encoded audio
        audio_data = response.json()["audios"][0]
        return audio_data
        
    except Exception as e:
        print(f"Error generating speech: {str(e)}")
        return None

def generate_response_tune(prompt, language="english"):
    try:
        # Add language instruction to the prompt for Marathi responses
        if language == "marathi":
            system_prompt = SYSTEM_PROMPT_MARATHI
            prompt = f"Please provide the response in Marathi (मराठी) language only. User query: {prompt}"
        else:
            system_prompt = SYSTEM_PROMPT_ENGLISH

        payload = {
            "model": TUNE_MODEL_NAME,
            "messages": [
                {
                    "content": system_prompt,
                    "role": "system"
                },
                {
                    "content": prompt,
                    "role": "user"
                }
            ],
            "max_tokens": 150,
            "temperature": 0.7,
            "top_p": 0.95
        }
        
        headers = {
            "Authorization": f"Bearer {TUNE_API_KEY}",
            "X-Org-Id": TUNE_ORG_ID,
            "Content-Type": "application/json"
        }
        
        response = requests.post(TUNE_API_URL, json=payload, headers=headers)
        response.raise_for_status()
        
        response_text = response.json()["choices"][0]["message"]["content"].strip()
        
        if language == "marathi":
            # Generate English response
            english_payload = {
                "model": TUNE_MODEL_NAME,
                "messages": [
                    {
                        "content": SYSTEM_PROMPT_ENGLISH,
                        "role": "system"
                    },
                    {
                        "content": prompt,
                        "role": "user"
                    }
                ],
                "max_tokens": 150,
                "temperature": 0.7,
                "top_p": 0.95
            }
            
            english_response = requests.post(TUNE_API_URL, json=english_payload, headers=headers)
            english_response.raise_for_status()
            english_text = english_response.json()["choices"][0]["message"]["content"].strip()
            
            # Generate speech for Marathi response
            audio_data = generate_speech(response_text)
            
            return {
                "english": english_text,
                "marathi": response_text,
                "audio": audio_data
            }
        else:
            return {"response": response_text}
            
    except Exception as e:
        print(f"Error with Tune API request: {str(e)}")
        return {"error": str(e)}

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    prompt = data.get('prompt')
    language = data.get('language', 'english')
    
    response = generate_response_tune(prompt, language)
    return jsonify(response)

@app.route('/audio/<path:filename>')
def serve_audio(filename):
    try:
        # Convert base64 to audio file
        audio_data = base64.b64decode(filename)
        return send_file(
            io.BytesIO(audio_data),
            mimetype='audio/wav',
            as_attachment=True,
            download_name='response.wav'
        )
    except Exception as e:
        return str(e), 400

@app.route('/connect', methods=['POST'])
def connect():
    client_id = request.remote_addr
    connected_clients.add(client_id)
    return jsonify({"message": "Connected successfully"})

@app.route('/disconnect', methods=['POST'])
def disconnect():
    client_id = request.remote_addr
    if client_id in connected_clients:
        connected_clients.remove(client_id)
    return jsonify({"message": "Disconnected successfully"})

@app.route('/clients', methods=['GET'])
def get_clients():
    return jsonify({"clients": list(connected_clients)})

def run_server():
    app.run(host='0.0.0.0', port=5000)

if __name__ == "__main__":
    os.environ["TOKENIZERS_PARALLELISM"] = "false"
    
    local_ip = get_local_ip()
    print(f" * Server running on http://{local_ip}:5000")

    # Run Flask app in a separate thread
    threading.Thread(target=run_server, daemon=True).start()

    # Run Streamlit app for server monitoring
    st.title("Inference Server Monitor")
    st.write(f"Server URL: http://{local_ip}:5000")
    st.write("Using Tune API for inference and Sarvam AI for TTS")
    
    # Create a placeholder for the client list
    client_list = st.empty()

    # Update the client list every 5 seconds
    while True:
        with client_list.container():
            st.write("Connected Clients:")
            for client in connected_clients:
                st.write(f"- {client}")
        time.sleep(5)
