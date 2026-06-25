// App State
let releaseData = null;
let currentSearch = '';
let currentFilter = 'all';

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const filterChips = document.querySelectorAll('.filter-chip');
const releaseListContainer = document.getElementById('release-list');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const retryBtn = document.getElementById('retry-btn');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Stats Elements
const statTotal = document.getElementById('stat-total');
const statLatest = document.getElementById('stat-latest');
const cacheStatusContainer = document.getElementById('cache-status-container');
const cacheDot = document.getElementById('cache-dot');
const cacheText = document.getElementById('cache-text');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCount = document.getElementById('char-count');
const progressCircle = document.getElementById('progress-circle');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const postTweetBtn = document.getElementById('post-tweet-btn');
const modalRefType = document.getElementById('modal-ref-type');
const modalRefDate = document.getElementById('modal-ref-date');
const modalRefSnippet = document.getElementById('modal-ref-snippet');

// Twitter Progress Ring Setup
const circleRadius = 8;
const circumference = 2 * Math.PI * circleRadius;
if (progressCircle) {
    progressCircle.style.strokeDasharray = circumference;
    progressCircle.style.strokeDashoffset = circumference;
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();
    
    // Load Theme Preference
    initTheme();
    
    // Fetch initial data
    fetchReleases(false);
    
    // Setup Event Listeners
    setupEventListeners();
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
    }
    updateThemeIcon();
}

function updateThemeIcon() {
    // Lucide automatically updates SVGs, but we trigger re-render if needed
    lucide.createIcons();
}

// Event Listeners
function setupEventListeners() {
    // Refresh action
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    retryBtn.addEventListener('click', () => fetchReleases(true));
    
    // Theme toggle
    themeToggleBtn.addEventListener('click', () => {
        if (document.body.classList.contains('dark-theme')) {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        }
        updateThemeIcon();
    });
    
    // Search inputs
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.trim().toLowerCase();
        clearSearchBtn.style.display = currentSearch ? 'flex' : 'none';
        filterAndRender();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearch = '';
        clearSearchBtn.style.display = 'none';
        filterAndRender();
    });
    
    // Filter chips
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.getAttribute('data-type').toLowerCase();
            filterAndRender();
        });
    });
    
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearch = '';
        clearSearchBtn.style.display = 'none';
        filterChips.forEach(c => c.classList.remove('active'));
        document.querySelector('.filter-chip[data-type="all"]').classList.add('active');
        currentFilter = 'all';
        filterAndRender();
    });
    
    // Tweet text area character counter
    tweetTextarea.addEventListener('input', updateCharCount);
    
    // Close Modal actions
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });
}

// Fetch Release Notes
async function fetchReleases(forceRefresh = false) {
    showState('loading');
    if (forceRefresh) {
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;
    }
    
    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.status === 'success') {
            releaseData = result.data;
            updateDashboard(result.cached);
            filterAndRender();
            showState('success');
        } else {
            throw new Error(result.message || 'Unknown server error');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        errorMessage.textContent = error.message || 'Could not reach the backend server.';
        showState('error');
    } finally {
        refreshBtn.classList.remove('loading');
        refreshBtn.disabled = false;
    }
}

// Update Header stats and cache indicators
function updateDashboard(isCached) {
    if (!releaseData || !releaseData.releases) return;
    
    // Calculate total individual update items
    let totalItems = 0;
    releaseData.releases.forEach(rel => {
        totalItems += rel.items.length;
    });
    
    statTotal.textContent = totalItems;
    
    // Set latest release date
    if (releaseData.releases.length > 0) {
        statLatest.textContent = releaseData.releases[0].date;
    } else {
        statLatest.textContent = 'None';
    }
    
    // Update cache indicator UI
    if (isCached) {
        cacheDot.className = 'indicator-dot stale';
        cacheText.textContent = `Cached (Fetched ${releaseData.fetched_at})`;
    } else {
        cacheDot.className = 'indicator-dot active';
        cacheText.textContent = `Live Feed`;
    }
}

// Render logic with filters
function filterAndRender() {
    if (!releaseData || !releaseData.releases) return;
    
    releaseListContainer.innerHTML = '';
    let visibleGroupsCount = 0;
    let visibleItemsCount = 0;
    
    releaseData.releases.forEach(group => {
        // Filter items within this date group
        const filteredItems = group.items.filter(item => {
            // Type Filter
            const matchesType = (currentFilter === 'all' || item.type.toLowerCase() === currentFilter);
            
            // Search keyword filter (title date, update type, or update description content)
            const matchesSearch = (!currentSearch || 
                group.date.toLowerCase().includes(currentSearch) ||
                item.type.toLowerCase().includes(currentSearch) ||
                item.text.toLowerCase().includes(currentSearch)
            );
            
            return matchesType && matchesSearch;
        });
        
        if (filteredItems.length > 0) {
            visibleGroupsCount++;
            visibleItemsCount += filteredItems.length;
            
            // Create Date Group Header
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';
            
            const groupHeader = document.createElement('div');
            groupHeader.className = 'date-group-header';
            
            const title = document.createElement('h2');
            title.textContent = group.date;
            
            const line = document.createElement('div');
            line.className = 'date-line';
            
            groupHeader.appendChild(title);
            groupHeader.appendChild(line);
            dateGroup.appendChild(groupHeader);
            
            // Create Cards for filtered items
            filteredItems.forEach(item => {
                const card = createUpdateCard(item);
                dateGroup.appendChild(card);
            });
            
            releaseListContainer.appendChild(dateGroup);
        }
    });
    
    // Handle Empty States
    if (visibleItemsCount === 0) {
        showState('empty');
    } else {
        showState('success');
    }
    
    // Update stats counts relative to filter
    if (currentSearch || currentFilter !== 'all') {
        statTotal.textContent = `${visibleItemsCount} found`;
    } else {
        // Reset to actual count if no filters
        let totalItems = 0;
        releaseData.releases.forEach(rel => {
            totalItems += rel.items.length;
        });
        statTotal.textContent = totalItems;
    }
    
    // Re-initialize any new Lucide icons
    lucide.createIcons();
}

