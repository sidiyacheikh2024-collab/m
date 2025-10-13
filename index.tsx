// Fix: Removed non-existent 'LiveSession' type from import.
import { GoogleGenAI, Chat, LiveServerMessage, Modality, Blob } from "@google/genai";
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { constructInstructionWithExamples, InstructionParts, getDefaultInstructionParts, assembleInstructionFromParts } from './instructions';

// --- Supabase Initialization ---
const supabaseUrl = 'https://rlfiypthhkamdedaiebv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZml5cHRoaGthbWRlZGFpZWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjIzMTcsImV4cCI6MjA3NDc5ODMxN30.hUOd66JatytNH5OWrwYjffNmMFkvopzQ1nqSokn16-c';
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);


// --- DOM Element Selection ---
const chatContainer = document.getElementById('chat-container') as HTMLDivElement | null;
const chatMessages = document.getElementById('chat-messages') as HTMLDivElement | null;
const chatForm = document.getElementById('chat-form') as HTMLFormElement | null;
const chatInput = document.getElementById('chat-input') as HTMLInputElement | null;
const sendButton = document.getElementById('send-button') as HTMLButtonElement | null;
const callScreen = document.getElementById('call-screen') as HTMLDivElement | null;
const callStatus = document.getElementById('call-status') as HTMLDivElement | null;
const callIconContainer = document.getElementById('call-icon-container') as HTMLDivElement | null;
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

// Admin Dashboard Elements
const adminDashboardButton = document.getElementById('admin-dashboard-button') as HTMLButtonElement | null;
const adminDashboard = document.getElementById('admin-dashboard') as HTMLDivElement | null;
const adminDashboardBackdrop = document.getElementById('admin-dashboard-backdrop') as HTMLDivElement | null;
const adminDashboardCloseButton = document.getElementById('admin-dashboard-close-button') as HTMLButtonElement | null;
const dashboardTabs = document.querySelector('.dashboard-tabs') as HTMLDivElement | null;
const correctionsContent = document.getElementById('corrections-content') as HTMLDivElement | null;
const instructionsContent = document.getElementById('instructions-content') as HTMLDivElement | null;
const statsContent = document.getElementById('stats-content') as HTMLDivElement | null;
const correctionsSearchInput = document.getElementById('corrections-search-input') as HTMLInputElement | null;
const correctionsList = document.getElementById('corrections-list') as HTMLDivElement | null;
const trainForm = document.getElementById('train-form') as HTMLFormElement | null;
const saveInstructionsButton = document.getElementById('save-instructions-button') as HTMLButtonElement | null;


// --- SVG Icons ---
const sendIconSVG = `<svg class="send-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>`;
const callIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.21-3.73-6.56-6.56l1.97-1.57c.27-.27.35-.66.24-1.01-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.72 21 20.01 21c.75 0 .99-.65.99-1.19v-2.43c0-.54-.45-.99-.99-.99z"/></svg>`;

// --- State ---
interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    userPrompt?: string; // The user message that triggered this AI response
}
let messages: Message[] = [];
let editingMessageId: string | null = null;
let editingCorrectionId: number | null = null;

let isLoginMode = true;
let currentUser: User | null = null;
const ADMIN_EMAIL = 'sidiyacheikh2023@gmail.com';
let chat: Chat;
let currentInstructionParts: InstructionParts = getDefaultInstructionParts();
let currentCorrectionExamples: any[] = [];
let allCorrectionsData: any[] = []; // For dashboard filtering


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

// Ringing sound state
let ringContext: AudioContext | null = null;
let ringOsc1: OscillatorNode | null = null;
let ringOsc2: OscillatorNode | null = null;
let ringGain: GainNode | null = null;
let ringIntervalId: number | null = null;

// --- Audio Feedback State ---
let audioCtx: AudioContext | null = null;

// --- Helper Functions ---

// --- Audio Feedback Function ---
function playSound(type: 'send' | 'receive') {
    try {
        // Create audio context on first user interaction to comply with autoplay policies
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (!audioCtx) return; // Still couldn't create it.

        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === 'send') {
            // A short, high-pitched "pop" for sending
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(900, now);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, now + 0.1);
        } else { // 'receive'
            // A slightly lower, softer "blip" for receiving
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(700, now);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, now + 0.15);
        }

        oscillator.start(now);
        oscillator.stop(now + 0.2);
    } catch(e) {
        console.warn("Could not play sound:", e);
        // Disable audio context if it fails, to prevent repeated errors.
        audioCtx = null;
    }
}


function updateMessageText(messageId: string, newText: string) {
    const message = messages.find(m => m.id === messageId);
    if (message) {
        message.text = newText;
        // More efficient than full re-render for streaming
        const messageDiv = document.querySelector(`[data-message-id="${messageId}"] .message`);
        if (messageDiv) {
            messageDiv.textContent = newText;
            scrollToBottom();
        }
    }
}


function createLoadingIndicator(): HTMLDivElement | null {
    if (!chatMessages) return null;
    const wrapper = document.createElement('div');
    wrapper.classList.add('message-wrapper', 'ai-wrapper');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'ai-message', 'loading-indicator');
    messageDiv.innerHTML = `<div class="dot"></div><div class="dot"></div><div class="dot"></div>`;
    wrapper.appendChild(messageDiv);
    chatMessages.appendChild(wrapper);
    scrollToBottom();
    return wrapper;
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

