import streamlit as st
import requests
import base64
import json
from PIL import Image
import io

# --- Page Configuration ---
st.set_page_config(
    page_title="OCR Text Vision Pro",
    page_icon="https://cdn-icons-png.flaticon.com/512/5262/5262072.png",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- Global Variables and Helper Functions ---
# OpenRouter API Endpoint
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
# Model to use from OpenRouter. This is specified in the PRD.
OPENROUTER_MODEL = "meta-llama/llama-3.2-11b-vision-instruct:free"

def _make_openrouter_call(api_key, messages, site_url="", site_name="OCR Text Vision Pro"):
    """
    Makes an API call to OpenRouter with the given messages.

    Args:
        api_key (str): The OpenRouter API key.
        messages (list): A list of message dictionaries for the chat completion API.
        site_url (str): Optional. Site URL for rankings on openrouter.ai.
        site_name (str): Optional. Site title for rankings on openrouter.ai.

    Returns:
        dict: The JSON response from the OpenRouter API.
    """
    if not api_key:
        st.error("OpenRouter API Key is missing. Please provide it in the sidebar.")
        return None

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": site_url, # Optional. Site URL for rankings on openrouter.ai.
        "X-Title": "OCR Text Vision Pro", # Optional. Site title for rankings on openrouter.ai.
    }
    payload = json.dumps({
        "model": OPENROUTER_MODEL,
        "messages": messages,
    })

    try:
        response = requests.post(OPENROUTER_API_URL, headers=headers, data=payload)
        response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
        return response.json()
    except requests.exceptions.RequestException as e:
        st.error(f"API Error: {e}")
        st.error("Please check your OpenRouter API key and network connection.")
        return None
    except json.JSONDecodeError:
        st.error("Failed to decode JSON response from API. The response might be malformed.")
        return None

def _get_base64_image_data_url(uploaded_file):
    """
    Converts an uploaded Streamlit file to a base64 data URL.

    Args:
        uploaded_file (streamlit.runtime.uploaded_file_manager.UploadedFile): The uploaded file object.

    Returns:
        str: A base64 encoded data URL string.
    """
    if uploaded_file is None:
        return None
    image_bytes = uploaded_file.getvalue()
    base64_image = base64.b64encode(image_bytes).decode('utf-8')
    return f"data:{uploaded_file.type};base64,{base64_image}"

def _clear_all_results():
    """
    Resets all session state variables related to inputs and outputs across all tabs.
    """
    # Tab 1
    st.session_state.tab1_uploaded_file = None
    st.session_state.tab1_content_type = "General Text Extraction"
    st.session_state.tab1_ocr_result = None
    # Tab 2
    st.session_state.tab2_uploaded_file = None
    st.session_state.tab2_question = ""
    st.session_state.tab2_result = None
    # Tab 3
    st.session_state.tab3_uploaded_file = None
    st.session_state.tab3_question = ""
    st.session_state.tab3_result = None
    # Tab 4
    st.session_state.tab4_uploaded_file = None
    st.session_state.tab4_chat_history = []
    st.rerun() # Rerun to clear inputs and outputs on the UI

# --- Title and Global Sidebar Content ---
col_title, col_clear = st.columns([6, 1])
with col_title:
    st.markdown(
        '<h1 style="display: flex; align-items: center;">'
        '<img src="https://cdn-icons-png.flaticon.com/512/5262/5262022.png" width="40" style="margin-right: 10px;">'
        'OCR Text Vision Pro'
        '</h1>',
        unsafe_allow_html=True
    )
    st.markdown('<p style="margin-top: -20px;">Leveraging Llama 3.2 Vision via OpenRouter for diverse image understanding and text extraction!</p>', unsafe_allow_html=True)

with col_clear:
    st.markdown("<br>", unsafe_allow_html=True) # Add some space for alignment
    if st.button("Clear All 🗑️", key="global_clear_button"):
        _clear_all_results()

st.markdown("---")

