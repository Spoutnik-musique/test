let audioPlayer = new Audio();
let isPlaying = false;
let songs = [];
let currentIndex = 0;
let isShuffle = false;
let isRepeat = false;
let shuffledIndices = [];
let isDragging = false;
let isLeftMouseDown = false;
let startY = 0;
let currentY = 0;
let filteredIndices = [];

function updateUI(songDetails) {
    const titleElement = document.getElementById('title');
    const artistElement = document.getElementById('artist');
    const albumCoverElement = document.getElementById('album-cover');
    const backgroundElement = document.getElementById('background');
    const progressBar = document.getElementById('progressBar');

    if (songDetails) {
        const { musicUrl, title, artist, thumbnailUrl, duration } = songDetails;
        titleElement.textContent = title;
        artistElement.textContent = artist;
        albumCoverElement.src = thumbnailUrl;
        backgroundElement.style.backgroundImage = `url('${thumbnailUrl}')`;
        audioPlayer.src = musicUrl;

        audioPlayer.ontimeupdate = () => {
            if (!isNaN(audioPlayer.duration)) {
                const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
                progressBar.value = progress;
                document.getElementById('time').textContent = `${formatTime(audioPlayer.currentTime)} / ${formatTime(audioPlayer.duration)}`;
            }
        };

        audioPlayer.preload = 'auto';
        if (window.api) window.api.setActivity({ ...songDetails, duration });
    } else {
        titleElement.textContent = "Musique non disponible";
        artistElement.textContent = "";
        albumCoverElement.src = "";
        backgroundElement.style.backgroundImage = "";
        document.getElementById('time').textContent = "0:00 / 0:00";
        if (window.api) window.api.setActivity();
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function saveState() {
    localStorage.setItem('currentIndex', currentIndex);
    localStorage.setItem('isPlaying', isPlaying);
    localStorage.setItem('currentTime', audioPlayer.currentTime);
}

function loadState() {
    const savedIndex = localStorage.getItem('currentIndex');
    const savedIsPlaying = localStorage.getItem('isPlaying');
    const savedCurrentTime = localStorage.getItem('currentTime');

    if (savedIndex !== null) {
        currentIndex = parseInt(savedIndex, 10);
    }
    if (savedIsPlaying !== null) {
        isPlaying = savedIsPlaying === 'true';
    }
    if (savedCurrentTime !== null) {
        audioPlayer.currentTime = parseFloat(savedCurrentTime);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    loadState(); // Charger l'état sauvegardé

    songs = await fetchPlaylistSongs();
    const suggestionsListElement = document.getElementById('suggestions-list');

    if (songs.length > 0) {
        playSong(currentIndex);
    }

    suggestionsListElement.innerHTML = '';

    songs.forEach((song, i) => {
        if (!song) {
            console.error(`Chanson invalide pour l'index ${i}`);
            return;
        }

        const suggestionElement = document.createElement('div');
        suggestionElement.className = 'suggestion-item';

        const coverElement = document.createElement('img');
        coverElement.className = 'suggestion-cover';
        coverElement.src = song.thumbnailUrl;
        suggestionElement.appendChild(coverElement);

        const infoElement = document.createElement('div');
        infoElement.className = 'suggestion-info';

        const titleElement = document.createElement('div');
        titleElement.className = 'suggestion-title';
        titleElement.textContent = song.title;
        infoElement.appendChild(titleElement);

        const artistElement = document.createElement('div');
        artistElement.className = 'suggestion-artist';
        artistElement.textContent = song.artist;
        infoElement.appendChild(artistElement);

        suggestionElement.appendChild(infoElement);

        suggestionElement.addEventListener('click', () => playSong(i));
        suggestionsListElement.appendChild(suggestionElement);
    });

    // Ajouter des écouteurs d'événements pour la recherche
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', () => filterSongs(searchInput.value));

    let touchstartY = 0;
    let touchendY = 0;

    function checkSwipeDirection() {
        if (touchendY < touchstartY - 50) {
            document.getElementById('suggestions-container').classList.add('visible');
        }
    }

    document.body.addEventListener('touchstart', (event) => {
        touchstartY = event.changedTouches[0].screenY;
    });

    document.body.addEventListener('touchend', (event) => {
        touchendY = event.changedTouches[0].screenY;
        checkSwipeDirection();
    });

    document.getElementById('suggestions-close').addEventListener('click', () => {
        document.getElementById('suggestions-container').classList.remove('visible');
    });


    const progressBar = document.getElementById('progressBar');

    audioPlayer.addEventListener('timeupdate', () => {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.value = progress;
        updateProgress();
    });

    progressBar.addEventListener('input', (event) => {
        const progress = event.target.value;
        if (!isNaN(audioPlayer.duration)) {
            audioPlayer.currentTime = (progress / 100) * audioPlayer.duration;
        }
    });

    function updateProgress() {
        const progress = progressBar.value;
        progressBar.style.background = `linear-gradient(to right, #fff ${progress}%, #333 ${progress}%)`;
    }

    updateProgress();

    audioPlayer.addEventListener('ended', () => {
        if (isRepeat) {
            playSong(currentIndex);
        } else {
            currentIndex = getNextIndex();
            playSong(currentIndex);
        }
        saveState(); // Sauvegarder l'état après la fin de la chanson
    });
});

document.getElementById('playPauseButton').addEventListener('click', () => {
    if (isPlaying) {
        audioPlayer.pause();
        document.querySelector('#playPauseButton .material-icons-outlined').textContent = 'play_arrow';
    } else {
        audioPlayer.play().catch(error => {
            console.error('Erreur lors de la lecture automatique:', error);
        });
        document.querySelector('#playPauseButton .material-icons-outlined').textContent = 'pause';
    }
    isPlaying = !isPlaying;
    saveState(); // Sauvegarder l'état à chaque fois que la lecture est mise en pause ou reprise
});

document.getElementById('shuffleButton').addEventListener('click', () => {
    isShuffle = !isShuffle;
    document.querySelector('#shuffleButton .material-icons-outlined').textContent = isShuffle ? 'shuffle_on' : 'shuffle';
    if (isShuffle) {
        shuffledIndices = [];
    }
    saveState(); // Sauvegarder l'état lorsque le mode shuffle est changé
});

document.getElementById('repeatButton').addEventListener('click', () => {
    isRepeat = !isRepeat;
    document.querySelector('#repeatButton .material-icons-outlined').textContent = isRepeat ? 'repeat_on' : 'repeat';
    saveState(); // Sauvegarder l'état lorsque le mode repeat est changé
});

function getNextIndex() {
    if (isShuffle) {
        if (shuffledIndices.length === 0) {
            shuffledIndices = Array.from({ length: songs.length }, (_, i) => i);
            shuffledIndices.sort(() => Math.random() - 0.5);
        }
        return shuffledIndices.pop();
    } else {
        return (currentIndex + 1) % songs.length;
    }
}

document.getElementById('nextButton').addEventListener('click', () => {
    currentIndex = getNextIndex();
    playSong(currentIndex);
});

document.getElementById('prevButton').addEventListener('click', () => {
    if (isShuffle) {
        currentIndex = shuffledIndices.length > 0 ? shuffledIndices.pop() : Math.floor(Math.random() * songs.length);
    } else {
        currentIndex = (currentIndex - 1 + songs.length) % songs.length;
    }
    playSong(currentIndex);
});

function playSong(index) {
    currentIndex = index; // Assurer que l'index courant est mis à jour
    const songDetails = songs[index];
    updateUI(songDetails);

    // Assurez-vous que la lecture automatique est désactivée
    if (!isPlaying) {
        audioPlayer.src = songDetails.musicUrl;
        audioPlayer.load(); // Charger la chanson sans lire automatiquement

        // Ajouter un événement pour jouer lorsque l'utilisateur clique sur le bouton de lecture
        document.getElementById('playPauseButton').addEventListener('click', () => {
            audioPlayer.play().catch(error => {
                console.error('Erreur lors de la lecture automatique:', error);
            });
            document.querySelector('#playPauseButton .material-icons-outlined').textContent = 'pause';
            isPlaying = true;
            saveState();
        }, { once: true });
    } else {
        audioPlayer.src = songDetails.musicUrl;
        audioPlayer.play().catch(error => {
            console.error('Erreur lors de la lecture automatique:', error);
        });
    }

    saveState(); // Sauvegarder l'état lorsque la chanson change
}

async function fetchPlaylistSongs() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/Spoutnik-musique/test/main/Music.json');
        if (!response.ok) {
            throw new Error('Failed to fetch playlist songs');
        }
        const data = await response.json();
        return data.songs;
    } catch (error) {
        console.error('Error fetching playlist songs:', error.message);
        return [];
    }
}

