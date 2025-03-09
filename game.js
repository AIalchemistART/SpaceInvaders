let texturesCreated = false;

// Player class
class Player extends Phaser.GameObjects.Sprite {
    constructor(scene, bulletGroup) {
        super(scene, scene.cameras.main.width / 2, scene.cameras.main.height - 50, 'player_frame1');
        this.scene = scene;
        this.bulletGroup = bulletGroup;
        this.speed = 5;
        this.shootDelay = 250;
        this.lastShot = 0;
        this.play('player_anim');
        this.setOrigin(0.5, 1);
        this.scene.physics.add.existing(this); // Enable physics
        this.setDepth(5);
    }

    update() {
        if (this.scene.cursors.left.isDown) {
            console.log('Left key pressed'); // Debug log
            this.x -= this.speed;
        }
        if (this.scene.cursors.right.isDown) {
            console.log('Right key pressed'); // Debug log
            this.x += this.speed;
        }
        if (Phaser.Input.Keyboard.JustDown(this.scene.spaceKey)) {
            console.log('Space key pressed'); // Debug log
            this.shoot();
        }
        // Clamp position to keep player fully within canvas
        this.x = Phaser.Math.Clamp(this.x, this.width / 2, this.scene.cameras.main.width - this.width / 2);
    }

    shoot() {
        const now = this.scene.time.now;
        if (now - this.lastShot > this.shootDelay) {
            this.lastShot = now;
            const bullet = new Bullet(this.scene, this.x, this.y - 25, -1);
            this.bulletGroup.add(bullet);
        }
    }
}

// Bullet class
class Bullet extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y, direction) {
        super(scene, x, y, 5, 10, 0xffffff);
        this.scene.add.existing(this); // For rendering
        this.scene.physics.add.existing(this); // For physics
        this.speed = 10 * direction;
    }

    update() {
        this.y += this.speed;
        if (this.y < 0 || this.y > 600) this.destroy();
    }
}

// Alien class
class Alien extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, colorKey) {
        super(scene, x, y, 'alien_frame1');
        this.scene = scene;
        this.setScale(0.7); // Reduced from 0.75 to 0.6
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);
        this.setDepth(10);
        this.setVisible(true);
        this.setAlpha(1); // Fully opaque

        // Get the base color for the level
        const baseColor = scene.levelColors[(scene.level - 1) % scene.levelColors.length];

        // Apply a solid tint based on the level color
        this.setTint(Phaser.Display.Color.GetColor(baseColor[0], baseColor[1], baseColor[2]));
        
        // Use normal blend mode
        this.setBlendMode(Phaser.BlendModes.NORMAL);

        // Play the alien animation
        this.play('alien_anim_original');
        console.log(`Alien created at x: ${this.x}, y: ${this.y}, tint: ${baseColor}`);
    }
}

// AlienGroup class
class AlienGroup {
    constructor(scene, bulletGroup, level, barriers) {
        this.scene = scene;
        this.aliens = scene.physics.add.group(); // Physics group for aliens
        this.bulletGroup = bulletGroup;
        this.barriers = barriers;
        this.direction = 1;
        this.baseSpeed = 1;
        this.baseShootInterval = 1000;
        this.downSpeed = 8;
        this.level = level;
        this.updateDifficulty();
        this.tintColor = scene.levelColors[(level - 1) % scene.levelColors.length];
        this.lastShot = 0;
        this.createAliens();
    }

    updateDifficulty() {
        this.speed = Math.min(3, this.baseSpeed + (this.level - 1) * 0.2);
        this.shootInterval = Math.max(700, this.baseShootInterval - (this.level - 1) * 25);
    }

    createAliens() {
        const colorKey = `color${(this.level - 1) % this.scene.levelColors.length}`;
        const rows = Math.min(5 + Math.floor((this.level - 1) / 4), 7);
        const cols = Math.min(10 + Math.floor((this.level - 1) / 6), 12);
        
        // Define the scale (matches Alien class)
        const scale = 0.6; // Reduced from 0.75 to 0.6
        
        // Get original sprite dimensions
        const alienTexture = this.scene.textures.get('alien_frame1');
        const originalWidth = alienTexture.source[0].width;
        const originalHeight = alienTexture.source[0].height;
        
        // Calculate scaled dimensions
        const scaledWidth = originalWidth * scale;
        const scaledHeight = originalHeight * scale;
        
        // Define spacing with a smaller gap
        const gapX = 19; // Reduced from 5 to 3
        const gapY = 7; // Reduced from 5 to 3
        const spacingX = scaledWidth + gapX;
        const spacingY = scaledHeight + gapY;
        
        // Calculate total formation width and height
        const totalWidth = (cols - 1) * spacingX;
        const totalHeight = (rows - 1) * spacingY;
        
        // Center horizontally, set a top margin
        const startX = (this.scene.cameras.main.width - totalWidth) / 2;
        const startY = 50; // Top margin, adjustable
        
        // Create the aliens
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = startX + col * spacingX;
                const y = startY + row * spacingY;
                const alien = new Alien(this.scene, x, y, colorKey);
                this.aliens.add(alien);
                console.log(`Added alien to group at x: ${alien.x}, y: ${alien.y}, texture: ${alien.texture.key}`);
            }
        }
        console.log(`Total aliens in group: ${this.aliens.getLength()}`);
    }

    update() {
        let edgeHit = false;
        const scale = 0.6; // Matches scale used above
        const scaledWidth = this.scene.textures.get('alien_frame1').source[0].width * scale;
        const halfWidth = scaledWidth / 2;
        
        this.aliens.getChildren().forEach(alien => {
            alien.x += this.speed * this.direction;
            if (alien.x + halfWidth >= this.scene.cameras.main.width || alien.x - halfWidth <= 0) {
                edgeHit = true;
            }
        });

        if (edgeHit) {
            this.direction *= -1;
            this.aliens.getChildren().forEach(alien => alien.y += this.downSpeed);
        }

        const now = this.scene.time.now;
        if (now - this.lastShot > this.shootInterval && this.aliens.getLength() > 0) {
            this.lastShot = now;
            const shooter = Phaser.Utils.Array.GetRandom(this.aliens.getChildren());
            const bullet = new Bullet(this.scene, shooter.x, shooter.y + 20, 1);
            this.bulletGroup.add(bullet);
        }
    }
}

