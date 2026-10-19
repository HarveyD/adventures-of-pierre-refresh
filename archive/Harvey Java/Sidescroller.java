import java.awt.*;
import java.awt.event.*;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStreamReader;
import javax.swing.*;
import java.applet.AudioClip;
import java.net.URL;
import java.net.MalformedURLException;

public class Sidescroller {
	BufferedReader in = new BufferedReader(new InputStreamReader(System.in));

	SoundList soundList;

	String mySound = "egyptian level.wav", pictureName;

	AudioClip playClip;

	URL codeBase;

	Image corgismallleft, corgismallright, checkpointUnused, checkpointUsed,
			corgiBoss, loadingscreen, corgi, cloud1, cloud2, cloud3,
			PlayerCharacter, playerRight, playerLeft, playerJump,
			playerFallRight, playerFallLeft, playeronLeftWall,
			playeronRightWall, playerDeath, bossProjectile, snowB, desertB,
			moonB, parisB, plainsB, cake;

	boolean[] corgeyforward = new boolean[5];

	char leftC = '1', rightC = '3', jumpC = ' ';

	boolean leftChange = false, rightChange = false, jumpChange = false,
			controlsOn = false, helpScreen = false, menuScreen = true,
			gameOver = true, startGame = false, left = false, right = false,
			inair = false, jumpRelease = true, movementallowedX,
			movementallowedY, corgiforward, xAllowR, xAllowL, onleftwall,
			onrightwall, keyError = false, bossShoot = true, bossShoottwo;

	int xPos = -100, yPos = 250, yVel = 1, pVel, level = 0, lives = 5,
			bossLives = 3, walljumpcounter = 0, loadingscreencounter = 0,
			corgiBossY = 500, bossMove = 1, missleXPos = 4550, missleYPos,
			mousex, mousey, checkpointXPic = -10000, checkpointYPic = -100000,
			movingPlatformY = 0, escapeCounter = 0;

	JFrame f;

	ImagePanel pic;

	boolean[] corgialive = new boolean[5];

	int[] corgiX = new int[5];

	int[] corgiY = new int[5];

	int[][] cloudLocations = new int[3][2];

	int checkpointX, checkpointY;

	int[] platformersPerLevel = new int[10];

	int[] movingPlatformX = new int[100];

	boolean[] platformLeft = new boolean[100];

	int[][][] BoxLocations = new int[100][10][10];

	class ImagePanel extends JPanel {
		Image backgroundImage;

		public ImagePanel(Image img) {
			backgroundImage = img;
		}

