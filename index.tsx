// Fix: Removed non-existent 'LiveSession' type from import.
import { GoogleGenAI, Chat, LiveServerMessage, Modality, Blob } from "@google/genai";
import { getSystemInstruction } from './instructions';

// --- Local Storage Keys ---
const USERS_STORAGE_KEY = 'chatAppUsers';
const LOGGED_IN_USER_KEY = 'chatAppCurrentUser';

// --- DOM Element Selection ---
const chatContainer = document.getElementById('chat-container') as HTMLDivElement | null;
const chatMessages = document.getElementById('chat-messages') as HTMLDivElement | null;
const chatForm = document.getElementById('chat-form') as HTMLFormElement | null;
const chatInput = document.getElementById('chat-input') as HTMLInputElement | null;
const sendButton = document.getElementById('send-button') as HTMLButtonElement | null;
const callScreen = document.getElementById('call-screen') as HTMLDivElement | null;
const callStatus = document.getElementById('call-status') as HTMLDivElement | null;
const endCallButton = document.getElementById('end-call-button') as HTMLButtonElement | null;
const menuButton = document.getElementById('menu-button') as HTMLButtonElement | null;
const voiceMenu = document.getElementById('voice-menu') as HTMLDivElement | null;
const callTranscriptContainer = document.getElementById('call-transcript-container') as HTMLDivElement | null;
const callTranscriptText = document.getElementById('call-transcript-text') as HTMLParagraphElement | null;

// Auth Elements
const signupButton = document.getElementById('signup-button') as HTMLButtonElement | null;
const logoutButton = document.getElementById('logout-button') as HTMLButtonElement | null;
const authModal = document.getElementById('auth-modal') as HTMLDivElement | null;
const authModalBackdrop = document.getElementById('auth-modal-backdrop') as HTMLDivElement | null;
const authModalCloseButton = document.getElementById('auth-modal-close-button') as HTMLButtonElement | null;
const authForm = document.getElementById('auth-form') as HTMLFormElement | null;
const authModalTitle = document.getElementById('auth-modal-title') as HTMLHeadingElement | null;
const authModalDescription = document.getElementById('auth-modal-description') as HTMLParagraphElement | null;
const authSubmitButton = document.getElementById('auth-submit-button') as HTMLButtonElement | null;
const emailInput = document.getElementById('email-input') as HTMLInputElement | null;
const passwordInput = document.getElementById('password-input') as HTMLInputElement | null;
const confirmPasswordWrapper = document.getElementById('confirm-password-wrapper') as HTMLDivElement | null;
const confirmPasswordInput = document.getElementById('confirm-password') as HTMLInputElement | null;
const toSignupSwitch = document.getElementById('to-signup-switch') as HTMLParagraphElement | null;
const toLoginSwitch = document.getElementById('to-login-switch') as HTMLParagraphElement | null;
const switchToSignupLink = document.getElementById('switch-to-signup') as HTMLAnchorElement | null;
const switchToLoginLink = document.getElementById('switch-to-login') as HTMLAnchorElement | null;

// --- SVG Icons ---
const sendIconSVG = `<svg class="send-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>`;
const callIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.21-3.73-6.56-6.56l1.97-1.57c.27-.27.35-.66.24-1.01-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.72 21 20.01 21c.75 0 .99-.65.99-1.19v-2.43c0-.54-.45-.99-.99-.99z"/></svg>`;

// --- State ---
let isLoginMode = true;
let currentUser: string | null = null;

// --- Live Call State ---
// Fix: The 'LiveSession' type is not exported. Using 'any' as a workaround.
let sessionPromise: Promise<any> | null = null;
let mediaStream: MediaStream | null = null;
let inputAudioContext: AudioContext | null = null;
let outputAudioContext: AudioContext | null = null;
let scriptProcessor: ScriptProcessorNode | null = null;
let nextStartTime = 0;
const sources = new Set<AudioBufferSourceNode>();
type VoiceOption = 'Zephyr' | 'Fenrir' | 'Puck' | 'Charon' | 'Kore';
let selectedVoice: VoiceOption = 'Zephyr'; // Default: female voice
let callTranscriptHistory: { sender: 'user' | 'ai', text: string }[] = [];
let currentInputTranscription = '';
let currentOutputTranscription = '';


// --- Helper Functions ---

function appendMessage(text: string, sender: 'user' | 'ai'): HTMLDivElement | null {
  if (!chatMessages) return null;
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', `${sender}-message`);
  messageDiv.textContent = text;
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
  return messageDiv;
}

