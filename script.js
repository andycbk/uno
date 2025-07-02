document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素
    const playerHandElement = document.getElementById('player-hand');
    const discardPileElement = document.getElementById('discard-pile');
    const drawPileElement = document.getElementById('draw-pile');
    const opponentsElements = [
        document.getElementById('opponent-1'),
        document.getElementById('opponent-2'),
        document.getElementById('opponent-3')
    ];
    const gameMessageElement = document.getElementById('game-message');
    const colorPickerElement = document.getElementById('color-picker');
    const unoButton = document.getElementById('uno-button');
    const gameOverlay = document.getElementById('game-overlay');
    const startGameButton = document.getElementById('start-game-button');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');

    // 遊戲狀態變數
    let deck = [];
    let players = [];
    let discardPile = [];
    let currentPlayerIndex = 0;
    let gameDirection = 1; // 1: 順時針, -1: 逆時針
    let isGameOver = true;
    let wildCardAwaitingColor = false;
    let playerDeclaredUNO = {};

    const COLORS = ['red', 'yellow', 'green', 'blue'];
    const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', '+2'];
    const WILD_VALUES = ['wild', 'wild+4'];

    // --- 遊戲初始化 ---
    function createDeck() {
        const newDeck = [];
        COLORS.forEach(color => {
            VALUES.forEach(value => {
                newDeck.push({ color, value });
                if (value !== '0') { // 0號牌每色只有一張，其餘兩張
                    newDeck.push({ color, value });
                }
            });
        });
        WILD_VALUES.forEach(value => {
            for (let i = 0; i < 4; i++) {
                newDeck.push({ color: 'black', value });
            }
        });
        return newDeck;
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function dealCards() {
        players = Array(4).fill(null).map((_, index) => ({
            id: index,
            hand: [],
            isAI: index !== 0
        }));
        playerDeclaredUNO = {};
        for (let i = 0; i < 7; i++) {
            players.forEach(player => {
                player.hand.push(deck.pop());
            });
        }
    }
    
    function initGame() {
        isGameOver = false;
        deck = createDeck();
        shuffle(deck);
        dealCards();

        // 翻開第一張牌
        let firstCard = deck.pop();
        while (WILD_VALUES.includes(firstCard.value)) {
            deck.push(firstCard);
            shuffle(deck);
            firstCard = deck.pop();
        }
        discardPile.push(firstCard);

        currentPlayerIndex = 0;
        gameDirection = 1;
        
        gameOverlay.classList.add('hidden');
        renderAll();
        setTimeout(() => processTurn(), 500);
    }
    
    // --- 渲染函式 ---
    function createCardElement(card) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.color = card.color;
        cardElement.dataset.value = card.value;
        
        const mainValue = document.createElement('span');
        mainValue.textContent = card.value.includes('+') ? card.value : card.value.replace('skip', '🚫').replace('reverse', '🔄').replace('wild', '🎨');
        
        const topLeftValue = document.createElement('span');
        topLeftValue.className = 'value top-left';
        topLeftValue.textContent = mainValue.textContent;
        
        const bottomRightValue = document.createElement('span');
        bottomRightValue.className = 'value bottom-right';
        bottomRightValue.textContent = mainValue.textContent;

        cardElement.appendChild(mainValue);
        cardElement.appendChild(topLeftValue);
        cardElement.appendChild(bottomRightValue);

        return cardElement;
    }
    
    function renderPlayerHand() {
        playerHandElement.innerHTML = '';
        players[0].hand.forEach(card => {
            const cardElement = createCardElement(card);
            cardElement.addEventListener('click', () => onCardClick(card));
            playerHandElement.appendChild(cardElement);
        });
        updatePlayableCards();
    }
    
    function renderOpponents() {
        opponentsElements.forEach((el, index) => {
            const player = players[index + 1];
            const cardCountEl = el.querySelector('.card-count');
            cardCountEl.textContent = player.hand.length;
            cardCountEl.dataset.count = player.hand.length;

            if (playerDeclaredUNO[player.id]) {
                el.classList.add('has-uno');
            } else {
                el.classList.remove('has-uno');
            }
        });
    }

    function renderDiscardPile() {
        discardPileElement.innerHTML = '';
        if (discardPile.length > 0) {
            const topCard = discardPile[discardPile.length - 1];
            const cardElement = createCardElement(topCard);
            // 如果是wild牌，顯示選擇的顏色
            if (topCard.chosenColor) {
                 cardElement.style.boxShadow = `0 0 15px 5px var(--${topCard.chosenColor})`;
            }
            discardPileElement.appendChild(cardElement);
        }
    }

    function renderAll() {
        renderPlayerHand();
        renderOpponents();
        renderDiscardPile();
        updateActivePlayerHighlight();
    }

    function updatePlayableCards() {
        const topCard = discardPile[discardPile.length - 1];
        const isPlayerTurn = currentPlayerIndex === 0 && !wildCardAwaitingColor;
        
        players[0].hand.forEach((card, index) => {
            const cardElement = playerHandElement.children[index];
            if (isPlayerTurn && isCardPlayable(card, topCard)) {
                cardElement.classList.add('playable');
            } else {
                cardElement.classList.remove('playable');
            }
        });
    }

    function updateActivePlayerHighlight() {
        opponentsElements.forEach((el, index) => {
            if (index + 1 === currentPlayerIndex) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
        // 玩家自己
        if(currentPlayerIndex === 0) {
            document.getElementById('player-hand-wrapper').style.boxShadow = '0 0 20px rgba(255, 255, 0, 0.5)';
        } else {
            document.getElementById('player-hand-wrapper').style.boxShadow = 'none';
        }
    }
    
    // --- 遊戲邏輯 ---
    function isCardPlayable(card, topCard) {
        const effectiveColor = topCard.chosenColor || topCard.color;
        return card.color === 'black' || card.color === effectiveColor || card.value === topCard.value;
    }

    function onCardClick(card) {
        if (isGameOver || currentPlayerIndex !== 0 || wildCardAwaitingColor) return;

        const topCard = discardPile[discardPile.length - 1];
        if (isCardPlayable(card, topCard)) {
            playCard(0, card);
        }
    }
    
    function playCard(playerIndex, card) {
        const player = players[playerIndex];
        const cardIndex = player.hand.findIndex(c => c.color === card.color && c.value === card.value);
        
        player.hand.splice(cardIndex, 1);
        
        // 如果出了倒數第二張牌，但沒喊UNO
        if(player.hand.length === 1 && !playerDeclaredUNO[player.id]) {
            setTimeout(() => {
                if(!playerDeclaredUNO[player.id]) {
                    showGameMessage(`玩家 ${player.id+1} 忘記喊UNO，罰抽2張!`);
                    drawCards(player.id, 2);
                    renderAll();
                }
            }, 1500); // 給玩家反應時間
        }
        // 出完牌後，取消UNO狀態
        if (player.hand.length > 1 && playerDeclaredUNO[player.id]) {
             delete playerDeclaredUNO[player.id];
        }

        card.chosenColor = null; // 清除上一張牌可能有的顏色指定
        discardPile.push(card);
        renderAll();
        
        // 檢查勝利
        if (player.hand.length === 0) {
            endGame(player.id);
            return;
        }

        // 處理特殊牌
        if (card.color === 'black') {
            wildCardAwaitingColor = true;
            if (player.isAI) {
                const chosenColor = getAIBestColor(player);
                applyWildCard(card, chosenColor);
            } else {
                colorPickerElement.classList.remove('hidden');
            }
        } else {
            applyCardEffect(card);
            nextTurn();
        }
    }
    
    function applyWildCard(card, chosenColor) {
        wildCardAwaitingColor = false;
        discardPile[discardPile.length - 1].chosenColor = chosenColor;
        colorPickerElement.classList.add('hidden');
        
        showGameMessage(`玩家 ${currentPlayerIndex + 1} 選擇了 ${chosenColor}`, 2000);
        
        if (card.value === 'wild+4') {
            const nextPlayerIndex = getNextPlayerIndex();
            drawCards(nextPlayerIndex, 4);
            currentPlayerIndex = nextPlayerIndex; // 跳過被罰的玩家
        }
        renderAll();
        nextTurn();
    }
    
    function applyCardEffect(card) {
        let nextPlayerIndex;
        switch (card.value) {
            case 'skip':
                currentPlayerIndex = getNextPlayerIndex(); // 跳過一個人
                break;
            case 'reverse':
                gameDirection *= -1;
                // 兩人遊戲中，reverse等於skip
                if (players.filter(p => p.hand.length > 0).length === 2) {
                    currentPlayerIndex = getNextPlayerIndex();
                }
                break;
            case '+2':
                nextPlayerIndex = getNextPlayerIndex();
                drawCards(nextPlayerIndex, 2);
                currentPlayerIndex = nextPlayerIndex; // 跳過被罰的玩家
                break;
        }
    }

    function drawCards(playerIndex, num) {
        const player = players[playerIndex];
        for (let i = 0; i < num; i++) {
            if (deck.length === 0) {
                reshuffleDiscardPile();
            }
            if (deck.length > 0) {
                player.hand.push(deck.pop());
            }
        }
        // 抽牌後取消UNO狀態
        if (playerDeclaredUNO[playerIndex]) {
            delete playerDeclaredUNO[playerIndex];
        }
    }
    
    function handleDrawCardClick() {
        if (isGameOver || currentPlayerIndex !== 0 || wildCardAwaitingColor) return;
        
        showGameMessage('你抽了一張牌', 1500);
        drawCards(0, 1);
        
        const drawnCard = players[0].hand[players[0].hand.length-1];
        const topCard = discardPile[discardPile.length-1];
        
        renderAll(); // 先渲染，讓玩家看到抽到的牌

        // 抽到的牌如果可以出，就自動出牌 (此為簡化規則，也可以讓玩家選擇)
        if(isCardPlayable(drawnCard, topCard)){
            setTimeout(() => {
                showGameMessage('抽到的牌可以出！', 1500);
                playCard(0, drawnCard);
            }, 1000);
        } else {
            setTimeout(() => nextTurn(), 1000);
        }
    }
    
    function reshuffleDiscardPile() {
        const topCard = discardPile.pop();
        deck = [...discardPile];
        discardPile = [topCard];
        shuffle(deck);
        showGameMessage('牌堆已重洗！', 2000);
    }
    
    function nextTurn() {
        currentPlayerIndex = getNextPlayerIndex();
        updateActivePlayerHighlight();
        
        // 檢查UNO按鈕
        if(players[0].hand.length === 2) {
            unoButton.classList.add('active');
        } else {
            unoButton.classList.remove('active');
        }
        
        setTimeout(() => processTurn(), 500);
    }
    
    function getNextPlayerIndex() {
        let nextIndex = (currentPlayerIndex + gameDirection);
        const numPlayers = players.length;
        nextIndex = (nextIndex + numPlayers) % numPlayers;
        // 如果下一個玩家已經沒牌了，就再找下一個
        while(players[nextIndex].hand.length === 0) {
            nextIndex = (nextIndex + gameDirection + numPlayers) % numPlayers;
        }
        return nextIndex;
    }

    function processTurn() {
        if (isGameOver) return;
        updateActivePlayerHighlight();
        showGameMessage(`輪到玩家 ${currentPlayerIndex + 1}`, 2000);

        if (players[currentPlayerIndex].isAI) {
            setTimeout(() => aiTurn(), 1000 + Math.random() * 1000);
        } else {
            // 玩家回合
            updatePlayableCards();
        }
    }
    
    // --- AI 邏輯 ---
    function aiTurn() {
        if (isGameOver || wildCardAwaitingColor) return;
        
        const player = players[currentPlayerIndex];
        const topCard = discardPile[discardPile.length - 1];
        const playableCards = player.hand.filter(card => isCardPlayable(card, topCard));
        
        if (playableCards.length > 0) {
            // AI策略：優先出特殊牌，然後是數字牌
            const wildCards = playableCards.filter(c => c.color === 'black');
            const actionCards = playableCards.filter(c => ['skip', 'reverse', '+2'].includes(c.value));
            const numberCards = playableCards.filter(c => !isNaN(parseInt(c.value)));
            
            let cardToPlay;
            if (actionCards.length > 0) cardToPlay = actionCards[0];
            else if (numberCards.length > 0) cardToPlay = numberCards[0];
            else cardToPlay = wildCards[0];

            // 如果AI剩2張牌，模擬喊UNO
            if(player.hand.length === 2){
                playerDeclaredUNO[player.id] = true;
                showGameMessage(`玩家 ${player.id+1} 喊了 UNO!`, 2000);
            }

            playCard(currentPlayerIndex, cardToPlay);

        } else {
            showGameMessage(`玩家 ${currentPlayerIndex + 1} 抽牌`, 1500);
            drawCards(currentPlayerIndex, 1);
            renderAll();
            // 抽完牌後檢查是否能出
            const drawnCard = player.hand[player.hand.length - 1];
            if(isCardPlayable(drawnCard, topCard)) {
                 setTimeout(() => {
                     showGameMessage(`玩家 ${currentPlayerIndex + 1} 打出剛抽的牌`, 1500);
                     playCard(currentPlayerIndex, drawnCard);
                 }, 1000);
            } else {
                 setTimeout(() => nextTurn(), 1000);
            }
        }
    }
    
    function getAIBestColor(player) {
        const colorCounts = { red: 0, yellow: 0, green: 0, blue: 0 };
        player.hand.forEach(card => {
            if (COLORS.includes(card.color)) {
                colorCounts[card.color]++;
            }
        });
        return Object.keys(colorCounts).reduce((a, b) => colorCounts[a] > colorCounts[b] ? a : b);
    }

    function showGameMessage(message, duration = 2000) {
        gameMessageElement.textContent = message;
        gameMessageElement.style.opacity = 1;
        setTimeout(() => {
            gameMessageElement.style.opacity = 0;
        }, duration);
    }

    function endGame(winnerId) {
        isGameOver = true;
        gameOverlay.classList.remove('hidden');
        if (winnerId === 0) {
            modalTitle.textContent = '🎉 你贏了! 🎉';
            modalText.textContent = '恭喜！再來一局？';
        } else {
            modalTitle.textContent = '遊戲結束';
            modalText.textContent = `玩家 ${winnerId + 1} 獲勝！`;
        }
        startGameButton.textContent = '重新開始';
    }

    // --- 事件監聽 ---
    startGameButton.addEventListener('click', initGame);
    drawPileElement.addEventListener('click', handleDrawCardClick);
    
    colorPickerElement.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-option')) {
            const color = e.target.dataset.color;
            const wildCard = discardPile[discardPile.length-1];
            applyWildCard(wildCard, color);
        }
    });
    
    unoButton.addEventListener('click', () => {
        if(players[0].hand.length === 2 && !playerDeclaredUNO[0]){
            playerDeclaredUNO[0] = true;
            unoButton.classList.remove('active');
            showGameMessage('你喊了UNO!', 1500);
        }
    });

});