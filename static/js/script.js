const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector(".send-btn");
const chatbox = document.querySelector(".chatbox");
const chatbotToggler = document.querySelector(".chatbot-toggler");
const chatbotCloseBtn = document.querySelector(".close-btn");

const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const closeModal = document.querySelector(".modal .close");

let userMessage;

// Function to create chat message list item
// Function to create chat message list item
const createChatLi = (message, className) => {
    const chatLi = document.createElement("li");
    chatLi.classList.add("chat", className);

    // Check if message contains "@image" and apply highlighting
    const highlightedMessage = message.replace(/(@image)/gi, '<span class="highlight">$1</span>');
    chatLi.innerHTML = `<p>${highlightedMessage}</p>`;

    return chatLi;
}


// Function to generate response from the Flask backend
const generateResponse = (incomingChatLi) => {
    const messageElement = incomingChatLi.querySelector("p");

    console.log('Sending request with message:', userMessage);

    fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage })
    })
    .then(res => {
        console.log('Response status:', res.status);
        return res.json();
    })
    .then(data => {
        console.log('Response data:', data);

        if (data.response) {
            messageElement.innerHTML = data.response; // Insert bot's response
        } else if (data.image_url) {
            messageElement.innerHTML = `<img src="${data.image_url}" class="chat-image" />`; // Insert image
            document.querySelector(".chat-image").addEventListener("click", () => {
                modalImage.src = data.image_url;
                imageModal.style.display = "block";
            });
        } else {
            messageElement.classList.add("error");
            messageElement.textContent = "Oops! Something went wrong.";
        }
    })
    .catch(err => {
        console.error('Error in fetch request:', err);
        messageElement.classList.add("error");
        messageElement.textContent = "Oops! Something went wrong. Please try again.";
    })
    .finally(() => chatbox.scrollTo(0, chatbox.scrollHeight));
}

// Function to handle sending the chat message
const handleChat = () => {
    userMessage = chatInput.value.trim();
    if (!userMessage) return;
    chatInput.value = "";

    // Add user's message to the chatbox
    chatbox.appendChild(createChatLi(userMessage, "outgoing"));
    chatbox.scrollTo(0, chatbox.scrollHeight);

    // Show bot's thinking message and generate response
    setTimeout(() => {
        const incomingChatLi = createChatLi("Thinking...", "incoming");
        chatbox.appendChild(incomingChatLi);
        chatbox.scrollTo(0, chatbox.scrollHeight);
        generateResponse(incomingChatLi);
    }, 600);
}

// Event listeners for sending chat messages
chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleChat();
    }
});

sendChatBtn.addEventListener("click", handleChat);
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
chatbotCloseBtn.addEventListener("click", () => document.body.classList.remove("show-chatbot"));

// Modal close functionality
closeModal.addEventListener("click", () => {
    imageModal.style.display = "none";
});

// Close the modal if user clicks anywhere outside of the image
window.addEventListener("click", (event) => {
    if (event.target === imageModal) {
        imageModal.style.display = "none";
    }
});