		public void paintComponent(Graphics g) {

			if (startGame) {

				super.paintComponent(g);

				// draws the background
				g.drawImage(backgroundImage, -xPos / 8 - 250, -yPos / 8 - 125,
						this);

				for (int x = 0; x < 5; x++) {

					if (corgeyforward[x]) {
						g.drawImage(corgismallright, corgiX[x] - xPos,
								corgiY[x] - yPos, this);
					} else {

						if (!corgeyforward[x]) {
							g.drawImage(corgismallleft, corgiX[x] - xPos,
									corgiY[x] - yPos, this);

						}
					}
				}

				g.drawImage(cloud1, cloudLocations[0][0] - xPos / 8,
						cloudLocations[0][1] - yPos / 8, this);
				g.drawImage(cloud2, cloudLocations[1][0] - xPos / 8,
						cloudLocations[1][1] - yPos / 8, this);
				g.drawImage(cloud3, cloudLocations[2][0] - xPos / 8,
						cloudLocations[2][1] - yPos / 8, this);

				g.drawImage(checkpointUnused, checkpointXPic - xPos,
						checkpointYPic - yPos, this);

				for (int x = 0; x < platformersPerLevel[level]; x++) {
					if (BoxLocations[x][4][level] == 4) {
						g.drawImage(checkpointUsed, (BoxLocations[x][0][level]
								- xPos + 100) - 25, (BoxLocations[x][1][level]
								- yPos + 400) - 90, this);
					}
				}

				//Draws all the animations
				if (onleftwall) {
					g.drawImage(playeronLeftWall, 615, 450, this);
				} else {
					if (onrightwall) {
						g.drawImage(playeronRightWall, 615, 450, this);
					} else {
						if (left) {

							if (yVel > 0) {

								g.drawImage(playerFallLeft, 615, 450, this);
							} else {

								g.drawImage(playerLeft, 615, 450, this);
							}
						} else {
							if (right) {
								if (yVel > 0) {
									g
											.drawImage(playerFallRight, 615,
													450, this);
								} else {

									g.drawImage(playerRight, 615, 450, this);
								}
							} else {
								g.drawImage(PlayerCharacter, 615, 450, this);
							}
						}
					}
				}

				//escape check
				if (escapeCounter == 1) {
					g.setColor(Color.RED);
					g.setFont(new Font("Calibri", Font.BOLD, 20));

					String youSure = ("are you sure you want to exit? Press again.");
					g.drawString(youSure, 10, 50);
				}

				//Starts boss fight on level 4
				if (level == 4) {
					g.drawImage(corgiBoss, 4550 - xPos, corgiBossY
									- yPos, this);

					if (bossShoottwo) {
						g.drawImage(bossProjectile, missleXPos - xPos,
								missleYPos - yPos, this);
					}

					g.setColor(Color.RED);
					g.setFont(new Font("Calibri", Font.BOLD, 85));

					String lives = ("" + bossLives);

					g.drawString(lives, 4650 - xPos, (corgiBossY) - yPos);

					if (bossLives == 0) {
						g.drawImage(cake, 4625 - xPos, 690 - yPos, this);
					}
				}

				//sets colour of platforms
				for (int x = 0; x < platformersPerLevel[level]; x++) {
					switch (BoxLocations[x][4][level]) {
					case 0:
						g.setColor(Color.BLACK);
						break;
					case 1:
						g.setColor(Color.BLUE);
						break;
					case 2:
						g.setColor(Color.YELLOW);
						break;
					case 3:
						g.setColor(Color.ORANGE);
						break;
					case 4:
						g.setColor(Color.GREEN);
						break;
					case 5:
						g.setColor(Color.RED);
						break;
					case 6:
						g.setColor(Color.RED);
						break;
					default:
						g.setColor(Color.BLACK);
						;
					}
					g.fillRect((BoxLocations[x][0][level] - xPos + 100),
							(BoxLocations[x][1][level] - yPos + 400),
							BoxLocations[x][2][level],
							BoxLocations[x][3][level]);
				}

				for (int x = 0; x < lives; x++) {
					g.fillRect(950 + 20 * x, 20, 10, 40);
				}
				loadingscreencounter++;
		
			} 
			
			if (loadingscreencounter < 100) {
				g.drawImage(loadingscreen, 0, 0, this);
			}
			
			if (startGame) {}else {

				if (controlsOn) {
					g.drawImage(backgroundImage, 0, 0, this);

					g.setColor(Color.YELLOW);
					g.setFont(new Font("Calibri", Font.BOLD, 30));

					String information = ("Click on a box then press the ");
					String information2 = ("key you wish to assign to the action");
					g.drawString(information, 800, 200);
					g.drawString(information2, 800, 220);

					g.setFont(new Font("Calibri", Font.BOLD, 90));

					String leftString = "" + leftC;
					g.drawString(leftString, 575, 222);

					String rightString = "" + rightC;
					g.drawString(rightString, 575, 405);

					// If the character is space, write space
					if (jumpC == ' ') {
						g.setFont(new Font("Calibri", Font.BOLD, 60));
						g.drawString("Space", 515, 595);
					} else {

						// Draw the character in the box
						String jumpString = "" + jumpC;
						g.drawString(jumpString, 575, 605);
					}

					// If key is already being used bring up an error
					if (keyError) {
						g.setColor(Color.RED);
						g.setFont(new Font("Calibri", Font.BOLD, 35));
						String keyErrorMsg = ("Key is already being used, try again");
						g.drawString(keyErrorMsg, 725, 375);
					}

				} else {

					if (helpScreen || gameOver) {
						g.drawImage(backgroundImage, 0, 0, this);
					}

					if (menuScreen) {
						g.drawImage(backgroundImage, 0, 0, this);
						String names = ("By Harvey and James");
						g.setFont(new Font("Calibri", Font.BOLD, 35));
						g.drawString(names, 5, 650);
					}
				}
			}
		}
	}

