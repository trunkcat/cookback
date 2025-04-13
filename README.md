# Cookback

Cook game's backend server.

## Setup

- Make sure you have Node.js 22 installed.
- Use pnpm instead of npm or yarn.

Clone the repository and install dependencies:

```sh
git clone https://github.com/trunkcat/cookback
cd cookback
pnpm install
```

If you are developing, make sure you run `tsc` to compile the code.
Install `tsc` as a global binary using `pnpm install -g typescript`.
Run `tsc --watch` in the directory afterwards.

Before starting the application, set up some environmental variables in `.env` file. (TODO: Drizzle setup scripts)

```sh
DATABASE_URL="" # Required. Connection string for the PostgreSQL database.
JWT_SECRET_SIGNATURE="" # Required. Secret sign key for JWT, keep it safe.
HOSTNAME="" # Optional. Hostname for the server. Defaults to oak's.
PORT=8080 # Optional. Port for the server. Defaults to 8080
```

Now to start the application, run:

```sh
pnpm run dev
```

Only the `dev` script is configured as of now.
Running this should print the HTTP URL the server is serving on.
Checkout the `/api/healthcheck` route to see if it returns `true`.

In order for the server to work when hosted on your local network, consider enabling the firewall access for the port 8080.

## Description

(To be added later)

## TODOs & Roadmap (v0)

Detailed descriptions will be added later.

- [x] Setup the base HTTP server
- [ ] Finish database schema
  - [ ] Decide what to store and where
- [x] Basic Registration & Authentication
- [ ] Websocket connection

## Developer Notes

If this ends up as a game with online multiplayer as planned, then, the game
needs to be a fully online game, including saves and progress. Another option is
to make the game offline and with offline LAN support. But that would destroy
the online thing we need for the DBMS project.

## License

MIT License

Copyright (c) 2024-2025 Trunk Cat Studios

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
