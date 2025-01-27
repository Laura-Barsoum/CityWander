const CONFIG = {
  UNSPLASH_API_URL: 'https://api.unsplash.com',
  UNSPLASH_ACCESS_KEY: 's09mUKilFgrMNpvT3bin3fI_nHiBmA-uLPckJ5bijJo',
  AI_API_URL: 'https://api.openai.com/v1/chat/completions',
  AI_API_KEY: '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',
  INITIAL_ATTRACTIONS: [
    { name: "Pyramids of Giza", query: "Pyramids of Giza Egypt", description: "One of the Seven Wonders of the Ancient World." },
    { name: "Egyptian Museum", query: "Egyptian Museum Cairo", description: "Home to an extensive collection of ancient Egyptian antiquities." },
    { name: "Khan El Khalili Bazaar", query: "Khan El Khalili Bazaar Cairo", description: "A famous market in Cairo known for its traditional crafts." },
    { name: "Cairo Tower", query: "Cairo Tower Egypt", description: "A free-standing tower offering panoramic views of the city." },
    { name: "Citadel of Saladin", query: "Citadel of Saladin Cairo", description: "A historic site in Islamic Cairo." }
  ],
  SWIPE_THRESHOLD: 100,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000
};
class CairoAttractionApp {
  constructor() {
    this.cardsContainer = document.getElementById('cards-container');
    this.matchedSection = document.getElementById('matched-section');
    this.matchedList = document.getElementById('matched-list') || document.createElement('ul');
    this.currentIndex = 0;
    this.matchedAttractions = [];
    this.usedRecommendations = new Set();
    this.isAnimating = false;
    this.startX = 0;
    this.moveX = 0;
    this.cardQueue = [];

    CONFIG.INITIAL_ATTRACTIONS.forEach(attraction =>
      this.usedRecommendations.add(attraction.name.toLowerCase())
    );

    if (!this.cardsContainer || !this.matchedSection) {
      console.error("Critical elements are missing from the DOM.");
      return;
    }

    this.showLoadingIndicator();
    this.initializeEventListeners();
    this.loadInitialCards();
  }

  initializeEventListeners() {
    this.cardsContainer.addEventListener('mousedown', (e) => this.onSwipeStart(e));
    this.cardsContainer.addEventListener('mousemove', (e) => this.onSwipeMove(e));
    this.cardsContainer.addEventListener('mouseup', (e) => this.onSwipeEnd(e));
    this.cardsContainer.addEventListener('mouseleave', (e) => this.onSwipeEnd(e));

    this.cardsContainer.addEventListener('touchstart', (e) => this.onSwipeStart(e));
    this.cardsContainer.addEventListener('touchmove', (e) => this.onSwipeMove(e));
    this.cardsContainer.addEventListener('touchend', (e) => this.onSwipeEnd(e));
  }

  showLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-indicator';
    loadingDiv.textContent = "Loading attractions...";
    this.cardsContainer.appendChild(loadingDiv);
  }

  hideLoadingIndicator() {
    const loadingDiv = this.cardsContainer.querySelector('.loading-indicator');
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }

  async loadInitialCards() {
    try {
      await this.loadAttractions(CONFIG.INITIAL_ATTRACTIONS);
      this.preloadNextBatch();
    } catch (error) {
      this.handleError("Unable to load attractions. Please refresh the page.");
    }
  }

  async loadAttractions(attractions) {
    let retries = 0;
    while (retries < CONFIG.MAX_RETRIES) {
      try {
        const firstAttraction = attractions[0];
        const image = await this.fetchAttractionImage(firstAttraction.query);
        const card = this.createCard(firstAttraction, image);
        this.cardQueue.push(card);
        this.cardsContainer.appendChild(card);

        for (let i = 1; i < attractions.length; i++) {
          const attraction = attractions[i];
          const nextImage = await this.fetchAttractionImage(attraction.query);
          const nextCard = this.createCard(attraction, nextImage);
          this.cardQueue.push(nextCard);
        }

        this.hideLoadingIndicator();
        return true;
      } catch (error) {
        retries++;
        if (retries === CONFIG.MAX_RETRIES) {
          throw new Error("Maximum retries reached");
        }
        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
      }
    }
  }

