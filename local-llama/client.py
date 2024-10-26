import streamlit as st
import requests
import base64
from datetime import datetime

# Server URL (replace with your server's local IP address)
SERVER_URL = "http://10.1.133.55:5000"  # Replace with your server's IP address

# Page configuration
st.set_page_config(
    page_title="Ekatra",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Enhanced CSS with modern styling
st.markdown("""
<style>
    /* Main app styling */
    .stApp {
        background-color: #1a1a1a;
        color: #ffffff;
    }
    
    /* Header styling */
    .main-header {
        background-color: #2d2d2d;
        padding: 1.5rem;
        border-radius: 10px;
        margin-bottom: 2rem;
        text-align: center;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    /* Chat container styling */
    .chat-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 1rem;
    }
    
    /* Message styling */
    .chat-message {
        padding: 1.5rem;
        border-radius: 15px;
        margin-bottom: 1rem;
        animation: fadeIn 0.5s ease-in-out;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .chat-message.user {
        background-color: #2c5282;
        margin-left: 2rem;
    }
    
    .chat-message.assistant {
        background-color: #2d3748;
        margin-right: 2rem;
    }
    
    /* Input styling */
    .stTextInput > div > div > input {
        color: #ffffff;
        background-color: #2d3748;
        border-radius: 10px;
        border: 1px solid #4a5568;
        padding: 0.75rem;
    }
    
    /* Button styling */
    .stButton > button {
        background-color: #4a5568;
        color: white;
        border-radius: 10px;
        padding: 0.5rem 1rem;
        border: none;
        transition: all 0.3s ease;
    }
    
    .stButton > button:hover {
        background-color: #2c5282;
        transform: translateY(-2px);
    }
    
    /* Audio player styling */
    audio {
        width: 100%;
        margin-top: 1rem;
        border-radius: 10px;
        background-color: #2d3748;
    }
    
    /* Animation */
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    /* Status indicator */
    .status-indicator {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 8px;
    }
    
    .status-online {
        background-color: #48BB78;
    }
    
    .status-offline {
        background-color: #F56565;
    }
    
    /* Timestamp styling */
    .message-timestamp {
        font-size: 0.8rem;
        color: #718096;
        margin-top: 0.5rem;
    }
    
    /* Sidebar styling */
    .css-1d391kg {
        background-color: #2d3748;
    }
</style>
""", unsafe_allow_html=True)

# Sidebar
with st.sidebar:
    st.markdown("### Settings")
    language = st.selectbox(
        "Response Language",
        ["Marathi", "English"],
        index=0
    )
    
    st.markdown("### About")
    st.markdown("""
    🤖 **Learn with Ekatra**
    - Powered by Llama 3.2
    - Multi-language support
    - SarvamAI Voices
    """)
    
    if st.button("Clear Chat History", key="clear_sidebar"):
        st.session_state.messages = []
        st.rerun()

# Initialize session state
if "messages" not in st.session_state:
    st.session_state.messages = []
if "connection_status" not in st.session_state:
    st.session_state.connection_status = False

# Main header
st.markdown("""
<div class="main-header">
    <h1>🤖 Ekatra AI Assistant</h1>
</div>
""", unsafe_allow_html=True)

# Connection status
try:
    response = requests.post(f"{SERVER_URL}/connect")
    st.session_state.connection_status = True
except requests.ConnectionError:
    st.session_state.connection_status = False

# Display connection status
status_color = "status-online" if st.session_state.connection_status else "status-offline"
status_text = "Connected" if st.session_state.connection_status else "Disconnected"
st.markdown(f"""
<div style="margin-bottom: 1rem;">
    <span class="status-indicator {status_color}"></span>
    <span>{status_text} to server at {SERVER_URL}</span>
</div>
""", unsafe_allow_html=True)

# Chat interface
st.markdown('<div class="chat-container">', unsafe_allow_html=True)

# Display chat messages
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        if "timestamp" in message:
            st.markdown(f'<div class="message-timestamp">{message["timestamp"]}</div>', 
                       unsafe_allow_html=True)
        if "audio" in message:
            st.audio(base64.b64decode(message["audio"]), format="audio/wav")

if prompt := st.chat_input("Type your message here..."):
    # Add user message
    current_time = datetime.now().strftime("%I:%M %p")
    st.session_state.messages.append({
        "role": "user",
        "content": prompt,
        "timestamp": current_time
    })
    
    with st.chat_message("user"):
        st.markdown(prompt)
        st.markdown(f'<div class="message-timestamp">{current_time}</div>', 
                   unsafe_allow_html=True)
    
    # Show typing indicator
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        st.markdown("*Thinking...*")
        
        try:
            # Send request
            response = requests.post(
                f"{SERVER_URL}/generate", 
                json={
                    "prompt": prompt, 
                    "language": language.lower()
                }
            )
            response.raise_for_status()
            assistant_response = response.json()
            
            # Get response content
            assistant_text = assistant_response.get("marathi" if language.lower() == "marathi" else "response", "")
            audio_data = assistant_response.get("audio")
            
            # Clear typing indicator and show response
            message_placeholder.empty()
            st.markdown(assistant_text)
            st.markdown(f'<div class="message-timestamp">{current_time}</div>', 
                       unsafe_allow_html=True)
            
            # Create message dictionary
            message_dict = {
                "role": "assistant",
                "content": assistant_text,
                "timestamp": current_time
            }
            
            # Handle audio
            if audio_data:
                message_dict["audio"] = audio_data
                st.audio(base64.b64decode(audio_data), format="audio/wav")
            
            # Add to session state
            st.session_state.messages.append(message_dict)

        except Exception as e:
            message_placeholder.error(f"Error: {str(e)}")

st.markdown('</div>', unsafe_allow_html=True)

# Footer
st.markdown("""
<div style="text-align: center; margin-top: 2rem; padding: 1rem; background-color: #2d3748; border-radius: 10px;">
    <p>Powered by Ekatra AI • Built with ❤️</p>
</div>
""", unsafe_allow_html=True)

# Disconnect from server when the app is closed
import atexit
atexit.register(lambda: requests.post(f"{SERVER_URL}/disconnect"))