// BarrierBlock class
class BarrierBlock extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'barrier_health3');
        this.scene.add.existing(this);
        this.setScale(0.7); // Reduce size by 30%
        this.health = 3;
        this.setDepth(5);
    }

    hit() {
        this.health -= 1;
        if (this.health <= 0) this.destroy();
        else this.setTexture(`barrier_health${this.health}`);
    }
}

// Explosion class
class Explosion extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'explosion_frame1');
        this.scene.add.existing(this);
        this.play('explosion_anim');
        this.on('animationcomplete', () => this.destroy());
    }
}

// MainScene class
class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    preload() {
        this.load.image('background', 'assets/space_background.png');
        for (let i = 1; i <= 7; i++) {
            this.load.image(`player_frame${i}`, `assets/spaceship${i}.png`);
            this.load.image(`alien_frame${i}`, `assets/alien${i}.png`);
            this.load.image(`explosion_frame${i}`, `assets/explosion${i}.png`);
        }
        this.load.image('barrier_health3', 'assets/barrier_health3.png');
        this.load.image('barrier_health2', 'assets/barrier_health2.png');
        this.load.image('barrier_health1', 'assets/barrier_health1.png');
    }

    create() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.continuesLeft = 3;

        const background = this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(0);
        background.setDisplaySize(this.cameras.main.width, this.cameras.main.height);
        this.cameras.main.setBackgroundColor('#000000');
        this.cameras.main.setBounds(0, 0, 800, 600);

        // Updated levelColors with a stronger blue for level 2
        this.levelColors = [
            [255, 255, 255], // Bright green for level 1
            [0, 255, 0],   // Stronger blue for level 2
            [255, 0, 0], // Bright red for level 3
            [0, 102, 255], // Bright yellow for level 4
            [245, 176, 65], // Bright cyan for level 5
            [153, 0, 255]  // Bright magenta for level 6
        ];

        // Animations
        this.anims.create({
            key: 'player_anim',
            frames: Array.from({ length: 7 }, (_, i) => ({ key: `player_frame${i + 1}` })),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'explosion_anim',
            frames: Array.from({ length: 7 }, (_, i) => ({ key: `explosion_frame${i + 1}` })),
            frameRate: 10,
            repeat: 0
        });
        this.anims.create({
            key: 'alien_anim_original',
            frames: Array.from({ length: 7 }, (_, i) => ({ key: `alien_frame${i + 1}` })),
            frameRate: 10,
            repeat: -1
        });

        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Initialize groups
        this.playerBullets = this.physics.add.group();
        this.alienBullets = this.physics.add.group();
        this.explosions = this.add.group();
        this.barriers = this.createBarriers();

        this.player = new Player(this, this.playerBullets);
        this.add.existing(this.player);
        this.alienGroup = new AlienGroup(this, this.alienBullets, this.level, this.barriers);

        // UI text
        this.scoreText = this.add.text(10, 10, `Score: ${this.score}`, { fontSize: '16px', color: '#fff' });
        this.livesText = this.add.text(650, 10, `Lives: ${this.lives}`, { fontSize: '16px', color: '#fff' });
        this.levelText = this.add.text(350, 10, `Level: ${this.level}`, { fontSize: '16px', color: '#fff' });

        // Set up colliders
        this.setupColliders();
    }

    setupColliders() {
        this.physics.add.collider(this.playerBullets, this.alienGroup.aliens, (bullet, alien) => {
            bullet.destroy();
            alien.destroy();
            this.score += 10;
            this.explosions.add(new Explosion(this, alien.x, alien.y));
            this.scoreText.setText(`Score: ${this.score}`);
        });

        this.physics.add.collider(this.player, this.alienBullets, (player, bullet) => {
            bullet.destroy();
            this.lives -= 1;
            this.explosions.add(new Explosion(this, player.x, player.y));
            this.livesText.setText(`Lives: ${this.lives}`);
        });

        this.physics.add.collider(this.playerBullets, this.barriers, (bullet, barrier) => {
            bullet.destroy();
            barrier.hit();
        });

        this.physics.add.collider(this.alienBullets, this.barriers, (bullet, barrier) => {
            bullet.destroy();
            barrier.hit();
        });
    }

    createBarriers() {
        const barriers = this.physics.add.group();
        const barrierY = this.cameras.main.height * 0.7;
        const barrierWidth = 5 * 14;
        const totalSpace = this.cameras.main.width * 0.8;
        const gap = (totalSpace - 4 * barrierWidth) / 3;
        const startX = this.cameras.main.width * 0.1;

        for (let i = 0; i < 4; i++) {
            const barrierX = startX + i * (barrierWidth + gap);
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 5; col++) {
                    const x = barrierX + col * 14;
                    const y = barrierY + row * 14;
                    const barrier = new BarrierBlock(this, x, y);
                    barriers.add(barrier);
                }
            }
        }
        return barriers;
    }

    update() {
        this.player.update();
        this.alienGroup.update();
        this.playerBullets.getChildren().forEach(b => b.update());
        this.alienBullets.getChildren().forEach(b => b.update());

        if (this.alienGroup.aliens.getLength() === 0) {
            this.level += 1;
            this.levelText.setText(`Level: ${this.level}`);
            this.alienGroup = new AlienGroup(this, this.alienBullets, this.level, this.barriers);
            this.setupColliders(); // Reapply colliders for new aliens
        }

        let gameOver = this.lives <= 0;
        this.alienGroup.aliens.getChildren().forEach(alien => {
            if (alien.y + 20 >= 500) gameOver = true;
        });

        if (gameOver) {
            if (this.continuesLeft > 0) {
                this.scene.launch('ContinueScene', {
                    continuesLeft: this.continuesLeft,
                    score: this.score,
                    level: this.level
                });
                this.scene.pause();
            } else {
                this.scene.start('GameOverScene', { score: this.score });
            }
        }

        const lowestAlienY = Math.max(...this.alienGroup.aliens.getChildren().map(a => a.y + 20));
        const topBarrierY = Math.min(...this.barriers.getChildren().map(b => b.y));
        if (lowestAlienY >= topBarrierY) {
            this.barriers.getChildren().filter(b => b.y === topBarrierY).forEach(b => b.destroy());
        }
    }
}

