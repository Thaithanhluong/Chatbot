const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion");
const toggleThemeButton = document.querySelector("#theme-toggle-button");
const deleteChatButton = document.querySelector("#delete-chat-button");
const micChatButton = document.querySelector("#mic-chat-button");

let userMessage = null;
let isResponseGenerating = false;
let recognition;

const API_KEY = "AIzaSyBMCpWnRtNaC-wejqsRZB2GQ2yJzoKn-84";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${API_KEY}`; 

const loadDataFromLocalstorage = () => {
  const savedChats = localStorage.getItem("saved-chats");
  const isLightMode = (localStorage.getItem("themeColor") === "light_mode");

  document.body.classList.toggle("light_mode", isLightMode);
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";

  chatContainer.innerHTML = savedChats || '';
  document.body.classList.toggle("hide-header", savedChats);

  chatContainer.scrollTo(0, chatContainer.scrollHeight);
}

const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
}

const showTypingEffect = (text, textElement, incomingMessageDiv) => {
  const words = text.split(' ');
  let currentWordIndex = 0;

  const typingInterval = setInterval(() => {
    textElement.innerText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
    incomingMessageDiv.querySelector(".icon").classList.add("hide");

    if (currentWordIndex === words.length) {
      clearInterval(typingInterval);
      isResponseGenerating = false;
      incomingMessageDiv.querySelector(".icon").classList.remove("hide");
      localStorage.setItem("saved-chats", chatContainer.innerHTML);
      
    }
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
  }, 75);
}

async function getSystemInstruction() {
  try {
    const response = await fetch('./system_instruction.txt');
    const systemInstruction = await response.text();
    return systemInstruction;
  } catch (error) {
    console.error("Lỗi khi đọc file system_instruction.txt:", error);
    return null;
  }
}

let systemInstructionObject = null;

(async () => {
  const systemInstruction = await getSystemInstruction();
  if (systemInstruction) {
    systemInstructionObject = {
      system_instruction: {
        parts: [{ text: systemInstruction }],
      },
    };
  } else {
    console.error("Không thể lấy hướng dẫn từ file system_instruction.txt");
  }
})();

async function generateAPIResponse(incomingMessageDiv) {
  const textElement = incomingMessageDiv.querySelector(".text"); 

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...systemInstructionObject, 
        contents: [{ 
          role: "user", 
          parts: [{ text: userMessage }]
        }],
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error.message);
    }

    const data = await response.json();

    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      const apiResponse = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1');
      showTypingEffect(apiResponse, textElement, incomingMessageDiv); 
    } else {
      console.error("Lỗi: Response từ API không hợp lệ", data);
      textElement.innerText = "Đã có lỗi xảy ra. Vui lòng thử lại sau."; 
      textElement.parentElement.closest(".message").classList.add("error");
    }
  } catch (error) { 
    isResponseGenerating = false;
    textElement.innerText = error.message;
    textElement.parentElement.closest(".message").classList.add("error");
  } finally {
    incomingMessageDiv.classList.remove("loading");
  }
}

const showLoadingAnimation = () => {
  const html = `<div class="message-content">
                  <img class="avatar" src="images/gemini.svg" alt="Gemini avatar">
                  <p class="text"></p>
                  <div class="loading-indicator">
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                  </div>
                </div>
                <div class="button-group">
                  <span onClick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>
                  <span onClick="speakMessage(this)" class="icon material-symbols-outlined">volume_up</span>
                </div>`;
                

  const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
  chatContainer.appendChild(incomingMessageDiv);

  

  chatContainer.scrollTo(0, chatContainer.scrollHeight);
  generateAPIResponse(incomingMessageDiv);

  // const audio = new Audio('./sound/newmessage.mp3'); 
  // audio.play();
}

const copyMessage = (copyButton) => {
  const messageText = copyButton.parentElement.querySelector(".text").innerText;

  navigator.clipboard.writeText(messageText);
  copyButton.innerText = "done"; 
  setTimeout(() => copyButton.innerText = "content_copy", 1000); 
}
// Hàm đọc nội dung tin nhắn
function speakMessage(button) {
  const messageElement = button.parentElement.previousElementSibling.querySelector(".text");
  const text = messageElement.innerText;

  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    speechSynthesis.speak(utterance);
  } else {
    alert('Trình duyệt của bạn không hỗ trợ Speech Synthesis API.');
  }
}
const handleOutgoingChat = () => {
  userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
  if (!userMessage || isResponseGenerating) return;

  isResponseGenerating = true;

  const html = `<div class="message-content">
                <img class="avatar" src="images/BDU.jpg" alt="User avatar">
                <div class="text-wrapper">
                  <p class="text">${userMessage}</p>
                  <div class="edit-toolbar">
                    <span class="edit-icon icon material-symbols-rounded">edit</span>
                    <div class="button-group">
                    <span class="material-symbols-outlined stop-editing-icon">done_all</span>
                    <span class="material-symbols-outlined return">restart_alt</span>
                  </div>
                    </div>
              </div>`;

  const outgoingMessageDiv = createMessageElement(html, "outgoing");
  chatContainer.appendChild(outgoingMessageDiv);

  const editIcon = outgoingMessageDiv.querySelector(".edit-icon");
  const stopEditingButton = outgoingMessageDiv.querySelector(".stop-editing-icon");
  const returnButton = outgoingMessageDiv.querySelector(".return"); 
  const textWrapper = outgoingMessageDiv.querySelector(".text-wrapper");
  let originalMessage = userMessage;
  let isEditing = false;
  let editInput; // Khai báo biến editInput ở phạm vi ngoài

  // Sự kiện click cho icon "edit" 
  // Sự kiện click cho icon "edit" 
  editIcon.addEventListener("click", () => {
    if (isEditing) return; 

    isEditing = true;
    textWrapper.classList.add("editing");

    // Ẩn nút edit, hiển thị 2 nút stop editing và return
    editIcon.style.display = "none"; 
    stopEditingButton.style.display = "inline-block";
    returnButton.style.display = "inline-block";

    // Tạo input để chỉnh sửa
    const existingEditInput = textWrapper.querySelector(".edit-input");
    if (existingEditInput) {
      existingEditInput.focus();
    } else {
      editInput = document.createElement("input");
      editInput.classList.add("edit-input");
      editInput.value = originalMessage;
      textWrapper.appendChild(editInput); 
      editInput.focus();
    }
  });

  // Sự kiện click cho nút "Stop editing"
  stopEditingButton.addEventListener("click", () => {
  if (editInput.value.length === 0) { 
    // Nếu input rỗng, khôi phục nội dung ban đầu
    textWrapper.querySelector(".text").innerText = originalMessage;
  } else {
    // Nếu input có nội dung, lưu nội dung mới
    originalMessage = editInput.value;
    textWrapper.querySelector(".text").innerText = originalMessage;
  }
    // Dừng việc chỉnh sửa
    isEditing = false; 
    textWrapper.classList.remove("editing");

    // Ẩn  2 nút stop editing và return,  hiện trở lại nút edit
    editIcon.style.display = "inline-block";
    stopEditingButton.style.display = "none";
    returnButton.style.display = "none"; 

    // Xóa khung input
    editInput.remove(); 
  });

    // *** Sự kiện click cho nút "Return" ***
  returnButton.addEventListener("click", async () => {
    if (isEditing) { 
      // 1. Lưu lại thay đổi hiện tại
      originalMessage = editInput.value;
      textWrapper.querySelector(".text").innerText = originalMessage;

      // 2. Dừng việc chỉnh sửa
      textWrapper.classList.remove("editing");
      editIcon.style.display = "inline-block";
      stopEditingButton.style.display = "none";
      returnButton.style.display = "none";
      editInput.remove();
      isEditing = false;

      // 3. Gửi yêu cầu mới đến API
      showLoadingAnimationAfterEdit(originalMessage, outgoingMessageDiv); 
    }
  });

async function showLoadingAnimationAfterEdit(newMessage, messageDiv) {
  // 1. Xóa phản hồi cũ (nếu có)
  const nextMessage = messageDiv.nextElementSibling; 
  if (nextMessage && nextMessage.classList.contains("incoming")) {
    chatContainer.removeChild(nextMessage);
  }

  // 2. Tạo nội dung HTML riêng cho animation loading:
  const loadingHtml = `<div class="message-content">
                        <img class="avatar" src="images/gemini.svg" alt="Gemini avatar">
                        <p class="text"></p>
                        <div class="loading-indicator">
                          <div class="loading-bar"></div>
                          <div class="loading-bar"></div>
                          <div class="loading-bar"></div>
                        </div>
                      </div>
                      <span onClick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>`;

  // 3. Khai báo incomingMessageDiv trước
  const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
  // 4. Sau đó mới gán innerHTML 
  incomingMessageDiv.innerHTML = loadingHtml;

  chatContainer.insertBefore(incomingMessageDiv, messageDiv.nextSibling); 
  chatContainer.scrollTo(0, chatContainer.scrollHeight);

  try {
    userMessage = newMessage; 
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...systemInstructionObject,
        contents: [{
          role: "user",
          parts: [{ text: userMessage }] 
        }],
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error.message);
    }

    const data = await response.json();

    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      const apiResponse = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1');
      const textElement = incomingMessageDiv.querySelector(".text"); 
      showTypingEffect(apiResponse, textElement, incomingMessageDiv); 
    } else {
      console.error("Lỗi: Response từ API không hợp lệ", data);
      incomingMessageDiv.querySelector(".text").innerText = "Đã có lỗi xảy ra. Vui lòng thử lại sau.";
      incomingMessageDiv.classList.add("error");
    }
  } catch (error) {
    console.error("Lỗi khi gọi API:", error);
    incomingMessageDiv.querySelector(".text").innerText = error.message; 
    incomingMessageDiv.classList.add("error");
  } finally {
    incomingMessageDiv.classList.remove("loading");
  }
}
  

  typingForm.reset(); 
  document.body.classList.add("hide-header");
  chatContainer.scrollTo(0, chatContainer.scrollHeight); 
  setTimeout(showLoadingAnimation, 500); 
};

if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = false; 
  recognition.lang = 'vi-VN'; 

   // Âm thanh bắt đầu ghi âm
  const startRecordingSound = new Audio('./sound/on.mp3'); // Thay đổi đường dẫn

  // Âm thanh kết thúc ghi âm
  const endRecordingSound = new Audio('./sound/off.mp3'); // Thay đổi đường dẫn

  micChatButton.addEventListener("click", () => {
    if (recognition.onstart !== null) { 
      recognition.stop();
      micChatButton.innerText = "mic";
      micChatButton.removeAttribute("data-icon"); 
      handleOutgoingChat(); 
    } else {
      recognition.start();
      micChatButton.innerText = "stop_circle";
      micChatButton.setAttribute("data-icon", "stop_circle"); 
      // Phát âm thanh bắt đầu ghi âm
      startRecordingSound.play();
    }
  });

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    typingForm.querySelector(".typing-input").value = transcript;
    micChatButton.innerText = "mic";
  };

  recognition.onend = () => {
    micChatButton.innerText = "mic";
    endRecordingSound.play();
  };

  recognition.onerror = (event) => {
    console.error("Lỗi nhận dạng giọng nói:", event.error);
    micChatButton.innerText = "mic";
  };
} else {
  micChatButton.disabled = true;
  console.error("Trình duyệt của bạn không hỗ trợ Web Speech API.");
}

toggleThemeButton.addEventListener("click", () => {
  const isLightMode = document.body.classList.toggle("light_mode");
  localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
});

deleteChatButton.addEventListener("click", () => {
  if (confirm("Are you sure you want to delete all the chats?")) {
    localStorage.removeItem("saved-chats");
    loadDataFromLocalstorage();
  }
});

suggestions.forEach(suggestion => {
  suggestion.addEventListener("click", () => {
    userMessage = suggestion.querySelector(".text").innerText;
    handleOutgoingChat();
  });
});

typingForm.addEventListener("submit", (e) => {
  e.preventDefault(); 
  handleOutgoingChat();
});

document.getElementById("resetButton").addEventListener("click", () => {
  localStorage.removeItem("saved-chats");
  localStorage.removeItem("themeColor");
  location.reload(); 
});

loadDataFromLocalstorage();