	public static void main(String[] args) {
		Sidescroller2 ss = new Sidescroller2();
		ss.launch();
	}

	public class MenuStartListener implements MouseListener {
		public void mouseClicked(MouseEvent e) {
			mousex = e.getX();
			mousey = e.getY();

			if (gameOver) {
				if (mousex > 901 && mousex < 1271 && mousey < 727
						&& mousey > 585) {
					resetGame();
				}
			}

			//If on menu screen
			if (menuScreen) {
				if (mousex > 333 && mousex < 931 && !startGame) {

					if (mousey > 175 && mousey < 327) {
						 playClip = soundList.getClip(mySound);
						 playClip.play();
						lives = 5;
						startGame = true;
						readInfo();
						yPos = 0;
					}

					if (mousey < 522 && mousey > 371) {
						controlsOn=true;
						menuScreen = false;
						pictureName = "ControlScreen.png";
						pic.backgroundImage = Toolkit.getDefaultToolkit()
								.getImage(pictureName);
					}

					if (mousey > 566 && mousey < 718) {
						helpScreen = true;
						menuScreen = false;
						pictureName = "HelpScreen.png";
						pic.backgroundImage = Toolkit.getDefaultToolkit()
								.getImage(pictureName);
					}
				}

				if (mousey < 119 && mousex > 1063) {
					System.exit(0);
				}
			}

			// Control Screen On
			if (controlsOn) {

				// Control changes
				if (mousex > 502 && mousex < 685) {

					if (mousey < 283 && mousey > 168) {
						leftChange = true;
					}

					if (mousey > 356 && mousey < 471) {
						rightChange = true;
					}

					if (mousey > 549 && mousey < 665) {
						jumpChange = true;
					}
				}

				// If controls is clicked, start control menu
				if (mousex > 799 && mousex < 1240 && mousey > 537
						&& mousey < 670) {
					controlsOn = false;
					menuScreen = true;
					pictureName = "MenuScreen.png";
					pic.backgroundImage = Toolkit.getDefaultToolkit().getImage(
							pictureName);
				}
			}

			// If help is clicked, start help
			if (helpScreen) {
				if (mousey > 618 && mousey < 727 && mousex > 961
						&& mousex < 1269) {
					helpScreen = false;
					menuScreen = true;
					pictureName = "MenuScreen.png";
					pic.backgroundImage = Toolkit.getDefaultToolkit().getImage(
							pictureName);

				}
			}
		}

		public void mouseEntered(MouseEvent e) {
		}

		public void mouseExited(MouseEvent e) {
		}

		public void mousePressed(MouseEvent e) {
		}

		public void mouseReleased(MouseEvent e) {
		}
	}

	public void readInfo() {
		try {
			String line;
			String[] words = new String[100];
			BufferedReader in = new BufferedReader(new FileReader(new File(
					"Levels2.txt")));

			//Sets background
			if (startGame) {

				switch (level) {
				case 0:
					pictureName = "testicle.jpg";
					pic.backgroundImage = Toolkit.getDefaultToolkit().getImage(
							pictureName);
					break;
				case 1:
					pictureName = "Mountains background.jpg";
					pic.backgroundImage = Toolkit.getDefaultToolkit().getImage(
							pictureName);
					break;
				case 2:
					pictureName = "desert background.jpg";
					pic.backgroundImage = Toolkit.getDefaultToolkit().getImage(
							pictureName);
					break;
				case 3:
					pictureName = "snow background.jpg";
					pic.backgroundImage = Toolkit.getDefaultToolkit().getImage(
							pictureName);
					break;
				case 4:
					pictureName = "moon level background.jpg";
					pic.backgroundImage = Toolkit.getDefaultToolkit().getImage(
							pictureName);
					break;
				default:
					;

				}
			}

			for (int y = 0; y < 5; y++) {
				platformersPerLevel[y] = (Integer.parseInt(in.readLine()));
				for (int x = 0; x < platformersPerLevel[y]; x++) {
					line = in.readLine();
					words = line.split(",");
					// Xpos
					BoxLocations[x][0][y] = (Integer.parseInt(words[1]) / 2);
					// Ypos
					BoxLocations[x][1][y] = (Integer.parseInt(words[2]) / 2);
					// Xlength
					BoxLocations[x][2][y] = (Integer.parseInt(words[3]) / 2);
					// YLength
					BoxLocations[x][3][y] = (Integer.parseInt(words[4]) / 2);
					// What the platform does
					BoxLocations[x][4][y] = (Integer.parseInt(words[5]));
					if (BoxLocations[x][4][y] == 3
							|| BoxLocations[x][4][y] == 6) {
						BoxLocations[x][5][y] = (Integer.parseInt(words[6]) / 2);
						movingPlatformX[x] = (Integer.parseInt(words[7]) / 2);
					}
				}
			}

			in.close();
		} catch (NumberFormatException nfe) {
		} catch (IOException ioe) {
		}
	}

