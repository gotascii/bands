npm install
npm link

Run bands someband.bandcamp.com/album/...
Automatically copies CSV output to clipboard
Paste into Google Sheet
Then Data > Split test to columns

Accessing Discogs API requires an API key
Login to Discogs, go to Settings > Developers
Key is read from ENV DISCOGS_TOKEN
./index.js can read from .env
./index.js -e path_to_dotenv will read from some other .env file
