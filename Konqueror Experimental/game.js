document.addEventListener('DOMContentLoaded', () => {
    // Define all elements and variables at the top
    const introScreen = document.getElementById('introScreen');
    const playGameButton = document.getElementById('playGameButton');
    const gameContent = document.getElementById('gameContent');
    const createTeamButton = document.getElementById('createTeamButton');
    const teamCreationModal = document.getElementById('teamCreationModal');
    const teamCreationForm = document.getElementById('teamCreationForm');
    const closeModal = document.getElementsByClassName('close')[0];

    const gridContainer = document.getElementById('gridContainer');
    const scoreboard = {};
    const cooldownBar = document.getElementById('cooldownBar').children[0]; // Access the inner div of the cooldown bar
    const messagePopup = document.getElementById('messagePopup');
    const victoryScreen = document.getElementById('victoryScreen');
    const errorPopup = document.getElementById('errorPopup'); // Error popup element
    const gridSize = 10; // 10x10 grid
    let teamColors = ['red', 'blue', 'green', 'yellow'];
    let teamColorMap = {
        red: { primary: 'red', secondary: 'darkred' },
        blue: { primary: 'blue', secondary: 'lightblue' },
        green: { primary: 'green', secondary: 'lightgreen' },
        yellow: { primary: 'yellow', secondary: 'orange' }
    }; // Maps team names to their colors
    let selectedTeam = null; // Track the selected team
    let canClick = true; // Track if the player can click
    let messageQueue = []; // Queue for messages to be displayed
    let showingMessage = false; // Track if a message is currently being displayed
    let outTeams = new Set(); // Track teams that are out
    let capitals = {}; // Track the capital status and click counts
    let teamTiles = {}; // Track the tiles owned by each team

    // Initialize capitals and team tiles
    teamColors.forEach(color => {
        capitals[color] = { exists: false, row: null, col: null, clicks: 0, autoClicks: 0 };
        teamTiles[color] = 0;
        scoreboard[color] = document.getElementById(`${color}Score`);
    });

    // Define the initial colors for each section
    const colors = [
        ['red', 'red', 'red', 'red', 'red', 'blue', 'blue', 'blue', 'blue', 'blue'],
        ['red', 'red', 'red', 'red', 'red', 'blue', 'blue', 'blue', 'blue', 'blue'],
        ['red', 'red', 'red', 'red', 'red', 'blue', 'blue', 'blue', 'blue', 'blue'],
        ['red', 'red', 'red', 'red', 'red', 'blue', 'blue', 'blue', 'blue', 'blue'],
        ['red', 'red', 'red', 'red', 'red', 'blue', 'blue', 'blue', 'blue', 'blue'],
        ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'green', 'green', 'green', 'green', 'green'],
        ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'green', 'green', 'green', 'green', 'green'],
        ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'green', 'green', 'green', 'green', 'green'],
        ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'green', 'green', 'green', 'green', 'green'],
        ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'green', 'green', 'green', 'green', 'green']
    ];

    const squares = [];
    console.log("starting game");
    // Create the grid
    for (let row = 0; row < gridSize; row++) {
        const rowSquares = [];
        for (let col = 0; col < gridSize; col++) {
            const square = document.createElement('div');
            square.classList.add('gridSquare');
            square.style.backgroundColor = colors[row][col];
            square.dataset.row = row;
            square.dataset.col = col;
            square.dataset.team = colors[row][col]; // Initialize with team based on color
            square.addEventListener('click', () => colorSquare(square));
            gridContainer.appendChild(square);
            rowSquares.push(square);
        }
        squares.push(rowSquares);
    }

    // Create the team selection menu
    const teamMenu = document.getElementById('teamMenu');
    teamColors.forEach(color => {
        const teamOption = document.createElement('div');
        teamOption.id = `${color}Team`;
        teamOption.classList.add('teamOption');
        teamOption.style.backgroundColor = teamColorMap[color].primary;
        teamOption.style.color = teamColorMap[color].secondary;
        teamOption.textContent = `${capitalize(color)} Team`;
        teamOption.addEventListener('click', () => selectTeam(color));
        teamMenu.appendChild(teamOption);
    });

    // Event listener for the Play Game button
    playGameButton.addEventListener('click', () => {
        introScreen.style.display = 'none';
        gameContent.classList.remove('hidden');
        gameContent.style.display = 'block';
        placeRandomCapitals(); // Place the capitals randomly
    });

    // Function to place capitals randomly for the initial teams
    function placeRandomCapitals() {
        teamColors.forEach(color => {
            let placed = false;
            while (!placed) {
                const row = getRandomInt(gridSize);
                const col = getRandomInt(gridSize);
                const square = squares[row][col];
                if (square.dataset.team === color) {
                    makeCapital(square, color, teamColorMap[color].primary);
                    placed = true;
                }
            }
        });
    }

    function selectTeam(team) {
        selectedTeam = team;
        console.log(`Selected team: ${team}`);
        highlightSelectedTeam(team);
    }

    function highlightSelectedTeam(team) {
        teamColors.forEach(teamColor => {
            const teamOption = document.getElementById(`${teamColor}Team`);
            if (teamColor === team) {
                teamOption.classList.add('highlighted');
            } else {
                teamOption.classList.remove('highlighted');
            }
        });
    }

    function colorSquare(square) {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const currentTeam = square.dataset.team;

        if (selectedTeam && canClick) {
            const teamColor = teamColorMap[selectedTeam].primary;
            if (teamTiles[selectedTeam] === 0 && !capitals[selectedTeam].exists) {
                // First tile clicked by a new team, make it the capital
                makeCapital(square, selectedTeam, teamColor);
                startCooldown(); // Start cooldown when making a capital
            } else if (currentTeam !== selectedTeam && canChangeTeam(square, selectedTeam)) {
                if (square.classList.contains('capital')) {
                    capitals[currentTeam].clicks++;
                    console.log(`Capital clicked ${capitals[currentTeam].clicks} times`);
                    startCooldown(); // Start cooldown when attacking a capital
                    if (capitals[currentTeam].clicks >= 3) { // Require 3 clicks to conquer
                        conquerCapital(square, selectedTeam, teamColor);
                    }
                } else {
                    square.style.backgroundColor = teamColor;
                    square.dataset.team = selectedTeam;
                    teamTiles[selectedTeam]++;
                    console.log(`Tile placed by ${selectedTeam}, total tiles: ${teamTiles[selectedTeam]}`);
                    updateScoreboard();
                    startCooldown(); // Start cooldown when conquering a tile
                    checkGameState();
                }
            } else {
                // Show error message if the tile is not adjacent to one of the team's tiles
                showErrorPopup("You can't click this tile. It's not next to your team's tiles.");
            }
        }
    }

    function makeCapital(square, team, color) {
        const secondaryColor = teamColorMap[team].secondary;
        square.classList.add('capital');
        square.dataset.team = team; // Assign the team
        square.style.backgroundColor = color; // Set the tile color to the team's primary color
        capitals[team] = { exists: true, row: square.dataset.row, col: square.dataset.col, clicks: 0, autoClicks: 0 };
        square.style.setProperty('--star-color', secondaryColor);
        teamTiles[team]++;
        console.log(`${capitalize(team)} team created a capital at row ${square.dataset.row}, col ${square.dataset.col}`);
        updateScoreboard();
        checkGameState();
    }

    function conquerCapital(square, team, color) {
        const prevTeam = square.dataset.team;
        square.style.backgroundColor = color;
        square.classList.add('capital');
        square.dataset.team = team; // Assign the new team
        const secondaryColor = teamColorMap[team].secondary;
        square.style.setProperty('--star-color', secondaryColor);
        capitals[prevTeam].clicks = 0; // Reset clicks for the previous team
        capitals[prevTeam].autoClicks = 0; // Reset auto clicks for the previous team
        capitals[prevTeam].exists = false; // The previous team's capital no longer exists
        capitals[team] = { exists: true, row: square.dataset.row, col: square.dataset.col, clicks: 0, autoClicks: 0 }; // The new team's capital
        console.log(`${capitalize(team)} team conquered the capital of ${capitalize(prevTeam)} team`);
        updateScoreboard();
        checkGameState();
    }

    function canChangeTeam(square, team) {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const adjacentOffsets = [
            [-1, 0], [1, 0], [0, -1], [0, 1]
        ];

        console.log(`Checking adjacent tiles for (${row}, ${col}) with target team ${team}`);

        return adjacentOffsets.some(offset => {
            const newRow = row + offset[0];
            const newCol = col + offset[1];
            if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
                const adjacentSquareTeam = squares[newRow][newCol].dataset.team;
                console.log(`Checking square at (${newRow}, ${newCol}): team ${adjacentSquareTeam}`);
                return adjacentSquareTeam === team;
            }
            return false;
        });
    }

    function getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }

    function expandColor(color) {
        const expandableSquares = [];

        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const square = squares[row][col];
                if (square.style.backgroundColor === color && canExpandFromSquare(square, color)) {
                    expandableSquares.push(square);
                }
            }
        }

        if (expandableSquares.length > 0) {
            const squareToExpandFrom = expandableSquares[getRandomInt(expandableSquares.length)];
            console.log(`Expanding color ${color} from row ${squareToExpandFrom.dataset.row}, col ${squareToExpandFrom.dataset.col}`);
            expandFromSquare(squareToExpandFrom, color);
            updateScoreboard();
            checkGameState();
        } else {
            console.log(`No expandable squares for color ${color}`);
        }
    }

    function canExpandFromSquare(square, color) {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const adjacentOffsets = [
            [-1, 0], [1, 0], [0, -1], [0, 1]
        ];

        return adjacentOffsets.some(offset => {
            const newRow = row + offset[0];
            const newCol = col + offset[1];
            if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
                console.log(`Checking square at row ${newRow}, col ${newCol}: ${squares[newRow][newCol].style.backgroundColor}`);
                return squares[newRow][newCol].style.backgroundColor !== color && !squares[newRow][newCol].classList.contains('capital');
            }
            return false;
        });
    }

    function expandFromSquare(square, color) {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const adjacentOffsets = [
            [-1, 0], [1, 0], [0, -1], [0, 1]
        ];

        const expandablePositions = adjacentOffsets
            .map(offset => [row + offset[0], col + offset[1]])
            .filter(([newRow, newCol]) => newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize)
            .filter(([newRow, newCol]) => squares[newRow][newCol].style.backgroundColor !== color);

        if (expandablePositions.length > 0) {
            const [newRow, newCol] = expandablePositions[getRandomInt(expandablePositions.length)];
            const targetSquare = squares[newRow][newCol];
            if (targetSquare.classList.contains('capital')) {
                capitals[targetSquare.style.backgroundColor].autoClicks++;
                if (capitals[targetSquare.style.backgroundColor].autoClicks >= 3) { // Require 3 auto clicks to conquer
                    conquerCapital(targetSquare, teamColors.find(team => teamColorMap[team] === color).primary, color);
                }
            } else {
                targetSquare.style.backgroundColor = color;
                targetSquare.dataset.team = teamColors.find(team => teamColorMap[team].primary === color);
                teamTiles[targetSquare.dataset.team]++;
                console.log(`Color ${color} expanding to row ${newRow}, col ${newCol}`);
            }
        } else {
            console.log(`No expandable positions for color ${color} from row ${square.dataset.row}, col ${square.dataset.col}`);
        }
    }

    function updateScoreboard() {
        const colorCounts = { red: 0, blue: 0, green: 0, yellow: 0 };

        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const color = squares[row][col].style.backgroundColor;
                if (color in colorCounts) {
                    colorCounts[color]++;
                }
            }
        }

        for (const color of teamColors) {
            scoreboard[color].textContent = `${capitalize(color)}: ${colorCounts[color]}`;
        }

        return colorCounts;
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function startCooldown() {
        canClick = false;
        cooldownBar.style.width = '100%';
        cooldownBar.style.transition = 'none';
        cooldownBar.offsetWidth; // Trigger reflow
        cooldownBar.style.transition = 'width 0.5s linear';
        cooldownBar.style.width = '0%';

        setTimeout(() => {
            canClick = true;
        }, 500); // 0.5 seconds cooldown
    }

    function showErrorPopup(message) {
        errorPopup.textContent = message;
        errorPopup.style.display = 'block';
        errorPopup.style.opacity = 1;

        setTimeout(() => {
            errorPopup.style.opacity = 0;
        }, 1000); // Fade out after 1 second

        setTimeout(() => {
            errorPopup.style.display = 'none';
        }, 2000); // Ensure it is hidden after the fade out
    }

    function checkGameState() {
        const colorCounts = updateScoreboard();

        for (const color of teamColors) {
            if (colorCounts[color] === 0 && !outTeams.has(color)) {
                outTeams.add(color);
                messageQueue.push(`${capitalize(color)} team is out!`);
            }
        }

        const remainingTeams = teamColors.filter(color => colorCounts[color] > 0);

        if (remainingTeams.length === 1) {
            messageQueue.push(`${capitalize(remainingTeams[0])} team is victorious!`);
        }

        if (!showingMessage && messageQueue.length > 0) {
            showNextMessage();
        }
    }

    function showNextMessage() {
        if (messageQueue.length === 0) {
            showingMessage = false;
            return;
        }

        showingMessage = true;
        const message = messageQueue.shift();
        messagePopup.textContent = message;
        messagePopup.style.display = 'block';

        setTimeout(() => {
            messagePopup.style.display = 'none';
            showingMessage = false;
            if (messageQueue.length > 0) {
                setTimeout(showNextMessage, 100); // Small delay before showing the next message
            }
        }, 3000); // Display message for 3 seconds
    }

    function showVictoryScreen(message) {
        victoryScreen.textContent = message;
        victoryScreen.style.display = 'block';
    }

    // Automatic expansion for one random team every 0.4 seconds
    setInterval(() => {
        const color = teamColors[getRandomInt(teamColors.length)];
        console.log(`Attempting to expand color ${color}`);
        expandColor(color);
    }, 400);

    // Initial scoreboard update
    updateScoreboard();

    // New functionality for creating teams
    createTeamButton.addEventListener('click', () => {
        teamCreationModal.style.display = 'block';
    });

    closeModal.addEventListener('click', () => {
        teamCreationModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == teamCreationModal) {
            teamCreationModal.style.display = 'none';
        }
    });

    teamCreationForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const teamName = document.getElementById('teamName').value.toLowerCase();
        const teamColor = document.getElementById('teamColor').value;
        const secondaryColor = document.getElementById('secondaryColor').value;
        createTeam(teamName, teamColor, secondaryColor);
        teamCreationModal.style.display = 'none';
    });

    function createTeam(name, color, secondaryColor) {
        if (teamColors.includes(name)) {
            alert('Team name already exists!');
            return;
        }

        // Create new team option in the team menu
        const newTeamOption = document.createElement('div');
        newTeamOption.classList.add('teamOption');
        newTeamOption.style.backgroundColor = color;
        newTeamOption.style.color = secondaryColor;
        newTeamOption.textContent = `${capitalize(name)} Team`;
        newTeamOption.addEventListener('click', () => selectTeam(name));

        teamMenu.appendChild(newTeamOption);

        // Add team to the scoreboard
        const newScore = document.createElement('div');
        newScore.id = `${name}Score`;
        newScore.textContent = `${capitalize(name)}: 0`;
        scoreboard[name] = newScore;

        document.getElementById('scoreboard').appendChild(newScore);

        // Initialize team data
        teamColors.push(name);
        teamColorMap[name] = { primary: color, secondary: secondaryColor };
        capitals[name] = { exists: false, row: null, col: null, clicks: 0, autoClicks: 0 };
        teamTiles[name] = 0;
        console.log(`Team ${name} created with color ${color} and secondary color ${secondaryColor}`);
    }
});