# Initialize API key in session state if not present
if 'openrouter_api_key' not in st.session_state:
    st.session_state.openrouter_api_key = ""

with st.sidebar:
    st.markdown("<h1 style='text-align: left;'>⚙️ Configuration</h1>", unsafe_allow_html=True)
    # Input for OpenRouter API Key in sidebar
    st.session_state.openrouter_api_key = st.text_input(
        "OpenRouter API Key:",
        type="password",
        value=st.session_state.openrouter_api_key,
        help="Enter your OpenRouter API key. Click the link below if you don't have one.",
    )
    st.link_button("Need a Free API Key?", "https://openrouter.ai/settings/keys", help="Click to get your OpenRouter API key.")
    st.markdown("Your API key is stored in the session state and is not persisted.")

    st.markdown("---")
    st.header("💻 About This App")
    st.markdown("This application provides various OCR and image understanding functionalities powered by the Llama 3.2 Vision model via the OpenRouter API. Feel free to suggest an improvement, Report an issue or bug, or Request a new Feature.")
    st.markdown("---")
    st.markdown("<div style='text-align: center;'>Made with ❤️ by Brian Castelino</div>", unsafe_allow_html=True)
    
    # Add social media links
    st.markdown("""
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
    .social-icons a {
        font-size: 24px;
        color: #4CAF50; /* Streamlit green */
        margin-right: 15px;
        text-decoration: none;
    }
    .social-icons a:hover {
        color: #388E3C; /* Darker green on hover */
    }
    </style>
    <div class="social-icons" align="center">
        <a href="https://github.com/bcastelino" target="_blank" title="GitHub"><i class="fab fa-github"></i></a>
        <a href="https://linkedin.com/in/cas7elino" target="_blank" title="LinkedIn"><i class="fab fa-linkedin"></i></a>
        <a href="https://twitter.com/cas7elino" target="_blank" title="Twitter"><i class="fab fa-twitter"></i></a>
    </div>
    """, unsafe_allow_html=True)


# --- Main Application Tabs ---
st.subheader("Select an Optical Character Recognition (OCR) Functionality:") # New heading for tabs
tab1, tab2, tab3, tab4 = st.tabs([
    "📈 General OCR & Content Recognition",
    "📑 Advanced Document Intelligence",
    "❓ Intelligent Visual Question Answering",
    "🗣️ Multi-modal Chat Assistant"
])

