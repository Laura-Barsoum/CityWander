// Define hidden gems data
const gems = {
    history: {
        quiet: {
            name: "Al-Azhar Park",
            description: "A peaceful, historical park with stunning views of Cairo's mosques and skyline.",
            image: "https://via.placeholder.com/300x200.png?text=Al-Azhar+Park"
        },
        adventure: {
            name: "The Egyptian Museum",
            description: "Explore the rich history of Egypt with an adventure through the treasures of the Pharaohs.",
            image: "https://via.placeholder.com/300x200.png?text=Egyptian+Museum"
        }
    },
    nature: {
        quiet: {
            name: "The Andalous Garden",
            description: "A tranquil, hidden garden perfect for relaxing surrounded by nature in the heart of Cairo.",
            image: "https://via.placeholder.com/300x200.png?text=Andalous+Garden"
        },
        adventure: {
            name: "Wadi Degla Protectorate",
            description: "Explore the wild side of Cairo with a hike through Wadi Degla, a beautiful desert valley.",
            image: "https://via.placeholder.com/300x200.png?text=Wadi+Degla"
        }
    },
    food: {
        quiet: {
            name: "El-Fishawy Café",
            description: "A historic café in Khan El-Khalili, perfect for a quiet cup of Egyptian coffee.",
            image: "https://via.placeholder.com/300x200.png?text=El-Fishawy+Café"
        },
        adventure: {
            name: "Street Food Tour in Downtown Cairo",
            description: "An exciting food tour through the vibrant streets of Cairo, sampling local delicacies.",
            image: "https://via.placeholder.com/300x200.png?text=Street+Food+Tour"
        }
    }
};

// Handle form submission
document.getElementById("quizForm").addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent form from reloading the page

    // Get selected options
    const type = document.querySelector('input[name="type"]:checked');
    const activity = document.querySelector('input[name="activity"]:checked');

    // Check if both options are selected
    if (!type || !activity) {
        alert("Please answer all questions to find your hidden gem!");
        return;
    }

    // Get the result based on the user's answers
    const result = gems[type.value][activity.value];

    // Display the result
    document.getElementById("gemRecommendation").textContent = `${result.name}: ${result.description}`;
    document.getElementById("gemImage").src = result.image;
    document.getElementById("result").style.display = "block";

    // Hide the form after submission
    document.getElementById("quizForm").style.display = "none";
});
