import streamlit as st
import requests

# Server URL (replace with your server's local IP address)
SERVER_URL = "http://10.156.115.8:5000"  # Replace with your server's IP address

st.set_page_config(page_title="Ekatra's Chat Client", layout="wide")

st.markdown("""
<style>
.stApp {
    background-color: #2b313e;
}
.chat-message {
    padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1rem; display: flex
}
.chat-message.user {
    background-color: #4a4a4a
}
.chat-message.bot {
    background-color: #3a3a3a
}
.chat-message .message {
    width: 80%;
    padding: 0 1.5rem;
    color: #fff;
}
.stTextInput>div>div>input {
    color: #fff;
    background-color: #3a3a3a;
}
</style>
""", unsafe_allow_html=True)

st.title("Ekatra's AI Chatbot Client")

if "messages" not in st.session_state:
    st.session_state.messages = []

# Connect to server
try:
    requests.post(f"{SERVER_URL}/connect")
    st.success(f"Connected to server at {SERVER_URL}")
except requests.ConnectionError:
    st.error(f"Unable to connect to server at {SERVER_URL}. Please check the server address and ensure the server is running.")

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

if prompt := st.chat_input("What is your message?"):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)
    
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        
        try:
            response = requests.post(f"{SERVER_URL}/generate", json={"prompt": prompt})
            response.raise_for_status()
            assistant_response = response.json()["response"]
            message_placeholder.markdown(assistant_response)
            st.session_state.messages.append({"role": "assistant", "content": assistant_response})
        except Exception as e:
            st.error(f"Error generating response: {str(e)}")

if st.button("Clear Chat History"):
    st.session_state.messages = []
    st.experimental_rerun()

# Disconnect from server when the app is closed
import atexit
atexit.register(lambda: requests.post(f"{SERVER_URL}/disconnect"))