const suggestionsContainer = document.getElementById('suggestions-container');

document.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        isDragging = true;
        isLeftMouseDown = true;
        startY = e.clientY;
    }
});

document.addEventListener('mousemove', (e) => {
    if (isDragging && isLeftMouseDown) {
        currentY = e.clientY;
        const diffY = startY - currentY;
        if (diffY > 50) {
            suggestionsContainer.classList.add('visible');
        }
    }
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    isLeftMouseDown = false;
});

let touchstartY = 0;
let touchendY = 0;

function checkSwipeDirection() {
    if (touchendY < touchstartY - 50) {
        suggestionsContainer.classList.add('visible');
    }
}

document.body.addEventListener('touchstart', (event) => {
    touchstartY = event.changedTouches[0].screenY;
});

document.body.addEventListener('touchend', (event) => {
    touchendY = event.changedTouches[0].screenY;
    checkSwipeDirection();
});

document.getElementById('suggestions-close').addEventListener('click', () => {
    suggestionsContainer.classList.remove('visible');
});

function filterSongs(query) {
    const suggestionsListElement = document.getElementById('suggestions-list');
    suggestionsListElement.innerHTML = '';

    filteredIndices = songs.map((song, index) => ({ song, index }))
        .filter(({ song }) => 
            song.title.toLowerCase().includes(query.toLowerCase()) ||
            song.artist.toLowerCase().includes(query.toLowerCase())
        );

    filteredIndices.forEach(({ song, index }) => {
        const suggestionElement = document.createElement('div');
        suggestionElement.className = 'suggestion-item';

        const coverElement = document.createElement('img');
        coverElement.className = 'suggestion-cover';
        coverElement.src = song.thumbnailUrl;
        suggestionElement.appendChild(coverElement);

        const infoElement = document.createElement('div');
        infoElement.className = 'suggestion-info';

        const titleElement = document.createElement('div');
        titleElement.className = 'suggestion-title';
        titleElement.textContent = song.title;
        infoElement.appendChild(titleElement);

        const artistElement = document.createElement('div');
        artistElement.className = 'suggestion-artist';
        artistElement.textContent = song.artist;
        infoElement.appendChild(artistElement);

        suggestionElement.appendChild(infoElement);

        suggestionElement.addEventListener('click', () => playSong(index));
        suggestionsListElement.appendChild(suggestionElement);
    });
}
document.addEventListener('DOMContentLoaded', function () {
    const albumCover = document.getElementById('album-cover');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const suggestionsClose = document.getElementById('suggestions-close');

    albumCover.addEventListener('click', function () {
        suggestionsContainer.classList.toggle('visible');
    });

    suggestionsClose.addEventListener('click', function () {
        suggestionsContainer.classList.remove('visible');
    });
});