	public void launch() {
		f.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
		f.addKeyListener(new MoveListener());
		f.addMouseListener(new MenuStartListener());
		f.setSize(1280, 740);
		f.setResizable(false);
		f.getContentPane().add(pic, BorderLayout.CENTER);
		f.setVisible(true);

		resetGame();
		Respawn();

		checkpointY = 230;
		checkpointX = -100;

		cloudLocations[0][0] = -300;
		cloudLocations[0][1] = 60;
		cloudLocations[1][0] = 200;
		cloudLocations[1][1] = 200;
		cloudLocations[2][0] = 700;
		cloudLocations[2][1] = 120;

		checkpointUnused = Toolkit.getDefaultToolkit().getImage(
				"checkpoint selected.gif");
		checkpointUsed = Toolkit.getDefaultToolkit().getImage("checkpoint.png");
		PlayerCharacter = Toolkit.getDefaultToolkit().getImage(
				"Pierre standing still.gif");
		playerRight = Toolkit.getDefaultToolkit().getImage(
				"pierre running right.gif");
		playerLeft = Toolkit.getDefaultToolkit().getImage(
				"pierre running left.gif");
		playerJump = Toolkit.getDefaultToolkit().getImage("pierre falling.gif");
		playerFallRight = Toolkit.getDefaultToolkit().getImage(
				"falling to the right.gif");
		playerFallLeft = Toolkit.getDefaultToolkit().getImage(
				"falling to the left.gif");
		playeronRightWall = Toolkit.getDefaultToolkit().getImage(
				"on right wall.gif");
		playeronLeftWall = Toolkit.getDefaultToolkit().getImage(
				"on left wall.gif");
		playerDeath = Toolkit.getDefaultToolkit().getImage(
				"death animation.gif");
		loadingscreen = Toolkit.getDefaultToolkit().getImage(
				"LOADING ANIMATION.gif");
		cake = Toolkit.getDefaultToolkit().getImage("cake slice.gif");

		corgiBoss = Toolkit.getDefaultToolkit().getImage("flying corgi.gif");
		bossProjectile = Toolkit.getDefaultToolkit().getImage("fire ball.gif");

		corgismallleft = Toolkit.getDefaultToolkit().getImage(
				"CorgismallLEFT.png");
		corgismallright = Toolkit.getDefaultToolkit().getImage(
				"CorgismallRIGHT.png");

		cloud1 = Toolkit.getDefaultToolkit().getImage("cloud 1.png");
		cloud2 = Toolkit.getDefaultToolkit().getImage("cloud 2.png");
		cloud3 = Toolkit.getDefaultToolkit().getImage("cloud 3.png");
		GravityMovement go2 = new GravityMovement();
		go2.start();
		CollisionY go3 = new CollisionY();
		go3.start();
		CollisionX go4 = new CollisionX();
		go4.start();
		Corgi go5 = new Corgi();
		go5.start();
		cloudmovement go6 = new cloudmovement();
		go6.start();
		PlatformMovement go7 = new PlatformMovement();
		go7.start();
		newCollission go8 = new newCollission();
		go8.start();
		BossFight go9 = new BossFight();
		go9.start();
	}

