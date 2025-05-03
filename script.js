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
document.getElementById('volumeSlider').addEventListener('input', (event) => {
    const volume = event.target.value / 100;
    audioPlayer.volume = volume;

    const volumeIcon = document.getElementById('volumeIcon');
    if (volume === 0) {
        volumeIcon.className = 'bi bi-volume-mute'; // Changer l'icône à volume muet
    } else if (volume < 0.5) {
        volumeIcon.className = 'bi bi-volume-down'; // Changer l'icône à volume faible
    } else {
        volumeIcon.className = 'bi bi-volume-up'; // Changer l'icône à volume élevé
    }

    saveVolumeState(volume); // Sauvegarder le niveau de volume dans le stockage local
});

// Fonction pour sauvegarder l'état du volume
function saveVolumeState(volume) {
    localStorage.setItem('volume', volume);
}

// Charger l'état de volume sauvegardé
function loadVolumeState() {
    const savedVolume = localStorage.getItem('volume');
    if (savedVolume !== null) {
        audioPlayer.volume = parseFloat(savedVolume);
        document.getElementById('volumeSlider').value = savedVolume * 100;

        const volumeIcon = document.getElementById('volumeIcon');
        if (savedVolume === '0') {
            volumeIcon.className = 'bi bi-volume-mute'; // Utilise l'icône pour volume muet
        } else if (savedVolume < 0.5) {
            volumeIcon.className = 'bi bi-volume-down'; // Utilise l'icône pour volume faible
        } else {
            volumeIcon.className = 'bi bi-volume-up'; // Utilise l'icône pour volume élevé
        }
    }
}

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
        // Mise à jour du favicon avec la cover de l'album
        let favicon = document.querySelector("link[rel='icon']");
        if (!favicon) {
            favicon = document.createElement("link");
            favicon.rel = "icon";
            document.head.appendChild(favicon);
        }
        favicon.href = thumbnailUrl;

        document.title = `${title} • ${artist}`; // Mise à jour du titre de la page

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
        document.title = "Spoutnik"; // Titre par défaut
        if (window.api) window.api.setActivity();
    }
}
function updateFaviconWithCover(coverUrl) {
    let favicon = document.querySelector("link[rel='icon']");
    if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.head.appendChild(favicon);
    }
    favicon.href = coverUrl;
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
    
        // Ajout d'un événement de clic pour jouer la chanson
        suggestionElement.addEventListener('click', () => playSong(i));
        suggestionsListElement.appendChild(suggestionElement);
    
        // Ajouter un contour blanc à la chanson en cours de lecture initiale
        if (i === currentIndex) {
            suggestionElement.classList.add('current-song');
        }
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
        progressBar.style.background = `linear-gradient(to right, #ffffff77 ${progress}%, #33333352 ${progress}%)`;
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
        document.querySelector('#playPauseButton i').classList.replace('bi-pause-fill', 'bi-play-fill');
    } else {
        audioPlayer.play().catch(error => {
            console.error('Erreur lors de la lecture automatique:', error);
        });
        document.querySelector('#playPauseButton i').classList.replace('bi-play-fill', 'bi-pause-fill');
    }
    isPlaying = !isPlaying;
    saveState(); // Sauvegarder l'état
});

document.getElementById('shuffleButton').addEventListener('click', () => {
    isShuffle = !isShuffle;
    document.getElementById('shuffleButton').classList.toggle('active', isShuffle); // Ajoute la classe active
    saveState();
});

