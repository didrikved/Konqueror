const players = {
  didrik: {
    team: "red",
  },
  sigurd: {
    team: "blue",
  },
};

const teams = {
  red: { color: "red", secondaryColor: "lightred" },
  blue: { color: "blue", secondaryColor: "cyan" },
};

const squaresData: (string | null)[][] = [];

const gridSize = 10; // 10x10 grid

for (let row = 0; row < gridSize; row++) {
  squaresData.push([]);
  for (let col = 0; col < gridSize; col++) {
    squaresData[row].push(null);
  }
}

const server = Bun.serve<{ authToken: string }>({
  fetch(req, server) {
    const success = server.upgrade(req);
    if (success) {
      return undefined;
    }

    return new Response("Hello world!");
  },
  websocket: {
    async message(ws, message) {
      if (typeof message === "string") {
        const data = JSON.parse(message);

        const event = data.event;

        if (event === "colorSquare") {
          console.log(
            "Coloring square " +
              data.row +
              " " +
              data.col +
              " for team " +
              data.team,
          );
          squaresData[data.row][data.col] = data.team;

          ws.send(
            JSON.stringify({
              event: "updateSquares",
              squares: squaresData,
              teams: teams,
            }),
          );
        }
      } else throw Error("Invalid message");
    },
  },
});

console.log(`Listening on ${server.hostname}:${server.port}`);