// Card DOM element factory
function createUpdateCard(item) {
    const card = document.createElement('article');
    card.className = 'update-card';
    
    // Header
    const cardHeader = document.createElement('header');
    cardHeader.className = 'update-card-header';
    
    // Badge based on type
    const badge = document.createElement('span');
    const sanitType = item.type.toLowerCase().replace(' ', '-');
    badge.className = `badge badge-${sanitType}`;
    badge.textContent = item.type;
    
    // Actions
    const cardActions = document.createElement('div');
    cardActions.className = 'card-actions';
    
    const tweetBtn = document.createElement('button');
    tweetBtn.className = 'action-btn tweet-btn';
    tweetBtn.setAttribute('title', 'Select and Tweet this update');
    tweetBtn.innerHTML = '<i data-lucide="twitter"></i>';
    tweetBtn.addEventListener('click', () => openTweetModal(item));
    
    const linkBtn = document.createElement('a');
    linkBtn.className = 'action-btn link-btn';
    linkBtn.setAttribute('href', item.link);
    linkBtn.setAttribute('target', '_blank');
    linkBtn.setAttribute('rel', 'noopener noreferrer');
    linkBtn.setAttribute('title', 'View original release notes documentation');
    linkBtn.innerHTML = '<i data-lucide="external-link"></i>';
    
    cardActions.appendChild(tweetBtn);
    cardActions.appendChild(linkBtn);
    
    cardHeader.appendChild(badge);
    cardHeader.appendChild(cardActions);
    
    // Body
    const cardBody = document.createElement('div');
    cardBody.className = 'update-card-body';
    cardBody.innerHTML = item.html;
    
    card.appendChild(cardHeader);
    card.appendChild(cardBody);
    
    return card;
}

// Show/Hide States
function showState(state) {
    loadingState.style.display = state === 'loading' ? 'flex' : 'none';
    errorState.style.display = state === 'error' ? 'flex' : 'none';
    emptyState.style.display = state === 'empty' ? 'flex' : 'none';
    releaseListContainer.style.display = state === 'success' ? 'flex' : 'none';
}

// Twitter Composer Modal Operations
function openTweetModal(item) {
    tweetTextarea.value = item.tweet_text;
    
    // Update reference card in modal
    modalRefType.textContent = item.type;
    modalRefType.className = `ref-type-badge badge-${item.type.toLowerCase().replace(' ', '-')}`;
    modalRefDate.textContent = item.date;
    modalRefSnippet.textContent = item.text;
    
    updateCharCount();
    
    tweetModal.classList.add('open');
    tweetModal.style.display = 'flex';
    tweetTextarea.focus();
    
    // Add temporary event listener for submission
    postTweetBtn.onclick = () => {
        const text = encodeURIComponent(tweetTextarea.value);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${text}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
        closeTweetModal();
    };
}

function closeTweetModal() {
    tweetModal.classList.remove('open');
    setTimeout(() => {
        tweetModal.style.display = 'none';
    }, 300); // Wait for transition
}

function updateCharCount() {
    const textLength = tweetTextarea.value.length;
    charCount.textContent = textLength;
    
    const countContainer = document.querySelector('.char-count-container');
    
    // Limit styling
    if (textLength >= 280) {
        countContainer.className = 'char-count-container error';
        postTweetBtn.disabled = true;
    } else if (textLength >= 260) {
        countContainer.className = 'char-count-container warning';
        postTweetBtn.disabled = false;
    } else {
        countContainer.className = 'char-count-container';
        postTweetBtn.disabled = false;
    }
    
    // Progress circle stroke offset
    if (progressCircle) {
        const percentage = Math.min(textLength / 280, 1);
        const offset = circumference - (percentage * circumference);
        progressCircle.style.strokeDashoffset = offset;
        
        // Change color based on limit
        if (textLength >= 280) {
            progressCircle.style.stroke = '#ef4444'; // Red
        } else if (textLength >= 260) {
            progressCircle.style.stroke = '#f59e0b'; // Amber
        } else {
            progressCircle.style.stroke = '#1da1f2'; // Blue
        }
    }
}