# --- Tab 1: General OCR & Content Recognition (Home Page) ---
with tab1:
    st.header("General OCR & Content Recognition")
    st.markdown("Upload an image and select the type of content you want to extract or describe.")

    # Session state for this tab's inputs and outputs
    if 'tab1_uploaded_file' not in st.session_state:
        st.session_state.tab1_uploaded_file = None
    if 'tab1_content_type' not in st.session_state:
        st.session_state.tab1_content_type = "General Text Extraction"
    if 'tab1_ocr_result' not in st.session_state:
        st.session_state.tab1_ocr_result = None

    uploaded_file_tab1 = st.file_uploader("Choose an image...", type=['png', 'jpg', 'jpeg'], key="tab1_uploader")
    if uploaded_file_tab1:
        st.session_state.tab1_uploaded_file = uploaded_file_tab1
        # Display image in a smaller, responsive column
        col_img1, _ = st.columns([0.4, 0.6]) # Allocate 40% of the width to the image column
        with col_img1:
            st.image(uploaded_file_tab1, caption="Uploaded Image", use_container_width=True)

    content_type = st.radio(
        "Select Content Type:",
        ("General Text Extraction", "LaTeX Equation Conversion", "Code Snippet Extraction", "Chart/Diagram Description"),
        key="tab1_content_type_radio"
    )
    st.session_state.tab1_content_type = content_type

    if st.button("Process Image 🚀", key="tab1_process_button"):
        if not st.session_state.openrouter_api_key:
            st.error("Please enter your OpenRouter API Key in the sidebar.")
        elif st.session_state.tab1_uploaded_file is None:
            st.error("Please upload an image first.")
        else:
            with st.spinner("Processing image..."):
                image_data_url = _get_base64_image_data_url(st.session_state.tab1_uploaded_file)
                prompt_text = ""

                if st.session_state.tab1_content_type == "General Text Extraction":
                    prompt_text = """Analyze the text in the provided image. Extract all readable content and present it in a structured Markdown format that is clear, concise, and well-organized. Ensure proper formatting (e.g., headings, lists, or code blocks) as necessary to represent the content effectively."""
                elif st.session_state.tab1_content_type == "LaTeX Equation Conversion":
                    prompt_text = """Understand the mathematical equation in the provided image and output the corresponding LaTeX code. NEVER include any additional text or explanations. DON'T add dollar signs ($) around the LaTeX code. DO NOT extract simplified versions of the equations. NEVER add documentclass, packages or begindocument. DO NOT explain the symbols used in the equation. Output only the LaTeX code corresponding to the mathematical equations in the image."""
                elif st.session_state.tab1_content_type == "Code Snippet Extraction":
                    prompt_text = """Extract all code from the provided image. Present the code in a formatted code block suitable for direct use. Do not include any additional text or explanations."""
                elif st.session_state.tab1_content_type == "Chart/Diagram Description":
                    prompt_text = """Describe the chart or diagram in the provided image. Explain its key elements, data, and any trends or insights it presents in a clear, concise manner."""

                messages = [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt_text},
                            {"type": "image_url", "image_url": {"url": image_data_url}}
                        ]
                    }
                ]

                response_json = _make_openrouter_call(st.session_state.openrouter_api_key, messages)

                if response_json:
                    extracted_content = response_json['choices'][0]['message']['content']
                    st.session_state.tab1_ocr_result = extracted_content
                else:
                    st.session_state.tab1_ocr_result = "Error: Could not get a response from the model."

    if st.session_state.tab1_ocr_result:
        st.markdown("### Result:")
        if st.session_state.tab1_content_type == "LaTeX Equation Conversion":
            st.code(st.session_state.tab1_ocr_result, language='latex')
            st.markdown("#### Rendered LaTeX:")
            cleaned_latex = st.session_state.tab1_ocr_result.replace(r"\[", "").replace(r"\]", "")
            st.latex(cleaned_latex)
        elif st.session_state.tab1_content_type == "Code Snippet Extraction":
            st.code(st.session_state.tab1_ocr_result, language='python') # Assuming Python, can be adjusted
        else:
            st.markdown(st.session_state.tab1_ocr_result)

# --- Tab 2: Advanced Document Intelligence ---
with tab2:
    st.header("Advanced Document Intelligence")
    st.markdown("Upload a document image to extract structured information or ask specific questions about its content and layout. This leverages the model's DocVQA capabilities.")

    # Session state for this tab
    if 'tab2_uploaded_file' not in st.session_state:
        st.session_state.tab2_uploaded_file = None
    if 'tab2_question' not in st.session_state:
        st.session_state.tab2_question = ""
    if 'tab2_result' not in st.session_state:
        st.session_state.tab2_result = None

    uploaded_file_tab2 = st.file_uploader("Choose a document image...", type=['png', 'jpg', 'jpeg'], key="tab2_uploader")
    if uploaded_file_tab2:
        st.session_state.tab2_uploaded_file = uploaded_file_tab2
        # Display image in a smaller, responsive column
        col_img2, _ = st.columns([0.4, 0.6]) # Allocate 40% of the width to the image column
        with col_img2:
            st.image(uploaded_file_tab2, caption="Uploaded Document", use_container_width=True)

    user_question_tab2 = st.text_area(
        "Ask a question or specify extraction (e.g., 'Extract invoice number and total amount', 'What is the date on this contract?'):",
        value=st.session_state.tab2_question,
        key="tab2_question_input"
    )
    st.session_state.tab2_question = user_question_tab2

    if st.button("Extract/Answer 🔍", key="tab2_process_button"):
        if not st.session_state.openrouter_api_key:
            st.error("Please enter your OpenRouter API Key in the sidebar.")
        elif st.session_state.tab2_uploaded_file is None:
            st.error("Please upload a document image first.")
        elif not st.session_state.tab2_question.strip():
            st.error("Please enter a question or extraction request.")
        else:
            with st.spinner("Processing document..."):
                image_data_url = _get_base64_image_data_url(st.session_state.tab2_uploaded_file)
                prompt_text = f"Analyze the provided document image and respond to the following request: {st.session_state.tab2_question}. Present the answer in a clear, structured Markdown format."

                messages = [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt_text},
                            {"type": "image_url", "image_url": {"url": image_data_url}}
                        ]
                    }
                ]

                response_json = _make_openrouter_call(st.session_state.openrouter_api_key, messages)

                if response_json:
                    extracted_content = response_json['choices'][0]['message']['content']
                    st.session_state.tab2_result = extracted_content
                else:
                    st.session_state.tab2_result = "Error: Could not get a response from the model."

    if st.session_state.tab2_result:
        st.markdown("### Result:")
        st.markdown(st.session_state.tab2_result)