document.getElementById('repeatButton').addEventListener('click', () => {
    isRepeat = !isRepeat;
    document.getElementById('repeatButton').classList.toggle('active', isRepeat); // Ajoute la classe active
    saveState();
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

let history = []; // Pile pour stocker l'historique des chansons jouées

function playSong(index) {
    currentIndex = index; // Met à jour l'index courant
    const songDetails = songs[index]; // Détails de la chanson actuelle
    updateUI(songDetails); // Met à jour l'interface utilisateur

    // Met à jour le contour blanc pour la chanson en cours de lecture
    const suggestionsListElement = document.getElementById('suggestions-list');
    Array.from(suggestionsListElement.children).forEach((element, i) => {
        if (i === index) {
            element.classList.add('current-song'); // Ajoute une classe pour la chanson actuelle
        } else {
            element.classList.remove('current-song'); // Retire la classe pour les autres chansons
        }
    });

    audioPlayer.src = songDetails.musicUrl; // Charge la chanson
    audioPlayer.load(); // Précharge la chanson

    // Ajouter la chanson actuelle à l'historique
    if (history.length === 0 || history[history.length - 1] !== currentIndex) {
        history.push(currentIndex); // Ajoute à l'historique si ce n'est pas déjà la même chanson
    }

    // Joue la chanson si elle n'est pas déjà en train de jouer
    if (!isPlaying) {
        audioPlayer.play().then(() => {
            document.querySelector('#playPauseButton i').classList.replace('bi-play-fill', 'bi-pause-fill'); // Change l'icône pour pause
            isPlaying = true; // Met à jour l'état de lecture
        }).catch(error => {
            console.error('Erreur lors de la lecture automatique:', error);
        });
    } else {
        audioPlayer.play().catch(error => {
            console.error('Erreur lors de la lecture automatique:', error);
        });
    }

    saveState(); // Sauvegarde l'état lorsque la chanson change
}

// Logique pour le bouton Précédent
document.getElementById('prevButton').addEventListener('click', () => {
    if (isShuffle) {
        // Mode aléatoire
        if (history.length > 1) {
            history.pop(); // Retire la chanson actuelle de l'historique
            currentIndex = history[history.length - 1]; // Prendre la dernière chanson jouée
            playSong(currentIndex); // Jouer cette chanson
        } else if (history.length === 1) {
            currentIndex = history[0]; // Joue la première chanson à nouveau
            playSong(currentIndex);
        } else {
            // Aucun historique, choisir une chanson aléatoire
            currentIndex = Math.floor(Math.random() * songs.length);
            playSong(currentIndex);
        }
    } else {
        // Mode normal (non aléatoire)
        currentIndex = (currentIndex - 1 + songs.length) % songs.length; // Retourne à la chanson précédente
        playSong(currentIndex); // Joue la chanson précédente dans l'ordre
    }
});


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
// Fonction pour obtenir la chanson en cours de lecture
function getCurrentSong() {
    return songs[currentIndex]; // Retourne la chanson actuelle à partir de l'index courant
}

// Fonction pour récupérer les paroles d'une chanson à partir de l'URL fournie
async function fetchLyrics(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch lyrics');
        }
        const lyrics = await response.text();
        return lyrics;
    } catch (error) {
        console.error('Error fetching lyrics:', error.message);
        return 'Lyrics not available.';
    }
}

// Fonction pour afficher les paroles dans le conteneur
function displayLyrics(lyrics) {
    const lyricsContainer = document.getElementById('lyrics-container');
    const lyricsContent = document.getElementById('lyrics-content');
    lyricsContent.textContent = lyrics;
    lyricsContainer.classList.add('visible');
}

// Fonction pour masquer les paroles
function hideLyrics() {
    const lyricsContainer = document.getElementById('lyrics-container');
    lyricsContainer.classList.remove('visible');
}

// Gestionnaire d'événement pour l'action de glisser vers le bas
document.addEventListener('swipedown', async () => {
    const currentSong = getCurrentSong();
    if (currentSong && currentSong.Parole) {
        const lyrics = await fetchLyrics(currentSong.Parole);
        displayLyrics(lyrics);
    } else {
        displayLyrics('Lyrics not available.');
    }
});

// Gestionnaire d'événement pour masquer les paroles lors d'un glissement vers le haut ou d'un clic à l'extérieur
document.addEventListener('swipeup', hideLyrics);
document.getElementById('lyrics-container').addEventListener('click', hideLyrics);

// Gestionnaire d'événement pour les suggestions (non complet, dépend du reste de votre code)
document.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        // Logique pour afficher les suggestions
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const albumCover = document.getElementById('album-cover');
    const lyricsContainer = document.getElementById('lyrics-container');
    const lyricsClose = document.getElementById('lyrics-close');
    updateFaviconWithCover(coverUrl);

    albumCover.addEventListener('click', async function () {
        const currentSong = getCurrentSong();
        if (currentSong && currentSong.Parole) {
            const lyrics = await fetchLyrics(currentSong.Parole);
            displayLyrics(lyrics);
        } else {
            displayLyrics('Lyrics not available.');
        }
    });

    lyricsClose.addEventListener('click', function () {
        hideLyrics();
    });
});

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
