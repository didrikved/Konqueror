const players = {
  didrik: {
    team: "red",
  },
  sigurd: {
    team: "blue",
  },
};

const teams = {
  red: { color: "red", secondaryColor: "darkred", capital: null },
  blue: { color: "blue", secondaryColor: "cyan", capital: null },
};

const squaresData: (string | null)[][] = [];

const gridSize = 10; // 10x10 grid

for (let row = 0; row < gridSize; row++) {
  squaresData.push([]);
  for (let col = 0; col < gridSize; col++) {
    squaresData[row].push(null);
  }
}
function countTeamTiles(team: string): number {
  let count = 0;
  for (let row = 0; row < squaresData.length; row++) {
    for (let col = 0; col < squaresData[row].length; col++) {
      if (squaresData[row][col] === team) {
        count++;
      }
    }
  }
  return count;
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
        const { event, team, row, col } = data;

        // Explicitly define the type of attackedCapitals
        let attackedCapitals: { row: number; col: number; attacker: string; defender: string }[] = [];

        if (event === "colorSquare") {
          console.log(`Coloring square at row ${row}, col ${col} for team ${team}`);

          const teamTileCount = countTeamTiles(team);

          if (!teams[team].capital && teamTileCount === 0) {
            // No capital and no tiles; this tile becomes the capital
            teams[team].capital = { row, col, clicks: 0 };
            squaresData[row][col] = team;
            console.log(`Capital placed for team ${team} at row ${row}, col ${col}`);
          } else if (squaresData[row][col] !== team) {
            const currentTeam = squaresData[row][col];
            if (currentTeam && teams[currentTeam].capital?.row === row && teams[currentTeam].capital?.col === col) {
              // Handle attacks on a capital
              teams[currentTeam].capital.clicks++;
              attackedCapitals.push({ row, col, attacker: team, defender: currentTeam });

              if (teams[currentTeam].capital.clicks >= 3) {
                // Conquer the capital
                teams[currentTeam].capital = null;
                squaresData[row][col] = team;
                console.log(`Capital at row ${row}, col ${col} conquered by team ${team}`);
              }
            } else {
              // Normal tile capture
              squaresData[row][col] = team;
            }
          }

          ws.send(
            JSON.stringify({
              event: "updateSquares",
              squares: squaresData,
              teams: teams,
              attackedCapitals: attackedCapitals,
            }),
          );
        }
      } else {
        throw Error("Invalid message");
      }
    },
    open(ws) {
      ws.send(
        JSON.stringify({
          event: "updateSquares",
          squares: squaresData,
          teams: teams,
          attackedCapitals: []
        }),
      );
    },
  },
});

console.log(`Listening on ${server.hostname}:${server.port}`);
