document.getElementById('musicForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const musicFile = document.getElementById('musicFile').files[0];
    const coverFile = document.getElementById('coverFile').files[0];
    const artist = document.getElementById('artist').value;
    const title = document.getElementById('title').value;

    const musicUrl = await uploadFile(musicFile, 'Musique');
    const thumbnailUrl = await uploadFile(coverFile, 'Cover');

    const newSong = {
        musicUrl: musicUrl,
        title: title,
        artist: artist,
        thumbnailUrl: thumbnailUrl
    };

    await addSongToJson(newSong);
    document.getElementById('message').innerText = 'Musique ajoutée avec succès !';
});

async function uploadFile(file, folder) {
    // Remplacez cette URL par l'URL de votre API ou de votre système de stockage
    const uploadUrl = `https://spoutnik-musique.github.io/test/${folder}/`;
    const response = await fetch(uploadUrl + file.name, {
        method: 'PUT',
        body: file
    });
    
    if (response.ok) {
        return uploadUrl + file.name;
    } else {
        throw new Error('Échec de l\'upload du fichier');
    }
}

async function addSongToJson(newSong) {
    const response = await fetch('https://spoutnik-musique.github.io/test/Music.json');
    const data = await response.json();
    data.songs.push(newSong);

    await fetch('https://spoutnik-musique.github.io/test/Music.json', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}
