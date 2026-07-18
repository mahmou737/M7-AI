import streamlit as st
import anthropic
import os

# ─── Page Config ────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="M7 AI",
    page_icon="✦",
    layout="centered",
    initial_sidebar_state="collapsed",
)

# ─── Session State ──────────────────────────────────────────────────────────
if "page" not in st.session_state:
    st.session_state.page = "welcome"
if "messages" not in st.session_state:
    st.session_state.messages = []
if "thinking" not in st.session_state:
    st.session_state.thinking = False

# ─── Styling ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap');

* { font-family: 'Cairo', sans-serif !important; }

html, body, [data-testid="stAppViewContainer"] {
    direction: rtl;
    background: #0a0a0f;
}

[data-testid="stAppViewContainer"] > .main {
    background: #0a0a0f;
}

/* Hide default Streamlit chrome */
#MainMenu, footer, header { visibility: hidden; }
[data-testid="stToolbar"] { display: none; }
[data-testid="stDecoration"] { display: none; }

/* ── Welcome Page ── */
.welcome-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 85vh;
    gap: 0;
    text-align: center;
    direction: rtl;
}

.logo-ring {
    width: 110px;
    height: 110px;
    border-radius: 50%;
    background: linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #8b5cf6 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    margin: 0 auto 28px auto;
    box-shadow: 0 0 60px rgba(245,158,11,0.35), 0 0 120px rgba(245,158,11,0.15);
    animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 60px rgba(245,158,11,0.35), 0 0 120px rgba(245,158,11,0.15); }
    50%       { box-shadow: 0 0 80px rgba(245,158,11,0.55), 0 0 160px rgba(245,158,11,0.25); }
}

.welcome-title {
    font-size: 3.8rem;
    font-weight: 900;
    background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 12px 0;
    letter-spacing: -1px;
}

.welcome-tagline {
    font-size: 1.2rem;
    color: #94a3b8;
    margin: 0 0 8px 0;
    font-weight: 400;
}

.welcome-sub {
    font-size: 0.95rem;
    color: #475569;
    margin: 0 0 48px 0;
    font-weight: 300;
}