	public Sidescroller() {
		startLoadingSounds();
		readInfo();
		f = new JFrame("The Adventures of Pierre");
		f.setFont(new Font("Modern", Font.BOLD, 20));
		pic = new ImagePanel(Toolkit.getDefaultToolkit().getImage(pictureName));
	}

	public void startLoadingSounds() {

		// Start asynchronous sound loading.
		try {
			codeBase = new URL("file:" + System.getProperty("user.dir") + "/");
		} catch (MalformedURLException e) {
			System.err.println(e.getMessage());
		}

		soundList = new SoundList(codeBase);
		soundList.startLoading(mySound);
	}

	public void resetGame() {
		for (int z = 0; z < 5; z++) {
			corgialive[z] = true;
			corgeyforward[z] = true;
		}
		

			corgiY[0] = 705;
		

		corgiY[1] = 635;
		corgiY[2] = 705;
		corgiY[3] = 900;

		corgiX[0] = 1650;
		corgiX[1] = 600 + 650;
		corgiX[2] = 1200 + 650;
		corgiX[3] = 1000+650;

		// Change spawn position
		yPos = checkpointY;
		xPos = checkpointX;

		lives = 5;
		menuScreen = true;
		startGame = false;

		pictureName = "MenuScreen.png";
		pic.backgroundImage = Toolkit.getDefaultToolkit().getImage(pictureName);
	}

	public class CollisionY extends Thread {
		public void run() {
			do {
				int noPlatform = 0;
				for (int x = 0; x < platformersPerLevel[level]; x++) {
					if (yPos > (BoxLocations[x][1][level] - 100)
							&& yPos < (BoxLocations[x][1][level] - 60)
							&& xPos > ((BoxLocations[x][0][level] - 50) - 500)
							&& xPos < ((BoxLocations[x][0][level] + BoxLocations[x][2][level]) - 515)
							&& yVel >= 0) {

						// Checks if he is on a platform
						if ((BoxLocations[x][4][level] == 0 || BoxLocations[x][4][level] == 3)
								&& yVel != 0) {

							yPos = BoxLocations[x][1][level] - 99;
							movementallowedY = false;
							yVel = 0;
							inair = false;
							onleftwall = false;
							onrightwall = false;

						}

						// Blue Bouncey block
						if (BoxLocations[x][4][level] == 1) {
							yVel = -15;
						}
					} else {
						noPlatform++;
					}
				}

				// Jumping below blocks
				for (int x = 0; x < platformersPerLevel[1]; x++) {
					if (yPos > (BoxLocations[x][1][level]
							+ BoxLocations[x][3][level] - 70)
							&& yPos < (BoxLocations[x][1][level]
									+ BoxLocations[x][3][level] - 50)
							&& xPos > ((BoxLocations[x][0][level] - 50) - 480)
							&& xPos < ((BoxLocations[x][0][level] + BoxLocations[x][2][level]) - 515)
							&& yVel < 1) {

						yVel = 0;
					}
				}
				if (noPlatform == platformersPerLevel[level]) {
					movementallowedY = true;
					inair = true;
				} else {
					movementallowedY = false;
				}

				try {
					this.sleep(5);
				} catch (InterruptedException e) {
				}
			} while (true);
		}
	}

