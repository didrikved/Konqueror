document.addEventListener('DOMContentLoaded', () => {
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
    const teamColors = ['red', 'blue', 'green', 'yellow'];
    const teamColorMap = {
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
    let bufferedClick = null; // To store the buffered click event during cooldown

    const gridSize = 100; // Dynamic grid size

    // Initialize capitals and team tiles
    teamColors.forEach(color => {
        capitals[color] = { exists: false, row: null, col: null, clicks: 0, autoClicks: 0 };
        teamTiles[color] = 0;
        scoreboard[color] = document.getElementById(`${color}Score`);
    });

    const squares = [];

    // Create the grid dynamically
    for (let row = 0; row < gridSize; row++) {
        const rowSquares = [];
        for (let col = 0; col < gridSize; col++) {
            const square = document.createElement('div');
            square.classList.add('gridSquare');
            square.style.backgroundColor = 'rgb(245,245,245)'; // Set the initial color to white (land)
            square.dataset.row = row;
            square.dataset.col = col;
            square.dataset.team = ''; // No team assigned initially
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
        placeRandomCapitals(); // Place the capitals randomly within their zones
    });

    function placeRandomCapitals() {
        const zoneSize = Math.floor(gridSize / 2); // Divide grid into four quarters

        const zones = {
            red: { rowRange: [0, zoneSize - 1], colRange: [0, zoneSize - 1] }, // Top-left quarter
            blue: { rowRange: [0, zoneSize - 1], colRange: [zoneSize, gridSize - 1] }, // Top-right quarter
            yellow: { rowRange: [zoneSize, gridSize - 1], colRange: [0, zoneSize - 1] }, // Bottom-left quarter
            green: { rowRange: [zoneSize, gridSize - 1], colRange: [zoneSize, gridSize - 1] }  // Bottom-right quarter
        };

        teamColors.forEach(color => {
            let placed = false;
            const zone = zones[color];
            let attempts = 0; // Track attempts to avoid infinite loop
            while (!placed && attempts < 1000) { // Limit the number of attempts
                const row = getRandomInt(zone.rowRange[1] - zone.rowRange[0] + 1) + zone.rowRange[0];
                const col = getRandomInt(zone.colRange[1] - zone.colRange[0] + 1) + zone.colRange[0];
                const square = squares[row][col];
                if (square && square.dataset.team === '') { // Ensure the square is not assigned to any team
                    makeCapital(square, color, teamColorMap[color].primary);
                    placed = true;
                }
                attempts++;
            }
            if (!placed) {
                console.error(`Failed to place capital for ${color} team after ${attempts} attempts.`);
            }
        });
    }

    function selectTeam(team) {
        selectedTeam = team;
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

        if (selectedTeam) {
            const teamColor = teamColorMap[selectedTeam].primary;

            if (!canClick) {
                // Buffer the click if cooldown is active
                bufferedClick = square;
                return;
            }

            // If the clicked tile belongs to the selected team, do nothing
            if (currentTeam === selectedTeam) {
                return;
            }

            // Handle the scenario where the tile does not belong to the selected team
            if (teamTiles[selectedTeam] === 0 && !capitals[selectedTeam].exists) {
                // New team is trying to place their first tile
                if (square.classList.contains('capital')) {
                    showErrorPopup("You cannot place your capital on another team's capital.");
                    return;
                } else {
                    makeCapital(square, selectedTeam, teamColor);
                    startCooldown(); // Start cooldown when making a capital
                }
            } else if (currentTeam !== selectedTeam) {
                if (canChangeTeam(square, selectedTeam)) {
                    if (square.classList.contains('capital')) {
                        capitals[currentTeam].clicks++;
                        // Set the blink colors
                        square.style.setProperty('--attack-color', teamColor);
                        square.style.setProperty('--original-color', teamColorMap[currentTeam].primary);

                        // Trigger the blink effect
                        square.classList.add('blink');

                        // Remove the blink class after the animation ends
                        setTimeout(() => {
                            square.classList.remove('blink');
                        }, 200); // Duration matches the CSS animation time

                        startCooldown(); // Start cooldown when attacking a capital
                        if (capitals[currentTeam].clicks >= 3) { // Require 3 clicks to conquer
                            conquerCapital(square, selectedTeam, teamColor);
                        }
                    } else {
                        square.style.backgroundColor = teamColor;
                        square.dataset.team = selectedTeam;
                        teamTiles[selectedTeam]++;
                        updateScoreboard();
                        startCooldown(); // Start cooldown when conquering a tile
                        checkGameState();
                    }
                } else {
                    showErrorPopup("You can't click this tile. It's not next to your team's tiles.");
                }
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
        updateScoreboard();
        checkGameState();
    }

    function canChangeTeam(square, team) {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const adjacentOffsets = [
            [-1, 0], [1, 0], [0, -1], [0, 1]
        ];

        return adjacentOffsets.some(offset => {
            const newRow = row + offset[0];
            const newCol = col + offset[1];
            if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
                const adjacentSquareTeam = squares[newRow][newCol].dataset.team;
                return adjacentSquareTeam === team;
            }
            return false;
        });
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
            expandFromSquare(squareToExpandFrom, color);
            updateScoreboard();
            checkGameState();
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
            }
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
            if (bufferedClick) {
                colorSquare(bufferedClick); // Execute the buffered click
                bufferedClick = null; // Clear the buffered click
            }
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
            if (colorCounts[color] === 0 && capitals[color].exists === false && !outTeams.has(color)) {
                outTeams.add(color);
                messageQueue.push(`${capitalize(color)} team is out!`);
            }
        }

        const remainingTeams = teamColors.filter(color => colorCounts[color] > 0 || capitals[color].exists);

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
        expandColor(color);
    }, 400);

    // Initial scoreboard update
    updateScoreboard();

    // Zoom and Pan Functionality
    let scale = 1;
    const zoomStep = 0.1;
    const maxScale = 3;
    const minScale = 0.5;
    let isDragging = false;
    let startX, startY;
    let offsetX = 0, offsetY = 0;

    // Zoom functionality
    gridContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = gridContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const prevScale = scale;

        if (e.deltaY < 0 && scale < maxScale) {
            scale += zoomStep;
        } else if (e.deltaY > 0 && scale > minScale) {
            scale -= zoomStep;
        }

        // Adjust the offset to zoom around the mouse pointer
        offsetX -= (mouseX / prevScale) * (scale - prevScale);
        offsetY -= (mouseY / prevScale) * (scale - prevScale);

        updateTransform();
    });

    // Pan functionality
    gridContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - offsetX;
        startY = e.clientY - offsetY;
        gridContainer.style.cursor = 'grabbing';
    });

    gridContainer.addEventListener('mousemove', (e) => {
        if (isDragging) {
            offsetX = e.clientX - startX;
            offsetY = e.clientY - startY;
            updateTransform();
        }
    });

    gridContainer.addEventListener('mouseup', () => {
        isDragging = false;
        gridContainer.style.cursor = 'grab';
    });

    gridContainer.addEventListener('mouseleave', () => {
        isDragging = false;  // Stop panning when the mouse leaves the grid area
    });

    function updateTransform() {
        gridContainer.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    }

    // New functionality for creating teams
    createTeamButton.addEventListener('click', () => {
        teamCreationModal.style.display = 'block';
        createTeamButton.style.display = 'none'; // Hide the Create Team button
    });

    closeModal.addEventListener('click', () => {
        teamCreationModal.style.display = 'none';
        createTeamButton.style.display = 'block'; // Show the Create Team button again
    });

    window.addEventListener('click', (event) => {
        if (event.target == teamCreationModal) {
            teamCreationModal.style.display = 'none';
            createTeamButton.style.display = 'block'; // Show the Create Team button again
        }
    });

    teamCreationForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const teamName = document.getElementById('teamName').value.toLowerCase();
        const teamColor = document.getElementById('teamColor').value;
        const secondaryColor = document.getElementById('secondaryColor').value;
        createTeam(teamName, teamColor, secondaryColor);
        teamCreationModal.style.display = 'none';
        createTeamButton.style.display = 'block'; // Show the Create Team button again
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
    }

    function getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }
});