function playAdminLoginSound() {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (!audioCtx) return;

        const oscillator1 = audioCtx.createOscillator();
        const oscillator2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        gainNode.connect(audioCtx.destination);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);

        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);

        oscillator1.type = 'sine';
        oscillator1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5

        oscillator2.type = 'sine';
        oscillator2.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.15); // G5

        oscillator1.start(audioCtx.currentTime);
        oscillator1.stop(audioCtx.currentTime + 0.1);

        oscillator2.start(audioCtx.currentTime + 0.15);
        oscillator2.stop(audioCtx.currentTime + 0.3);
        
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.4);

        setTimeout(() => audioCtx.close(), 500);

    } catch (e) {
        console.error("Could not play admin login sound:", e);
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

// --- Ringing Sound Helpers ---

function startRinging() {
    if (ringContext) return; // Already ringing

    try {
        ringContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        ringOsc1 = ringContext.createOscillator();
        ringOsc2 = ringContext.createOscillator();
        ringGain = ringContext.createGain();

        ringOsc1.type = 'sine';
        ringOsc1.frequency.value = 440; // Standard European ring tone
        
        ringOsc2.type = 'sine';
        ringOsc2.frequency.value = 480; // Standard European ring tone

        ringOsc1.connect(ringGain);
        ringOsc2.connect(ringGain);
        ringGain.connect(ringContext.destination);

        // Fix: Start the oscillators. They run continuously, and we control their
        // volume with the gain node to produce the ringing pattern.
        ringOsc1.start();
        ringOsc2.start();

        ringGain.gain.setValueAtTime(0, ringContext.currentTime);

        const ring = () => {
            if (!ringContext || !ringGain) return;
            const now = ringContext.currentTime;
            // Ring for 1.8s, silent for 2.2s. Total 4s cycle.
            ringGain.gain.setValueAtTime(0.1, now);
            ringGain.gain.setValueAtTime(0, now + 1.8);
        };
        
        ring(); // Ring immediately
        ringIntervalId = window.setInterval(ring, 4000); // Ring every 4 seconds
    } catch(e) {
        console.error("Could not start ringing sound:", e);
        // Ensure cleanup if something fails
        stopRinging();
    }
}

function stopRinging() {
    if (ringIntervalId) {
        clearInterval(ringIntervalId);
        ringIntervalId = null;
    }
    if (ringContext) {
        const now = ringContext.currentTime;
        ringGain?.gain.cancelScheduledValues(now);
        // Fade out smoothly over 0.2s
        ringGain?.gain.setValueAtTime(ringGain.gain.value, now);
        ringGain?.gain.linearRampToValueAtTime(0, now + 0.2); 
        
        // Use a timeout to stop everything after the fade-out is complete
        setTimeout(() => {
            ringOsc1?.stop();
            ringOsc2?.stop();
            ringContext?.close().catch(console.error);

            ringContext = null;
            ringOsc1 = null;
            ringOsc2 = null;
            ringGain = null;
        }, 300);
    }
}


// --- Main Application Logic ---
async function initializeChat() {
  const essentialElements = [
    chatContainer, chatMessages, chatForm, chatInput, sendButton,
    callScreen, callStatus, endCallButton, menuButton, voiceMenu,
    callIconContainer, callTranscriptContainer, callTranscriptText, signupButton, authModal,
    authModalBackdrop, authModalCloseButton, authForm, authModalTitle,
    authModalDescription, authSubmitButton, confirmPasswordWrapper,
    confirmPasswordInput, toSignupSwitch, toLoginSwitch, switchToSignupLink,
    switchToLoginLink, logoutButton, emailInput, passwordInput,
    adminDashboardButton, adminDashboard, adminDashboardBackdrop, adminDashboardCloseButton,
    trainForm, saveInstructionsButton, statsContent
  ];

  if (essentialElements.some(el => !el)) {
    console.error('Fatal Error: One or more essential chat/call/auth elements are missing from the DOM.');
    if (document.body) {
      document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: red; font-family: sans-serif;"><h1>خطأ فادح</h1><p>لم يتم تحميل واجهة الدردشة أو المصادقة بشكل صحيح.</p></div>';
    }
    return;
  }
  
  let ai: GoogleGenAI;

  function getAdminWelcomeMessage(): string {
      const adminNotice = currentInstructionParts.adminNotice;
      // Regex to find the text between "تقول \"" and "\"،"
      // Example: ... تقول "مرحباً بالمدير، سيدي الشيخ!"، فهذا يعني ...
      const regex = /تقول "([^"]+)"،/;
      const match = adminNotice.match(regex);

      if (match && match[1]) {
          return match[1]; // Return the captured group (e.g., "مرحباً بالمدير، سيدي الشيخ!")
      }

      // Fallback message if parsing fails for any reason.
      return 'مرحباً بالمدير!';
  }

  function reinitializeChat() {
      const baseInstruction = assembleInstructionFromParts(currentInstructionParts);
      const fullInstruction = constructInstructionWithExamples(baseInstruction, currentCorrectionExamples);
      
      chat = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: { systemInstruction: fullInstruction },
      });
      messages = [];
      renderMessages();
      console.log("Chat reinitialized with new instructions and examples.");
  }

  async function fetchInstructionsAndCorrections(isForDashboard = false) {
      if (isForDashboard && correctionsList) {
          correctionsList.innerHTML = '<div class="loading-indicator" style="margin: auto;"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
      }

      const instructionPromise = supabase
          .from('system_instructions')
          .select('instruction_parts')
          .eq('id', 1)
          .single();

      const correctionsPromise = supabase
          .from('message_corrections')
          .select('id, user_prompt, original_response, corrected_message')
          .order('created_at', { ascending: false });

      const [instructionResult, correctionsResult] = await Promise.all([
          instructionPromise,
          correctionsPromise
      ]);
      
      if (instructionResult.error) {
          console.warn("Could not fetch instruction parts from Supabase. Using defaults.", instructionResult.error);
          currentInstructionParts = getDefaultInstructionParts();

          // FIX: Show a detailed alert to the admin if the table is missing by checking the error code.
          if (currentUser?.email === ADMIN_EMAIL && instructionResult.error.code === 'PGRST205') {
              alert(
                  'خطأ في قاعدة البيانات: الجدول "system_instructions" غير موجود.\n\n' +
                  'كمدير، يجب عليك تشغيل كود SQL التالي في محرر Supabase لإصلاح المشكلة:\n\n' +
                  '-- 1. Create the table for segmented instructions\n' +
                  'CREATE TABLE public.system_instructions (\n' +
                  '  id BIGINT PRIMARY KEY,\n' +
                  '  created_at TIMESTAMPTZ DEFAULT NOW(),\n' +
                  '  instruction_parts JSONB\n' +
                  ');\n\n' +
                  '-- 2. Insert the initial row for the instructions (ID = 1)\n' +
                  "INSERT INTO public.system_instructions (id, instruction_parts) VALUES (1, '{}'::jsonb);\n\n" +
                  '-- 3. Enable Row Level Security (Important for security)\n' +
                  'ALTER TABLE public.system_instructions ENABLE ROW LEVEL SECURITY;\n\n' +
                  '-- 4. Create a policy that allows everyone to READ the instructions\n' +
                  'CREATE POLICY "Allow public read access to instructions" ON public.system_instructions FOR SELECT USING (true);\n\n' +
                  '-- 5. Create a policy that ONLY allows the ADMIN to UPDATE the instructions\n' +
                  'CREATE POLICY "Allow admin to update instructions" ON public.system_instructions FOR UPDATE TO authenticated USING (auth.email() = \'sidiyacheikh2023@gmail.com\') WITH CHECK (auth.email() = \'sidiyacheikh2023@gmail.com\');'
              );
          }
      } else if (!instructionResult.data || !instructionResult.data.instruction_parts) {
          console.warn("Instruction parts data is missing or null in Supabase. Using defaults.");
          currentInstructionParts = getDefaultInstructionParts();
      } else {
          // Success case: Ensure all parts from default are present in fetched data
          currentInstructionParts = { ...getDefaultInstructionParts(), ...instructionResult.data.instruction_parts };
      }

      if (correctionsResult.error || !correctionsResult.data) {
           currentCorrectionExamples = [];
           allCorrectionsData = [];
      } else {
          currentCorrectionExamples = correctionsResult.data;
          allCorrectionsData = correctionsResult.data;
      }
      
      if(isForDashboard) {
          renderDashboardCorrections();
      } else {
        reinitializeChat();
      }
  }

  async function handleSendMessage(event: Event) {
    event.preventDefault();
    const userMessage = chatInput!.value.trim();
    if (!userMessage) return;
  
    playSound('send');
    appendMessage(userMessage, 'user');
    chatInput!.value = '';
    updateSendButtonState();
    
    const loadingIndicator = createLoadingIndicator();
    if (!loadingIndicator) return;
  
    try {
      const responseStream = await chat.sendMessageStream({ message: userMessage });
      let aiMessage: Message | null = null;
      let accumulatedText = '';
  
      for await (const chunk of responseStream) {
          const chunkText = chunk.text;
          if (chunkText) {
              accumulatedText += chunkText;
              if (!aiMessage) {
                  chatMessages!.removeChild(loadingIndicator);
                  playSound('receive');
                  aiMessage = appendMessage('', 'ai', userMessage);
              }
              if (aiMessage) {
                updateMessageText(aiMessage.id, accumulatedText);
              }
          }
      }
      if (!aiMessage) { // Handle case where stream is empty
          chatMessages!.removeChild(loadingIndicator);
      } else {
          // Final re-render to add edit button
          renderMessages();
      }

    } catch (error) {
      console.error(error);
      chatMessages!.removeChild(loadingIndicator);
      playSound('receive');
      appendMessage("يتم تحديث التطبيق حاليا ، الرجاء العودة لاحقا", 'ai');
    }
  }

  async function startCall() {
      callTranscriptHistory = [];
      currentInputTranscription = '';
      currentOutputTranscription = '';
      if (callTranscriptText) callTranscriptText.textContent = '';
    
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      callScreen!.style.display = 'flex';
      callStatus!.textContent = 'جاري الاتصال...';
      startRinging();

      setTimeout(() => {
          if (!mediaStream) return; // Call might have been ended during ringing
          stopRinging();
          callStatus!.textContent = 'متصل';
          initializeLiveSession(ai);
      }, 4000); // Wait 4s to simulate connection and allow for one ring cycle

    } catch (err) {
      console.error("Error accessing microphone:", err);
      stopRinging(); // Clean up ringing on error
      alert("لا يمكن الوصول إلى الميكروفون. يرجى التحقق من الأذونات.");
    }
  }

  function initializeLiveSession(aiInstance: GoogleGenAI) {
      inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const systemInstructionText = constructInstructionWithExamples(
          assembleInstructionFromParts(currentInstructionParts),
          currentCorrectionExamples
      );

      const callInstructionPrefix = `أنت الآن في مكالمة صوتية مباشرة. شخصيتك هي شخص ودود يتحدث الحسانية بطلاقة وبشكل طبيعي. كن مرحباً وتفاعلياً بشكل خاص. التعليمات التفصيلية الخاصة بك هي التالية:\n\n`;
      const finalCallInstruction = callInstructionPrefix + systemInstructionText;

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
                  // Fix: Add optional chaining to `parts`, `[0]`, and `inlineData` to prevent errors
                  // when a message part is not audio or the parts array is empty.
                  const base64EncodedAudioString = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                  if (base64EncodedAudioString) {
                      callIconContainer?.classList.add('is-speaking');
                      nextStartTime = Math.max(nextStartTime, outputAudioContext!.currentTime);
                      const audioBuffer = await decodeAudioData(
                          decode(base64EncodedAudioString),
                          outputAudioContext!, 24000, 1
                      );
                      const sourceNode = outputAudioContext!.createBufferSource();
                      sourceNode.buffer = audioBuffer;
                      sourceNode.connect(outputAudioContext!.destination);
                      sourceNode.addEventListener('ended', () => { 
                          sources.delete(sourceNode);
                          if (sources.size === 0) {
                              callIconContainer?.classList.remove('is-speaking');
                          }
                      });
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
                      callIconContainer?.classList.remove('is-speaking');
                  }
                  if (message.serverContent?.outputTranscription) {
                      currentOutputTranscription += message.serverContent.outputTranscription.text;
                      if (callTranscriptText) callTranscriptText.textContent = currentOutputTranscription;
                      if(callTranscriptContainer) callTranscriptContainer.scrollTop = callTranscriptContainer.scrollHeight;
                  } else if (message.serverContent?.inputTranscription) {
                      currentInputTranscription += message.serverContent.inputTranscription.text;
                  }

                  if (message.serverContent?.turnComplete) {
                      if (currentInputTranscription.trim()) callTranscriptHistory.push({ sender: 'user', text: currentInputTranscription.trim() });
                      if (currentOutputTranscription.trim()) callTranscriptHistory.push({ sender: 'ai', text: currentOutputTranscription.trim() });
                      currentInputTranscription = '';
                      currentOutputTranscription = '';
                  }
              },
              onerror: (e: ErrorEvent) => { console.error('Live session error:', e); endCall(); },
              onclose: (e: CloseEvent) => { console.debug('Live session closed'); endCall(); },
          },
          config: {
              responseModalities: [Modality.AUDIO],
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              systemInstruction: finalCallInstruction,
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
              },
          },
      });
  }

  function endCall() {
    stopRinging(); // Stop ringing sound if call is ended during connection phase

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
    if (inputAudioContext) inputAudioContext.close().catch(console.error);
    if (outputAudioContext) outputAudioContext.close().catch(console.error);
    inputAudioContext = null;
    outputAudioContext = null;
    sources.forEach(source => source.stop());
    sources.clear();
    nextStartTime = 0;
    callIconContainer?.classList.remove('is-speaking');


    if (currentInputTranscription.trim()) callTranscriptHistory.push({ sender: 'user', text: currentInputTranscription.trim() });
    if (currentOutputTranscription.trim()) callTranscriptHistory.push({ sender: 'ai', text: currentOutputTranscription.trim() });
    
    callTranscriptHistory.forEach(entry => appendMessage(entry.text, entry.sender));
    
    callTranscriptHistory = [];
    currentInputTranscription = '';
    currentOutputTranscription = '';
    if(callTranscriptText) callTranscriptText.textContent = '';
    callScreen!.style.display = 'none';
  }

  function appendMessage(text: string, sender: 'user' | 'ai', userPromptForAiMessage?: string): Message {
      const message: Message = {
          id: `msg-${Date.now()}-${Math.random()}`,
          text,
          sender,
          userPrompt: userPromptForAiMessage,
      };
      messages.push(message);
      renderMessages();
      return message;
  }

  function renderMessages() {
    if (!chatMessages) return;
    chatMessages.innerHTML = '';

    messages.forEach(msg => {
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${msg.sender}-wrapper`;
        wrapper.dataset.messageId = msg.id;

        if (editingMessageId === msg.id) {
            // Render edit view
            const editContainer = document.createElement('div');
            editContainer.className = 'message-edit-container';

            const textarea = document.createElement('textarea');
            textarea.className = 'message-edit-textarea';
            textarea.value = msg.text;
            
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'message-edit-buttons';

            const saveButton = document.createElement('button');
            saveButton.textContent = 'حفظ';
            saveButton.onclick = () => handleSaveCorrection(msg.id, textarea.value);

            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'إلغاء';
            cancelButton.onclick = handleCancelEdit;

            buttonContainer.append(saveButton, cancelButton);
            editContainer.append(textarea, buttonContainer);
            wrapper.appendChild(editContainer);

        } else {
            // Render normal view
            const content = document.createElement('div');
            content.className = `message ${msg.sender}-message`;
            content.textContent = msg.text;
            wrapper.appendChild(content);

            // Show actions (edit/report) for AI messages if a user is logged in
            if (msg.sender === 'ai' && currentUser && msg.userPrompt) {
                const actions = document.createElement('div');
                actions.className = 'message-actions';

                if (currentUser.email === ADMIN_EMAIL) {
                    // Admin sees the Edit button
                    const editButton = document.createElement('button');
                    editButton.className = 'edit-btn';
                    editButton.setAttribute('aria-label', 'تعديل الرسالة');
                    editButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/></svg>`;
                    editButton.onclick = () => {
                        editingMessageId = msg.id;
                        renderMessages();
                    };
                    actions.appendChild(editButton);
                } else {
                    // Other logged-in users see the Report button
                    const reportButton = document.createElement('button');
                    reportButton.className = 'report-btn';
                    reportButton.setAttribute('aria-label', 'الإبلاغ عن رد');
                    reportButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z"/></svg>`;
                    // The onclick is handled by the event listener on chatMessages
                    actions.appendChild(reportButton);
                }
                wrapper.appendChild(actions);
            }
        }
        chatMessages.appendChild(wrapper);
    });
    scrollToBottom();
  }

  function handleCancelEdit() {
      editingMessageId = null;
      renderMessages();
  }

  async function handleReportMessage(messageId: string, buttonElement: HTMLButtonElement) {
    const messageToReport = messages.find(m => m.id === messageId);
    if (!messageToReport || !messageToReport.userPrompt) {
        alert('لا يمكن الإبلاغ عن هذه الرسالة.');
        return;
    }

    buttonElement.disabled = true;

    const { error } = await supabase
        .from('review_suggestions')
        .insert({
            user_prompt: messageToReport.userPrompt,
            reported_response: messageToReport.text,
        });

    if (error) {
        console.error('Failed to save suggestion:', error.message);
        if (currentUser?.email === ADMIN_EMAIL && error.message.includes("does not exist")) {
            alert(
                'فشل الإبلاغ: الجدول "review_suggestions" غير موجود.\n\n' +
                'كمدير، قم بتشغيل كود SQL التالي في محرر Supabase:\n\n' +
                'CREATE TABLE public.review_suggestions (\n' +
                '  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n' +
                '  created_at TIMESTAMPTZ DEFAULT NOW(),\n' +
                '  user_prompt TEXT,\n' +
                '  reported_response TEXT NOT NULL\n' +
                ');\n\n' +
                '-- Enable RLS\n' +
                'ALTER TABLE public.review_suggestions ENABLE ROW LEVEL SECURITY;\n\n' +
                '-- Allow logged-in users to create suggestions\n' +
                'CREATE POLICY "Allow authenticated users to insert suggestions" \n' +
                'ON public.review_suggestions FOR INSERT \n' +
                'TO authenticated WITH CHECK (true);'
            );
        } else {
            alert('فشل إرسال البلاغ: ' + error.message);
        }
        buttonElement.disabled = false; // Re-enable if failed
        return;
    }

    // Success visual feedback
    buttonElement.classList.add('reported');
    buttonElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`;
    buttonElement.setAttribute('aria-label', 'تم الإبلاغ');
}


  async function handleSaveCorrection(messageId: string, correctedText: string) {
      const originalMessage = messages.find(m => m.id === messageId);
      if (!originalMessage || !originalMessage.userPrompt) {
          alert('لا يمكن حفظ التصحيح. الرسالة الأصلية للمستخدم غير موجودة.');
          return;
      }

      const { error } = await supabase
          .from('message_corrections')
          .insert({
              user_prompt: originalMessage.userPrompt,
              original_response: originalMessage.text,
              corrected_message: correctedText,
              corrected_response: correctedText // Also write to the other column to be safe
          });

      if (error) {
          console.error('Failed to save correction:', error.message);
          if (error.message.includes("does not exist")) {
              alert(
                  'فشل الحفظ: الجدول "message_corrections" غير موجود.\n\n' +
                  'لإصلاح هذا، قم بتشغيل كود SQL التالي في محرر Supabase:\n\n' +
                  'CREATE TABLE public.message_corrections (\n' +
                  '  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n' +
                  '  created_at TIMESTAMPTZ DEFAULT NOW(),\n' +
                  '  user_prompt TEXT,\n' +
                  '  original_response TEXT,\n' +
                  '  corrected_message TEXT NOT NULL\n' +
                  ');\n\n' +
                  'ملاحظة: قد تحتاج إلى إعداد سياسات RLS للسماح بالكتابة.'
              );
          } else {
              alert('فشل حفظ التصحيح: ' + error.message);
          }
          return;
      }

      // Success
      originalMessage.text = correctedText;
      editingMessageId = null;
      await fetchInstructionsAndCorrections(); // Re-fetch all and re-initialize chat
      renderMessages();
      setTimeout(() => {
        playSound('receive');
        appendMessage('تم حفظ التصحيح. سيتعلم المساعد من هذا المثال في المحادثات القادمة.', 'ai')
      }, 300);
  }

  function updateAuthStateUI() {
      if (currentUser) {
          signupButton?.classList.add('hidden');
          logoutButton?.classList.remove('hidden');
          if (currentUser.email === ADMIN_EMAIL) {
              adminDashboardButton?.classList.remove('hidden');
          } else {
              adminDashboardButton?.classList.add('hidden');
          }
      } else {
          signupButton?.classList.remove('hidden');
          logoutButton?.classList.add('hidden');
          adminDashboardButton?.classList.add('hidden');
      }
      renderMessages(); // Re-render messages to show/hide edit buttons
  }

  async function handleLogout() {
      const { error } = await supabase.auth.signOut();
      if (error) {
          console.error('Error logging out:', error.message);
          alert('حدث خطأ أثناء تسجيل الخروج.');
      }
      adminDashboardButton?.classList.add('hidden');
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
          // Fix: Use classList.remove to modify classes, not Element.prototype.remove which removes the element.
          toLoginSwitch!.classList.remove('hidden');
      }
  }

  function showAuthModal() {
      isLoginMode = true;
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
          authForm?.reset();
      }, 300);
  }

  // --- Admin Dashboard Logic ---
  function renderDashboardCorrections(filter: string = '') {
      if (!correctionsList) return;
      const lowerCaseFilter = filter.toLowerCase();

      const filteredData = allCorrectionsData.filter(c =>
          c.user_prompt?.toLowerCase().includes(lowerCaseFilter) ||
          c.original_response?.toLowerCase().includes(lowerCaseFilter) ||
          c.corrected_message?.toLowerCase().includes(lowerCaseFilter)
      );

      if (filteredData.length === 0) {
          correctionsList.innerHTML = `<p style="text-align: center; opacity: 0.7;">لا توجد تصحيحات مطابقة.</p>`;
          return;
      }

      correctionsList.innerHTML = filteredData.map(correction => {
        const isEditing = correction.id === editingCorrectionId;

        return `
          <div class="correction-card ${isEditing ? 'is-editing' : ''}" data-id="${correction.id}">
              <div class="correction-card-section">
                  <label>سؤال المستخدم</label>
                  ${isEditing 
                    ? `<textarea data-field="user_prompt">${correction.user_prompt || ''}</textarea>` 
                    : `<p>${correction.user_prompt || ''}</p>`}
              </div>
              <div class="correction-card-section">
                  <label>الرد الأصلي</label>
                  ${isEditing 
                    ? `<textarea data-field="original_response">${correction.original_response || ''}</textarea>` 
                    : `<p>${correction.original_response || ''}</p>`}
              </div>
              <div class="correction-card-section">
                  <label>الرد المصحح</label>
                   ${isEditing 
                    ? `<textarea data-field="corrected_message">${correction.corrected_message || ''}</textarea>` 
                    : `<p>${correction.corrected_message || ''}</p>`}
              </div>
              <div class="correction-card-actions">
                  ${isEditing 
                    ? `
                        <button class="save-correction-btn">حفظ</button>
                        <button class="cancel-correction-btn">إلغاء</button>
                    ` 
                    : `
                        <button class="edit-correction-btn">تعديل</button>
                        <button class="delete-correction-btn">حذف</button>
                    `}
              </div>
          </div>
        `;
    }).join('');
  }

  async function handleDeleteCorrection(id: number) {
      if (!confirm(`هل أنت متأكد من رغبتك في حذف هذا التصحيح؟ لا يمكن التراجع عن هذا الإجراء.`)) return;

      const { error } = await supabase.from('message_corrections').delete().eq('id', id);
      if (error) {
          alert('فشل حذف التصحيح: ' + error.message);
      } else {
          await fetchInstructionsAndCorrections(true); // Refresh dashboard
          await reinitializeChat(); // Re-init chat with new data
          alert('تم حذف التصحيح بنجاح.');
      }
  }

  async function handleSaveCorrectionUpdate(id: number, cardElement: HTMLDivElement) {
    const updates = {
        user_prompt: (cardElement.querySelector('textarea[data-field="user_prompt"]') as HTMLTextAreaElement).value,
        original_response: (cardElement.querySelector('textarea[data-field="original_response"]') as HTMLTextAreaElement).value,
        corrected_message: (cardElement.querySelector('textarea[data-field="corrected_message"]') as HTMLTextAreaElement).value,
    };

    if (!updates.user_prompt || !updates.corrected_message) {
        alert('"سؤال المستخدم" و "الرد المصحح" لا يمكن أن يكونا فارغين.');
        return;
    }

    const { error } = await supabase
        .from('message_corrections')
        .update(updates)
        .eq('id', id);

    if (error) {
        alert('فشل تحديث التصحيح: ' + error.message);
    } else {
        editingCorrectionId = null; 
        await fetchInstructionsAndCorrections(true); 
        reinitializeChat(); 
        alert('تم تحديث التصحيح بنجاح.');
    }
}


  function showAdminDashboard() {
      // Populate the form with the current instruction parts
      for (const key in currentInstructionParts) {
        const textarea = trainForm?.querySelector(`textarea[data-part="${key}"]`) as HTMLTextAreaElement;
        if (textarea) {
            textarea.value = currentInstructionParts[key as keyof InstructionParts] || '';
        }
      }
      fetchInstructionsAndCorrections(true);
      adminDashboardBackdrop?.classList.remove('hidden');
      adminDashboard?.classList.remove('hidden');
      setTimeout(() => {
          adminDashboardBackdrop?.classList.add('show');
          adminDashboard?.classList.add('show');
      }, 10);
  }

  function hideAdminDashboard() {
      adminDashboardBackdrop?.classList.remove('show');
      adminDashboard?.classList.remove('show');
      setTimeout(() => {
          adminDashboardBackdrop?.classList.add('hidden');
          adminDashboard?.classList.add('hidden');
      }, 300);
  }

  // --- New Stats Dashboard Logic ---
  function getStatsTableSQL(): string {
    return `-- 1. Create the page_views table
CREATE TABLE public.page_views (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (Important!)
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy to allow anonymous users to insert (log their own visit)
CREATE POLICY "Allow anonymous insert" ON public.page_views FOR INSERT TO anon WITH CHECK (true);

-- 4. Create a policy that ONLY allows the ADMIN to READ the data
CREATE POLICY "Allow admin to read all views" ON public.page_views FOR SELECT USING (auth.email() = 'sidiyacheikh2023@gmail.com');`;
  }

  async function renderStatsDashboard() {
    if (!statsContent) return;

    statsContent.innerHTML = `<div class="loading-indicator" style="margin: 3rem auto;"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;

    const { data, error } = await supabase
        .from('page_views')
        .select('created_at')
        .order('created_at', { ascending: false });

    if (error) {
        const errorMessage = `
            <div class="stats-error">
                <h3>خطأ في تحميل الإحصائيات</h3>
                <p>لم نتمكن من جلب بيانات الزوار. قد يكون السبب أن الجدول المطلوب غير موجود.</p>
                <p>كمدير، يرجى تشغيل كود SQL التالي في محرر Supabase الخاص بك لإعداد جدول الإحصائيات:</p>
                <pre class="sql-code-block"><code>${getStatsTableSQL()}</code></pre>
            </div>
        `;
        statsContent.innerHTML = errorMessage;
        return;
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const visitsToday = data.filter(v => new Date(v.created_at) >= today).length;
    const totalVisits = data.length;

    // Calculate visits for the last 7 days for the chart
    const dailyCounts = Array(7).fill(0);
    const dayLabels: string[] = [];
    
    for (let i = 0; i < 7; i++) {
        const day = new Date(today);
        day.setDate(today.getDate() - i);
        const dayString = day.toDateString();
        
        if (i === 0) dayLabels.push('اليوم');
        else if (i === 1) dayLabels.push('الأمس');
        else dayLabels.push(`قبل ${i} أيام`);
        
        dailyCounts[i] = data.filter(v => new Date(v.created_at).toDateString() === dayString).length;
    }

    const maxCount = Math.max(...dailyCounts, 1); // Avoid division by zero
    
    // Generate HTML
    const statsHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <span class="stat-value">${totalVisits}</span>
                <span class="stat-label">إجمالي الزيارات</span>
            </div>
            <div class="stat-card">
                <span class="stat-value">${visitsToday}</span>
                <span class="stat-label">زيارات اليوم</span>
            </div>
        </div>
        <div class="stats-chart-container">
            <h3>الزيارات في آخر 7 أيام</h3>
            <div class="chart">
                ${dailyCounts.map((count, i) => `
                    <div class="chart-row">
                        <div class="chart-label">${dayLabels[i]}</div>
                        <div class="chart-bar-wrapper">
                            <div class="chart-bar" style="width: ${(count / maxCount) * 100}%;"></div>
                        </div>
                        <div class="chart-value">${count}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    statsContent.innerHTML = statsHTML;
}

async function logPageView() {
    // Use sessionStorage to prevent logging on every refresh within the same session
    if (sessionStorage.getItem('pageViewLogged')) {
        return;
    }
    try {
        const { error } = await supabase.from('page_views').insert({});
        if (error) {
            // Don't bother the user with this error, just log it.
            console.warn('Could not log page view:', error.message);
        } else {
            sessionStorage.setItem('pageViewLogged', 'true');
        }
    } catch (e) {
        console.warn('Exception during page view logging:', e);
    }
}


  try {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user ?? null;
    updateAuthStateUI();

    supabase.auth.onAuthStateChange((_event, session) => {
        currentUser = session?.user ?? null;
        updateAuthStateUI();
    });

    ai = new GoogleGenAI({ apiKey: 'AIzaSyAKGB7rK2n6BSXz14C3v_Vj7V8saogNM64' });
    
    await logPageView();
    await fetchInstructionsAndCorrections();
    
    // --- Event Listeners ---
    chatForm!.addEventListener('submit', handleSendMessage);
    chatInput!.addEventListener('input', updateSendButtonState);
    sendButton!.addEventListener('click', () => {
        if (chatInput!.value.trim() === '') startCall();
    });
    endCallButton!.addEventListener('click', endCall);
    signupButton!.addEventListener('click', showAuthModal);
    // Fix: The event listener passes an event object to `handleLogout`, which expects 0 arguments.
    // Wrapping it in an arrow function ensures it's called correctly and fixes the error.
    logoutButton!.addEventListener('click', () => handleLogout());
    authModalCloseButton!.addEventListener('click', hideAuthModal);
    authModalBackdrop!.addEventListener('click', hideAuthModal);
    switchToSignupLink!.addEventListener('click', (e) => { e.preventDefault(); isLoginMode = false; updateAuthModalView(); });
    switchToLoginLink!.addEventListener('click', (e) => { e.preventDefault(); isLoginMode = true; updateAuthModalView(); });

    chatMessages!.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const reportButton = target.closest('.report-btn') as HTMLButtonElement | null;
        if (reportButton && !reportButton.disabled) {
            const messageWrapper = target.closest('.message-wrapper') as HTMLDivElement;
            const messageId = messageWrapper?.dataset.messageId;
            if (messageId) {
                handleReportMessage(messageId, reportButton);
            }
        }
    });

    authForm!.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput!.value.trim();
        const password = passwordInput!.value;
        authSubmitButton!.disabled = true;
        authSubmitButton!.textContent = '...جاري المعالجة';

        if (isLoginMode) {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                 if (error.message.includes('Email not confirmed')) {
                    alert('لم يتم تأكيد بريدك الإلكتروني. يرجى التحقق من صندوق الوارد الخاص بك والنقر على رابط التفعيل.');
                } else {
                    alert('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
                }
            } else {
                if (data.user?.email === ADMIN_EMAIL) playAdminLoginSound();
                hideAuthModal();
                if (data.user?.email === ADMIN_EMAIL) {
                    const welcomeMessage = getAdminWelcomeMessage();
                    setTimeout(() => {
                        playSound('receive');
                        appendMessage(welcomeMessage, 'ai')
                    }, 300);
                }
            }
        } else {
            if (password !== confirmPasswordInput!.value) {
                alert('كلمتا المرور غير متطابقتين.');
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) {
                    if (error.message.includes('User already registered')) alert('هذا البريد الإلكتروني مسجل بالفعل.');
                    else if (error.message.includes('password should be at least 6 characters')) alert('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.');
                    else alert('حدث خطأ أثناء إنشاء الحساب: ' + error.message);
                } else {
                    alert('تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.');
                    hideAuthModal();
                }
            }
        }
        authSubmitButton!.disabled = false;
        updateAuthModalView();
    });

    // --- Dashboard Event Listeners ---
    adminDashboardButton!.addEventListener('click', showAdminDashboard);
    adminDashboardCloseButton!.addEventListener('click', hideAdminDashboard);
    adminDashboardBackdrop!.addEventListener('click', hideAdminDashboard);
    
    dashboardTabs!.addEventListener('click', e => {
        const target = e.target as HTMLButtonElement;
        if (target.matches('.tab-button')) {
            const tabName = target.dataset.tab;
            dashboardTabs!.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            target.classList.add('active');
            const contentEl = document.getElementById(`${tabName}-content`);
             if (contentEl) {
                contentEl.classList.add('active');
            }
            if (tabName === 'stats') {
                renderStatsDashboard();
            }
        }
    });

    correctionsSearchInput!.addEventListener('input', e => {
        renderDashboardCorrections((e.target as HTMLInputElement).value);
    });

    correctionsList!.addEventListener('click', async e => {
        const target = e.target as HTMLElement;
        const card = target.closest('.correction-card') as HTMLDivElement;
        if (!card) return;

        const id = parseInt(card.dataset.id!, 10);

        if (target.matches('.delete-correction-btn')) {
            // Fix: Added 'await' to ensure the async delete operation completes before proceeding.
            await handleDeleteCorrection(id);
        } else if (target.matches('.edit-correction-btn')) {
            editingCorrectionId = id;
            renderDashboardCorrections((correctionsSearchInput as HTMLInputElement).value);
        } else if (target.matches('.cancel-correction-btn')) {
            editingCorrectionId = null;
            renderDashboardCorrections((correctionsSearchInput as HTMLInputElement).value);
        } else if (target.matches('.save-correction-btn')) {
            await handleSaveCorrectionUpdate(id, card);
        }
    });


    trainForm!.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newInstructionParts = { ...getDefaultInstructionParts() };
        let hasChanges = false;
        trainForm!.querySelectorAll('textarea[data-part]').forEach(textareaEl => {
            const textarea = textareaEl as HTMLTextAreaElement;
            const partKey = textarea.dataset.part as keyof InstructionParts;
            if (partKey in newInstructionParts) {
                newInstructionParts[partKey] = textarea.value;
                hasChanges = true;
            }
        });

        if (!hasChanges) return alert('لم يتم إجراء أي تغييرات.');

        saveInstructionsButton!.disabled = true;
        saveInstructionsButton!.textContent = '...جاري الحفظ';

        const { error } = await supabase
            .from('system_instructions')
            .upsert({ id: 1, instruction_parts: newInstructionParts });

        if (error) {
            console.error('Failed to save instructions:', error.message);
            if (error.message.includes("does not exist") || error.message.includes("instruction_parts")) {
                 alert(
                    'فشل الحفظ: يبدو أن بنية الجدول قديمة.\n\n' +
                    'لإصلاح هذا، قم بتشغيل كود SQL التالي في محرر Supabase:\n\n' +
                    '-- Step 1: Drop old column if it exists\n' +
                    'ALTER TABLE public.system_instructions DROP COLUMN IF EXISTS instruction_text;\n\n' +
                    '-- Step 2: Add new JSONB column\n' +
                    'ALTER TABLE public.system_instructions ADD COLUMN IF NOT EXISTS instruction_parts JSONB;\n\n' +
                     '-- Step 3: Insert initial empty data if table is empty\n' +
                    "INSERT INTO public.system_instructions (id, instruction_parts) SELECT 1, '{}'::jsonb WHERE NOT EXISTS (SELECT 1 FROM public.system_instructions WHERE id = 1);"
                );
            } else {
                alert('فشل حفظ التعليمات: ' + error.message);
            }
        } else {
            // Success
            currentInstructionParts = newInstructionParts;
            reinitializeChat();
            hideAdminDashboard();
            setTimeout(() => {
                playSound('receive');
                appendMessage('تم تحديث التعليمات بنجاح.', 'ai');
            }, 300);
        }

        saveInstructionsButton!.disabled = false;
        saveInstructionsButton!.textContent = 'حفظ التغييرات';
    });
    
    // --- Voice Menu Logic ---
    menuButton!.addEventListener('click', (e) => {
        e.stopPropagation();
        voiceMenu!.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!voiceMenu!.contains(e.target as Node) && !menuButton!.contains(e.target as Node)) {
            voiceMenu!.classList.remove('show');
        }
    });

    voiceMenu!.querySelectorAll('.menu-item[data-voice]').forEach(button => {
        button.addEventListener('click', () => {
            const voice = button.getAttribute('data-voice') as VoiceOption;
            selectedVoice = voice;

            // Update UI
            voiceMenu!.querySelectorAll('.menu-item[data-voice]').forEach(btn => {
                btn.classList.remove('selected-voice');
            });
            button.classList.add('selected-voice');
            voiceMenu!.classList.remove('show');
        });
    });

  } catch (err: any) {
    console.error('Fatal initialization error:', err);
    if (chatContainer) {
      chatContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--danger-color); font-family: sans-serif;">
        <h1>خطأ غير متوقع</h1>
        <p>حدث خطأ أثناء تهيئة التطبيق. يرجى التحقق من وحدة التحكم لمزيد من التفاصيل.</p>
        <p style="font-size: 0.8em; color: #999;">${err.message || 'Unknown error'}</p>
      </div>`;
    }
  }
}

// Start the application
initializeChat();