	// B.Rad and his sidekick Har.V
	public class CollisionX extends Thread {
		public void run() {
			do {
				if (pVel <= 0) {
					for (int x = 0; x < platformersPerLevel[level]; x++) {

						if ((yPos >= (BoxLocations[x][1][level] - 99))
								&& (yPos <= (BoxLocations[x][1][level]
										+ BoxLocations[x][3][level] - 50))
								&& (xPos >= ((BoxLocations[x][0][level]
										+ BoxLocations[x][2][level] - 15) - 515))
								&& (xPos <= ((BoxLocations[x][0][level] + BoxLocations[x][2][level]) - 515))) {

							if (BoxLocations[x][4][level] == 0
									|| BoxLocations[x][4][level] == 1) {
								xAllowL = false;
								pVel = 0;
								xPos = BoxLocations[x][0][level]
										+ BoxLocations[x][2][level] - 515;

								if (inair) {
									onleftwall = true;
								}
							}

						} else {
							xAllowL = true;
						}
					}
				}

				if ((onleftwall && !left) || yVel < -8) {
					walljumpcounter++;
					if (walljumpcounter == 20) {
						walljumpcounter = 0;
						onleftwall = false;
					}
				}

				if (pVel >= 0) {
					for (int x = 0; x < platformersPerLevel[level]; x++) {
						if (yPos >= (BoxLocations[x][1][level] - 99)
								&& yPos <= (BoxLocations[x][1][level]
										+ BoxLocations[x][3][level] - 50)
								&& xPos >= ((BoxLocations[x][0][level] - 66) - 490)
								&& xPos <= ((BoxLocations[x][0][level] - 45) - 490)) {

							if (BoxLocations[x][4][level] == 0
									|| BoxLocations[x][4][level] == 1) {
								xPos = BoxLocations[x][0][level] - 550;
								pVel = 0;
								xAllowR = false;

								if (inair) {
									onrightwall = true;
								}
							}
						} else {

							xAllowR = true;
						}
					}
				}
				if ((onrightwall && !right) || yVel <= -8) {
					walljumpcounter++;
					if (walljumpcounter == 20) {
						walljumpcounter = 0;
						onrightwall = false;
					}
				}

				try {
					this.sleep(10);
				} catch (InterruptedException e) {
				}
			} while (true);
		}
	}

	public class newCollission extends Thread {
		public void run() {
			do {
				for (int x = 0; x < platformersPerLevel[level]; x++) {
					if (yPos > (BoxLocations[x][1][level] - 100)
							&& yPos < (BoxLocations[x][1][level]
									+ BoxLocations[x][3][level] - 50)
							&& xPos > ((BoxLocations[x][0][level] - 50) - 500)
							&& xPos < ((BoxLocations[x][0][level] + BoxLocations[x][2][level]) - 515)) {
						if (BoxLocations[x][4][level] == 2) {
							if (level < 4) {
								yVel = -2;
								level++;
								checkpointXPic = -10000;
								checkpointYPic = -10000;

								checkpointY = 220;
								checkpointX = -100;
								Respawn();
								lives = 5;
							}
						} else {
							if (BoxLocations[x][4][level] == 3) {
								if (platformLeft[x]) {
									xPos++;
								} else {
									xPos--;
								}
							}
							if (BoxLocations[x][4][level] == 4) {
								checkpointY = BoxLocations[x][1][level] - 100;
								checkpointX = BoxLocations[x][0][level] - 535;
								checkpointXPic = BoxLocations[x][0][level] + 75;
								checkpointYPic = BoxLocations[x][1][level] + 310;
							}

							if (BoxLocations[x][4][level] == 5
									|| BoxLocations[x][4][level] == 6) {
								Respawn();
							}
						}
					}
				}
				try {
					this.sleep(10);
				} catch (InterruptedException e) {
				}
			} while (true);
		}
	}

	//Resets everything on death
	public void Respawn() {

		yPos = checkpointY;
		xPos = checkpointX;

		pVel = 0;
		yVel = 0;

		for (int x = 0; x < 100; x++) {
			movingPlatformX[x] = 0;
		}
		
		if(level==0){
		corgiY[0] = 705;
		}else{
			corgiY[0]=99990;
		}
		
		if(level==1){
			corgiY[2]=705;
			corgiY[1]=635;
		}else{
			corgiY[2]=99999;
			corgiY[1]=99999;
		}
		
		
		readInfo();
		lives--;

		
		//If dead
		if (lives == 0) {
			pictureName = "GameOver.png";

			pic.backgroundImage = Toolkit.getDefaultToolkit().getImage(
					pictureName);
			controlsOn=false;
			startGame = false;
			gameOver = true;
			menuScreen = false;
			lives = 5;

		}
	}