.divider {
    width: 60px;
    height: 3px;
    background: linear-gradient(90deg, #f59e0b, #ef4444);
    border-radius: 2px;
    margin: 0 auto 48px auto;
}

.feature-grid {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 52px;
    direction: rtl;
}

.feature-card {
    background: #13131a;
    border: 1px solid #1e1e2e;
    border-radius: 16px;
    padding: 20px 24px;
    text-align: center;
    min-width: 130px;
    transition: border-color 0.2s;
}

.feature-card:hover { border-color: #f59e0b44; }

.feature-icon { font-size: 1.8rem; margin-bottom: 8px; }
.feature-label { font-size: 0.85rem; color: #94a3b8; font-weight: 400; }

/* ── Chat Page ── */
.chat-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(10,10,15,0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #1e1e2e;
    padding: 14px 0;
    margin-bottom: 24px;
    direction: rtl;
    display: flex;
    align-items: center;
    gap: 12px;
}

.chat-logo {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: linear-gradient(135deg, #f59e0b, #ef4444);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
}

.chat-header-title { font-size: 1.25rem; font-weight: 700; color: #f1f5f9; }
.chat-header-status { font-size: 0.78rem; color: #22c55e; font-weight: 400; }

/* ── Messages ── */
.msg-row {
    display: flex;
    margin-bottom: 20px;
    direction: rtl;
    align-items: flex-end;
    gap: 10px;
}

.msg-row.user { justify-content: flex-start; }
.msg-row.ai   { justify-content: flex-end; }

.msg-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    flex-shrink: 0;
}

.msg-avatar.user-av { background: #1e293b; }
.msg-avatar.ai-av   { background: linear-gradient(135deg, #f59e0b, #ef4444); }

.msg-bubble {
    max-width: 72%;
    padding: 14px 18px;
    border-radius: 18px;
    font-size: 0.97rem;
    line-height: 1.7;
    direction: rtl;
    text-align: right;
    word-wrap: break-word;
}

.msg-bubble.user-bubble {
    background: #1e293b;
    color: #f1f5f9;
    border-bottom-right-radius: 4px;
}

.msg-bubble.ai-bubble {
    background: linear-gradient(135deg, #1a1008, #1a0f00);
    border: 1px solid #f59e0b33;
    color: #f1f5f9;
    border-bottom-left-radius: 4px;
}

/* ── Empty state ── */
.empty-chat {
    text-align: center;
    padding: 60px 20px;
    color: #475569;
    direction: rtl;
}
.empty-chat .big-icon { font-size: 3.5rem; margin-bottom: 16px; }
.empty-chat h3 { color: #64748b; font-weight: 600; margin-bottom: 8px; }
.empty-chat p { font-size: 0.9rem; }

/* ── Suggestions ── */
.suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    margin-top: 28px;
}

.suggestion-pill {
    background: #13131a;
    border: 1px solid #2d2d3d;
    border-radius: 24px;
    padding: 8px 18px;
    font-size: 0.88rem;
    color: #94a3b8;
    cursor: pointer;
    direction: rtl;
}

/* ── Input area ── */
.input-area {
    position: sticky;
    bottom: 0;
    background: rgba(10,10,15,0.95);
    backdrop-filter: blur(12px);
    border-top: 1px solid #1e1e2e;
    padding: 16px 0 8px 0;
    margin-top: 24px;
    direction: rtl;
}

/* Streamlit input override */
[data-testid="stChatInput"] {
    direction: rtl !important;
}

[data-testid="stChatInput"] textarea {
    direction: rtl !important;
    text-align: right !important;
    font-family: 'Cairo', sans-serif !important;
    font-size: 1rem !important;
}

/* Buttons */
.stButton > button {
    font-family: 'Cairo', sans-serif !important;
    font-weight: 600;
    border-radius: 12px;
    transition: all 0.2s ease;
}

.stButton > button:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(245,158,11,0.3);
}

/* Back button */
.back-btn > button {
    background: transparent !important;
    border: 1px solid #2d2d3d !important;
    color: #94a3b8 !important;
    padding: 6px 14px !important;
    font-size: 0.85rem !important;
}

/* Thinking indicator */
.thinking-dots {
    display: flex;
    gap: 5px;
    padding: 16px 18px;
    background: linear-gradient(135deg, #1a1008, #1a0f00);
    border: 1px solid #f59e0b33;
    border-radius: 18px;
    border-bottom-left-radius: 4px;
    width: fit-content;
}

.thinking-dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f59e0b;
    animation: bounce 1.2s ease-in-out infinite;
}
.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%            { transform: scale(1);   opacity: 1; }
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: #0a0a0f; }
::-webkit-scrollbar-thumb { background: #2d2d3d; border-radius: 4px; }
</style>
""", unsafe_allow_html=True)


# ─── Anthropic Client ────────────────────────────────────────────────────────
@st.cache_resource
def get_client():
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        st.error("⚠️ مفتاح ANTHROPIC_API_KEY غير موجود في المتغيرات البيئية.")
        st.stop()
    return anthropic.Anthropic(api_key=api_key)


# ─── Welcome Page ────────────────────────────────────────────────────────────
def show_welcome():
    st.markdown("""
    <div class="welcome-wrapper">
        <div class="logo-ring">✦</div>
        <h1 class="welcome-title">M7 AI</h1>
        <p class="welcome-tagline">مساعدك الذكي باللغة العربية</p>
        <p class="welcome-sub">مدعوم بأحدث تقنيات الذكاء الاصطناعي</p>
        <div class="divider"></div>
        <div class="feature-grid">
            <div class="feature-card">
                <div class="feature-icon">💬</div>
                <div class="feature-label">محادثة طبيعية</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">⚡</div>
                <div class="feature-label">ردود فورية</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🧠</div>
                <div class="feature-label">ذكاء متقدم</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🌙</div>
                <div class="feature-label">واجهة أنيقة</div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        if st.button("🚀  ابدأ المحادثة", use_container_width=True, type="primary"):
            st.session_state.page = "chat"
            st.rerun()


# ─── Chat Page ───────────────────────────────────────────────────────────────
SUGGESTIONS = [
    "كيف يمكنني تحسين إنتاجيتي؟",
    "اشرح لي مفهوم الذكاء الاصطناعي",
    "اكتب لي قصيدة عربية",
    "ما هي أفضل تقنيات البرمجة؟",
]

def show_chat():
    client = get_client()

    # ── Header
    col_back, col_title = st.columns([1, 5])
    with col_back:
        if st.button("← رجوع", key="back"):
            st.session_state.page = "welcome"
            st.session_state.messages = []
            st.rerun()

    st.markdown("""
    <div class="chat-header">
        <div class="chat-logo">✦</div>
        <div>
            <div class="chat-header-title">M7 AI</div>
            <div class="chat-header-status">● متصل</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # ── Messages area
    messages_container = st.container()

    with messages_container:
        if not st.session_state.messages:
            # Empty state with suggestions
            st.markdown("""
            <div class="empty-chat">
                <div class="big-icon">✦</div>
                <h3>أهلاً! كيف يمكنني مساعدتك؟</h3>
                <p>أنا M7 AI، مساعدك الذكي. اسألني عن أي شيء!</p>
                <div class="suggestions">
            """, unsafe_allow_html=True)

            cols = st.columns(2)
            for i, suggestion in enumerate(SUGGESTIONS):
                with cols[i % 2]:
                    if st.button(suggestion, key=f"sug_{i}", use_container_width=True):
                        st.session_state.messages.append({"role": "user", "content": suggestion})
                        st.rerun()

            st.markdown("</div></div>", unsafe_allow_html=True)

        else:
            for msg in st.session_state.messages:
                if msg["role"] == "user":
                    st.markdown(f"""
                    <div class="msg-row user">
                        <div class="msg-avatar user-av">👤</div>
                        <div class="msg-bubble user-bubble">{msg["content"]}</div>
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    content = msg["content"].replace("\n", "<br>")
                    st.markdown(f"""
                    <div class="msg-row ai">
                        <div class="msg-avatar ai-av">✦</div>
                        <div class="msg-bubble ai-bubble">{content}</div>
                    </div>
                    """, unsafe_allow_html=True)

    # ── Input
    prompt = st.chat_input("اكتب رسالتك هنا...")

    if prompt:
        # Add user message
        st.session_state.messages.append({"role": "user", "content": prompt})

        # Build API messages
        api_messages = [
            {"role": m["role"], "content": m["content"]}
            for m in st.session_state.messages
        ]

        # Stream response
        with st.spinner(""):
            st.markdown("""
            <div class="msg-row ai">
                <div class="msg-avatar ai-av">✦</div>
                <div class="thinking-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
            """, unsafe_allow_html=True)

            full_response = ""
            response_placeholder = st.empty()

            with client.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=8192,
                system=(
                    "أنت M7 AI، مساعد ذكاء اصطناعي متقدم يتحدث العربية بطلاقة. "
                    "تجيب بأسلوب واضح ومفيد وودي. استخدم العربية الفصحى البسيطة. "
                    "عند الحاجة للتعداد أو الخطوات، نظّمها بشكل جميل."
                ),
                messages=api_messages,
            ) as stream:
                for text_chunk in stream.text_stream:
                    full_response += text_chunk
                    formatted = full_response.replace("\n", "<br>")
                    response_placeholder.markdown(f"""
                    <div class="msg-row ai">
                        <div class="msg-avatar ai-av">✦</div>
                        <div class="msg-bubble ai-bubble">{formatted}</div>
                    </div>
                    """, unsafe_allow_html=True)

        # Save assistant response
        st.session_state.messages.append({"role": "assistant", "content": full_response})
        st.rerun()


# ─── Router ──────────────────────────────────────────────────────────────────
if st.session_state.page == "welcome":
    show_welcome()
else:
    show_chat()