// ContinueScene class
class ContinueScene extends Phaser.Scene {
    constructor() {
        super('ContinueScene');
    }

    create(data) {
        this.continuesLeft = data.continuesLeft;
        this.score = data.score;
        this.level = data.level;

        this.add.image(0, 0, 'background').setOrigin(0, 0);
        this.add.text(300, 250, `Continues left: ${this.continuesLeft}`, { fontSize: '16px', color: '#fff' });
        this.add.text(200, 300, 'Press C to continue, R to restart, Q to quit', { fontSize: '16px', color: '#fff' });

        this.input.keyboard.on('keydown-C', () => {
            this.scene.stop();
            const mainScene = this.scene.get('MainScene');
            mainScene.continuesLeft -= 1;
            mainScene.lives = 3;
            mainScene.player.setPosition(400, 590);
            mainScene.playerBullets.clear(true, true);
            mainScene.alienBullets.clear(true, true);
            mainScene.explosions.clear(true, true);
            mainScene.barriers = mainScene.createBarriers();
            if (mainScene.alienGroup) {
                mainScene.alienGroup.aliens.clear(true, true);
            }
            mainScene.alienGroup = new AlienGroup(mainScene, mainScene.alienBullets, this.level, mainScene.barriers);
            mainScene.setupColliders();
            mainScene.livesText.setText(`Lives: 3`);
            mainScene.scene.resume();
        });
    }
}

// GameOverScene class
class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    create(data) {
        this.add.image(0, 0, 'background').setOrigin(0, 0);
        this.add.text(350, 250, 'Game Over!', { fontSize: '32px', color: '#ff0000' });
        this.add.text(350, 300, `Final Score: ${data.score}`, { fontSize: '16px', color: '#fff' });
        this.add.text(250, 350, 'Press R to Restart or Q to Quit', { fontSize: '16px', color: '#fff' });

        this.input.keyboard.on('keydown-R', () => this.scene.start('MainScene'));
        this.input.keyboard.on('keydown-Q', () => this.game.destroy(true));
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: Math.min(800, window.innerWidth * 0.8),
    height: Math.min(600, window.innerHeight * 0.8),
    scene: [MainScene, ContinueScene, GameOverScene],
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade', // Explicitly enable arcade physics
        arcade: {
            debug: false // Set to true for debugging physics issues
        }
    }
};

const game = new Phaser.Game(config);