# --- Tab 3: Intelligent Visual Question Answering (VQA) ---
with tab3:
    st.header("Intelligent Visual Question Answering")
    st.markdown("Upload any image and ask a general question about its content. This uses the model's Visual Question Answering (VQA) and Visual Reasoning capabilities.")

    # Session state for this tab
    if 'tab3_uploaded_file' not in st.session_state:
        st.session_state.tab3_uploaded_file = None
    if 'tab3_question' not in st.session_state:
        st.session_state.tab3_question = ""
    if 'tab3_result' not in st.session_state:
        st.session_state.tab3_result = None

    uploaded_file_tab3 = st.file_uploader("Choose an image...", type=['png', 'jpg', 'jpeg'], key="tab3_uploader")
    if uploaded_file_tab3:
        st.session_state.tab3_uploaded_file = uploaded_file_tab3
        # Display image in a smaller, responsive column
        col_img3, _ = st.columns([0.4, 0.6]) # Allocate 40% of the width to the image column
        with col_img3:
            st.image(uploaded_file_tab3, caption="Uploaded Image", use_container_width=True)

    user_question_tab3 = st.text_input(
        "Ask your question about the image (e.g., 'What is the main subject?', 'Describe the scene'):",
        value=st.session_state.tab3_question,
        key="tab3_question_input"
    )
    st.session_state.tab3_question = user_question_tab3

    if st.button("Get Answer 🤔", key="tab3_process_button"):
        if not st.session_state.openrouter_api_key:
            st.error("Please enter your OpenRouter API Key in the sidebar.")
        elif st.session_state.tab3_uploaded_file is None:
            st.error("Please upload an image first.")
        elif not st.session_state.tab3_question.strip():
            st.error("Please enter a question.")
        else:
            with st.spinner("Getting answer..."):
                image_data_url = _get_base64_image_data_url(st.session_state.tab3_uploaded_file)
                prompt_text = f"Based on the provided image, answer the following question: {st.session_state.tab3_question}"

                messages = [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt_text},
                            {"type": "image_url", "image_url": {"url": image_data_url}}
                        ]
                    }
                ]

                response_json = _make_openrouter_call(st.session_state.openrouter_api_key, messages)

                if response_json:
                    answer_content = response_json['choices'][0]['message']['content']
                    st.session_state.tab3_result = answer_content
                else:
                    st.session_state.tab3_result = "Error: Could not get a response from the model."

    if st.session_state.tab3_result:
        st.markdown("### Answer:")
        st.markdown(st.session_state.tab3_result)