	//Moves special platforms
	public class PlatformMovement extends Thread {
		public void run() {
			do {
				for (int x = 0; x < platformersPerLevel[level]; x++) {
					if (BoxLocations[x][4][level] == 3) {
						if (movingPlatformX[x] > BoxLocations[x][5][level]) {
							platformLeft[x] = false;
						}
						if (movingPlatformX[x] < 0) {
							platformLeft[x] = true;
						}
						if (platformLeft[x]) {
							movingPlatformX[x]++;
						} else {
							movingPlatformX[x]--;
						}
						if (platformLeft[x]) {
							BoxLocations[x][0][level]++;
						} else {
							BoxLocations[x][0][level]--;
						}
					}
					if (BoxLocations[x][4][level] == 6) {
						if (movingPlatformX[x] > BoxLocations[x][5][level]) {
							platformLeft[x] = false;
						}
						if (movingPlatformX[x] < 0) {
							platformLeft[x] = true;
						}
						if (platformLeft[x]) {
							movingPlatformX[x]++;
						} else {
							movingPlatformX[x]--;
						}
						if (platformLeft[x]) {
							BoxLocations[x][1][level]++;
						} else {
							BoxLocations[x][1][level]--;
						}
					}
				}

				try {
					this.sleep(10);
				} catch (InterruptedException e) {
				}
			} while (true);
		}
	}

	//Code for boss fight
	public class BossFight extends Thread {
		public void run() {
			do {
				if (corgiBossY < 0) {
					bossMove = 1;
				}
				if (corgiBossY > 530) {
					bossMove = -1;
				}

				if (bossShoot == true) {
					missleYPos = corgiBossY;
					bossShoottwo = true;
					bossShoot = false;
				}

				if (bossShoottwo) {
					missleXPos = missleXPos - 3;
				}

				if (missleXPos < 3550) {
					bossShoot = true;
					missleXPos = 4525;
				}

				// Make it accurate
				if (yPos > missleYPos - 445 && yPos < missleYPos - 405
						&& xPos > missleXPos - 630 && xPos < missleXPos - 545) {
					Respawn();
				}

				if (yPos > corgiBossY - 435 && yPos < corgiBossY - 415
						&& xPos > 3900 && xPos < 4100) {
					yPos = 240;
					xPos = 3880;
					bossLives--;
					if (bossLives == 0) {
						bossShoot = false;
						bossShoottwo = false;
						corgiBossY = 9001;
					}
				}
				corgiBossY = corgiBossY + bossMove;
				try {
					this.sleep(5);
				} catch (InterruptedException e) {
				}
			} while (true);
		}
	}

	//Moves corgis
	public class Corgi extends Thread {
		public void run() {
			do {

				for (int x = 0; x < 3; x++) {
					if ((corgiX[x] - 650) < xPos && corgiX[x] - 565 > xPos
							&& yVel >= 0 && yPos > corgiY[x] - 482) {

						if (yPos > corgiY[x] - 492 && yPos < corgiY[x] - 472) {
							// If he jumps on the corgi, then it bounces him up
							yVel = -20;
							// and it removes the corgi
							corgiX[x] = 9001;
							corgialive[x] = false;

						} else {
							// If he gets hit it exits
							Respawn();
						}

						// Else it continues moving
					} else {

						if (level == 0) {
							corgialive[0] = true;
							if (corgiX[0] > 1230 + 600) {
								corgeyforward[0] = false;
							}
							if (corgiX[0] < 885 + 590) {
								corgeyforward[0] = true;
							}
						} else {
							corgialive[0] = false;
						}

						if (level == 1) {
							corgialive[1] = true;
							corgialive[2] = true;
							if (corgiX[1] > 935 + 600) {
								corgeyforward[1] = false;
							}
							if (corgiX[1] < 530 + 590) {
								corgeyforward[1] = true;
							}

							if (corgiX[2] > 1385 + 600) {
								corgeyforward[2] = false;
							}
							if (corgiX[2] < 935 + 590) {
								corgeyforward[2] = true;
							}
						} else {
							corgialive[1] = false;
							corgialive[2] = false;
						}
						
						if(level==2){
							corgialive[3] = true;
							
							if (corgiX[3] > 4350 + 600) {
								corgeyforward[3] = false;
							}
							if (corgiX[3] < 3375 + 590) {
								corgeyforward[3] = true;
							}
						}else{
							corgialive[3] = false;
						}
						

						if (corgialive[x]) {
							if (corgeyforward[x]) {
								corgiX[x] = corgiX[x] + 1;
							} else {
								corgiX[x] = corgiX[x] - 1;
							}
						}
					}
				}
				try {
					this.sleep(3);
				} catch (InterruptedException e) {
				}
			} while (true);
		}
	}