async getRecommendations() {
    try {
      if (this.matchedAttractions.length === 0) {
        return CONFIG.INITIAL_ATTRACTIONS;
      }

      const recentMatches = this.matchedAttractions.slice(-3);
      
      const prompt = `You are a Cairo tourism expert. Based on interest in these Cairo attractions: ${recentMatches.join(', ')}, 
        suggest 5 different Cairo attractions that would appeal to someone with these interests.
        Important: Do NOT suggest any of these already seen attractions: ${Array.from(this.usedRecommendations).join(', ')}.
        
        Format your response as a JSON array of exactly 5 attractions, each with name, query, and description.
        Example format:
        [
          {
            "name": "Khan el-Khalili",
            "query": "Khan el-Khalili bazaar Cairo",
            "description": "Historic bazaar and souk in Islamic Cairo"
          }
        ]`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.AI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a Cairo tourism expert. Respond only with JSON arrays containing attraction recommendations."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error:', errorText);
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('OpenAI Response:', data); // For debugging

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid API response structure');
      }

      let recommendations;
      try {
        const content = data.choices[0].message.content.trim();
        console.log('AI Content:', content); // For debugging
        recommendations = JSON.parse(content);
      } catch (error) {
        console.error('JSON Parse Error:', error);
        throw new Error('Failed to parse recommendations');
      }

      if (!Array.isArray(recommendations)) {
        throw new Error('Recommendations is not an array');
      }

      // Validate and filter recommendations
      const validRecommendations = recommendations
        .filter(attraction => 
          attraction &&
          attraction.name &&
          attraction.query &&
          attraction.description &&
          !this.usedRecommendations.has(attraction.name.toLowerCase())
        )
        .map(attraction => ({
          name: attraction.name.trim(),
          query: `${attraction.query.trim()} Cairo landmark`,
          description: attraction.description.trim()
        }));

      if (validRecommendations.length === 0) {
        throw new Error('No valid recommendations after filtering');
      }

      return validRecommendations.slice(0, 5);

    } catch (error) {
      console.error('Recommendation Error:', error);
      
      // Enhanced fallback attractions
      const fallbackAttractions = [
        {
          name: "Cairo Tower",
          query: "Cairo Tower Egypt landmark",
          description: "Modern Cairo's iconic observation tower offering panoramic city views."
        },
        {
          name: "Al-Azhar Park",
          query: "Al-Azhar Park Cairo",
          description: "Beautiful urban park with Islamic architectural elements and city views."
        },
        {
          name: "Manial Palace",
          query: "Manial Palace Cairo",
          description: "Historic royal palace with stunning Islamic architecture and gardens."
        },
        {
          name: "Old Cairo Coptic Churches",
          query: "Coptic Cairo ancient churches",
          description: "Historic district featuring ancient Coptic Christian churches."
        },
        {
          name: "Ibn Tulun Mosque",
          query: "Ibn Tulun Mosque Cairo",
          description: "One of the oldest and largest mosques in Cairo, known for its unique architecture."
        }
      ];

      // Return unused fallback attractions
      return fallbackAttractions.filter(attraction => 
        !this.usedRecommendations.has(attraction.name.toLowerCase())
      ).slice(0, 5);
    }
  }
  createCard(attraction, imageUrl) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.name = attraction.name;
    
    card.style.position = 'absolute';
    card.style.top = '0';
    card.style.left = '0';
    card.style.width = '100%';
    card.style.height = '100%';
    
    card.innerHTML = `
      <div class="card-image">
        <img src="${imageUrl}" alt="${attraction.name}">
      </div>
      <div class="card-content">
        <h2>${attraction.name}</h2>
        <p>${attraction.description}</p>
      </div>
    `;
    
    return card;
  }

  async fetchAttractionImage(query) {
    const cachedImage = localStorage.getItem(`image_${query}`);
    if (cachedImage) return cachedImage;

    try {
      const response = await fetch(
        `${CONFIG.UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Client-ID ${CONFIG.UNSPLASH_ACCESS_KEY}` } }
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      const imageUrl = data.results[0]?.urls?.regular || 'https://via.placeholder.com/300x450';
      
      localStorage.setItem(`image_${query}`, imageUrl);
      return imageUrl;
    } catch (error) {
      return 'https://via.placeholder.com/300x450';
    }
  }

  async preloadNextBatch() {
    if (this.cardQueue.length < 3) {
      try {
        const recommendations = await this.getRecommendations();
        if (recommendations && recommendations.length > 0) {
          for (const attraction of recommendations) {
            if (!this.usedRecommendations.has(attraction.name.toLowerCase())) {
              const image = await this.fetchAttractionImage(attraction.query);
              const card = this.createCard(attraction, image);
              this.cardQueue.push(card);
              this.usedRecommendations.add(attraction.name.toLowerCase());
            }
          }
        }
      } catch (error) {
        console.warn('Getting next recommendations:', error);
      }
    }
  }

  onSwipeStart(e) {
    if (this.isAnimating || !this.cardQueue[0]) return;
    this.startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    this.moveX = this.startX;
  }

  onSwipeMove(e) {
    if (this.startX === 0 || !this.cardQueue[0]) return;
    
    this.moveX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const deltaX = this.moveX - this.startX;
    
    const card = this.cardQueue[0];
    card.style.transform = `translateX(${deltaX}px) rotate(${deltaX / 10}deg)`;
  }

  onSwipeEnd(e) {
    if (this.startX === 0 || !this.cardQueue[0]) return;

    const deltaX = this.moveX - this.startX;
    if (Math.abs(deltaX) > CONFIG.SWIPE_THRESHOLD) {
      if (deltaX > 0) {
        this.addMatch(this.cardQueue[0].dataset.name);
        this.removeCard('right');
      } else {
        this.removeCard('left');
      }
    } else {
      this.resetCardPosition(this.cardQueue[0]);
    }

    this.startX = 0;
  }

  removeCard(direction) {
    const currentCard = this.cardQueue.shift();
    if (currentCard) {
      currentCard.style.transition = 'transform 0.3s ease-out';
      currentCard.style.transform = direction === 'right' 
        ? 'translateX(100vw) rotate(10deg)' 
        : 'translateX(-100vw) rotate(-10deg)';
      
      setTimeout(() => {
        currentCard.remove();
        if (this.cardQueue.length > 0) {
          const nextCard = this.cardQueue[0];
          this.cardsContainer.appendChild(nextCard);
        }
        this.preloadNextBatch();
      }, 300);
    }
  }

  resetCardPosition(card) {
    if (!card) return;
    
    card.style.transition = 'transform 0.2s ease-out';
    card.style.transform = 'translateX(0) rotate(0)';
    
    setTimeout(() => {
      card.style.transition = '';
      this.isAnimating = false;
    }, 200);
  }

  addMatch(name) {
    if (!this.matchedAttractions.includes(name)) {
      this.matchedAttractions.push(name);
      const listItem = document.createElement('li');
      listItem.textContent = name;
      this.matchedList.appendChild(listItem);
      this.matchedSection.style.display = 'block';
      this.preloadNextBatch();
    }
  }

  handleError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    const existingError = this.cardsContainer.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }

    this.cardsContainer.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
  }
}

// Initialize the app
new CairoAttractionApp();