# --- Tab 4: Multi-modal Chat and Assistant-like Interactions ---
with tab4:
    st.header("Multi-modal Chat Assistant")
    st.markdown("Engage in a conversation with the AI about an image. The Llama 3.2-Vision model is optimized for assistant-like chat with images.")

    # Session state for this tab
    if 'tab4_uploaded_file' not in st.session_state:
        st.session_state.tab4_uploaded_file = None
    if 'tab4_chat_history' not in st.session_state:
        st.session_state.tab4_chat_history = [] # Stores {"role": "user/assistant", "content": "message"}

    uploaded_file_tab4 = st.file_uploader("Upload an image to start the conversation...", type=['png', 'jpg', 'jpeg'], key="tab4_uploader")

    if uploaded_file_tab4 and st.session_state.tab4_uploaded_file != uploaded_file_tab4:
        st.session_state.tab4_uploaded_file = uploaded_file_tab4
        st.session_state.tab4_chat_history = [] # Clear chat history on new image upload
        # Display image in a smaller, responsive column
        col_img4, _ = st.columns([0.4, 0.6]) # Allocate 40% of the width to the image column
        with col_img4:
            st.image(uploaded_file_tab4, caption="Image for Chat", use_container_width=True)
        # Initial message from assistant
        st.session_state.tab4_chat_history.append({"role": "assistant", "content": "Hello! Upload an image and ask me anything about it."})
        st.rerun() # Rerun to display the initial message

    # Display chat messages
    if st.session_state.tab4_uploaded_file:
        col_img4_display, _ = st.columns([0.4, 0.6]) # Allocate 40% of the width for the displayed image
        with col_img4_display:
            st.image(st.session_state.tab4_uploaded_file, caption="Current Image for Chat", use_container_width=True)

    for message in st.session_state.tab4_chat_history:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    if user_prompt := st.chat_input("Type your message here..."):
        if not st.session_state.openrouter_api_key:
            st.error("Please enter your OpenRouter API Key in the sidebar.")
        elif st.session_state.tab4_uploaded_file is None:
            st.error("Please upload an image to start the chat.")
        else:
            with st.spinner("Thinking..."):
                image_data_url = _get_base64_image_data_url(st.session_state.tab4_uploaded_file)

                # Construct messages for OpenRouter, including the image context only once
                api_messages = []
                # Add the image to the first user message
                # Check if chat history is not empty and if the first message is from assistant
                # If it's the very first user message after image upload, the assistant's initial greeting is already there.
                # The image should be associated with the first *user* message in the API call, not the assistant's greeting.
                # So, if the history is just the assistant's greeting, the current user_prompt is the first actual user input.
                if len(st.session_state.tab4_chat_history) == 1 and st.session_state.tab4_chat_history[0]["role"] == "assistant":
                    # This is the first user prompt after the initial assistant greeting
                    api_messages.append({
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_prompt}, # Use the current user_prompt
                            {"type": "image_url", "image_url": {"url": image_data_url}}
                        ]
                    })
                else:
                    # For subsequent messages or if the chat history started differently,
                    # reconstruct the history for the API call.
                    # The image should ideally be with the first user message that references it.
                    # Given the current flow, we'll attach it to the first user message in the API call.
                    # This assumes the user always uploads an image before starting a relevant conversation.

                    # Find the first user message in the history and attach the image there
                    first_user_message_found = False
                    for msg in st.session_state.tab4_chat_history:
                        if msg["role"] == "user" and not first_user_message_found:
                            api_messages.append({
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": msg["content"]},
                                    {"type": "image_url", "image_url": {"url": image_data_url}}
                                ]
                            })
                            first_user_message_found = True
                        else:
                            api_messages.append({"role": msg["role"], "content": msg["content"]})


                response_json = _make_openrouter_call(st.session_state.openrouter_api_key, api_messages)

                if response_json:
                    assistant_response = response_json['choices'][0]['message']['content']
                    st.session_state.tab4_chat_history.append({"role": "assistant", "content": assistant_response})
                    with st.chat_message("assistant"):
                        st.markdown(assistant_response)
                else:
                    st.session_state.tab4_chat_history.append({"role": "assistant", "content": "Error: Could not get a response from the model."})
                    with st.chat_message("assistant"):
                        st.markdown("Error: Could not get a response from the model.")
