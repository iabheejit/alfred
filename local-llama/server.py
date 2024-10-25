import streamlit as st
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from huggingface_hub import login, snapshot_download
from huggingface_hub.utils import RepositoryNotFoundError, RevisionNotFoundError
import os
import warnings
import requests
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import socket
import time

# Suppress warnings
warnings.filterwarnings("ignore")

# Hugging Face configuration
HF_TOKEN = os.environ.get("HF_TOKEN", "")
HF_MODEL_NAME = "meta-llama/Llama-3.2-1B-Instruct"

# Tune AI API configuration
TUNE_API_URL = "https://proxy.tune.app/chat/completions"
TUNE_API_KEY = os.environ.get("TUNE_API_KEY", "sk-tune-")
TUNE_ORG_ID = os.environ.get("TUNE_ORG_ID", "")
TUNE_MODEL_NAME = "meta/llama-3.2-90b-vision"

# System prompt
SYSTEM_PROMPT = """You are Alfred, a helpful AI assistant by ekatra. Respond directly to the user's input without repeating their messages. Be concise, relevant, and avoid roleplaying or making claims about being a specific gender or person. If you don't understand or can't answer a question, say so politely."""

# Global variables for model and tokenizer
global_model = None
global_tokenizer = None

# Flask app
app = Flask(__name__)
CORS(app)

# Connected clients
connected_clients = set()

# Server-side model selection
USE_LOCAL_MODEL = False  # Set this to False to use the Tune AI API

# Function to get local IP address
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

def check_model_availability(model_name):
    try:
        cache_dir = snapshot_download(model_name, token=HF_TOKEN, local_files_only=True)
        return True, cache_dir
    except (RepositoryNotFoundError, RevisionNotFoundError):
        return False, None

def initialize_model():
    global global_model, global_tokenizer
    if not USE_LOCAL_MODEL:
        print("Using Tune AI API. No local model initialization required.")
        return None, None
    try:
        login(HF_TOKEN, add_to_git_credential=True)
        
        is_available, cache_dir = check_model_availability(HF_MODEL_NAME)
        
        if not is_available:
            print(f"Model {HF_MODEL_NAME} is not available locally. Downloading... This may take a while.")
            cache_dir = snapshot_download(HF_MODEL_NAME, token=HF_TOKEN)
            print("Model downloaded successfully!")
        else:
            print(f"Model {HF_MODEL_NAME} found in local cache: {cache_dir}")
        
        global_tokenizer = AutoTokenizer.from_pretrained(HF_MODEL_NAME, token=HF_TOKEN, cache_dir=cache_dir)
        global_tokenizer.pad_token = global_tokenizer.eos_token
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        if device == "cuda":
            global_model = AutoModelForCausalLM.from_pretrained(
                HF_MODEL_NAME,
                torch_dtype=torch.float16,
                low_cpu_mem_usage=True,
                device_map="auto",
                token=HF_TOKEN,
                cache_dir=cache_dir
            )
        else:
            global_model = AutoModelForCausalLM.from_pretrained(
                HF_MODEL_NAME,
                torch_dtype=torch.float32,
                low_cpu_mem_usage=True,
                token=HF_TOKEN,
                cache_dir=cache_dir
            ).to(device)
        
        print("Local model initialized successfully.")
        return global_model, global_tokenizer
    except Exception as e:
        print(f"Error initializing model: {str(e)}")
        return None, None

def generate_response_local(prompt):
    global global_model, global_tokenizer
    inputs = global_tokenizer(prompt, return_tensors="pt", padding=True).to(global_model.device)
    with torch.no_grad():
        output = global_model.generate(**inputs, max_new_tokens=150, temperature=0.7, top_p=0.95)
    response = global_tokenizer.decode(output[0], skip_special_tokens=True)
    return response.split("Assistant:")[-1].strip()

def generate_response_api(prompt):
    try:
        payload = {
            "model": TUNE_MODEL_NAME,
            "messages": [
                {
                    "content": SYSTEM_PROMPT,
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
        
        response_data = response.json()
        if 'choices' in response_data and len(response_data['choices']) > 0:
            return response_data['choices'][0]['message']['content'].strip()
        else:
            print("Unexpected response format from Tune AI API")
            return None
    except requests.RequestException as e:
        print(f"Error with API request: {str(e)}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error processing API response: {str(e)}")
        return None

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    prompt = data.get('prompt')
    
    if USE_LOCAL_MODEL:
        response = generate_response_local(prompt)
    else:
        response = generate_response_api(prompt)
    
    return jsonify({"response": response})

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
    initialize_model()
    
    local_ip = get_local_ip()
    print(f" * Server running on http://{local_ip}:5000")

    # Run Flask app in a separate thread
    threading.Thread(target=run_server, daemon=True).start()

    # Run Streamlit app for server monitoring
    st.title("Inference Server Monitor")
    st.write(f"Server URL: http://{local_ip}:5000")
    st.write(f"Using {'Local Model' if USE_LOCAL_MODEL else 'Tune AI API'}")
    
    # Create a placeholder for the client list
    client_list = st.empty()

    # Update the client list every 5 seconds
    while True:
        with client_list.container():
            st.write("Connected Clients:")
            for client in connected_clients:
                st.write(f"- {client}")
        time.sleep(5)
