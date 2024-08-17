document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('gridContainer');
    const scoreboard = {
        red: document.getElementById('redScore'),
        blue: document.getElementById('blueScore'),
        green: document.getElementById('greenScore'),
        yellow: document.getElementById('yellowScore')
    };
    const cooldownBar = document.getElementById('cooldownBar');
    const messagePopup = document.getElementById('messagePopup');
    const victoryScreen = document.getElementById('victoryScreen');
    const gridSize = 10; // 10x10 grid
    let teamColors = ['red', 'blue', 'green', 'yellow'];
    let selectedTeam = null; // Track the selected team
    let canClick = true; // Track if the player can click
    let messageQueue = []; // Queue for messages to be displayed
    let showingMessage = false; // Track if a message is currently being displayed
    let outTeams = new Set(); // Track teams that are out
    let capitals = {}; // Track the capital status and click counts
    let firstMove = {}; // Track the first move for each team
    let teamCreatedTiles = {}; // Track if a team has created at least one tile

    // Initialize capitals, first moves, and created tiles
    teamColors.forEach(color => {
        capitals[color] = { exists: false, row: null, col: null, clicks: 0, autoClicks: 0 };
        firstMove[color] = true;
        teamCreatedTiles[color] = false;
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

    // Create the grid
    for (let row = 0; row < gridSize; row++) {
        const rowSquares = [];
        for (let col = 0; col < gridSize; col++) {
            const square = document.createElement('div');
            square.classList.add('gridSquare');
            square.style.backgroundColor = colors[row][col];
            square.dataset.row = row;
            square.dataset.col = col;
            square.addEventListener('click', () => colorSquare(square));
            gridContainer.appendChild(square);
            rowSquares.push(square);
        }
        squares.push(rowSquares);
    }

    // Create the team selection menu
    const teamMenu = document.getElementById('teamMenu');
    const createTeamButton = document.getElementById('createTeam');
    const teamCreationModal = document.getElementById('teamCreationModal');
    const teamCreationClose = document.querySelector('.close');
    const createTeamButtonModal = document.getElementById('createTeamButton');

    teamColors.forEach(color => {
        const teamOption = document.getElementById(`${color}Team`);
        teamOption.addEventListener('click', () => selectTeam(color));
    });

    createTeamButton.addEventListener('click', () => {
        teamCreationModal.style.display = 'block';
    });

    teamCreationClose.addEventListener('click', () => {
        teamCreationModal.style.display = 'none';
    });

    createTeamButtonModal.addEventListener('click', () => {
        const teamName = document.getElementById('teamName').value;
        const teamColor = document.getElementById('teamColor').value;
        createTeam(teamName, teamColor);
        teamCreationModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == teamCreationModal) {
            teamCreationModal.style.display = 'none';
        }
    });

    function selectTeam(color) {
        selectedTeam = color;
        console.log(`Selected team: ${color}`);
        highlightSelectedTeam(color);
    }

    function highlightSelectedTeam(color) {
        teamColors.forEach(teamColor => {
            const teamOption = document.getElementById(`${teamColor}Team`);
            if (teamOption) {
                if (teamColor === color) {
                    teamOption.classList.add('highlighted');
                } else {
                    teamOption.classList.remove('highlighted');
                }
            }
        });
    }

    function createTeam(name, color) {
        const teamOption = document.createElement('div');
        teamOption.classList.add('teamOption');
        teamOption.style.backgroundColor = color;
        teamOption.textContent = name;
        teamOption.id = `${name}Team`;
        teamOption.addEventListener('click', () => selectTeam(color));
        teamMenu.appendChild(teamOption);
        teamColors.push(color);
        capitals[color] = { exists: false, row: null, col: null, clicks: 0, autoClicks: 0 };
        firstMove[color] = true;
        teamCreatedTiles[color] = false;
        scoreboard[color] = document.createElement('div');
        scoreboard[color].id = `${color}Score`;
        scoreboard[color].textContent = `${capitalize(name)}: 0`;
        document.getElementById('scoreboard').appendChild(scoreboard[color]);
    }

    function colorSquare(square) {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const currentColor = square.style.backgroundColor;

        if (selectedTeam && canClick) {
            const colorCounts = getColorCounts();
            if (colorCounts[selectedTeam] === 0 && !capitals[selectedTeam].exists) {
                makeCapital(square, selectedTeam);
                teamCreatedTiles[selectedTeam] = true;
            } else if (currentColor !== selectedTeam && canChangeColor(square, selectedTeam)) {
                if (square.classList.contains('capital')) {
                    capitals[currentColor].clicks++;
                    if (capitals[currentColor].clicks >= 3) { // Require 3 clicks to conquer
                        conquerCapital(square, selectedTeam);
                    }
                } else {
                    square.style.backgroundColor = selectedTeam;
                }
                updateScoreboard();
                startCooldown();
                checkGameState();
            }
        }
    }

    function makeCapital(square, color) {
        square.classList.add('capital');
        square.classList.add(color); // Add the team's color class
        capitals[color] = { exists: true, row: square.dataset.row, col: square.dataset.col, clicks: 0, autoClicks: 0 };
        console.log(`${capitalize(color)} team created a capital at row ${square.dataset.row}, col ${square.dataset.col}`);
    }

    function conquerCapital(square, color) {
        const prevColor = square.style.backgroundColor;
        square.style.backgroundColor = color;
        square.classList.add('capital');
        square.classList.add(color); // Add the new team's color class
        capitals[prevColor].clicks = 0; // Reset clicks for the previous team
        capitals[prevColor].autoClicks = 0; // Reset auto clicks for the previous team
        console.log(`${capitalize(color)} team conquered the capital of ${capitalize(prevColor)} team`);
    }

    function canChangeColor(square, color) {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const adjacentOffsets = [
            [-1, 0], [1, 0], [0, -1], [0, 1]
        ];

        return adjacentOffsets.some(offset => {
            const newRow = row + offset[0];
            const newCol = col + offset[1];
            if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
                return squares[newRow][newCol].style.backgroundColor === color;
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
                return squares[newRow][newCol].style.backgroundColor !== color;
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
                    conquerCapital(targetSquare, color);
                }
            } else {
                targetSquare.style.backgroundColor = color;
            }
            console.log(`Color ${color} expanding to row ${newRow}, col ${newCol}`);
        } else {
            console.log(`No expandable positions for color ${color} from row ${square.dataset.row}, col ${square.dataset.col}`);
        }
    }

    function updateScoreboard() {
        const colorCounts = getColorCounts();

        for (const color of teamColors) {
            scoreboard[color].textContent = `${capitalize(color)}: ${colorCounts[color]}`;
        }

        return colorCounts;
    }

    function getColorCounts() {
        const colorCounts = {};

        teamColors.forEach(color => {
            colorCounts[color] = 0;
        });

        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const color = squares[row][col].style.backgroundColor;
                if (color in colorCounts) {
                    colorCounts[color]++;
                }
            }
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

    function checkGameState() {
        const colorCounts = updateScoreboard();

        for (const color of teamColors) {
            if (colorCounts[color] === 0 && !outTeams.has(color) && teamCreatedTiles[color]) {
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
});
