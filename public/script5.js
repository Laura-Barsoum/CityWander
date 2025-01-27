const PEXELS_API_URL = 'https://api.pexels.com/v1/search';
const PEXELS_API_KEY = '17d4kUKpFs7l8xOSRnJdfgW1TfAwUX4o558jSUm0lxC4COQB74ACReWp'; // Pexels API key

const gems = [
    {
        name: "Darb 1718",
        description: "A contemporary arts center hidden in Old Cairo's Fustat district. Features underground exhibitions, workshops, and performances by local artists.",
        query: "art-cairo-egypt"
    },
    {
        name: "Baron Empain's Hindu Palace",
        description: "An abandoned architectural marvel in Heliopolis, this haunting Belgian-built palace combines Hindu and European architectural styles.",
        query: "baron-empain-palace-cairo"
    },
    {
        name: "El Korba's Art Deco District",
        description: "A forgotten architectural treasure in Heliopolis featuring pristine 1920s buildings, local cafes, and colonial-era charm.",
        query: "korba-heliopolis-cairo"
    },
    {
        name: "Souq Al Goma (Friday Market)",
        description: "A sprawling flea market where locals trade everything from antiques to electronics. Only opens before dawn on Fridays.",
        query: "friday-market-cairo"
    },
    {
        name: "Beit El Sennari",
        description: "An 18th-century Ottoman house turned cultural center, featuring original architecture and hidden courtyards.",
        query: "ottoman-house-cairo"
    },
    {
        name: "Qalawun Complex Backstreets",
        description: "Lesser-known medieval alleys behind the famous complex, home to traditional craftsmen and authentic food spots.",
        query: "islamic-cairo-street"
    },
    {
        name: "Wekalet al-Ghouri",
        description: "A restored 16th-century merchant in hosting weekly Tannoura shows in its courtyard. Hidden gem for traditional Sufi performances.",
        query: "wekalet-ghouri-cairo"
    },
    {
        name: "Prince Mohamed Ali Palace",
        description: "A secluded palace in Manial featuring stunning Persian carpets and ceramic collections, often overlooked by tourists.",
        query: "manial-palace-interior-cairo"
    }
];

async function fetchPexelsImage(query) {
  try {
    const response = await fetch(`${PEXELS_API_URL}?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`, {
      headers: {
        'Authorization': PEXELS_API_KEY
      }
    });
    
    const data = await response.json();
    
    // Return the first landscape image or a placeholder
    return data.photos[0]?.src?.large || 'https://via.placeholder.com/800x600';
  } catch (error) {
    console.error('Error fetching image:', error);
    return 'https://via.placeholder.com/800x600';
  }
}

// Update the event listener to use fetchPexelsImage
document.getElementById("surpriseBtn").addEventListener("click", async function() {
  const button = this;
  button.disabled = true;
  button.textContent = "Loading...";
  
  const randomGem = gems[Math.floor(Math.random() * gems.length)];
  const imageUrl = await fetchPexelsImage(randomGem.query);
  
  document.getElementById("gemName").textContent = randomGem.name;
  document.getElementById("gemDescription").textContent = randomGem.description;
  
  const gemImage = document.getElementById("gemImage");
  gemImage.src = imageUrl;
  gemImage.style.display = "block";
  
  button.disabled = false;
  button.textContent = "🎉 Surprise Me! 🎉";
});