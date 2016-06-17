
var hero,
	heroes = [],
	monsterId = 1,
	playerId;

var deleteAfter = 15000; // Delay to delete from canvas

// Horizon Connection
var horizon = Horizon({ authType: 'anonymous' });
horizon.connect();

// Get current user information

horizon.currentUser()
	.fetch()
	.subscribe( function(user){
		playerId = user.id;
		console.log(user.id);
	});

var players = horizon("players");
var monsters = horizon("monster");

var updatePlayerDBPosition = function(x, y){
	if(playerId){
		players.upsert({
			id: playerId,
			x: x,
			y: y,
			lastUpdated: Date.now()
		});
	}
};

var updateMonsterDBPosition = function(x, y){
	monsters.upsert({
		id: monsterId,
		x: x,
		y: y
	});
};

// Update positions on plot
var updatePlayerPlotPosition = function(player){
	var playerHeroArray = heroes.filter(function(p){
		return p.id == player.id;
	});
	if(!playerHeroArray.length){
		heroes.push(player)
	}else{
		playerHeroArray[0].x = player.x;
		playerHeroArray[0].y = player.y;
		playerHeroArray[0].lastUpdated = player.lastUpdated;
	}
};

var updatePlayersPlotPositions = function(players){
	players.map(updatePlayerPlotPosition);
};

var updateMonsterPlotPosition = function(monsterDb){
	if(monster){
		monster.x = monsterDb.x;
		monster.y = monsterDb.y;
	}
};

// Subscribe to changes and update
players
.watch()
.subscribe(updatePlayersPlotPositions);

monsters.watch().subscribe(function(change){
	change.map(updateMonsterPlotPosition);
	console.log(change);
});

// Create the canvas
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
canvas.width = 512;
canvas.height = 480;
document.body.appendChild(canvas);

// Background image
var bgReady = false;
var bgImage = new Image();
bgImage.onload = function () {
	bgReady = true;
};
bgImage.src = "images/background.png";

// Hero image
var heroReady = false;
var heroImage = new Image();
heroImage.onload = function () {
	heroReady = true;
};
heroImage.src = "images/hero2.png";

// Other Player Image
var otherPlayerReady = false;
var otherPlayerImage = new Image();
otherPlayerImage.onload = function(){
	otherPlayerReady = true;
};
otherPlayerImage.src = "images/hero.png";

// Monster image
var monsterReady = false;
var monsterImage = new Image();
monsterImage.onload = function () {
	monsterReady = true;
};
monsterImage.src = "images/monster.png";

// Game objects
/*
var hero = {
	speed: 128 // movement in pixels per second
};
*/

speed = 128;

var monster = {};
var monstersCaught = 0;

// Handle keyboard controls
var keysDown = {};

addEventListener("keydown", function (e) {
	keysDown[e.keyCode] = true;
}, false);

addEventListener("keyup", function (e) {
	delete keysDown[e.keyCode];
}, false);

// Reset the game when the player catches a monster
var reset = function () {
	// Throw the monster somewhere on the screen randomly
	monster.x = 32 + (Math.random() * (canvas.width - 64));
	monster.y = 32 + (Math.random() * (canvas.height - 64));
	updateMonsterDBPosition(monster.x, monster.y);
};

// Update game objects
var update = function (modifier) {
	var x, y;
	x = hero.x;
	y = hero.y;

	if (38 in keysDown) { // Player holding up
			hero.y -= speed * modifier;
	}
	if (40 in keysDown) { // Player holding down
		 hero.y += speed * modifier;
	}
	if (37 in keysDown) { // Player holding left
		hero.x -= speed * modifier;
	}
	if (39 in keysDown) { // Player holding right
		hero.x += speed * modifier;
	}

	// Are they touching?
	if (
		hero.x <= (monster.x + 32)
		&& monster.x <= (hero.x + 32)
		&& hero.y <= (monster.y + 32)
		&& monster.y <= (hero.y + 32)
	) {
		++monstersCaught;
		reset();
	}

	//Only update db is player position changed
	if((x - hero.x) || (y-hero.y)){
		updatePlayerDBPosition(hero.x, hero.y);
	}
};

// Draw everything
var render = function () {
	if (bgReady) {
		ctx.drawImage(bgImage, 0, 0);
	}

	if (monsterReady) {
		ctx.drawImage(monsterImage, monster.x, monster.y);
	}

	if(otherPlayerReady){
		heroes.filter(function(h){
			return h.id != playerId
		}).forEach(function(h){
			//console.log(h);
			if(Date.now() - h.lastUpdated < deleteAfter){
			ctx.drawImage(otherPlayerImage, h.x, h.y);
			}
		})
	}

	if (heroReady) {
		ctx.drawImage(heroImage, hero.x, hero.y);
	}

	// Score
	ctx.fillStyle = "rgb(250, 250, 250)";
	ctx.font = "24px Helvetica";
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.fillText("Goblins caught: " + monstersCaught, 32, 32);
};

// The main game loop
var main = function () {
	var now = Date.now();
	var delta = now - then;

	update(delta / 1000);
	render();

	then = now;

	// Request to do this again ASAP
	requestAnimationFrame(main);
};

// Cross-browser support for requestAnimationFrame
var w = window;
requestAnimationFrame = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.msRequestAnimationFrame || w.mozRequestAnimationFrame;

// Let's play this game!
hero = heroes.filter(function(h){
		return h.id == playerId;
	})[0] 
	|| {
		x: canvas.width / 2 ,
		y: canvas.height / 2,
		lastUpdated: Date.now()
	};

var then = Date.now();
reset();
main();
