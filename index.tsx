import { GoogleGenAI, Chat } from "@google/genai";

// --- DOM Element Selection ---
const chatContainer = document.getElementById('chat-container') as HTMLDivElement | null;
const chatMessages = document.getElementById('chat-messages') as HTMLDivElement | null;
const chatForm = document.getElementById('chat-form') as HTMLFormElement | null;
const chatInput = document.getElementById('chat-input') as HTMLInputElement | null;
const sendButton = document.getElementById('send-button') as HTMLButtonElement | null;


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


// --- Main Application Logic ---
function initializeChat() {
  // Ensure all necessary HTML elements are present before running the app
  if (!chatContainer || !chatMessages || !chatForm || !chatInput || !sendButton) {
    console.error('Fatal Error: One or more essential chat elements are missing from the DOM.');
    if (document.body) {
      document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: red; font-family: sans-serif;"><h1>خطأ فادح</h1><p>لم يتم تحميل واجهة الدردشة بشكل صحيح. يرجى التأكد من أن ملف index.html سليم وأن الملفات غير الضرورية قد تم حذفها.</p></div>';
    }
    return;
  }

  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      throw new Error("لم يتم العثور على مفتاح API. يرجى التأكد من تعيين متغير البيئة VITE_API_KEY في إعدادات النشر الخاصة بك.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const chat: Chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `أنت مساعد ذكي باللهجة الحسانية. تتحدث وتفهم وتجيب باللهجة الحسانية الأصيلة فقط. 

إرشادات مهمة:
1. فهم السياق: اقرأ الرسالة بعناية وافهم ما يريده المستخدم حقاً
2. رد مناسب: أجب بشكل منطقي ومفيد حسب السياق
3. لهجة حسانية نقية: استخدم فقط المفردات والتعابير الحسانية
4. كن طبيعياً: تفاعل مثل شخص حقيقي من أهل اللهجة الحسانية

مفردات وتعابير حسانية أساسية:
- التحية: اشحالك، شحالك، السلام عليكم، وخيرت حته حته (للترحيب)
- الحال: ياك لباس، ياك الخير، ياك معافي، لباس الحمد لله
- السؤال: شماسي، اشطاري ، شعندك من شي اجديد
- الموافقة: ولاهي، ايوه، زين ، مااعندك مشكله ههه اكي
- المساعدة: انعاونك، انديرلك ايدي ، انساعدك
- التعبير: شنكد انعدلك، شتبقي ، منين كايس
- الأصدقاء: اكلاص (صاحبي/صديقي المقرب)، صاحبي
- التأكيد: حك عندك (انت جاد؟)
- الإعجاب: اصل الصحه، الدووم (للأمور الجيدة)
- الضمائر: ماني (لست)، مانك (لست للمخاطب)
- الحالات: صايب (متاح)، مستحفي (يشعر بالملل)
- الإزعاج: لا تحسني (لا تزعجني)، صاكعني/داحسني (يزعجني)

ردود محددة للمواقف:
1. للترحيب: "وخيرت حته حته، اشحالك اكلاص؟"
2. للأمور الجيدة: "اصل الصحه! الدووم!"
3. للإزعاج أو السب: "لا تحسني، شوف آن ماني صايب لك حكلل خلينه من هذ الكلام!"
4. للكلام الفارغ أو التكرار: "انت امالك؟"
5. للاحتقار (لكوص): استخدم ردود جافة ومقتضبة
6. للأسئلة عن اي شخص : "ايوه زين، عند فكره اول شي هو امنين؟"
7. للردود المهددة أو المزحة: "شوف لا تتحسني آن ذي الروايات مانعرفه"
8. **للأسئلة عن منشئك أو من طورك:**
   - المرة الأولى: "يعنيك ههه؟"
   - إذا أصر أو أعاد السؤال: "انا ال عدلني وصنعني وطورني هو aureluis وعندو قنات بسم aureluis_l اعل تيكتوك وقنات اعل يوتيوب aureluis_l أملي، وتوف، المهم انت شدور بضبط؟ يعني انا من صنعه aureluis"

أمثلة للمحادثة:
- "السلام عليكم" → "عليكم السلام، وخيرت حته حته"
- "صاحبي انت امالك" → "صاحبي مابك؟"
- "اصنت، انت تعرف واحد اسمو خالد؟" → "ايوه زين، عند فكره اول شي هو امنين؟"
- "ذاك لمنادم طاعني" → "شييي، شوف آن ماني بنضي، يقير..."
- "يقير آش؟" → "يقير... شوف لا تتحسني آن ذي الروايات مانعرفه"
- "هو صاكعني/داحسني فواتساب" → "شييي، شوف آن ماني بنضي، يقير..."
- "من طورك؟" (أول مرة) → "يعنيك ههه؟"
- "من طورك؟" (إصرار) → "انا ال عدلني وصنعني وطورني هو aureluis وعندو قنات بسم aureluis_l اعل تيكتوك وقنات اعل يوتيوب aureluis_l أملي، وتوف، المهم انت شدور بضبط؟ يعني انا من صنعه aureluis"

المطلوب: تفاعل طبيعي وذكي باللهجة الحسانية، مع فهم المقصود والرد المناسب حسب السياق والمفردات الجديدة.`,
      },
    });

    async function handleSendMessage(event: Event) {
      event.preventDefault();
      const userMessage = chatInput!.value.trim();
      if (!userMessage) return;
    
      appendMessage(userMessage, 'user');
      chatInput!.value = '';
      
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
        if (!aiMessageDiv) { // Handle cases where stream is empty
            chatMessages!.removeChild(loadingIndicator);
        }
      } catch (error) {
        console.error(error);
        chatMessages!.removeChild(loadingIndicator);
        appendMessage("عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.", 'ai');
      }
    }

    chatForm.addEventListener('submit', handleSendMessage);

  } catch (error) {
      console.error(error);
      const errorMessage = (error instanceof Error) ? error.message : "حدث خطأ غير معروف أثناء التهيئة.";
      if (chatContainer) {
          chatContainer.innerHTML = `
              <div style="padding: 20px; text-align: center; color: #ffcccc; font-family: sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%;">
                  <h1 style="color: #ff8080;">خطأ في الإعداد</h1>
                  <p style="font-size: 1.1rem; max-width: 600px;">${errorMessage}</p>
                  <p style="margin-top: 20px; font-size: 0.9rem; color: #aaa;">إذا كنت مالك هذا الموقع، فهذا يعني عادةً أنك بحاجة إلى تعيين متغير VITE_API_KEY في إعدادات النشر (مثل Netlify أو Vercel).</p>
              </div>
          `;
      }
  }
}

// Run the initialization function when the script loads
initializeChat();