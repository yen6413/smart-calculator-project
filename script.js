let currentInput = "";
let storedValue = null;
let storedOperator = null;

const display = document.getElementById("display-output");
const buttons = document.querySelectorAll(".calc-button");


// Select the calculator element
const calculator = document.getElementById('calculator');

// Load your sound
const introSound = new Audio('sounds/intro.mp3');

setTimeout(() => {
    introSound.play();
}, 200)

// Speech recognition setup
let recognition; //variable will hold the speech recognition object
let isRecording = false; //flag to track if the program is listening

let expression = "";


// Check if the browser supports recognition
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    // Create a new SpeechRecognition object
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition);
    recognition.continuous = false; //only get one result per recognition session
    recognition.interimResults = false; //only return final result
    recognition.lang ='en-US';

    recognition.onstart = () => {
        isRecording = true;
        display.textContent = "..."; //give user feedback
        console.log("Speech recognition started");
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("Speech recognized:". transcript);
        processVoiceInput(transcript);
        isRecording = false;
    }

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        display.textContent = "Error"; // Indicate error to user
        isRecording = false; // Reset on error
        setTimeout(() => { // Clear error after a short delay
            if (display.textContent === "Error") {
                display.textContent = currentInput; // Revert to current input
            }
        }, 2000);
    };

    recognition.onend = () => {
        console.log("Speech recognition ended.");
        // If no result was processed, revert display
        if (display.textContent === "Listening...") {
             display.textContent = currentInput;
        }
        isRecording = false;
    };

} else {
    console.warn("Web Speech API is not supported in this browser.");
    // Optionally, disable the mic button or show a message
    const micButton = document.querySelector('.calc-button[data-value="mic"]');
    if (micButton) {
        micButton.style.opacity = 0.5;
        micButton.style.cursor = 'not-allowed';
        micButton.title = 'Speech recognition not supported';
    }
}
//end of speech recognition setup
buttons.forEach(button => {
    button.addEventListener("click", () => {
        const sound = new Audio("sounds/click.wav");
        sound.play();

        const value = button.dataset.value;
        if (!value) return;

        if (value === "C") {
            currentInput = "";
            storedValue = null;
            storedOperator = null;
            display.textContent = "";
        } else if (value === "mic") {
            if (recognition) {
                if (!isRecording) {
                    currentInput = ""; // Clear current input before listening for voice
                    display.textContent = ""; // Clear display temporarily
                    recognition.start();
                } else {
                    recognition.stop();
                }
            }
        } else if (value === "=") {
            if (storedOperator !== null && currentInput !== "") {
                storedValue = evaluate(storedValue, storedOperator, parseFloat(currentInput));
                display.textContent = formatDisplay(storedValue);
                currentInput = storedValue.toString();  // <--- This lets square/sqrt work after "="
                storedOperator = null;
            }
        } else if (value === "square") {
            if (currentInput !== "") {
                let num = parseFloat(currentInput);
                currentInput = (num * num).toString();
                display.textContent = formatDisplay(currentInput);
            }
        } else if (value === "sqrt") { //if i do +-/* before, i cant do sqrt or squrae for some reason
            if (currentInput !== "") {
                let num = parseFloat(currentInput);
                if (num >= 0) {
                    currentInput = Math.sqrt(num).toFixed(6).replace(/\.?0+$/, "");  // trim trailing zeroes
                    display.textContent = formatDisplay(currentInput);
                } else {
                    currentInput = "";
                    display.textContent = "Error";
                }
            }
        } else if ("+-*/".includes(value)) {
            if (storedOperator !== null && currentInput !== "") {
            storedValue = evaluate(storedValue, storedOperator, parseFloat(currentInput));
            } else if (currentInput !== "") {
                storedValue = parseFloat(currentInput);
            }
            storedOperator = value;
            currentInput = "";  // Clear for new input
            display.textContent = formatDisplay(storedValue);
        } else if (value === ".") {
            if (!currentInput.includes(".")) {
                currentInput += currentInput === "" ? "0." : ".";
                display.textContent = currentInput;
            }
        } else {
            currentInput += value;
            display.textContent = currentInput;
        }
    });
});

document.querySelectorAll(".calc-button").forEach(button => {
    const originalSrc = button.src;
    const pressedSrc = originalSrc.replace("buttons", "buttons-pressed");

    button.addEventListener("mousedown", () => {
        button.src = pressedSrc;
    });

    const revert = () => {
        button.src = originalSrc;
    };

    button.addEventListener("mouseup", revert);
    button.addEventListener("mouseleave", revert);
    button.addEventListener("touchend", revert); // for mobile
});


function evaluate(a, op, b) {
    if (op === "+") return a + b;
    if (op === "-") return a - b;
    if (op === "*") return a * b;
    if (op === "/") return b !== 0 ? a / b : "Error";
}

function formatDisplay(value) {
    if (typeof value === "number") {
        return Number.isInteger(value) ? value.toString() : value.toFixed(6).replace(/\.?0+$/, "");
    }
    return value;
}

// --- New function to process voice input ---
function processVoiceInput(transcript) {
    let processedInput = transcript.toLowerCase();
    console.log("Raw transcript:", processedInput);

    // Replace operator words with symbols
    processedInput = processedInput
        .replace(/plus/g, " + ")
        .replace(/minus/g, " - ")
        .replace(/times|multiply by/g, " * ")
        .replace(/divided by|divide by/g, " / ")
        .replace(/point/g, ".");

    // Convert number words to digits
    const numberWords = {
        "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
        "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
        "ten": "10"
    };
    for (const word in numberWords) {
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        processedInput = processedInput.replace(regex, numberWords[word]);
    }

    // Remove filler words like "equals" or "is"
    processedInput = processedInput.replace(/\b(equals|equal|is|calculate|what's|whats|what is)\b/g, " = ");

    console.log("Processed expression:", processedInput);

    const cleaned = processedInput.replace("=", "").trim();
    try {
        const result = eval(cleaned).toFixed(6).replace(/\.?0+$/, "");;
        display.textContent = formatDisplay(result);
        currentInput = result.toString();
        expression = result.toString();
    } catch (e) {
        console.error("Evaluation error:", e);
        display.textContent = "Error";
        currentInput = "";
        expression = "";
    }
    
}


// Ensure initial display is empty
display.textContent = "";