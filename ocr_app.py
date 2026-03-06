import streamlit as st
import requests
import base64
import json
import re
from PIL import Image
import io
import fitz  # PyMuPDF
from streamlit_cookies_controller import CookieController

# --- Page Configuration ---
st.set_page_config(
    page_title="OCR Text Vision Pro",
    page_icon="https://cdn-icons-png.flaticon.com/512/5262/5262072.png",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- Responsive CSS ---
st.markdown("""
<style>
/* Mobile (≤768px) */
@media (max-width: 768px) {
    [data-testid="stHorizontalBlock"] {
        flex-direction: column !important;
    }
    [data-testid="stColumn"] {
        width: 100% !important;
        flex: 1 1 100% !important;
        min-width: 100% !important;
    }
    .block-container {
        padding-left: 1rem !important;
        padding-right: 1rem !important;
    }
    h1 { font-size: 1.4rem !important; }
    h2 { font-size: 1.2rem !important; }
    h3 { font-size: 1.05rem !important; }
    h1 img { width: 28px !important; }
    button[role="tab"] {
        font-size: 0.75rem !important;
        padding: 0.4rem 0.6rem !important;
    }
    [data-testid="stSidebar"] {
        min-width: 0 !important;
        width: 260px !important;
    }
}
/* Tablet (769–1024px) */
@media (min-width: 769px) and (max-width: 1024px) {
    .block-container {
        padding-left: 2rem !important;
        padding-right: 2rem !important;
    }
    h1 { font-size: 1.6rem !important; }
    button[role="tab"] {
        font-size: 0.85rem !important;
    }
}
</style>
""", unsafe_allow_html=True)

# --- Global Variables and Helper Functions ---
# OpenRouter API Endpoint
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Available free vision models on OpenRouter
AVAILABLE_MODELS = {
    "NVIDIA: Nemotron Nano 12B 2 VL": "nvidia/nemotron-nano-12b-v2-vl:free",
    "Google: Gemma 3 27B": "google/gemma-3-27b-it:free",
    "Mistral: Mistral Small 3.1 24B": "mistralai/mistral-small-3.1-24b-instruct:free",
}

# Maximum number of API calls allowed using the built-in fallback key per session
FALLBACK_API_MAX_USES = 5
FALLBACK_API_COOKIE_KEY = "ocr_fallback_api_uses"
FALLBACK_API_COOKIE_EXPIRES_DAYS = 30

cookie_manager = CookieController()

def _read_fallback_uses_from_cookie():
    """Read the persisted fallback-use count from a browser cookie."""
    cookie_value = cookie_manager.get(FALLBACK_API_COOKIE_KEY)
    if cookie_value is None:
        return None
    try:
        uses = int(cookie_value)
    except (TypeError, ValueError):
        return None
    return max(0, min(FALLBACK_API_MAX_USES, uses))

def _set_fallback_api_uses(uses):
    """Persist the fallback-use count to both session state and a browser cookie."""
    try:
        clamped_uses = max(0, min(FALLBACK_API_MAX_USES, int(uses)))
    except (TypeError, ValueError):
        clamped_uses = 0
    st.session_state.fallback_api_uses = clamped_uses
    cookie_manager.set(
        FALLBACK_API_COOKIE_KEY,
        str(clamped_uses),
        max_age=FALLBACK_API_COOKIE_EXPIRES_DAYS * 24 * 3600,
    )

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
    selected = st.session_state.get("selected_model", list(AVAILABLE_MODELS)[0])
    model_id = AVAILABLE_MODELS.get(selected, list(AVAILABLE_MODELS.values())[0])
    payload = json.dumps({
        "model": model_id,
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

def _resolve_api_key():
    """
    Returns the API key to use for an OpenRouter call.
    Priority: user-provided key > built-in fallback key (capped at FALLBACK_API_MAX_USES per session).
    Shows appropriate error messages and returns None when no key is available.
    """
    # 1. User-provided key takes priority
    user_key = st.session_state.get("openrouter_api_key", "").strip()
    if user_key:
        return user_key

    # 2. Fallback developer key from Streamlit Secrets
    uses = st.session_state.get("fallback_api_uses", 0)
    if uses >= FALLBACK_API_MAX_USES:
        st.error(
            f"You have used all {FALLBACK_API_MAX_USES} free API calls for this session. "
            "Please enter your own OpenRouter API key in the sidebar to continue."
        )
        return None

    try:
        fallback_key = st.secrets["OPENROUTER_API_KEY"]
    except (KeyError, FileNotFoundError):
        st.error("No API key provided and no fallback key is configured. Please enter your OpenRouter API key in the sidebar.")
        return None

    _set_fallback_api_uses(uses + 1)
    return fallback_key

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

def _parse_page_selection(selection_str, total_pages):
    """
    Parse a comma-separated page selection string like '1-5, 8, 12, 34' into
    a sorted list of 0-based page indices. Returns (list, error_msg).
    """
    if not selection_str or not selection_str.strip():
        return [], "Please enter at least one page number."
    pages = set()
    for part in selection_str.split(","):
        part = part.strip()
        if not part:
            continue
        range_match = re.match(r"^(\d+)\s*-\s*(\d+)$", part)
        if range_match:
            start, end = int(range_match.group(1)), int(range_match.group(2))
            if start < 1 or end < 1:
                return [], f"Page numbers must be positive (got '{part}')."
            if start > end:
                return [], f"Invalid range '{part}' — start must be ≤ end."
            if end > total_pages:
                return [], f"Page {end} exceeds the PDF's {total_pages} page(s)."
            pages.update(range(start, end + 1))
        elif re.match(r"^\d+$", part):
            p = int(part)
            if p < 1:
                return [], "Page numbers must be positive."
            if p > total_pages:
                return [], f"Page {p} exceeds the PDF's {total_pages} page(s)."
            pages.add(p)
        else:
            return [], f"Invalid entry '{part}'. Use numbers or ranges like '1-5'."
    sorted_pages = sorted(pages)
    indices = [p - 1 for p in sorted_pages]  # convert to 0-based
    return indices, None

def _pdf_pages_to_data_urls(pdf_bytes, page_indices):
    """
    Convert specific pages of a PDF to base64 PNG data URLs.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    data_urls = []
    for idx in page_indices:
        page = doc.load_page(idx)
        pix = page.get_pixmap(dpi=150)
        png_bytes = pix.tobytes("png")
        b64 = base64.b64encode(png_bytes).decode("utf-8")
        data_urls.append(f"data:image/png;base64,{b64}")
    doc.close()
    return data_urls

def _clear_all_results():
    """
    Resets all session state variables related to inputs and outputs across all tabs.
    """
    # Tab 1
    st.session_state.tab1_uploaded_file = None
    st.session_state.tab1_content_type = "General Text Extraction"
    st.session_state.tab1_ocr_result = None
    # Tab 2 (Ask, Analyze & Chat)
    st.session_state.tab2_uploaded_file = None
    st.session_state.tab2_mode = "One-time Answer"
    st.session_state.tab2_analysis_scope = "Document Intelligence"
    st.session_state.tab2_question = ""
    st.session_state.tab2_result = None
    st.session_state.tab2_chat_history = []
    st.session_state.tab2_image_signature = None
    # Tab 3 (PDF Scan & Extract)
    st.session_state.tab3_uploaded_file = None
    st.session_state.tab3_content_type = "General Text Extraction"
    st.session_state.tab3_page_mode = "All Pages"
    st.session_state.tab3_page_selection = ""
    st.session_state.tab3_result = None
    for legacy_key in ["tab4_uploaded_file", "tab4_chat_history"]:
        if legacy_key in st.session_state:
            del st.session_state[legacy_key]
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
    st.markdown('<p style="margin-top: -20px;">Powered by free vision models via OpenRouter for diverse image understanding and text extraction!</p>', unsafe_allow_html=True)

with col_clear:
    st.markdown("<br>", unsafe_allow_html=True) # Add some space for alignment
    if st.button("Clear All 🗑️", key="global_clear_button"):
        _clear_all_results()

st.markdown("---")

# Initialize session state defaults
if 'openrouter_api_key' not in st.session_state:
    st.session_state.openrouter_api_key = ""
if 'selected_model' not in st.session_state or st.session_state.selected_model not in AVAILABLE_MODELS:
    st.session_state.selected_model = list(AVAILABLE_MODELS)[0]
if 'fallback_api_uses' not in st.session_state:
    cookie_uses = _read_fallback_uses_from_cookie()
    st.session_state.fallback_api_uses = cookie_uses if cookie_uses is not None else 0

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

    # Show fallback key usage info when user hasn't provided their own key
    if not st.session_state.openrouter_api_key.strip():
        remaining = max(0, FALLBACK_API_MAX_USES - st.session_state.fallback_api_uses)
        if remaining > 0:
            st.info(f"🔑 No key entered — {remaining} free use(s) remaining this session.")
        else:
            st.warning(f"⚠️ All {FALLBACK_API_MAX_USES} free uses exhausted. Please enter your own API key.")

    st.markdown("---")

    # Model selector dropdown
    st.session_state.selected_model = st.selectbox(
        "Select Vision Model:",
        options=list(AVAILABLE_MODELS.keys()),
        index=list(AVAILABLE_MODELS.keys()).index(st.session_state.selected_model),
        help="Choose which free vision model to use for OCR and image understanding.",
    )
    st.caption(f"Model ID: `{AVAILABLE_MODELS[st.session_state.selected_model]}`")

    st.markdown("---")
    st.header("💻 About This App")
    st.markdown("This application provides various OCR and image understanding functionalities powered by free vision models via the OpenRouter API. Feel free to suggest an improvement, Report an issue or bug, or Request a new Feature.")
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
st.subheader("Select an Optical Character Recognition (OCR) Functionality:")
tab1, tab2, tab3 = st.tabs(["📈 Extract & Convert", "🎯 Ask, Analyze & Chat", "📑 PDF Scan & Extract"])

# --- Tab 1: Extract & Convert ---
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
        api_key = _resolve_api_key()
        if not api_key:
            pass  # _resolve_api_key already showed the error
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

                response_json = _make_openrouter_call(api_key, messages)

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

# --- Tab 2: Ask, Analyze & Chat ---
with tab2:
    st.header("Ask, Analyze & Chat")
    st.markdown("Upload an image and interact with the AI — ask a one-time question, extract document data, or hold a multi-turn conversation.")

    # Session state for this tab
    if 'tab2_uploaded_file' not in st.session_state:
        st.session_state.tab2_uploaded_file = None
    if 'tab2_mode' not in st.session_state:
        st.session_state.tab2_mode = "One-time Answer"
    if 'tab2_analysis_scope' not in st.session_state:
        st.session_state.tab2_analysis_scope = "Document Intelligence"
    if 'tab2_question' not in st.session_state:
        st.session_state.tab2_question = ""
    if 'tab2_result' not in st.session_state:
        st.session_state.tab2_result = None
    if 'tab2_chat_history' not in st.session_state:
        st.session_state.tab2_chat_history = []
    if 'tab2_image_signature' not in st.session_state:
        st.session_state.tab2_image_signature = None

    uploaded_file_tab2 = st.file_uploader("Choose an image...", type=['png', 'jpg', 'jpeg'], key="tab2_uploader")
    if uploaded_file_tab2:
        st.session_state.tab2_uploaded_file = uploaded_file_tab2
        new_sig = f"{uploaded_file_tab2.name}:{uploaded_file_tab2.size}:{uploaded_file_tab2.type}"
        if new_sig != st.session_state.tab2_image_signature:
            st.session_state.tab2_image_signature = new_sig
            st.session_state.tab2_chat_history = []
            st.session_state.tab2_result = None
        col_img2, _ = st.columns([0.4, 0.6])
        with col_img2:
            st.image(uploaded_file_tab2, caption="Uploaded Image", use_container_width=True)

    interaction_mode = st.radio(
        "Interaction Mode:",
        ("One-time Answer", "Chat Session"),
        key="tab2_mode_radio",
        horizontal=True,
    )
    st.session_state.tab2_mode = interaction_mode

    if interaction_mode == "One-time Answer":
        analysis_scope = st.radio(
            "Analysis Scope:",
            ("Document Intelligence", "Visual Question Answering"),
            key="tab2_scope_radio",
            horizontal=True,
        )
        st.session_state.tab2_analysis_scope = analysis_scope

        if analysis_scope == "Document Intelligence":
            placeholder = "e.g., 'Extract invoice number and total amount', 'What is the date on this contract?'"
        else:
            placeholder = "e.g., 'What is the main subject?', 'Describe the scene'"

        user_question = st.text_area(
            "Enter your question or extraction request:",
            value=st.session_state.tab2_question,
            placeholder=placeholder,
            key="tab2_question_input",
        )
        st.session_state.tab2_question = user_question

        btn_label = "Extract / Answer 🔍" if analysis_scope == "Document Intelligence" else "Get Answer 🤔"
        if st.button(btn_label, key="tab2_process_button"):
            api_key = _resolve_api_key()
            if not api_key:
                pass
            elif st.session_state.tab2_uploaded_file is None:
                st.error("Please upload an image first.")
            elif not st.session_state.tab2_question.strip():
                st.error("Please enter a question or extraction request.")
            else:
                with st.spinner("Processing..."):
                    image_data_url = _get_base64_image_data_url(st.session_state.tab2_uploaded_file)
                    if analysis_scope == "Document Intelligence":
                        prompt_text = f"Analyze the provided document image and respond to the following request: {st.session_state.tab2_question}. Present the answer in a clear, structured Markdown format."
                    else:
                        prompt_text = f"Based on the provided image, answer the following question: {st.session_state.tab2_question}"

                    messages = [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt_text},
                                {"type": "image_url", "image_url": {"url": image_data_url}},
                            ],
                        }
                    ]
                    response_json = _make_openrouter_call(api_key, messages)
                    if response_json:
                        st.session_state.tab2_result = response_json['choices'][0]['message']['content']
                    else:
                        st.session_state.tab2_result = "Error: Could not get a response from the model."

        if st.session_state.tab2_result:
            st.markdown("### Result:")
            st.markdown(st.session_state.tab2_result)

    else:  # Chat Session
        for message in st.session_state.tab2_chat_history:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])

        if user_prompt := st.chat_input("Type your message here..."):
            api_key = _resolve_api_key()
            if not api_key:
                pass
            elif st.session_state.tab2_uploaded_file is None:
                st.error("Please upload an image to start the chat.")
            else:
                with st.spinner("Thinking..."):
                    image_data_url = _get_base64_image_data_url(st.session_state.tab2_uploaded_file)

                    st.session_state.tab2_chat_history.append({"role": "user", "content": user_prompt})

                    # Build API messages — attach image to the first user message
                    api_messages = []
                    first_user_done = False
                    for msg in st.session_state.tab2_chat_history:
                        if msg["role"] == "user" and not first_user_done:
                            api_messages.append({
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": msg["content"]},
                                    {"type": "image_url", "image_url": {"url": image_data_url}},
                                ],
                            })
                            first_user_done = True
                        else:
                            api_messages.append({"role": msg["role"], "content": msg["content"]})

                    response_json = _make_openrouter_call(api_key, api_messages)
                    if response_json:
                        assistant_response = response_json['choices'][0]['message']['content']
                    else:
                        assistant_response = "Error: Could not get a response from the model."

                    st.session_state.tab2_chat_history.append({"role": "assistant", "content": assistant_response})
                    with st.chat_message("user"):
                        st.markdown(user_prompt)
                    with st.chat_message("assistant"):
                        st.markdown(assistant_response)

# --- Tab 3: PDF Scan & Extract ---
with tab3:
    st.header("PDF Scan & Extract")
    st.markdown("Upload a PDF file to extract text, equations, code, or descriptions from its pages using vision AI.")

    # Session state for this tab
    if 'tab3_uploaded_file' not in st.session_state:
        st.session_state.tab3_uploaded_file = None
    if 'tab3_content_type' not in st.session_state:
        st.session_state.tab3_content_type = "General Text Extraction"
    if 'tab3_page_mode' not in st.session_state:
        st.session_state.tab3_page_mode = "All Pages"
    if 'tab3_page_selection' not in st.session_state:
        st.session_state.tab3_page_selection = ""
    if 'tab3_result' not in st.session_state:
        st.session_state.tab3_result = None

    uploaded_pdf = st.file_uploader("Choose a PDF file...", type=['pdf'], key="tab3_uploader")
    if uploaded_pdf:
        st.session_state.tab3_uploaded_file = uploaded_pdf
        pdf_bytes = uploaded_pdf.getvalue()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = doc.page_count
        doc.close()
        st.info(f"📄 PDF loaded: **{total_pages}** page(s)")

        page_mode = st.radio(
            "Pages to scan:",
            ("All Pages", "Select Specific Pages"),
            key="tab3_page_mode_radio",
            horizontal=True,
        )
        st.session_state.tab3_page_mode = page_mode

        if page_mode == "Select Specific Pages":
            page_sel = st.text_input(
                "Enter page numbers (e.g. 1-5, 8, 12, 34):",
                value=st.session_state.tab3_page_selection,
                key="tab3_page_selection_input",
            )
            st.session_state.tab3_page_selection = page_sel

    content_type_pdf = st.radio(
        "Select Content Type:",
        ("General Text Extraction", "LaTeX Equation Conversion", "Code Snippet Extraction", "Chart/Diagram Description"),
        key="tab3_content_type_radio",
    )
    st.session_state.tab3_content_type = content_type_pdf

    if st.button("Scan PDF 🔍", key="tab3_process_button"):
        api_key = _resolve_api_key()
        if not api_key:
            pass
        elif st.session_state.tab3_uploaded_file is None:
            st.error("Please upload a PDF file first.")
        else:
            pdf_bytes = st.session_state.tab3_uploaded_file.getvalue()
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            total_pages = doc.page_count
            doc.close()

            # Determine which pages to process
            if st.session_state.tab3_page_mode == "All Pages":
                page_indices = list(range(total_pages))
            else:
                page_indices, parse_error = _parse_page_selection(
                    st.session_state.tab3_page_selection, total_pages
                )
                if parse_error:
                    st.error(parse_error)
                    st.stop()

            if len(page_indices) > 15:
                st.warning(
                    f"⚠️ You selected {len(page_indices)} pages. Processing many pages at once "
                    "may affect response quality with free-tier models."
                )

            with st.spinner(f"Scanning {len(page_indices)} page(s)..."):
                data_urls = _pdf_pages_to_data_urls(pdf_bytes, page_indices)

                prompt_text = ""
                if st.session_state.tab3_content_type == "General Text Extraction":
                    prompt_text = """Analyze ALL the provided PDF page images. Extract all readable text from every page and present it in a structured Markdown format that is clear, concise, and well-organized. Ensure proper formatting (e.g., headings, lists, or code blocks) as necessary. Clearly indicate page boundaries."""
                elif st.session_state.tab3_content_type == "LaTeX Equation Conversion":
                    prompt_text = """Examine ALL the provided PDF page images. Extract every mathematical equation and output the corresponding LaTeX code. NEVER include any additional text or explanations. DON'T add dollar signs ($) around the LaTeX code. DO NOT extract simplified versions of the equations. NEVER add documentclass, packages or begindocument. Output only the LaTeX code."""
                elif st.session_state.tab3_content_type == "Code Snippet Extraction":
                    prompt_text = """Examine ALL the provided PDF page images. Extract all code from every page. Present the code in formatted code blocks suitable for direct use. Do not include any additional text or explanations."""
                elif st.session_state.tab3_content_type == "Chart/Diagram Description":
                    prompt_text = """Examine ALL the provided PDF page images. Describe every chart or diagram found across the pages. Explain key elements, data, and any trends or insights in a clear, concise manner. Indicate which page each chart appears on."""

                content_parts: list[dict] = [{"type": "text", "text": prompt_text}]
                for url in data_urls:
                    content_parts.append({"type": "image_url", "image_url": {"url": url}})

                messages = [{"role": "user", "content": content_parts}]
                response_json = _make_openrouter_call(api_key, messages)

                if response_json:
                    st.session_state.tab3_result = response_json['choices'][0]['message']['content']
                else:
                    st.session_state.tab3_result = "Error: Could not get a response from the model."

    if st.session_state.tab3_result:
        st.markdown("### Result:")
        if st.session_state.tab3_content_type == "LaTeX Equation Conversion":
            st.code(st.session_state.tab3_result, language='latex')
            st.markdown("#### Rendered LaTeX:")
            cleaned_latex = st.session_state.tab3_result.replace(r"\[", "").replace(r"\]", "")
            st.latex(cleaned_latex)
        elif st.session_state.tab3_content_type == "Code Snippet Extraction":
            st.code(st.session_state.tab3_result, language='python')
        else:
            st.markdown(st.session_state.tab3_result)