	//Cloud movement
	public class cloudmovement extends Thread {
		public void run() {
			do {
				if (cloudLocations[0][0] < 2080) {
					cloudLocations[0][0]++;
				} else {
					cloudLocations[0][0] = (int) ((Math.random() * 100) - 400);
					cloudLocations[0][1] = (int) ((Math.random() * 300) + 1);
				}
				if (cloudLocations[1][0] < 1280) {
					cloudLocations[1][0]++;
				} else {
					cloudLocations[1][0] = (int) ((Math.random() * 100) - 400);
					cloudLocations[1][1] = (int) ((Math.random() * 300) + 1);
				}
				if (cloudLocations[2][0] < 1280) {
					cloudLocations[2][0]++;
				} else {
					cloudLocations[2][0] = (int) ((Math.random() * 100) - 400);
					cloudLocations[2][1] = (int) ((Math.random() * 300) + 1);
				}
				try {
					this.sleep(100);
				} catch (InterruptedException e) {
				}
			} while (true);
		}
	}

	//Physics for up and down and left and right
	public class GravityMovement extends Thread {
		public void run() {
			do {
				xPos = xPos + pVel;
				if (left) {
					if (pVel > -10) {
						pVel--;
					}

				} else {
					if (right) {
						if (pVel < 10) {
							pVel++;
						}
					} else {
						if (pVel > 0) {
							pVel--;
						} else {
							if (pVel < 0) {
								pVel++;
							}
						}
					}
				}

				if (pVel > 10) {
					pVel--;
				}
				if (pVel < -10) {
					pVel++;
				}

				if (movementallowedY) {
					if (yVel < 15) {
						yVel++;
					}
					yPos = yPos + yVel;
				}
				pic.repaint();
				try {
					this.sleep(20);
				} catch (InterruptedException e) {
				}
			} while (true);
		}
	}

	//Key presses
	public class MoveListener implements KeyListener {
		public void keyReleased(KeyEvent e) {
			if (e.getKeyChar() == leftC) {
				left = false;
			}
			if (e.getKeyChar() == rightC) {
				right = false;
			}
			if (e.getKeyChar() == jumpC) {
				if (jumpRelease == false) {
					if (yVel < 0) {
						yVel = 0;
					}
				}
				jumpRelease = true;
			}
		}

		public void keyPressed(KeyEvent e) {

			if (e.getKeyChar() == '`' && startGame) {
				escapeCounter++;
				if (escapeCounter == 2) {
					escapeCounter = 0;
					// resetGame();
				}
			}

			if (e.getKeyChar() == leftC && xAllowL) {
				left = true;
			}
			if (e.getKeyChar() == rightC && xAllowR) {
				right = true;
			}

			if (e.getKeyChar() == jumpC) {
				if (onrightwall && jumpRelease) {
					yVel = -15;
					pVel = -16;
					onrightwall = false;
					jumpRelease = false;
				}

				if (onleftwall && jumpRelease) {
					yVel = -15;
					pVel = 16;
					onleftwall = false;
					jumpRelease = false;
				}

				if (jumpRelease) {
					if (!inair) {
						inair = true;
						yVel = -15;
						jumpRelease = false;
					}
				}
			}

			if (controlsOn) {
				if (rightChange) {
					if (e.getKeyChar() != leftC && e.getKeyChar() != jumpC) {
						rightC = e.getKeyChar();
						rightChange = false;
						keyError = false;
					} else {
						keyError = true;
					}
				}
				if (leftChange) {
					if (e.getKeyChar() != rightC && e.getKeyChar() != jumpC) {
						leftC = e.getKeyChar();
						leftChange = false;
						keyError = false;
					} else {
						keyError = true;
					}
				}
				if (jumpChange) {
					if (e.getKeyChar() != rightC && e.getKeyChar() != leftC) {
						jumpC = e.getKeyChar();
						jumpChange = false;
						keyError = false;
					} else {
						keyError = true;
					}
				}
			}
		}

		public void keyTyped(KeyEvent e) {
		}
	}
}