// Fix: Removed non-existent 'LiveSession' type from import.
import { GoogleGenAI, Chat, LiveServerMessage, Modality, Blob } from "@google/genai";
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { getSystemInstruction, constructInstructionWithExamples } from './instructions';

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

// Admin Training Elements
const adminTrainButton = document.getElementById('admin-train-button') as HTMLButtonElement | null;
const trainModal = document.getElementById('train-modal') as HTMLDivElement | null;
const trainModalBackdrop = document.getElementById('train-modal-backdrop') as HTMLDivElement | null;
const trainModalCloseButton = document.getElementById('train-modal-close-button') as HTMLButtonElement | null;
const trainForm = document.getElementById('train-form') as HTMLFormElement | null;
const instructionTextarea = document.getElementById('instruction-textarea') as HTMLTextAreaElement | null;
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

let isLoginMode = true;
let currentUser: User | null = null;
const ADMIN_EMAIL = 'sidiyacheikh2023@gmail.com';
let chat: Chat;
let currentSystemInstruction: string = '';
let currentCorrectionExamples: any[] = [];


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


// --- Main Application Logic ---
async function initializeChat() {
  const essentialElements = [
    chatContainer, chatMessages, chatForm, chatInput, sendButton,
    callScreen, callStatus, endCallButton, menuButton, voiceMenu,
    callTranscriptContainer, callTranscriptText, signupButton, authModal,
    authModalBackdrop, authModalCloseButton, authForm, authModalTitle,
    authModalDescription, authSubmitButton, confirmPasswordWrapper,
    confirmPasswordInput, toSignupSwitch, toLoginSwitch, switchToSignupLink,
    switchToLoginLink, logoutButton, emailInput, passwordInput,
    adminTrainButton, trainModal, trainModalBackdrop, trainModalCloseButton,
    trainForm, instructionTextarea, saveInstructionsButton
  ];

  if (essentialElements.some(el => !el)) {
    console.error('Fatal Error: One or more essential chat/call/auth elements are missing from the DOM.');
    if (document.body) {
      document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: red; font-family: sans-serif;"><h1>خطأ فادح</h1><p>لم يتم تحميل واجهة الدردشة أو المصادقة بشكل صحيح.</p></div>';
    }
    return;
  }
  
  // Fix: Moved appendMessage and other function definitions inside initializeChat scope
  // to resolve scope issues and improve code organization.
  // === START OF CONSOLIDATED FUNCTION DEFINITIONS ===

  // Fix: Declare `ai` in a scope accessible by all helper functions. It will be initialized inside the `try` block.
  let ai: GoogleGenAI;

  // Fix: Moved function definitions from the `try` block to a shared scope to resolve "Cannot find name" errors.
  function reinitializeChat() {
      const fullInstruction = constructInstructionWithExamples(currentSystemInstruction, currentCorrectionExamples);
      chat = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: { systemInstruction: fullInstruction },
      });
      messages = [];
      renderMessages();
      console.log("Chat reinitialized with new instructions and examples.");
  }

  async function fetchInstructionsAndCorrections() {
      const instructionPromise = supabase
          .from('system_instructions')
          .select('instruction_text')
          .eq('id', 1)
          .single();

      const correctionsPromise = supabase
          .from('message_corrections')
          .select('user_prompt, original_response, corrected_response');

      const [instructionResult, correctionsResult] = await Promise.all([
          instructionPromise,
          correctionsPromise
      ]);
      
      if (instructionResult.error || !instructionResult.data) {
          currentSystemInstruction = getSystemInstruction();
      } else {
          currentSystemInstruction = instructionResult.data.instruction_text;
      }

      if (correctionsResult.error || !correctionsResult.data) {
           currentCorrectionExamples = [];
      } else {
          currentCorrectionExamples = correctionsResult.data;
      }

      reinitializeChat();
  }

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
      let aiMessage: Message | null = null;
      let accumulatedText = '';
  
      for await (const chunk of responseStream) {
          const chunkText = chunk.text;
          if (chunkText) {
              accumulatedText += chunkText;
              if (!aiMessage) {
                  chatMessages!.removeChild(loadingIndicator);
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
      appendMessage("عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.", 'ai');
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

      setTimeout(() => {
          if (!mediaStream) return;
          callStatus!.textContent = 'متصل';
          initializeLiveSession(ai);
      }, 1500);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("لا يمكن الوصول إلى الميكروفون. يرجى التحقق من الأذونات.");
    }
  }

  function initializeLiveSession(aiInstance: GoogleGenAI) {
      inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
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
              systemInstruction: constructInstructionWithExamples(currentSystemInstruction, currentCorrectionExamples),
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
    if (inputAudioContext) inputAudioContext.close().catch(console.error);
    if (outputAudioContext) outputAudioContext.close().catch(console.error);
    inputAudioContext = null;
    outputAudioContext = null;
    sources.forEach(source => source.stop());
    sources.clear();
    nextStartTime = 0;

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

            if (msg.sender === 'ai' && currentUser?.email === ADMIN_EMAIL && msg.userPrompt) {
                const actions = document.createElement('div');
                actions.className = 'message-actions';
                
                const editButton = document.createElement('button');
                editButton.className = 'edit-btn';
                editButton.setAttribute('aria-label', 'تعديل الرسالة');
                editButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/></svg>`;
                editButton.onclick = () => {
                    editingMessageId = msg.id;
                    renderMessages();
                };

                actions.appendChild(editButton);
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
              corrected_response: correctedText
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
                  '  corrected_response TEXT\n' +
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
      setTimeout(() => appendMessage('تم حفظ التصحيح. سيتعلم المساعد من هذا المثال في المحادثات القادمة.', 'ai'), 300);
  }

  function updateAuthStateUI() {
      if (currentUser) {
          signupButton?.classList.add('hidden');
          logoutButton?.classList.remove('hidden');
          if (currentUser.email === ADMIN_EMAIL) {
              adminTrainButton?.classList.remove('hidden');
          } else {
              adminTrainButton?.classList.add('hidden');
          }
      } else {
          signupButton?.classList.remove('hidden');
          logoutButton?.classList.add('hidden');
          adminTrainButton?.classList.add('hidden');
      }
      renderMessages(); // Re-render messages to show/hide edit buttons
  }

  async function handleLogout() {
      const { error } = await supabase.auth.signOut();
      if (error) {
          console.error('Error logging out:', error.message);
          alert('حدث خطأ أثناء تسجيل الخروج.');
      }
      adminTrainButton?.classList.add('hidden');
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

  // --- Admin Training Modal Logic ---
  function showTrainModal() {
      instructionTextarea!.value = currentSystemInstruction;
      trainModalBackdrop?.classList.remove('hidden');
      trainModal?.classList.remove('hidden');
      setTimeout(() => {
          trainModalBackdrop?.classList.add('show');
          trainModal?.classList.add('show');
      }, 10);
  }

  function hideTrainModal() {
      trainModalBackdrop?.classList.remove('show');
      trainModal?.classList.remove('show');
      setTimeout(() => {
          trainModalBackdrop?.classList.add('hidden');
          trainModal?.classList.add('hidden');
      }, 300);
  }

  // === END OF CONSOLIDATED FUNCTION DEFINITIONS ===

  try {
    // --- Auth State Initialization ---
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user ?? null;
    updateAuthStateUI();

    supabase.auth.onAuthStateChange((_event, session) => {
        currentUser = session?.user ?? null;
        updateAuthStateUI();
    });

    // Fix: Initialize the `ai` variable that was declared in the outer scope.
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    await fetchInstructionsAndCorrections();
    
    // --- Event Listeners ---
    chatForm!.addEventListener('submit', handleSendMessage);
    chatInput!.addEventListener('input', updateSendButtonState);
    sendButton!.addEventListener('click', () => {
        if (chatInput!.value.trim() === '') startCall();
    });
    endCallButton!.addEventListener('click', endCall);
    signupButton!.addEventListener('click', showAuthModal);
    logoutButton!.addEventListener('click', handleLogout);
    authModalCloseButton!.addEventListener('click', hideAuthModal);
    authModalBackdrop!.addEventListener('click', hideAuthModal);
    switchToSignupLink!.addEventListener('click', (e) => { e.preventDefault(); isLoginMode = false; updateAuthModalView(); });
    switchToLoginLink!.addEventListener('click', (e) => { e.preventDefault(); isLoginMode = true; updateAuthModalView(); });

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
                    setTimeout(() => appendMessage('مرحباً بالمدير، سيدي الشيخ!', 'ai'), 300);
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

    adminTrainButton!.addEventListener('click', showTrainModal);
    trainModalCloseButton!.addEventListener('click', hideTrainModal);
    trainModalBackdrop!.addEventListener('click', hideTrainModal);
    trainForm!.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newInstructions = instructionTextarea!.value.trim();
        if (!newInstructions) return alert('لا يمكن أن تكون التعليمات فارغة.');

        saveInstructionsButton!.disabled = true;
        saveInstructionsButton!.textContent = '...جاري الحفظ';

        const { error } = await supabase
            .from('system_instructions')
            .upsert({ id: 1, instruction_text: newInstructions });

        if (error) {
            console.error('Failed to save instructions:', error.message);
            if (error.message.includes("does not exist")) {
                 alert(
                    'فشل الحفظ: الجدول "system_instructions" غير موجود.\n\n' +
                    'لإصلاح هذا، قم بتشغيل كود SQL التالي في محرر Supabase:\n\n' +
                    'CREATE TABLE public.system_instructions (\n' +
                    '  id BIGINT PRIMARY KEY,\n' +
                    '  instruction_text TEXT\n' +
                    ');\n\n' +
                    "INSERT INTO public.system_instructions (id, instruction_text) VALUES (1, 'Your default instructions here...');\n\n" +
                    'ملاحظة: تأكد من أن سياسات RLS تسمح بعملية "upsert".'
                );
            } else {
                alert('فشل حفظ التعليمات: ' + error.message);
            }
        } else {
            // Success
            currentSystemInstruction = newInstructions;
            reinitializeChat();
            hideTrainModal();
            setTimeout(() => appendMessage('تم تحديث التعليمات بنجاح.', 'ai'), 300);
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