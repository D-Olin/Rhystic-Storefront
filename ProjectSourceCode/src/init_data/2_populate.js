const apiUrl = 'https://api.scryfall.com/bulk-data';
console.log("TESTING")
fetch(apiUrl)
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log(data);
    })
    .catch(error => {
    console.error('Error:', error);
    });

// havent written the part to populate db cause i cant get it to run this file on startup at all, may just do it manually