function createLoadingIndicator(): HTMLDivElement | null {
    if (!chatMessages) return null;
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'ai-message', 'loading-indicator');
    messageDiv.innerHTML = `<div class="dot"></div><div class="dot"></div><div class="dot"></div>`;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    return messageDiv;
}

function scrollToBottom() {
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function updateSendButtonState() {
    if (!chatInput || !sendButton) return;
    const hasText = chatInput.value.trim() !== '';
    if (hasText) {
        sendButton.innerHTML = sendIconSVG;
        sendButton.setAttribute('aria-label', 'إرسال الرسالة');
        sendButton.type = 'submit';
    } else {
        sendButton.innerHTML = callIconSVG;
        sendButton.setAttribute('aria-label', 'بدء مكالمة');
        sendButton.type = 'button';
    }
}

// --- Audio Encoding/Decoding Helpers ---
function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}


// --- Main Application Logic ---
function initializeChat() {
  const essentialElements = [
    chatContainer, chatMessages, chatForm, chatInput, sendButton,
    callScreen, callStatus, endCallButton, menuButton, voiceMenu,
    callTranscriptContainer, callTranscriptText, signupButton, authModal,
    authModalBackdrop, authModalCloseButton, authForm, authModalTitle,
    authModalDescription, authSubmitButton, confirmPasswordWrapper,
    confirmPasswordInput, toSignupSwitch, toLoginSwitch, switchToSignupLink,
    switchToLoginLink, logoutButton, emailInput, passwordInput
  ];

  if (essentialElements.some(el => !el)) {
    console.error('Fatal Error: One or more essential chat/call/auth elements are missing from the DOM.');
    if (document.body) {
      document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: red; font-family: sans-serif;"><h1>خطأ فادح</h1><p>لم يتم تحميل واجهة الدردشة أو المصادقة بشكل صحيح.</p></div>';
    }
    return;
  }

  // --- Auth State Initialization ---
  function updateAuthStateUI() {
      if (currentUser) {
          signupButton?.classList.add('hidden');
          logoutButton?.classList.remove('hidden');
      } else {
          signupButton?.classList.remove('hidden');
          logoutButton?.classList.add('hidden');
      }
  }

  function checkInitialAuthState() {
      const loggedInUser = localStorage.getItem(LOGGED_IN_USER_KEY);
      if (loggedInUser) {
          currentUser = loggedInUser;
      }
      updateAuthStateUI();
  }

  function handleLogout() {
      currentUser = null;
      localStorage.removeItem(LOGGED_IN_USER_KEY);
      updateAuthStateUI();
  }
  
  checkInitialAuthState();

  try {
    // This is a placeholder for a real API key which should be loaded from environment variables.
    const apiKey = "DUMMY_API_KEY";
    if (!apiKey) {
      throw new Error("لم يتم العثور على مفتاح API.");
    }
    const ai = new GoogleGenAI({ apiKey });
    
    // --- Text Chat Logic ---
    const chat: Chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction: getSystemInstruction() },
    });

    async function handleSendMessage(event: Event) {
      event.preventDefault();
      const userMessage = chatInput!.value.trim();
      if (!userMessage) return;
    
      appendMessage(userMessage, 'user');
      chatInput!.value = '';
      updateSendButtonState();
      
      const loadingIndicator = createLoadingIndicator();
      if (!loadingIndicator) return;
    
      try {
        const responseStream = await chat.sendMessageStream({ message: userMessage });
        let aiMessageDiv: HTMLDivElement | null = null;
        let accumulatedText = '';
    
        for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            if (chunkText) {
                accumulatedText += chunkText;
                if (!aiMessageDiv) {
                    chatMessages!.removeChild(loadingIndicator);
                    aiMessageDiv = appendMessage('', 'ai');
                }
                if (aiMessageDiv) {
                  aiMessageDiv.textContent = accumulatedText;
                  scrollToBottom();
                }
            }
        }
        if (!aiMessageDiv) {
            chatMessages!.removeChild(loadingIndicator);
        }
      } catch (error) {
        console.error(error);
        chatMessages!.removeChild(loadingIndicator);
        appendMessage("عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.", 'ai');
      }
    }

    // --- Voice Call Logic ---
    async function startCall() {
        // Reset state from any previous call
        callTranscriptHistory = [];
        currentInputTranscription = '';
        currentOutputTranscription = '';
        if (callTranscriptText) callTranscriptText.textContent = '';
      
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        callScreen!.style.display = 'flex';
        callStatus!.textContent = 'جاري الاتصال...';

        setTimeout(() => {
            if (!mediaStream) return; // Check if call was cancelled
            callStatus!.textContent = 'متصل';
            initializeLiveSession(ai);
        }, 1500);

      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("لا يمكن الوصول إلى الميكروفون. يرجى التحقق من الأذونات.");
      }
    }

    function initializeLiveSession(aiInstance: GoogleGenAI) {
        // Fix: Cast window to 'any' to allow access to vendor-prefixed webkitAudioContext for broader browser compatibility.
        inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        // Fix: Cast window to 'any' to allow access to vendor-prefixed webkitAudioContext for broader browser compatibility.
        outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        sessionPromise = aiInstance.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    const source = inputAudioContext!.createMediaStreamSource(mediaStream!);
                    scriptProcessor = inputAudioContext!.createScriptProcessor(4096, 1, 1);
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromise!.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContext!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                    if (base64EncodedAudioString) {
                        nextStartTime = Math.max(nextStartTime, outputAudioContext!.currentTime);
                        const audioBuffer = await decodeAudioData(
                            decode(base64EncodedAudioString),
                            outputAudioContext!, 24000, 1
                        );
                        const sourceNode = outputAudioContext!.createBufferSource();
                        sourceNode.buffer = audioBuffer;
                        sourceNode.connect(outputAudioContext!.destination);
                        sourceNode.addEventListener('ended', () => { sources.delete(sourceNode); });
                        sourceNode.start(nextStartTime);
                        nextStartTime += audioBuffer.duration;
                        sources.add(sourceNode);
                    }
                    if (message.serverContent?.interrupted) {
                        for (const source of sources.values()) {
                            source.stop();
                            sources.delete(source);
                        }
                        nextStartTime = 0;
                    }
                     // Handle transcription
                    if (message.serverContent?.outputTranscription) {
                        const text = message.serverContent.outputTranscription.text;
                        currentOutputTranscription += text;
                        if (callTranscriptText) {
                            callTranscriptText.textContent = currentOutputTranscription;
                            if(callTranscriptContainer) {
                            callTranscriptContainer.scrollTop = callTranscriptContainer.scrollHeight;
                            }
                        }
                    } else if (message.serverContent?.inputTranscription) {
                        const text = message.serverContent.inputTranscription.text;
                        currentInputTranscription += text;
                    }

                    if (message.serverContent?.turnComplete) {
                        if (currentInputTranscription.trim()) {
                            callTranscriptHistory.push({ sender: 'user', text: currentInputTranscription.trim() });
                        }
                        if (currentOutputTranscription.trim()) {
                            callTranscriptHistory.push({ sender: 'ai', text: currentOutputTranscription.trim() });
                        }
                        // Reset for next turn
                        currentInputTranscription = '';
                        currentOutputTranscription = '';
                        // Don't clear the live text, it will be cleared by the next outputTranscription chunk
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live session error:', e);
                    endCall();
                },
                onclose: (e: CloseEvent) => {
                    console.debug('Live session closed');
                    endCall();
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {}, // Enable user speech transcription
                outputAudioTranscription: {}, // Enable AI speech transcription
                systemInstruction: getSystemInstruction(),
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
                },
            },
        });
    }

    function endCall() {
      if (sessionPromise) {
        sessionPromise.then(session => session.close()).catch(console.error);
        sessionPromise = null;
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
      }
      if (scriptProcessor) {
        scriptProcessor.disconnect();
        scriptProcessor = null;
      }
      if (inputAudioContext) {
        inputAudioContext.close().catch(console.error);
        inputAudioContext = null;
      }
       if (outputAudioContext) {
        outputAudioContext.close().catch(console.error);
        outputAudioContext = null;
      }
      sources.forEach(source => source.stop());
      sources.clear();
      nextStartTime = 0;

      // Check for any lingering partial transcriptions
      if (currentInputTranscription.trim()) {
          callTranscriptHistory.push({ sender: 'user', text: currentInputTranscription.trim() });
      }
      if (currentOutputTranscription.trim()) {
          callTranscriptHistory.push({ sender: 'ai', text: currentOutputTranscription.trim() });
      }

      // Append transcript to chat
      callTranscriptHistory.forEach(entry => {
          appendMessage(entry.text, entry.sender);
      });

      // Reset all transcript state
      callTranscriptHistory = [];
      currentInputTranscription = '';
      currentOutputTranscription = '';
      if(callTranscriptText) callTranscriptText.textContent = '';


      callScreen!.style.display = 'none';
    }

    // --- Auth Modal Logic ---
    function updateAuthModalView() {
        if (isLoginMode) {
            authModalTitle!.textContent = 'تسجيل الدخول';
            authModalDescription!.textContent = 'مرحباً بعودتك! سجل الدخول للمتابعة.';
            authSubmitButton!.textContent = 'متابعة';
            confirmPasswordWrapper!.classList.add('hidden');
            confirmPasswordInput!.required = false;
            toSignupSwitch!.classList.remove('hidden');
            toLoginSwitch!.classList.add('hidden');
        } else {
            authModalTitle!.textContent = 'إنشاء حساب جديد';
            authModalDescription!.textContent = 'أنشئ حساباً لحفظ سجل محادثاتك.';
            authSubmitButton!.textContent = 'إنشاء حساب';
            confirmPasswordWrapper!.classList.remove('hidden');
            confirmPasswordInput!.required = true;
            toSignupSwitch!.classList.add('hidden');
            toLoginSwitch!.classList.remove('hidden');
        }
    }

    function showAuthModal() {
        isLoginMode = true; // Default to login mode
        updateAuthModalView();
        authModalBackdrop?.classList.remove('hidden');
        authModal?.classList.remove('hidden');
        setTimeout(() => {
            authModalBackdrop?.classList.add('show');
            authModal?.classList.add('show');
        }, 10);
    }
    
    function hideAuthModal() {
        authModalBackdrop?.classList.remove('show');
        authModal?.classList.remove('show');
        setTimeout(() => {
            authModalBackdrop?.classList.add('hidden');
            authModal?.classList.add('hidden');
            authForm?.reset(); // Clear form on close
        }, 300); // Match CSS transition duration
    }


    // --- Event Listeners ---
    chatForm!.addEventListener('submit', handleSendMessage);
    chatInput!.addEventListener('input', updateSendButtonState);
    sendButton!.addEventListener('click', () => {
        if (chatInput!.value.trim() === '') {
            startCall();
        }
    });
    endCallButton!.addEventListener('click', endCall);
    
    // Auth Listeners
    signupButton!.addEventListener('click', showAuthModal);
    logoutButton!.addEventListener('click', handleLogout);
    authModalCloseButton!.addEventListener('click', hideAuthModal);
    authModalBackdrop!.addEventListener('click', hideAuthModal);
    switchToSignupLink!.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = false;
        updateAuthModalView();
    });
    switchToLoginLink!.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = true;
        updateAuthModalView();
    });

    authForm!.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInput!.value.trim();
        const password = passwordInput!.value;

        const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '{}');

        if (isLoginMode) {
            // Login Logic
            if (users[email] && users[email] === password) {
                currentUser = email;
                localStorage.setItem(LOGGED_IN_USER_KEY, email);
                updateAuthStateUI();
                hideAuthModal();
            } else {
                alert('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
            }
        } else {
            // Signup Logic
            const confirmPassword = confirmPasswordInput!.value;
            if (password !== confirmPassword) {
                alert('كلمتا المرور غير متطابقتين.');
                return;
            }
            if (users[email]) {
                alert('هذا البريد الإلكتروني مسجل بالفعل.');
                return;
            }

            users[email] = password;
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
            
            currentUser = email;
            localStorage.setItem(LOGGED_IN_USER_KEY, email);
            
            alert('تم إنشاء الحساب بنجاح!');
            updateAuthStateUI();
            hideAuthModal();
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && authModal?.classList.contains('show')) {
            hideAuthModal();
        }
    });


    // --- Dropdown Menu Logic ---
    menuButton!.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent window listener from closing it immediately
      voiceMenu!.classList.toggle('show');
    });

    window.addEventListener('click', (e) => {
      if (voiceMenu!.classList.contains('show')) {
        // Fix: Cast the target to an element to check if it's inside the menu button
        const target = e.target as Element;
        if (!menuButton!.contains(target)) {
          voiceMenu!.classList.remove('show');
        }
      }
    });

    voiceMenu!.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent window listener from closing it
      const target = e.target as HTMLElement;
      // Fix: Cast the result of closest() to HTMLElement to access the dataset property.
      const menuItem = target.closest('.menu-item') as HTMLElement | null;
      if (menuItem && menuItem.dataset.voice) {
        selectedVoice = menuItem.dataset.voice as VoiceOption;

        // Update UI
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('selected-voice'));
        menuItem.classList.add('selected-voice');

        // Close menu
        voiceMenu!.classList.remove('show');
      }
    });

    updateSendButtonState(); // Set initial state on load

  } catch (error) {
      console.error(error);
      const errorMessage = (error instanceof Error) ? error.message : "حدث خطأ غير معروف أثناء التهيئة.";
      if (chatContainer) {
          chatContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #ffcccc; font-family: sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%;">
                  <h1 style="color: #ff8080;">خطأ في الإعداد</h1><p style="font-size: 1.1rem; max-width: 600px;">${errorMessage}</p></div>`;
      }
  }
}

// Run the initialization function when the script loads
initializeChat();